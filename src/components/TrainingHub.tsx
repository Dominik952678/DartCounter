import React, { useState, useEffect, useRef } from 'react';
import type { Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveUserSyncInfo } from '../db';
import { readInt, readOneOf, write } from '../utils/storage';
import { Button, Card, CardHeader, Choice, Slider, Icons } from './ui';
import type { IconProps } from './ui';
import { playerColorByName } from '../utils/playerColors';
import { DEFAULT_BOT_AVERAGE, botRosterLabel } from '../utils/botProfiles';

export type MiniGameMode = 'checkout' | 'powerscoring' | 'splitscore';

const MINI_GAME_MODES: readonly MiniGameMode[] = ['checkout', 'powerscoring', 'splitscore'];

/** Die drei Modus-Karten. §5 gibt ihnen denselben Selected-State wie den Chips. */
const MODE_CHOICES: readonly { mode: MiniGameMode; icon: React.FC<IconProps>; title: string; desc: string }[] = [
  {
    mode: 'checkout',
    icon: Icons.IconTarget,
    title: 'Checkout Training',
    desc: 'Zufällige Checkouts unter Druck treffen'
  },
  {
    mode: 'powerscoring',
    icon: Icons.IconBars,
    title: 'Power Scoring',
    desc: 'Maximale Punkte in festen Runden sammeln'
  },
  {
    mode: 'splitscore',
    icon: Icons.IconSplit,
    title: 'Split Score (Halve-It)',
    desc: 'Vorgegebene Segmente treffen oder Punkte halbieren'
  }
];

interface TrainingHubProps {
  profiles: Record<string, Profile>;
  setProfiles?: (profiles: Record<string, Profile>) => void;
  onStartMiniGame: (mode: MiniGameMode, players: string[], settings: Record<string, unknown>) => void;
  initialMode?: MiniGameMode;
}

