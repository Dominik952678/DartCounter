import React, { useState } from 'react';
import type { GameConfig, Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveUserSyncInfo, removeLinkedGuestProfiles, saveProfiles, validateGuestSyncTokens } from '../db';
import { reportPersistenceError } from '../store/useNotificationStore';
import { readJson, remove as removeStored } from '../utils/storage';
import { BullOffModal } from './matchSetup/BullOffModal';
import { GameConfigPanel } from './matchSetup/GameConfigPanel';
import { GuestSyncRedeemModal } from './GuestSyncRedeemModal';
import { PlayerSelection } from './matchSetup/PlayerSelection';
import { OverwriteSavedGameModal, SavedGameCard } from './matchSetup/SavedGameCard';
import type { SavedMatchSummary } from './matchSetup/SavedGameCard';
import { useLineup } from './matchSetup/useLineup';
import { toGameConfig, useMatchSetupConfig } from './matchSetup/useMatchSetupConfig';
import { Button } from './ui';

interface MatchSetupProps {
  profiles: Record<string, Profile>;
  onStartGame: (players: string[], config: GameConfig, startingIndex?: number) => void;
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  onDiscardSavedGame?: () => void;
  setProfiles?: (profiles: Record<string, Profile>) => void;
}

/**
 * The screen that configures a match: who plays, over what distance, and what
 * to do with a match that was never finished.
 *
 * It owns the pre-flight checks that have to see everything at once — the
 * line-up, the configuration and the cloud state — and leaves the rest to the
 * pieces in `matchSetup/`.
 */
export const MatchSetup: React.FC<MatchSetupProps> = ({
  profiles,
  onStartGame,
  hasSavedGame,
  onResumeGame,
  onDiscardSavedGame,
  setProfiles
}) => {
  const { user } = useAuthStore();
  const isGuest = !user;

  const [config, dispatch] = useMatchSetupConfig();
  const lineup = useLineup(profiles, isGuest, config.playerCount);

  const [savedMatch, setSavedMatch] = useState<SavedMatchSummary | null>(() => {
    const parsed = readJson<SavedMatchSummary | null>('savedGame', null);
    return parsed?.players && parsed.config ? { players: parsed.players, config: parsed.config } : null;
  });
  const [isSavedBannerDismissed, setIsSavedBannerDismissed] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [showGuestSyncModal, setShowGuestSyncModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bullOffPlayers, setBullOffPlayers] = useState<string[] | null>(null);

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

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      setErrorMsg("Ein Spieler kann nicht mehrfach antreten. Bitte wähle unterschiedliche Spieler!");
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
      setErrorMsg("Ein Spiel nur mit Bots ist nicht möglich. Bitte wähle mindestens einen echten Spieler!");
      return;
    }

    // 1. Only block while this profile is actually live on another device.
    //
    // Previously any live sync code blocked local play, so simply owning a code
    // — or importing someone else's — meant you had to go and switch your own
    // sync off before you could start a match on your own device.
    if (user?.id) {
      const syncInfo = await getActiveUserSyncInfo(user.id);
      const coupledHost = syncInfo?.activeHost || syncInfo?.activeHosts?.[0];
      const syncOn = syncInfo?.syncEnabled === true
        || (syncInfo?.syncEnabled === undefined && !!syncInfo?.code && new Date(syncInfo.expiresAt) > new Date());
      if (syncInfo && syncOn && coupledHost) {
        setErrorMsg(`⚠️ Dein Profil ist aktuell auf '${coupledHost.hostName}' gekoppelt. Trenne die Verbindung im Profil-Tab, um hier wieder lokal zu spielen.`);
        return;
      }
    }

    // 2. Pre-flight: are the linked cloud guests still authorised?
    const hasLinkedGuests = chosenPlayers.some(p => profiles[p]?.isLinkedCloudGuest);
    if (hasLinkedGuests) {
      const check = await validateGuestSyncTokens(chosenPlayers, profiles);
      if (!check.valid) {
        // A cut link means the guest is gone: drop the profile and free the slot
        // rather than leaving a dead entry the user has to clear by hand.
        const { profiles: cleaned, removed } = removeLinkedGuestProfiles(profiles, check.revokedGuests);
        if (removed.length > 0 && setProfiles) {
          setProfiles(cleaned);
          saveProfiles(cleaned, user?.id).catch(err => reportPersistenceError(err, 'Profile konnten nicht gespeichert werden'));
          lineup.clearSlots(removed);
        }
        setErrorMsg(`⚠️ Die Verbindung zu @${check.revokedGuests.join(', @')} wurde getrennt. Das Gastprofil wurde entfernt — bitte einen neuen Sync-Code anfordern.`);
        return;
      }
    }

    if (isGuest && setProfiles) {
      // Merge, never replace: a guest's accumulated stats live in these
      // profiles, and overwriting them with zeroed records wiped the local
      // history on every single start.
      const nextProfiles: Record<string, Profile> = { ...profiles };
      chosenPlayers.forEach(p => {
        const existing = nextProfiles[p];
        nextProfiles[p] = existing
          ? { ...existing, isBot: lineup.guestBots[p] || false }
          : {
              wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
              targetAverage: 40,
              isBot: lineup.guestBots[p] || false
            };
      });
      setProfiles(nextProfiles);
      saveProfiles(nextProfiles, null).catch(err => reportPersistenceError(err, 'Gastprofile konnten nicht gespeichert werden'));
    }

    if (hasSavedGame && savedMatch && !isSavedBannerDismissed) {
      setShowOverwriteModal(true);
      return;
    }

    proceedToStart();
  };

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

  return (
    <div className="screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>
      <div className="hero-glow-bg-setup" />

      <div className="app-header">
        <h1>🎯 Neues Spiel</h1>
        <p className="subtitle">Konfiguriere dein Match</p>
      </div>

      {hasSavedGame && !isSavedBannerDismissed && savedMatch && (
        <SavedGameCard
          match={savedMatch}
          onResume={() => onResumeGame?.()}
          onDiscard={discardSavedGame}
          onDismiss={() => setIsSavedBannerDismissed(true)}
        />
      )}

      {/* Bottom margin guarantees clearance for the sticky start button below —
          without it, a short desktop two-column layout left too little page
          height for the button's natural flow position, so it stuck early and
          covered the last checkbox in this grid. */}
      <div className="match-setup-grid" style={{ marginBottom: '76px' }}>
        <PlayerSelection
          profiles={profiles}
          isGuest={isGuest}
          playerCount={config.playerCount}
          is2v2={config.is2v2}
          lineup={lineup}
          errorMsg={errorMsg}
          onModeChange={is2v2 => dispatch({ type: 'mode', is2v2 })}
          onPlayerCountChange={value => dispatch({ type: 'playerCount', value })}
          onAddCloudGuest={() => setShowGuestSyncModal(true)}
        />

        <GameConfigPanel config={config} dispatch={dispatch} />
      </div>

      {/* Sticks above the floating dock, not 20px above the viewport edge —
          which put the primary action behind the dock while scrolling. */}
      <div style={{ position: 'sticky', bottom: 'var(--dock-space)', zIndex: 'var(--z-sticky)', padding: '0 10px' }}>
        <Button
          variant="primary" size="large"
          onClick={handleStartGame}
          style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)' }}
        >
          🎯 Spiel starten
        </Button>
      </div>

      {/* spacer for bottom nav */}

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
