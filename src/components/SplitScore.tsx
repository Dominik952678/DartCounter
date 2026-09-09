import React, { useState, useEffect, useLayoutEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Profile, Dart } from '../types';
import { playDartHitSound, playSciFiHitSound, speak, play180Sound, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { ConfirmModal } from './ConfirmModal';
import { Button, CallOut, StatStrip, Icons } from './ui';
import { withDartRecorded } from '../utils/segmentStats';
import { liveStats } from '../utils/storyExport';
import { playerColorBySeat } from '../utils/playerColors';
import { botAverage } from '../utils/botProfiles';

interface SplitScoreProps {
  players: string[];
  profiles: Record<string, Profile>;
  onFinish: (results: {
    name: string;
    score: number;
    splitLog: { target: string; gained: number | null; hits: number }[];
    segmentHits: Record<string, number>;
    dartsThrown: number;
    triplesHit: number;
  }[]) => void;
  onAbort: () => void;
  isOnline?: boolean;
  isHost?: boolean;
  roomChannel?: RealtimeChannel | null;
  myUsername?: string;
}

interface PlayerState {
  name: string;
  score: number;
  isBot: boolean;
  targetAverage: number;
  color?: string;
  /**
   * Ziel für Ziel. `gained: null` heißt halbiert; `hits` zählt die Darts, die
   * im Ziel lagen — einfach, unabhängig von Single, Double oder Triple.
   * Länge = TARGETS.length.
   */
  splitLog: { target: string; gained: number | null; hits: number }[];
  segmentHits: Record<string, number>;
  dartsThrown: number;
  triplesHit: number;
}

const TARGETS = [
  { label: '15', type: 'number', val: 15 },
  { label: '16', type: 'number', val: 16 },
  { label: 'Double', type: 'modifier', val: 2 },
  { label: '17', type: 'number', val: 17 },
  { label: '18', type: 'number', val: 18 },
  { label: 'Triple', type: 'modifier', val: 3 },
  { label: '19', type: 'number', val: 19 },
  { label: '20', type: 'number', val: 20 },
  { label: 'BULL', type: 'number', val: 25 },
];

interface HistorySnapshot {
  gameState: PlayerState[];
  activePlayer: number;
  currentRoundIndex: number;
  currentRoundDarts: Dart[];
}

export const SplitScore: React.FC<SplitScoreProps> = ({ players, profiles, onFinish, onAbort, isOnline, isHost, roomChannel, myUsername }) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [gameState, setGameState] = useState<PlayerState[]>(() => 
    players.map(p => ({
      name: p,
      score: 40,
      isBot: profiles[p]?.isBot || false,
      targetAverage: botAverage(profiles[p]),
      color: profiles[p]?.color,
      splitLog: TARGETS.map(t => ({ target: t.label, gained: null as number | null, hits: 0 })),
      segmentHits: {},
      dartsThrown: 0,
      triplesHit: 0
    }))
  );
  
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentRoundDarts, setCurrentRoundDarts] = useState<Dart[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  /** Zählt hoch, wenn halbiert wurde — löst die SPLIT-Einblendung neu aus. */
  const [splitFlash, setSplitFlash] = useState(0);

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeP = gameState[activePlayer];
  const currentTarget = TARGETS[currentRoundIndex];
  const isMyTurn = isOnline ? (activeP.name === myUsername) : true;

  const stateRef = React.useRef({ gameState, activePlayer, currentRoundIndex, currentRoundDarts, isProcessing, currentMultiplier });

  // Before paint, so two taps inside one frame cannot both pass the
  // `isProcessing` guard in `handleDart`.
  useLayoutEffect(() => {
    stateRef.current = { gameState, activePlayer, currentRoundIndex, currentRoundDarts, isProcessing, currentMultiplier };
  }, [gameState, activePlayer, currentRoundIndex, currentRoundDarts, isProcessing, currentMultiplier]);

  // Aborting inside the 500 ms result delay must not still book the session.
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
  }, []);

  const processRoundEnd = React.useCallback((darts: Dart[]) => {
    let roundScore = 0;
    // Getroffene Darts, nicht Punkte: für die Trefferquote zählt jeder Dart im
    // Ziel einfach, ob Single, Double oder Triple.
    let hits = 0;
    const cTarget = TARGETS[stateRef.current.currentRoundIndex];

    for (const d of darts) {
      if (cTarget.type === 'number') {
        if (d.base === cTarget.val) {
          roundScore += d.value;
          hits += 1;
        }
      } else if (cTarget.type === 'modifier') {
        if (d.mult === cTarget.val && d.base !== 0) {
          roundScore += d.value;
          hits += 1;
        }
      }
    }
    const hitAny = hits > 0;
    
    if (hitAny) {
      if (roundScore === 180) play180Sound();
      else speak(roundScore.toString());
    } else {
      // Der Modus heißt Split Score, und „Split" ist auch das, was am Board
      // gerufen wird — vorher sagte der Caller „Halbiert".
      speak('Split');
      setSplitFlash(st => st + 1);
    }

    const st = stateRef.current;

    // Computed here rather than inside the updater. `[...prev]` shares the
    // player objects, so writing through it edited the previous state too:
    // StrictMode ran the updater twice and the halving branch quartered the
    // score instead of halving it.
    const nextState = st.gameState.map((p, i) => {
      if (i !== st.activePlayer) return p;

      // Neu aufgebaut statt mutiert: die Snapshots im Undo-Verlauf teilen sich
      // sonst dieselben Objekte.
      let segmentHits = p.segmentHits;
      let triplesHit = p.triplesHit;
      for (const d of darts) {
        segmentHits = withDartRecorded(segmentHits, d);
        if (d.mult === 3) triplesHit += 1;
      }

      const splitLog = [...p.splitLog];
      splitLog[st.currentRoundIndex] = {
        target: TARGETS[st.currentRoundIndex].label,
        gained: hitAny ? roundScore : null,
        hits
      };

      return {
        ...p,
        score: hitAny ? p.score + roundScore : Math.floor(p.score / 2),
        splitLog,
        segmentHits,
        triplesHit,
        dartsThrown: p.dartsThrown + darts.length
      };
    });
    setGameState(nextState);

    if (st.activePlayer === players.length - 1) {
      if (st.currentRoundIndex === TARGETS.length - 1) {
        setCurrentRoundDarts([]);
        // `onFinish` saves the match and books the profile stats. It used to be
        // called from inside a `setGameState` updater, so StrictMode ran it
        // twice and every session was written to history twice over.
        const finalResults = nextState.map(p => ({
          name: p.name,
          score: p.score,
          splitLog: p.splitLog,
          segmentHits: p.segmentHits,
          dartsThrown: p.dartsThrown,
          triplesHit: p.triplesHit
        }));
        finishTimeoutRef.current = setTimeout(() => onFinish(finalResults), 500);
        return;
      } else {
        setCurrentRoundIndex(prev => prev + 1);
      }
    }
    
    setActivePlayer((st.activePlayer + 1) % players.length);
    setCurrentRoundDarts([]);
    setIsProcessing(false);
  }, [players.length, onFinish]);

  const handleDart = React.useCallback((base: number, overrideMult?: number) => {
    if (stateRef.current.isProcessing) return;

    if (isOnline && !isHost) {
       roomChannel?.send({ type: 'broadcast', event: 'ss_throw', payload: { base, overrideMult } });
       return;
    }

    // Save snapshot before dart
    setHistory(prev => [...prev, {
      gameState: stateRef.current.gameState.map(p => ({ ...p })),
      activePlayer: stateRef.current.activePlayer,
      currentRoundIndex: stateRef.current.currentRoundIndex,
      currentRoundDarts: [...stateRef.current.currentRoundDarts]
    }]);

    let mult = overrideMult ?? stateRef.current.currentMultiplier;
    if (base === 25 && mult === 3) mult = 1;
    
    const value = base * mult;
    const dart: Dart = {
      base,
      mult,
      value,
      label: base === 0 ? 'MISS' : base === 25 ? (mult === 2 ? 'DB' : 'BULL') : `${mult === 3 ? 'T' : mult === 2 ? 'D' : ''}${base}`
    };

    const newDarts = [...stateRef.current.currentRoundDarts, dart];
    setCurrentRoundDarts(newDarts);
    setCurrentMultiplier(1);

    if (base === 20 && mult === 3) playSciFiHitSound('T20');
    else if (base === 19 && mult === 3) playSciFiHitSound('T19');
    else if (base === 25 && mult === 2) playSciFiHitSound('Bull');
    else playDartHitSound();

    if (newDarts.length === 3) {
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => {
        processRoundEnd(newDarts);
      }, 1000);
    }
  }, [isOnline, isHost, roomChannel, processRoundEnd]);

  useEffect(() => {
    if (isOnline && roomChannel) {
      if (isHost) {
         roomChannel.send({ type: 'broadcast', event: 'ss_state', payload: stateRef.current });
         const sub = roomChannel.on('broadcast', { event: 'ss_throw' }, (p: unknown) => {
            const data = (p && typeof p === 'object' && 'payload' in p ? (p as { payload: { base: number; overrideMult?: number } }).payload : p) as { base: number; overrideMult?: number };
            if (data && typeof data.base === 'number') {
              handleDart(data.base, data.overrideMult);
            }
         });
         return () => { sub.unsubscribe(); };
      } else {
         const sub = roomChannel.on('broadcast', { event: 'ss_state' }, (p: unknown) => {
            const data = (p && typeof p === 'object' && 'payload' in p ? (p as { payload: Record<string, unknown> }).payload : p) as Record<string, unknown>;
            if (data?.gameState) setGameState(data.gameState as PlayerState[]);
            if (data?.activePlayer !== undefined) setActivePlayer(data.activePlayer as number);
            if (data?.currentRoundIndex !== undefined) setCurrentRoundIndex(data.currentRoundIndex as number);
            if (data?.currentRoundDarts) setCurrentRoundDarts(data.currentRoundDarts as Dart[]);
            if (data?.isProcessing !== undefined) setIsProcessing(data.isProcessing as boolean);
            if (data?.currentMultiplier !== undefined) setCurrentMultiplier(data.currentMultiplier as number);
         });
         return () => { sub.unsubscribe(); };
      }
    }
  }, [isOnline, isHost, roomChannel, handleDart]);

  useEffect(() => {
    if (isOnline && isHost && roomChannel) {
       roomChannel.send({ type: 'broadcast', event: 'ss_state', payload: stateRef.current });
    }
  }, [gameState, activePlayer, currentRoundIndex, currentRoundDarts, isProcessing, currentMultiplier, isOnline, isHost, roomChannel]);

  useEffect(() => {
    if (activeP.isBot && !isProcessing && currentRoundIndex < TARGETS.length && (!isOnline || isHost)) {
      const timer = setTimeout(() => {
        let aimBase = 20;
        if (currentTarget.type === 'number') aimBase = currentTarget.val;

        let mult = 1;
        let base: number;
        const hitChance = Math.max(0.1, Math.min(0.8, activeP.targetAverage / 120));
        
        if (currentTarget.type === 'modifier') {
            if (Math.random() < hitChance) {
                mult = currentTarget.val;
                base = 20;
            } else {
                mult = 1;
                base = 20;
            }
        } else {
            if (Math.random() < hitChance) {
                base = aimBase;
                if (Math.random() < 0.2) mult = 2;
                if (Math.random() < 0.1 && base !== 25) mult = 3;
            } else {
                base = 1;
            }
        }

        handleDart(base, mult);
      }, 800);
      return () => clearTimeout(timer);
    }
    // `currentRoundDarts.length` is what makes the bot throw more than once:
    // nothing else here changes between darts of the same visit, so the effect
    // never re-ran and the bot stalled after its first dart.
  }, [activeP.isBot, activeP.targetAverage, currentRoundIndex, currentRoundDarts.length, currentTarget.type, currentTarget.val, isProcessing, isOnline, isHost, handleDart]);
  const undoSingleDart = () => {
    if (isOnline && !isHost) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsProcessing(false);

    setHistory(prevHistory => {
      if (prevHistory.length === 0) {
        if (stateRef.current.currentRoundDarts.length > 0) {
          setCurrentRoundDarts(prev => prev.slice(0, -1));
        }
        return prevHistory;
      }

      const lastSnapshot = prevHistory[prevHistory.length - 1];
      const newHistory = prevHistory.slice(0, -1);

      setGameState(lastSnapshot.gameState);
      setActivePlayer(lastSnapshot.activePlayer);
      setCurrentRoundIndex(lastSnapshot.currentRoundIndex);
      setCurrentRoundDarts(lastSnapshot.currentRoundDarts);

      return newHistory;
    });
  };

  // Compute live score for active player
  const getLiveScore = () => {
    let rs = 0;
    for (const d of currentRoundDarts) {
      if (currentTarget.type === 'number' && d.base === currentTarget.val) {
        rs += d.value;
      } else if (currentTarget.type === 'modifier' && d.mult === currentTarget.val && d.base !== 0) {
        rs += d.value;
      }
    }
    return activeP.score + rs;
  };

  const activeSplitScore = gameState[activePlayer]?.score ?? 0;
  const activeSplitLog = gameState[activePlayer]?.splitLog ?? [];

  return (
    <div className="screen active-screen game-screen-layout">
      <CallOut
        trigger={splitFlash}
        text="SPLIT"
        detail={`Halbiert auf ${activeSplitScore}`}
        tone="bad"
      />
      {isOnline && !isMyTurn && (
         <div className="bust-flash">
            Warte auf {activeP.name}...
         </div>
      )}
      <div style={{ opacity: (!isOnline || isMyTurn) ? 1 : 0.6, height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="match-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
            <span className="match-title">
              <Icons.IconSplit size={17} /> Split Score
            </span>
            <span className="match-meta">
              Ziel: {currentTarget?.label} ({currentRoundIndex + 1}/{TARGETS.length})
            </span>
          </div>

          <div className="match-header-actions">
            <button 
              onClick={() => {
                const next = !soundOn;
                setSoundEnabled(next);
                setSoundOn(next);
              }}
              className={`btn-sound-toggle ${soundOn ? 'btn-sound-on' : 'btn-sound-off'}`}
              title={soundOn ? 'Caller An (klicken zum Stummschalten)' : 'Caller Aus (klicken zum Einschalten)'}
              aria-label={soundOn ? 'Caller stummschalten' : 'Caller aktivieren'}
            >
              {soundOn ? <Icons.IconSoundOn size={18} /> : <Icons.IconSoundOff size={18} />}
            </button>

            <Button
              variant="dangerText"
              size="compact"
              onClick={() => setShowAbortConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <Icons.IconClose size={16} /> <span className="btn-abort-text">Beenden</span>
            </Button>
          </div>
        </div>

        <div className="game-screen-body">
          <div className="game-screen-left">
            {/* Wie im Power Scoring: der Werfende groß, die Mitspieler als
                Zeile. Vorher stand hier eine Karte je Spieler mit einer
                3em-Zahl — auf einem Telefon füllte das die halbe Spalte. */}
            <div className="ps-board">
              <div
                className="ps-card"
                style={{ '--player-color': activeP?.color || playerColorBySeat(activePlayer) } as React.CSSProperties}
              >
                <div className="ps-card-head">
                  <span className="ps-card-name">{activeP?.isBot && <Icons.IconBot size={15} className="icon-inline" />}{activeP?.name}</span>
                  <span className="ps-card-total">{getLiveScore()}</span>
                </div>

                <div className="split-now">
                  <span className="stat-label">Ziel</span>
                  <span className="split-now-target">{currentTarget?.label}</span>
                  <div className="split-darts">
                 {[0, 1, 2].map(idx => {
                   const dart = currentRoundDarts[idx];
                   return (
                     <div
                       key={idx}
                       className={`split-dart ${dart ? (dart.value > 0 ? 'is-hit' : 'is-miss') : ''}`}
                     >
                       {dart ? dart.label : ''}
                     </div>
                   );
                 })}
                  </div>
                </div>

                {/* Trefferquote und Co. laufen mit — dieselbe Rechnung wie
                    auf dem Story-Bild. */}
                <StatStrip
                  items={liveStats(
                    {
                      name: activeP?.name ?? '', sets: 0, legs: 0, avg: '0.0', first9: '0.0',
                      score: activeP?.score ?? 0,
                      splitLog: activeSplitLog,
                      dartsThrown: activeP?.dartsThrown ?? 0,
                      triplesHit: activeP?.triplesHit ?? 0
                    },
                    'splitScore'
                  )}
                />

                {/* Alle neun Ziele auf einen Blick: erledigte, das laufende
                    und die kommenden. Scrollt innerhalb der Karte. */}
                <ol className="split-targets">
                 {activeSplitLog.map((entry, idx) => (
                   <li
                     key={entry.target}
                     className={`split-target ${idx === currentRoundIndex ? 'is-current' : ''} ${
                       idx < currentRoundIndex ? (entry.gained === null ? 'is-split' : 'is-hit') : ''
                     }`}
                   >
                     <span className="split-target-label">{entry.target}</span>
                     <span className="split-target-value">
                       {idx >= currentRoundIndex ? '–' : entry.gained === null ? 'SPLIT' : `+${entry.gained}`}
                     </span>
                  </li>
                ))}
              </ol>
              </div>

              {gameState.length > 1 && (
                <ul className="ps-others">
                  {gameState.map((p, i) => i === activePlayer ? null : (
                    <li key={i} className="ps-other">
                      <span
                        className="ps-other-dot"
                        style={{ backgroundColor: p.color || playerColorBySeat(i) }}
                        aria-hidden="true"
                      />
                      <span className="ps-other-name">{p.isBot && <Icons.IconBot size={14} className="icon-inline" />}{p.name}</span>
                      <span className="ps-other-score">{p.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="game-screen-right" style={{ pointerEvents: (!isOnline || isMyTurn) ? 'auto' : 'none' }}>
            <div className="keypad" style={{ padding: '10px 0' }}>
              {currentTarget?.type === 'number' && currentTarget?.val !== 25 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => handleDart(0, 1)} className="num-btn is-miss" style={{ gridColumn: 'span 2' }}>Miss (0)</button>
                  <button className="num-btn" onClick={() => handleDart(currentTarget.val, 1)}>Single ({currentTarget.val})</button>
                  <button className="num-btn" onClick={() => handleDart(currentTarget.val, 2)}>Double ({currentTarget.val * 2})</button>
                  <button className="num-btn" onClick={() => handleDart(currentTarget.val, 3)}>Triple ({currentTarget.val * 3})</button>
                </div>
              )}

              {currentTarget?.type === 'number' && currentTarget?.val === 25 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <button className="num-btn is-miss" onClick={() => handleDart(0, 1)}>Miss</button>
                  <button className="num-btn" onClick={() => handleDart(25, 1)}>Single Bull (25)</button>
                  <button className="num-btn" onClick={() => handleDart(25, 2)}>Double Bull (50)</button>
                </div>
              )}

              {currentTarget?.type === 'modifier' && (
                <div className="numpad-grid">
                  {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                    <button 
                      key={num} 
                      className="num-btn" 
                      onClick={() => handleDart(num, currentTarget.val)}

                    >
                      {num}
                    </button>
                  ))}
                  {currentTarget.val === 2 && (
                    <button className="num-btn" onClick={() => handleDart(25, 2)}>BULL</button>
                  )}
                  <button className="num-btn" onClick={() => handleDart(0, 1)} style={{ color: 'var(--text-dim)', gridColumn: currentTarget.val === 2 ? 'span 4' : 'span 5' }}>MISS</button>
                </div>
              )}

              <div style={{ marginTop: '15px' }}>
                <Button variant="secondary" onClick={undoSingleDart} disabled={(history.length === 0 && currentRoundDarts.length === 0) || isProcessing}>
                  <Icons.IconUndo size={17} /> Wurf zurücknehmen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAbortConfirm && (
        <ConfirmModal
          title="Training beenden?"
          message="Möchtest du die aktuelle Training-Session wirklich abbrechen?"
          confirmLabel="Beenden"
          cancelLabel="Weiterspielen"
          destructive
          onConfirm={() => {
            setShowAbortConfirm(false);
            onAbort();
          }}
          onCancel={() => setShowAbortConfirm(false)}
        />
      )}
    </div>
  );
};
