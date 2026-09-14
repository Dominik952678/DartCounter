import React, { useState, useEffect, useRef } from 'react';
import type { MatchHistory, Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveUserSyncInfo } from '../db';
import { readInt, readOneOf, write } from '../utils/storage';
import { Button, Icons, Sheet, Slider, Toggle } from './ui';
import { playerColorBySeat } from '../utils/playerColors';
import { DEFAULT_BOT_AVERAGE, botRosterLabel } from '../utils/botProfiles';

export type MiniGameMode = 'checkout' | 'powerscoring' | 'splitscore';

const MINI_GAME_MODES: readonly MiniGameMode[] = ['checkout', 'powerscoring', 'splitscore'];

interface ModeCard {
  mode: MiniGameMode;
  kicker: string;
  title: string;
  desc: string;
  /** Wie das Ergebnis dieses Modus in der Match-Historie heißt. */
  gameType: MatchHistory['gameType'];
  best: (profile?: Profile) => number | undefined;
  bestLabel: string;
}

/** Die drei Modi als Karten (Entwurf E1). */
const MODE_CARDS: readonly ModeCard[] = [
  {
    mode: 'checkout',
    kicker: 'Finishen',
    title: 'Checkout-Training',
    desc: 'Zufällige Finishes unter Druck — alle spielen dieselben Ziele.',
    gameType: 'checkoutTraining',
    best: p => p?.checkoutTraining?.bestCheckout,
    bestLabel: 'bestes Finish'
  },
  {
    mode: 'powerscoring',
    kicker: 'Scoring',
    title: 'Power Scoring',
    desc: 'So viele Punkte wie möglich in festen Runden.',
    gameType: 'powerScoring',
    best: p => p?.powerScoring?.bestScore,
    bestLabel: 'Bestwert'
  },
  {
    mode: 'splitscore',
    kicker: 'Präzision',
    title: 'Split Score',
    desc: 'Ziel treffen — sonst wird halbiert.',
    gameType: 'splitScore',
    best: p => p?.splitScore?.bestScore,
    bestLabel: 'Bestwert'
  }
];

interface TrainingHubProps {
  profiles: Record<string, Profile>;
  setProfiles?: (profiles: Record<string, Profile>) => void;
  onStartMiniGame: (mode: MiniGameMode, players: string[], settings: Record<string, unknown>) => void;
  /** Öffnet die Einstellungen dieses Modus gleich — für Links mit `?mode=`. */
  initialMode?: MiniGameMode;
  /** Für die Karte „Zuletzt". */
  matches?: MatchHistory[];
}

/**
 * Training (Entwurf E1–E2): die drei Modi als Karten mit Bestwert, darunter
 * das letzte Training. Ein Tap öffnet die Einstellungen als Blatt.
 */