export const TrainingHub: React.FC<TrainingHubProps> = ({ profiles, setProfiles, onStartMiniGame, initialMode = 'checkout' }) => {
  const { user } = useAuthStore();
  const isGuest = !user;
  const profileNames = Object.keys(profiles);

  const [selectedMode, setSelectedMode] = useState<MiniGameMode>(() => {
    if (initialMode && MINI_GAME_MODES.includes(initialMode)) return initialMode;
    return readOneOf('trainingMode', MINI_GAME_MODES, 'checkout');
  });

  const [playerCount, setPlayerCount] = useState<number>(
    () => readInt('trainingPlayerCount', 1, { min: 1, max: 4 })
  );

  const [powerScoringRounds, setPowerScoringRounds] = useState<number>(
    () => readInt('powerScoringRounds', 10, { min: 1 })
  );

  const [checkoutRounds, setCheckoutRounds] = useState<number>(
    () => readInt('checkoutRounds', 1, { min: 1 })
  );

  const [checkoutTargets, setCheckoutTargets] = useState<number>(
    () => readInt('checkoutTargets', 10, { min: 1 })
  );

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(() => {
    if (isGuest) return ['Gast 1', 'Gast 2', 'Gast 3', 'Gast 4'];
    const pNames = Object.keys(profiles);
    if (pNames.length > 0) {
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
    }
    return [];
  });
  const [guestBots, setGuestBots] = useState<Record<string, boolean>>({});
  const [randomOrderOnStart, setRandomOrderOnStart] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorMsg) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errorMsg]);

  useEffect(() => {
    write('trainingMode', selectedMode);
  }, [selectedMode]);

  useEffect(() => {
    write('trainingPlayerCount', playerCount);
  }, [playerCount]);

  useEffect(() => {
    write('powerScoringRounds', powerScoringRounds);
  }, [powerScoringRounds]);

  useEffect(() => {
    write('checkoutRounds', checkoutRounds);
  }, [checkoutRounds]);

  useEffect(() => {
    write('checkoutTargets', checkoutTargets);
  }, [checkoutTargets]);

  const handlePlayerChange = (index: number, name: string) => {
    const newSelected = [...selectedPlayers];
    // If the selected name is already present in another active slot, swap them!
    const existingIndex = newSelected.slice(0, playerCount).indexOf(name);
    if (existingIndex !== -1 && existingIndex !== index) {
      newSelected[existingIndex] = newSelected[index];
    }
    newSelected[index] = name;
    setSelectedPlayers(newSelected);
  };

  const handleGuestBotToggle = (index: number, isBot: boolean) => {
    const name = selectedPlayers[index] || `Gast ${index + 1}`;
    setGuestBots(prev => ({ ...prev, [name]: isBot }));
  };

  const handleStart = async () => {
    let chosenPlayers = selectedPlayers.slice(0, playerCount);

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      setErrorMsg("Ein Spieler kann nicht mehrfach antreten. Bitte wähle unterschiedliche Spieler!");
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
      setErrorMsg("Ein Spiel nur mit Bots ist nicht möglich. Bitte wähle mindestens einen echten Spieler!");
      return;
    }

    // Nur blockieren, wenn dieses Profil GERADE auf einem fremden Gerät läuft.
    // Merely owning a sync code is not a conflict — see MatchSetup for the same
    // rule; the old check made you switch your own sync off to play locally.
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
      // Merge, never replace. This used to hand over a map holding only the
      // players of this session with zeroed records, so starting a training
      // session dropped every other guest profile and reset the stats of the
      // ones taking part — which the end-of-session booking then persisted.
      // The match screen had the same bug and was fixed; this copy was missed.
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
      checkoutRounds: checkoutRounds,
      checkoutTargets: checkoutTargets
    });
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playerCount) return;
    const newSelected = [...selectedPlayers];
    const temp = newSelected[index];
    newSelected[index] = newSelected[targetIndex];
    newSelected[targetIndex] = temp;
    setSelectedPlayers(newSelected);
  };

  return (
    <div className="training-hub screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>

      <div className="hero-glow-bg-training" />

      <div className="app-header" style={{ marginBottom: '20px' }}>
        <h2>Training &amp; Mini-Games</h2>
        <p className="subtitle">Verbessere deine Fähigkeiten und trainiere gezielt</p>
      </div>

      <div className="training-hub-grid">
        {/* Modes Column */}
        <Card>
          <CardHeader heading={"Modus wählen"} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {MODE_CHOICES.map(({ mode, icon: Icon, title, desc }) => (
              <Choice
                key={mode}
                className="training-mode-btn"
                selected={selectedMode === mode}
                onClick={() => setSelectedMode(mode)}
              >
                <span className="training-mode-icon" aria-hidden="true"><Icon size={22} /></span>
                <span>
                  <span className="training-mode-title">{title}</span>
                  <span className="training-mode-desc">{desc}</span>
                </span>
              </Choice>
            ))}
          </div>
        </Card>

        {/* Settings Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <CardHeader heading={"Spieler"} />
            <Slider
              name="playerCount"
              value={playerCount}
              options={[1, 2, 3, 4].map(count => ({
                value: count,
                label: count,
                ariaLabel: `${count} Spieler`
              }))}
              onChange={setPlayerCount}
              ariaLabel="Anzahl Spieler"
            />

            <div className="player-selects" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.from({ length: playerCount }).map((_, i) => {
                const playerName = selectedPlayers[i] || '';
                const isBot = isGuest ? guestBots[playerName] : profiles[playerName]?.isBot;

                return (
                  <div 
                    key={i} 
                    className="player-select-wrapper" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      background: 'var(--surface)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--card-border)'
                    }}
                  >
                    <div className="seat-order">
                      <button
                        type="button"
                        className="seat-move-btn"
                        onClick={() => movePlayer(i, 'up')}
                        disabled={i === 0}
                        aria-label="Spieler nach oben"
                        title="Nach oben"
                      >
                        <Icons.IconChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="seat-move-btn"
                        onClick={() => movePlayer(i, 'down')}
                        disabled={i >= playerCount - 1}
                        aria-label="Spieler nach unten"
                        title="Nach unten"
                      >
                        <Icons.IconChevronDown size={15} />
                      </button>
                    </div>

                    <div className="avatar-circle" style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontWeight: 'var(--weight-medium)', 
                      fontSize: '14px',
                      backgroundColor: playerColorByName(playerName || `Spieler ${i+1}`) 
                    }}>
                      {isBot ? <Icons.IconBot size={17} /> : (playerName.charAt(0).toUpperCase() || '?')}
                    </div>

                    {isGuest ? (
                      <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={playerName} 
                          onChange={e => handlePlayerChange(i, e.target.value)} 
                          placeholder={`Spieler ${i + 1}`} 
                          style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '16px' }} 
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85em', color: 'var(--text-dim)', cursor: 'pointer', minWidth: '48px', minHeight: '48px', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={guestBots[playerName] || false} 
                            onChange={e => handleGuestBotToggle(i, e.target.checked)} 
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Bot
                        </label>
                      </div>
                    ) : (
                      <select 
                        value={playerName}
                        onChange={(e) => handlePlayerChange(i, e.target.value)}
                        style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '16px', outline: 'none' }}
                      >
                        {profileNames.map(name => (
                          <option 
                            key={name} 
                            value={name}
                            style={{ color: '#000', background: '#fff' }}
                          >
                            {botRosterLabel(name, profiles[name])}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div
                ref={errorRef}
                role="alert"
                style={{
                  background: 'var(--red)',
                  color: 'white',
                  padding: '12px',
                  borderRadius: 'var(--radius)',
                  marginTop: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 'var(--weight-medium)'
                }}
              >
                <Icons.IconAlert size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {playerCount > 1 && (
              <div style={{ marginTop: '15px' }}>
                <label className="option-toggle">
                  <input
                    type="checkbox"
                    checked={randomOrderOnStart}
                    onChange={(e) => setRandomOrderOnStart(e.target.checked)}
                  />
                  <span className="option-toggle-title">
                    <Icons.IconShuffle size={16} /> Zufällige Reihenfolge beim Start auslosen
                  </span>
                </label>
              </div>
            )}
          </Card>

          {selectedMode === 'powerscoring' && (
            <Card>
              <CardHeader heading={"Rundenlimit"} />
              <Slider
                name="powerScoringRounds"
                value={powerScoringRounds}
                options={[5, 10, 15, 20].map(r => ({
                  value: r,
                  label: r,
                  ariaLabel: `${r} Runden`
                }))}
                onChange={setPowerScoringRounds}
                ariaLabel="Rundenlimit"
              />
            </Card>
          )}

          {selectedMode === 'checkout' && (
            <>
            <Card>
              <CardHeader heading={"Anzahl Targets"} />
              <Slider
                name="checkoutTargets"
                value={checkoutTargets}
                options={[5, 10, 15, 20].map(r => ({
                  value: r,
                  label: r,
                  ariaLabel: `${r} Targets`
                }))}
                onChange={setCheckoutTargets}
                ariaLabel="Anzahl Targets"
              />
            </Card>

            <Card>
              <CardHeader heading={"Runden (Versuche pro Finish)"} />
              <Slider
                name="checkoutRounds"
                value={checkoutRounds}
                options={[1, 2, 3, 5].map(r => ({
                  value: r,
                  label: r,
                  ariaLabel: `${r} ${r === 1 ? 'Runde' : 'Runden'}`
                }))}
                onChange={setCheckoutRounds}
                ariaLabel="Runden pro Finish"
              />
              <p style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '10px', textAlign: 'center' }}>
                1 Runde = 3 Darts um das Finish zu checken.
              </p>
            </Card>
            </>
          )}

          <Button variant="primary" size="large" fullWidth onClick={handleStart}>
            <Icons.IconPlayFilled size={20} /> Training starten
          </Button>
        </div>
      </div>
      
      {/* spacer for bottom nav */}
    </div>
  );
};

