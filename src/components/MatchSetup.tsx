import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GameConfig, Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveUserSyncInfo, removeLinkedGuestProfiles, saveProfiles, validateGuestSyncTokens } from '../db';
import { reportPersistenceError } from '../store/useNotificationStore';
import { readJson, remove as removeStored } from '../utils/storage';
import { BullOffModal } from './matchSetup/BullOffModal';
import { GameConfigPanel } from './matchSetup/GameConfigPanel';
import { GuestSyncRedeemModal } from './GuestSyncRedeemModal';
import { PlayerSelection } from './matchSetup/PlayerSelection';
import { OverwriteSavedGameModal } from './matchSetup/SavedGameCard';
import type { SavedMatchSummary } from './matchSetup/SavedGameCard';
import { useLineup } from './matchSetup/useLineup';
import {
  MAX_START_SCORE,
  MIN_START_SCORE,
  isValidStartScore,
  toGameConfig,
  useMatchSetupConfig
} from './matchSetup/useMatchSetupConfig';
import { Button, Slider } from './ui';
import { DEFAULT_BOT_AVERAGE } from '../utils/botProfiles';
import { configPills } from './matchSetup/configSummary';

interface MatchSetupProps {
  profiles: Record<string, Profile>;
  onStartGame: (players: string[], config: GameConfig, startingIndex?: number) => void;
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  onDiscardSavedGame?: () => void;
  setProfiles?: (profiles: Record<string, Profile>) => void;
  /**
   * Startet das Match, sobald die Aufstellung steht — der „Ein Tap"-Weg von der
   * orangen Karte des Start-Screens.
   *
   * Der Weg führt bewusst durch diesen Screen und nicht um ihn herum: hier
   * liegen die Vorprüfungen (gekoppelte Cloud-Profile, gültige Gast-Tokens, ein
   * noch laufendes Match, das Anlegen von Gastprofilen). Blockt eine davon,
   * bleibt der Nutzer genau hier stehen und sieht die Meldung.
   */
  autoStart?: boolean;
}

/**
 * „Neues Spiel" (Entwurf B1–B4): wer spielt, über welche Distanz, mit welchem
 * Finish.
 *
 * Er besitzt die Vorprüfungen, die alles zugleich sehen müssen — Aufstellung,
 * Konfiguration und Cloud-Zustand — und überlässt den Rest den Teilen in
 * `matchSetup/`. Ein unterbrochenes Match bietet der Start-Screen an; hier wird
 * nur gefragt, bevor ein neues es ersetzt.
 */