export const TrainingHub: React.FC<TrainingHubProps> = ({ profiles, setProfiles, onStartMiniGame, initialMode, matches }) => {
  const { user } = useAuthStore();
  const isGuest = !user;
  const profileNames = Object.keys(profiles);

  const [selectedMode, setSelectedMode] = useState<MiniGameMode>(() => {
    if (initialMode && MINI_GAME_MODES.includes(initialMode)) return initialMode;
    return readOneOf('trainingMode', MINI_GAME_MODES, 'checkout');
  });
  const [settingsOpen, setSettingsOpen] = useState(() => Boolean(initialMode && MINI_GAME_MODES.includes(initialMode)));
  const activeMode = MODE_CARDS.find(m => m.mode === selectedMode) ?? MODE_CARDS[0];

  const [playerCount, setPlayerCount] = useState<number>(() => readInt('trainingPlayerCount', 1, { min: 1, max: 4 }));
  const [powerScoringRounds, setPowerScoringRounds] = useState<number>(() => readInt('powerScoringRounds', 10, { min: 1 }));
  const [checkoutRounds, setCheckoutRounds] = useState<number>(() => readInt('checkoutRounds', 1, { min: 1 }));
  const [checkoutTargets, setCheckoutTargets] = useState<number>(() => readInt('checkoutTargets', 10, { min: 1 }));

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(() => {
    if (isGuest) return ['Gast 1', 'Gast 2', 'Gast 3', 'Gast 4'];
    const pNames = Object.keys(profiles);
    if (pNames.length === 0) return [];
    const initial: string[] = [];
    const humans = pNames.filter(n => !profiles[n]?.isBot);
    const bots = pNames.filter(n => profiles[n]?.isBot);
    for (let i = 0; i < 4; i++) {
      if (i === 0 && humans.length > 0) {
        initial.push(humans[0]);
      } else {
        const nextHuman = humans.find(h => !initial.includes(h));
        const nextBot = bots.find(b => !initial.includes(b));
        if (nextHuman) initial.push(nextHuman);
        else if (nextBot) initial.push(nextBot);
      }
    }
    return initial;
  });
  const [guestBots, setGuestBots] = useState<Record<string, boolean>>({});
  const [randomOrderOnStart, setRandomOrderOnStart] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorMsg) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errorMsg]);

  useEffect(() => { write('trainingMode', selectedMode); }, [selectedMode]);
  useEffect(() => { write('trainingPlayerCount', playerCount); }, [playerCount]);
  useEffect(() => { write('powerScoringRounds', powerScoringRounds); }, [powerScoringRounds]);
  useEffect(() => { write('checkoutRounds', checkoutRounds); }, [checkoutRounds]);
  useEffect(() => { write('checkoutTargets', checkoutTargets); }, [checkoutTargets]);

  // Die Bestwerte gehören dem eigenen Profil, sonst dem ersten Menschen auf dem Gerät.
  const ownName = user?.user_metadata?.username && profiles[user.user_metadata.username]
    ? user.user_metadata.username
    : profileNames.find(n => !profiles[n]?.isBot);
  const ownProfile = ownName ? profiles[ownName] : undefined;

  const lastTraining = matches?.find(m => m.gameType && m.gameType !== 'standard');
  const lastCard = lastTraining ? MODE_CARDS.find(m => m.gameType === lastTraining.gameType) : undefined;
  const lastScore = lastTraining?.players.find(p => p.name === lastTraining.winner)?.score;

  const handlePlayerChange = (index: number, name: string) => {
    const next = [...selectedPlayers];
    // Picking someone who already sits in another active seat swaps the two.
    const existingIndex = next.slice(0, playerCount).indexOf(name);
    if (existingIndex !== -1 && existingIndex !== index) {
      next[existingIndex] = next[index];
    }
    next[index] = name;
    setSelectedPlayers(next);
  };

  const handleGuestBotToggle = (index: number, isBot: boolean) => {
    const name = selectedPlayers[index] || `Gast ${index + 1}`;
    setGuestBots(prev => ({ ...prev, [name]: isBot }));
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playerCount) return;
    const next = [...selectedPlayers];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setSelectedPlayers(next);
  };

  const handleStart = async () => {
    let chosenPlayers = selectedPlayers.slice(0, playerCount);

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      setErrorMsg('Ein Spieler kann nicht mehrfach antreten. Bitte wähle unterschiedliche Spieler!');
      return;
    }

    if (chosenPlayers.some(p => !p || !p.trim())) {
      setErrorMsg('Bitte gib für jeden Spielerplatz einen Namen ein.');
      return;
    }

    const hasHuman = isGuest
      ? chosenPlayers.some(p => !guestBots[p])
      : chosenPlayers.some(p => profiles[p] && !profiles[p].isBot);

    if (!hasHuman) {
      setErrorMsg('Ein Spiel nur mit Bots ist nicht möglich. Bitte wähle mindestens einen echten Spieler!');
      return;
    }

    // Nur blockieren, wenn dieses Profil GERADE auf einem fremden Gerät läuft.
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

    if (isGuest && setProfiles) {
      // Merge, never replace: the other guest profiles and their statistics stay.
      const nextProfiles: Record<string, Profile> = { ...profiles };
      chosenPlayers.forEach(p => {
        const existing = nextProfiles[p];
        nextProfiles[p] = existing
          ? { ...existing, isBot: guestBots[p] || false }
          : {
              wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
              targetAverage: DEFAULT_BOT_AVERAGE,
              isBot: guestBots[p] || false
            };
      });
      setProfiles(nextProfiles);
    }

    if (randomOrderOnStart) {
      const shuffled = [...chosenPlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      chosenPlayers = shuffled;
    }

    onStartMiniGame(selectedMode, chosenPlayers, {
      rounds: powerScoringRounds,
      checkoutRounds,
      checkoutTargets
    });
  };

  const summary = selectedMode === 'checkout'
    ? `${checkoutTargets} Ziele · ${checkoutRounds} ${checkoutRounds === 1 ? 'Runde' : 'Runden'}`
    : selectedMode === 'powerscoring'
      ? `${powerScoringRounds} Runden`
      : `${playerCount} Spieler`;

  return (
    <div className="screen active-screen training-screen">
      <h1 className="setup-title">Training</h1>
      <p className="training-sub">Drei Modi · mit Bots und bis zu vier Spielern</p>

      <div className="training-modes">
        {MODE_CARDS.map(card => {
          const best = card.best(ownProfile);
          return (
            <button
              key={card.mode}
              type="button"
              className="training-mode-card"
              onClick={() => {
                setSelectedMode(card.mode);
                setErrorMsg(null);
                setSettingsOpen(true);
              }}
            >
              <span className="training-mode-text">
                <span className="label-caps">{card.kicker}</span>
                <span className="training-mode-title">{card.title}</span>
                <span className="training-mode-desc">{card.desc}</span>
              </span>
              <span className="training-mode-best">
                <span className="num">{best ? best : '–'}</span>
                <span className="training-mode-best-label">{card.bestLabel}</span>
              </span>
            </button>
          );
        })}
      </div>

      {lastTraining && lastCard && (
        <div className="start-last">
          <div>
            <span className="label-caps">Zuletzt</span>
            <span className="start-last-title">
              {lastScore !== undefined ? `${lastCard.title} · ${lastScore}` : lastCard.title}
            </span>
          </div>
          <span className="start-last-meta">{lastTraining.date}</span>
        </div>
      )}

      {settingsOpen && (
        <Sheet title={activeMode.title} onClose={() => setSettingsOpen(false)}>
          <div className="training-settings">
            <section className="setup-section">
              <h2 className="setup-section-title">Spieler</h2>
              <Slider
                name="playerCount"
                variant="tiles"
                value={playerCount}
                options={[1, 2, 3, 4].map(count => ({ value: count, label: count, ariaLabel: `${count} Spieler` }))}
                onChange={setPlayerCount}
                ariaLabel="Anzahl Spieler"
              />
            </section>

            <div className="seat-list">
              {Array.from({ length: playerCount }, (_, i) => {
                const playerName = selectedPlayers[i] || '';
                const isBot = isGuest ? guestBots[playerName] : profiles[playerName]?.isBot;
                return (
                  <div
                    key={i}
                    className="seat-row"
                    style={{ '--player-color': playerColorBySeat(i) } as React.CSSProperties}
                  >
                    <div className="seat-order">
                      <button
                        type="button"
                        className="seat-move-btn"
                        onClick={() => movePlayer(i, 'up')}
                        disabled={i === 0}
                        aria-label="Spieler nach oben"
                      >
                        <Icons.IconChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="seat-move-btn"
                        onClick={() => movePlayer(i, 'down')}
                        disabled={i >= playerCount - 1}
                        aria-label="Spieler nach unten"
                      >
                        <Icons.IconChevronDown size={15} />
                      </button>
                    </div>
                    <span className="seat-avatar" aria-hidden="true">
                      {isBot ? <Icons.IconBot size={17} /> : playerName.charAt(0).toUpperCase() || '?'}
                    </span>
                    <div className="seat-main">
                      {isGuest ? (
                        <input
                          type="text"
                          className="seat-input"
                          value={playerName}
                          onChange={e => handlePlayerChange(i, e.target.value)}
                          placeholder={`Spieler ${i + 1}`}
                          aria-label={`Name für Platz ${i + 1}`}
                        />
                      ) : (
                        <select
                          className="seat-input"
                          value={playerName}
                          onChange={e => handlePlayerChange(i, e.target.value)}
                          aria-label={`Spieler für Platz ${i + 1}`}
                        >
                          {profileNames.map(name => (
                            <option key={name} value={name}>{botRosterLabel(name, profiles[name])}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {isGuest && (
                      <label className="seat-bot">
                        <input
                          type="checkbox"
                          checked={guestBots[playerName] || false}
                          onChange={e => handleGuestBotToggle(i, e.target.checked)}
                        />
                        Bot
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div ref={errorRef} role="alert" className="setup-error">
                <Icons.IconAlert size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {playerCount > 1 && (
              <Toggle
                icon={<Icons.IconShuffle size={18} />}
                label="Zufällige Reihenfolge"
                checked={randomOrderOnStart}
                onChange={setRandomOrderOnStart}
              />
            )}

            {selectedMode === 'powerscoring' && (
              <section className="setup-section">
                <h2 className="setup-section-title">Runden</h2>
                <Slider
                  name="powerScoringRounds"
                  variant="tiles"
                  value={powerScoringRounds}
                  options={[5, 10, 15, 20].map(r => ({ value: r, label: r, ariaLabel: `${r} Runden` }))}
                  onChange={setPowerScoringRounds}
                  ariaLabel="Runden"
                />
              </section>
            )}

            {selectedMode === 'checkout' && (
              <>
                <section className="setup-section">
                  <h2 className="setup-section-title">Ziele</h2>
                  <Slider
                    name="checkoutTargets"
                    variant="tiles"
                    value={checkoutTargets}
                    options={[5, 10, 15, 20].map(r => ({ value: r, label: r, ariaLabel: `${r} Ziele` }))}
                    onChange={setCheckoutTargets}
                    ariaLabel="Anzahl Ziele"
                  />
                </section>
                <section className="setup-section">
                  <h2 className="setup-section-title">Runden pro Ziel</h2>
                  <Slider
                    name="checkoutRounds"
                    variant="tiles"
                    value={checkoutRounds}
                    options={[1, 2, 3, 5].map(r => ({ value: r, label: r, ariaLabel: `${r} ${r === 1 ? 'Runde' : 'Runden'}` }))}
                    onChange={setCheckoutRounds}
                    ariaLabel="Runden pro Ziel"
                  />
                </section>
              </>
            )}

            <Button variant="primary" size="large" fullWidth className="setup-start-btn" onClick={handleStart}>
              <span>Training starten</span>
              <span className="setup-start-summary">{summary}</span>
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
};