export const MatchSetup: React.FC<MatchSetupProps> = ({
  profiles,
  onStartGame,
  hasSavedGame,
  onResumeGame,
  onDiscardSavedGame,
  setProfiles,
  autoStart = false
}) => {
  const { user } = useAuthStore();
  const isGuest = !user;

  const [config, dispatch] = useMatchSetupConfig();
  const lineup = useLineup(profiles, isGuest, config.playerCount);

  const [savedMatch, setSavedMatch] = useState<SavedMatchSummary | null>(() => {
    const parsed = readJson<SavedMatchSummary | null>('savedGame', null);
    return parsed?.players && parsed.config ? { players: parsed.players, config: parsed.config } : null;
  });
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [showGuestSyncModal, setShowGuestSyncModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bullOffPlayers, setBullOffPlayers] = useState<string[] | null>(null);

  const startScoreValid = isValidStartScore(config.startScore);

  /* ── Der „Ein Tap"-Start ──
     Nicht sofort beim Mounten: die Profile kommen asynchron, und `useLineup`
     leitet die Sitzplätze daraus ab. Ein Start im ersten Render träfe leere
     Namen. Der Ref sorgt dafür, dass es bei einem Versuch bleibt. */
  const autoStartedRef = useRef(false);
  const startGameRef = useRef<() => Promise<void>>(async () => {});

  const readyToAutoStart =
    autoStart && lineup.selectedPlayers.slice(0, config.playerCount).every(p => p && p.trim());

  const discardSavedGame = () => {
    if (onDiscardSavedGame) onDiscardSavedGame();
    else removeStored('savedGame');
    setSavedMatch(null);
  };

  const executeStartGame = (finalPlayers: string[], startingIndex = 0) => {
    discardSavedGame();
    onStartGame(finalPlayers, toGameConfig(config), startingIndex);
  };

  /** Resolves seat order (shuffle, if chosen), then either starts right away or runs a bull-off first. */
  const proceedToStart = () => {
    let finalPlayers = lineup.selectedPlayers.slice(0, config.playerCount);
    if (lineup.randomOrderOnStart) {
      const shuffled = [...finalPlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      finalPlayers = shuffled;
    }

    if (lineup.bullOffEnabled) {
      setBullOffPlayers(finalPlayers);
    } else {
      executeStartGame(finalPlayers);
    }
  };

  const handleStartGame = async () => {
    const chosenPlayers = lineup.selectedPlayers.slice(0, config.playerCount);

    if (!isValidStartScore(config.startScore)) {
      setErrorMsg(`Die Startpunktzahl muss zwischen ${MIN_START_SCORE} und ${MAX_START_SCORE} liegen.`);
      return;
    }

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      setErrorMsg('Ein Spieler kann nicht mehrfach antreten. Bitte wähle unterschiedliche Spieler!');
      return;
    }

    if (chosenPlayers.some(p => !p || !p.trim())) {
      setErrorMsg('Bitte gib für jeden Spielerplatz einen Namen ein.');
      return;
    }

    const hasHuman = isGuest
      ? chosenPlayers.some(p => !lineup.guestBots[p])
      : chosenPlayers.some(p => profiles[p] && !profiles[p].isBot);

    if (!hasHuman) {
      setErrorMsg('Ein Spiel nur mit Bots ist nicht möglich. Bitte wähle mindestens einen echten Spieler!');
      return;
    }

    // 1. Only block while this profile is actually live on another device.
    if (user?.id) {
      const syncInfo = await getActiveUserSyncInfo(user.id);
      const coupledHost = syncInfo?.activeHost || syncInfo?.activeHosts?.[0];
      const syncOn = syncInfo?.syncEnabled === true
        || (syncInfo?.syncEnabled === undefined && !!syncInfo?.code && new Date(syncInfo.expiresAt) > new Date());
      if (syncInfo && syncOn && coupledHost) {
        setErrorMsg(`Dein Profil ist aktuell auf '${coupledHost.hostName}' gekoppelt. Trenne die Verbindung im Profil-Tab, um hier wieder lokal zu spielen.`);
        return;
      }
    }

    // 2. Pre-flight: are the linked cloud guests still authorised?
    const hasLinkedGuests = chosenPlayers.some(p => profiles[p]?.isLinkedCloudGuest);
    if (hasLinkedGuests) {
      const check = await validateGuestSyncTokens(chosenPlayers, profiles);
      if (!check.valid) {
        // A cut link means the guest is gone: drop the profile and free the slot.
        const { profiles: cleaned, removed } = removeLinkedGuestProfiles(profiles, check.revokedGuests);
        if (removed.length > 0 && setProfiles) {
          setProfiles(cleaned);
          saveProfiles(cleaned, user?.id).catch(err => reportPersistenceError(err, 'Profile konnten nicht gespeichert werden'));
          lineup.clearSlots(removed);
        }
        setErrorMsg(`Die Verbindung zu @${check.revokedGuests.join(', @')} wurde getrennt. Das Gastprofil wurde entfernt — bitte einen neuen Sync-Code anfordern.`);
        return;
      }
    }

    if (isGuest && setProfiles) {
      // Merge, never replace: a guest's accumulated stats live in these profiles.
      const nextProfiles: Record<string, Profile> = { ...profiles };
      chosenPlayers.forEach(p => {
        const existing = nextProfiles[p];
        nextProfiles[p] = existing
          ? { ...existing, isBot: lineup.guestBots[p] || false }
          : {
              wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
              targetAverage: DEFAULT_BOT_AVERAGE,
              isBot: lineup.guestBots[p] || false
            };
      });
      setProfiles(nextProfiles);
      saveProfiles(nextProfiles, null).catch(err => reportPersistenceError(err, 'Gastprofile konnten nicht gespeichert werden'));
    }

    setErrorMsg(null);

    if (hasSavedGame && savedMatch) {
      setShowOverwriteModal(true);
      return;
    }

    proceedToStart();
  };

  useLayoutEffect(() => {
    startGameRef.current = handleStartGame;
  });

  useEffect(() => {
    if (!readyToAutoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startGameRef.current();
  }, [readyToAutoStart]);

  /** Lists a freshly redeemed cloud guest and seats them in the first free slot. */
  const addImportedGuest = (username: string, profile: Profile) => {
    if (setProfiles) {
      const nextProfiles = { ...profiles, [username]: profile };
      setProfiles(nextProfiles);
      if (user?.id) {
        saveProfiles(nextProfiles, user.id)
          .catch(err => reportPersistenceError(err, 'Gastprofil konnte nicht gespeichert werden'));
      }
    }
    lineup.setSelectedPlayers(prev => {
      const next = [...prev];
      const freeSlot = next.findIndex(p => !p || profiles[p]?.isBot);
      if (freeSlot >= 0) next[freeSlot] = username;
      return next;
    });
  };

  // Dieselben Worte wie auf der orangen Karte des Start-Screens.
  const pills = configPills(config);
  const summary = `${pills[0]} · ${config.outMode} · ${pills[2]}`;

  return (
    <div className="screen active-screen setup-screen">
      <h1 className="setup-title">Neues Spiel</h1>

      <Slider
        name="matchMode2v2"
        value={config.is2v2 ? 'team' : 'single'}
        options={[
          { value: 'single', label: 'Einzel' },
          { value: 'team', label: '2v2 Doppel' }
        ]}
        onChange={value => dispatch({ type: 'mode', is2v2: value === 'team' })}
        ariaLabel="Spielmodus"
      />

      <div className="setup-grid">
        <div className="setup-column">
          <GameConfigPanel config={config} dispatch={dispatch} />
        </div>
        <div className="setup-column">
          <PlayerSelection
            profiles={profiles}
            isGuest={isGuest}
            playerCount={config.playerCount}
            is2v2={config.is2v2}
            lineup={lineup}
            errorMsg={errorMsg}
            onPlayerCountChange={value => dispatch({ type: 'playerCount', value })}
            onAddCloudGuest={() => setShowGuestSyncModal(true)}
          />
        </div>
      </div>

      <div className="setup-start">
        <Button
          variant="primary"
          size="large"
          fullWidth
          className="setup-start-btn"
          onClick={handleStartGame}
          disabled={!startScoreValid}
        >
          <span>Spiel starten</span>
          <span className="setup-start-summary">{startScoreValid ? summary : 'Startpunktzahl prüfen'}</span>
        </Button>
      </div>

      {showOverwriteModal && (
        <OverwriteSavedGameModal
          onResume={() => {
            setShowOverwriteModal(false);
            onResumeGame?.();
          }}
          onOverwrite={() => {
            setShowOverwriteModal(false);
            proceedToStart();
          }}
          onCancel={() => setShowOverwriteModal(false)}
        />
      )}

      {showGuestSyncModal && (
        <GuestSyncRedeemModal
          onImported={addImportedGuest}
          onClose={() => setShowGuestSyncModal(false)}
        />
      )}

      {bullOffPlayers && (
        <BullOffModal
          players={bullOffPlayers}
          profiles={profiles}
          /* Im 2v2 wirft einer pro Team: Sitz 0 führt Team 1, Sitz 1 Team 2. */
          contenders={config.is2v2 ? [0, 1] : undefined}
          onResolved={startingIndex => {
            const players = bullOffPlayers;
            setBullOffPlayers(null);
            executeStartGame(players, startingIndex);
          }}
          onCancel={() => setBullOffPlayers(null)}
        />
      )}
    </div>
  );
};
