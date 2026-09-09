import React, { useState, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Profile, Dart } from '../types';
import { Keypad } from './Keypad';
import { getCheckoutSuggestion } from '../utils/checkouts';
import { getBotDart } from '../utils/bot';
import { playDartHitSound, playSciFiHitSound, speak, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { ConfirmModal } from './ConfirmModal';
import { Button, CallOut } from './ui';
import { withDartRecorded } from '../utils/segmentStats';
import { playerColorBySeat } from '../utils/playerColors';

interface CheckoutTrainingProps {
  players: string[];
  profiles: Record<string, Profile>;
  checkoutRounds: number;
  checkoutTargets: number;
  onFinish: (results: {
    name: string;
    score: number;
    roundsCompleted: number;
    attempts: number;
    dartsUsed: number;
    checkoutLog: { target: number; darts: number | null }[];
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
  isBot: boolean;
  targetAverage: number;
  color?: string;
  targetScore: number;
  currentScore: number;
  scoreAtStartOfRound: number;
  roundsOnCurrentTarget: number;
  /**
   * Darts actually spent on the current target. `roundsOnCurrentTarget * 3`
   * was used instead, which over-reports every round that ended early on a
   * bust — those raise the round counter without costing three darts.
   */
  dartsOnCurrentTarget: number;
  dartsUsed: number;
  roundsCompleted: number;
  attempts: number;
  /** Ziel für Ziel: `darts: null` heißt, es wurde nicht gefinisht. */
  checkoutLog: { target: number; darts: number | null }[];
  segmentHits: Record<string, number>;
  dartsThrown: number;
  triplesHit: number;
  bestCheckout: number;
}

interface HistorySnapshot {
  gameState: PlayerState[];
  activePlayer: number;
  currentRoundDarts: Dart[];
  roundBust: boolean;
}

const generateRandomScore = () => Math.floor(Math.random() * (120 - 2 + 1)) + 2;

export const CheckoutTraining: React.FC<CheckoutTrainingProps> = ({ players, profiles, checkoutRounds, checkoutTargets, onFinish, onAbort, isOnline, isHost, roomChannel, myUsername }) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [gameState, setGameState] = useState<PlayerState[]>(() => 
    players.map(p => {
        const target = generateRandomScore();
        return {
            name: p,
            isBot: profiles[p]?.isBot || false,
            targetAverage: profiles[p]?.targetAverage || 40,
            color: profiles[p]?.color,
            targetScore: target,
            currentScore: target,
            scoreAtStartOfRound: target,
            roundsOnCurrentTarget: 0,
            dartsOnCurrentTarget: 0,
            dartsUsed: 0,
            roundsCompleted: 0,
            attempts: 0,
            checkoutLog: [],
            segmentHits: {},
            dartsThrown: 0,
            triplesHit: 0,
            bestCheckout: 0
        };
    })
  );
  
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentRoundDarts, setCurrentRoundDarts] = useState<Dart[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [roundBust, setRoundBust] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  /**
   * Der große Zuruf über dem Board. `n` zählt hoch, damit derselbe Ruf zweimal
   * hintereinander auch zweimal erscheint.
   */
  const [callOut, setCallOut] = useState<{ n: number; text: string; detail: string; tone: 'good' | 'bad' }>(
    { n: 0, text: '', detail: '', tone: 'good' }
  );

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeP = gameState[activePlayer] || gameState[0];
  const isMyTurn = isOnline ? (activeP.name === myUsername) : true;

  const stateRef = React.useRef({ gameState, activePlayer, currentRoundDarts, isProcessing, currentMultiplier, roundBust });

  useEffect(() => {
    stateRef.current = { gameState, activePlayer, currentRoundDarts, isProcessing, currentMultiplier, roundBust };
  }, [gameState, activePlayer, currentRoundDarts, isProcessing, currentMultiplier, roundBust]);

  const advanceToNextPlayerOrFinish = React.useCallback((latestGameState: PlayerState[]) => {
    const allFinished = latestGameState.every(p => p.attempts >= checkoutTargets);

    if (allFinished) {
      setCurrentRoundDarts([]);
      setIsProcessing(true);
      setTimeout(() => {
        onFinish(latestGameState.map(p => ({ 
          name: p.name, 
          score: p.bestCheckout, 
          roundsCompleted: p.roundsCompleted, 
          attempts: p.attempts, 
          dartsUsed: p.dartsUsed,
          checkoutLog: p.checkoutLog,
          segmentHits: p.segmentHits,
          dartsThrown: p.dartsThrown,
          triplesHit: p.triplesHit 
        })));
      }, 500);
      return;
    }

    const st = stateRef.current;
    let nextIdx = (st.activePlayer + 1) % players.length;
    for (let i = 0; i < players.length; i++) {
      if (latestGameState[nextIdx].attempts < checkoutTargets) {
        break;
      }
      nextIdx = (nextIdx + 1) % players.length;
    }

    setActivePlayer(nextIdx);
    setCurrentRoundDarts([]);
    setIsProcessing(false);
  }, [checkoutTargets, onFinish, players.length]);

  const processCheckout = React.useCallback((dartsInThisTurn: number) => {
    speak('Game Shot');

    const st = stateRef.current;
    const p = st.gameState[st.activePlayer];
    const totalDartsForThisTarget = p.dartsOnCurrentTarget + dartsInThisTurn;
    setCallOut(c => ({
      n: c.n + 1,
      text: 'CHECKOUT!',
      detail: `${p.targetScore} mit ${totalDartsForThisTarget} Darts`,
      tone: 'good'
    }));
    const newAttempts = p.attempts + 1;
    const newCompleted = p.roundsCompleted + 1;
    const newBestCheckout = Math.max(p.bestCheckout, p.targetScore);
    const newDartsUsed = p.dartsUsed + totalDartsForThisTarget;

    let nextTarget = p.targetScore;
    if (newAttempts < checkoutTargets) {
      nextTarget = generateRandomScore();
    }

    const updatedPlayer: PlayerState = {
      ...p,
      attempts: newAttempts,
      roundsCompleted: newCompleted,
      bestCheckout: newBestCheckout,
      dartsUsed: newDartsUsed,
      checkoutLog: [...p.checkoutLog, { target: p.targetScore, darts: totalDartsForThisTarget }],
      targetScore: nextTarget,
      currentScore: nextTarget,
      scoreAtStartOfRound: nextTarget,
      roundsOnCurrentTarget: 0,
      dartsOnCurrentTarget: 0
    };

    const nextGameState = [...st.gameState];
    nextGameState[st.activePlayer] = updatedPlayer;
    setGameState(nextGameState);

    advanceToNextPlayerOrFinish(nextGameState);
  }, [checkoutTargets, advanceToNextPlayerOrFinish]);

  const processBust = React.useCallback((dartsInThisTurn: number) => {
    speak("No Score");
    setRoundBust(false);

    const st = stateRef.current;
    const p = st.gameState[st.activePlayer];
    const nextRoundOnTarget = p.roundsOnCurrentTarget + 1;

    let updatedPlayer: PlayerState;

    if (nextRoundOnTarget >= checkoutRounds) {
      // All allowed rounds on this target used -> target failed
      setCallOut(c => ({ n: c.n + 1, text: 'VERPASST', detail: `${p.targetScore} nicht gefinisht`, tone: 'bad' }));
      const newAttempts = p.attempts + 1;
      const totalDartsForThisTarget = p.dartsOnCurrentTarget + dartsInThisTurn;
      let nextTarget = p.targetScore;
      if (newAttempts < checkoutTargets) {
        nextTarget = generateRandomScore();
      }

      updatedPlayer = {
        ...p,
        attempts: newAttempts,
        dartsUsed: p.dartsUsed + totalDartsForThisTarget,
        checkoutLog: [...p.checkoutLog, { target: p.targetScore, darts: null }],
        targetScore: nextTarget,
        currentScore: nextTarget,
        scoreAtStartOfRound: nextTarget,
        roundsOnCurrentTarget: 0,
        dartsOnCurrentTarget: 0
      };
    } else {
      // Has remaining round attempts for this target -> reset score back to scoreAtStartOfRound
      updatedPlayer = {
        ...p,
        currentScore: p.scoreAtStartOfRound,
        roundsOnCurrentTarget: nextRoundOnTarget,
        dartsOnCurrentTarget: p.dartsOnCurrentTarget + dartsInThisTurn
      };
    }

    const nextGameState = [...st.gameState];
    nextGameState[st.activePlayer] = updatedPlayer;
    setGameState(nextGameState);

    advanceToNextPlayerOrFinish(nextGameState);
  }, [checkoutRounds, checkoutTargets, advanceToNextPlayerOrFinish]);

  const processEndTurn = React.useCallback((darts: Dart[]) => {
    const roundScore = darts.reduce((s, d) => s + d.value, 0);
    if (roundScore > 0) speak(roundScore.toString());
    else speak("No Score");

    const st = stateRef.current;
    const p = st.gameState[st.activePlayer];
    const nextRoundOnTarget = p.roundsOnCurrentTarget + 1;
    const remainingScore = p.currentScore;

    let updatedPlayer: PlayerState;

    if (nextRoundOnTarget >= checkoutRounds) {
      // All allowed rounds on this target used -> target failed
      const newAttempts = p.attempts + 1;
      const totalDartsForThisTarget = p.dartsOnCurrentTarget + darts.length;
      let nextTarget = p.targetScore;
      if (newAttempts < checkoutTargets) {
        nextTarget = generateRandomScore();
      }

      updatedPlayer = {
        ...p,
        attempts: newAttempts,
        dartsUsed: p.dartsUsed + totalDartsForThisTarget,
        targetScore: nextTarget,
        currentScore: nextTarget,
        scoreAtStartOfRound: nextTarget,
        roundsOnCurrentTarget: 0,
        dartsOnCurrentTarget: 0
      };
    } else {
      // Keep remaining score for next attempt at this target
      updatedPlayer = {
        ...p,
        currentScore: remainingScore,
        scoreAtStartOfRound: remainingScore,
        roundsOnCurrentTarget: nextRoundOnTarget,
        dartsOnCurrentTarget: p.dartsOnCurrentTarget + darts.length
      };
    }

    const nextGameState = [...st.gameState];
    nextGameState[st.activePlayer] = updatedPlayer;
    setGameState(nextGameState);

    advanceToNextPlayerOrFinish(nextGameState);
  }, [checkoutRounds, checkoutTargets, advanceToNextPlayerOrFinish]);

  const handleDart = React.useCallback((base: number, overrideMult?: number) => {
    if (stateRef.current.isProcessing) return;

    if (isOnline && !isHost) {
       roomChannel?.send({ type: 'broadcast', event: 'ct_throw', payload: { base, overrideMult } });
       return;
    }

    // Save snapshot before dart
    setHistory(prev => [...prev, {
      gameState: stateRef.current.gameState.map(p => ({ ...p })),
      activePlayer: stateRef.current.activePlayer,
      currentRoundDarts: [...stateRef.current.currentRoundDarts],
      roundBust: stateRef.current.roundBust
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

    // Sofort verbucht, nicht erst am Rundenende: ein Ziel kann platzen oder
    // ungefinisht auslaufen, geworfen wurde trotzdem — und die Heatmap auf dem
    // Story-Bild soll jeden Dart zeigen.
    setGameState(prev => prev.map((pl, i) => i !== stateRef.current.activePlayer ? pl : {
      ...pl,
      segmentHits: withDartRecorded(pl.segmentHits, dart),
      dartsThrown: pl.dartsThrown + 1,
      triplesHit: pl.triplesHit + (dart.mult === 3 ? 1 : 0)
    }));
    setCurrentMultiplier(1);

    if (base === 20 && mult === 3) playSciFiHitSound('T20');
    else if (base === 19 && mult === 3) playSciFiHitSound('T19');
    else if (base === 25 && mult === 2) playSciFiHitSound('Bull');
    else playDartHitSound();

    const st = stateRef.current;
    const currentP = st.gameState[st.activePlayer];
    const newScore = currentP.currentScore - value;
    
    // Live update player currentScore so UI shows the dart result instantly
    setGameState(prev => {
      const next = [...prev];
      next[st.activePlayer] = {
        ...next[st.activePlayer],
        currentScore: Math.max(0, newScore)
      };
      return next;
    });

    if (newScore === 0 && mult === 2) {
      // Successful Checkout!
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => processCheckout(newDarts.length), 700);
    } else if (newScore <= 1) {
      // Bust!
      setRoundBust(true);
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => processBust(newDarts.length), 800);
    } else if (newDarts.length === 3) {
      // Completed 3 darts turn
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => processEndTurn(newDarts), 700);
    }
  }, [isOnline, isHost, roomChannel, processCheckout, processBust, processEndTurn]);

  useEffect(() => {
    if (isOnline && roomChannel) {
      if (isHost) {
         roomChannel.send({ type: 'broadcast', event: 'ct_state', payload: stateRef.current });
         const sub = roomChannel.on('broadcast', { event: 'ct_throw' }, (p: unknown) => {
            const data = (p && typeof p === 'object' && 'payload' in p ? (p as { payload: { base: number; overrideMult?: number } }).payload : p) as { base: number; overrideMult?: number };
            if (data && typeof data.base === 'number') {
              handleDart(data.base, data.overrideMult);
            }
         });
         return () => { sub.unsubscribe(); };
      } else {
         const sub = roomChannel.on('broadcast', { event: 'ct_state' }, (p: unknown) => {
            const data = (p && typeof p === 'object' && 'payload' in p ? (p as { payload: Record<string, unknown> }).payload : p) as Record<string, unknown>;
            if (data?.gameState) setGameState(data.gameState as PlayerState[]);
            if (data?.activePlayer !== undefined) setActivePlayer(data.activePlayer as number);
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
       roomChannel.send({ type: 'broadcast', event: 'ct_state', payload: stateRef.current });
    }
  }, [gameState, activePlayer, currentRoundDarts, isProcessing, currentMultiplier, isOnline, isHost, roomChannel]);

  useEffect(() => {
    if (activeP && activeP.isBot && !isProcessing && (!isOnline || isHost)) {
      const timer = setTimeout(() => {
        const botThrow = getBotDart(activeP.targetAverage, activeP.currentScore, 'DO'); 
        handleDart(botThrow.base, botThrow.mult);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeP, isProcessing, isOnline, isHost, handleDart]);

  const undoSingleDart = () => {
    if (isOnline && !isHost) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setRoundBust(false);
    setIsProcessing(false);

    setHistory(prevHistory => {
      if (prevHistory.length === 0) {
        if (stateRef.current.currentRoundDarts.length > 0) {
          const st = stateRef.current;
          const remainingDarts = st.currentRoundDarts.slice(0, -1);
          // Recalculate score from scoreAtStartOfRound minus remaining darts
          const remainingScore = remainingDarts.reduce((s, d) => s - d.value, st.gameState[st.activePlayer].scoreAtStartOfRound);
          setGameState(prev => {
            const next = [...prev];
            next[st.activePlayer] = {
              ...next[st.activePlayer],
              currentScore: Math.max(0, remainingScore)
            };
            return next;
          });
          setCurrentRoundDarts(remainingDarts);
        }
        return prevHistory;
      }

      const lastSnapshot = prevHistory[prevHistory.length - 1];
      const newHistory = prevHistory.slice(0, -1);

      setGameState(lastSnapshot.gameState);
      setActivePlayer(lastSnapshot.activePlayer);
      setCurrentRoundDarts(lastSnapshot.currentRoundDarts);
      setRoundBust(lastSnapshot.roundBust || false);

      return newHistory;
    });
  };

  return (
    <div className="screen active-screen game-screen-layout">
      <CallOut trigger={callOut.n} text={callOut.text} detail={callOut.detail} tone={callOut.tone} />
      {isOnline && !isMyTurn && (
         <div className="bust-flash">
            Warte auf {activeP.name}...
         </div>
      )}
      <div style={{ opacity: (!isOnline || isMyTurn) ? 1 : 0.6, height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="match-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
            <span className="match-title">
              🎯 Checkout Training
            </span>
            <span className="match-meta">
              Target {Math.min(activeP.attempts + 1, checkoutTargets)} / {checkoutTargets}
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
              {soundOn ? '🔊' : '🔇'}
            </button>

            <Button
              variant="dangerText"
              size="compact"
              onClick={() => setShowAbortConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              ✕ <span className="btn-abort-text">Beenden</span>
            </Button>
          </div>
        </div>

        <div className="game-screen-body">
          <div className="game-screen-left">
            {/* Wie in den anderen beiden Modi: der Werfende groß, die
                Mitspieler als Zeile. Vorher stand hier je Spieler eine Karte
                mit 3em-Zahl und `minWidth: 140px` — auf einem Telefon passte
                schon eine zweite nicht mehr daneben. */}
            <div className="ps-board">
              <div
                className="ps-card"
                style={{ '--player-color': activeP?.color || playerColorBySeat(activePlayer) } as React.CSSProperties}
              >
                <div className="ps-card-head">
                  <span className="ps-card-name">{activeP?.isBot ? '🤖 ' : ''}{activeP?.name}</span>
                  <span className="ps-card-total">{activeP?.currentScore}</span>
                </div>

                <div className="co-now">
                  <span className="co-chip">
                    <span className="stat-label">Ziel</span> {activeP?.targetScore}
                  </span>
                  <span className="co-chip">
                    <span className="stat-label">Runde</span>{' '}
                    {Math.min((activeP?.roundsOnCurrentTarget ?? 0) + 1, checkoutRounds)}/{checkoutRounds}
                  </span>
                  <span className="co-chip">
                    <span className="stat-label">Ø Darts</span>{' '}
                    {(activeP?.roundsCompleted ?? 0) > 0
                      ? ((activeP?.dartsUsed ?? 0) / (activeP?.roundsCompleted ?? 1)).toFixed(1)
                      : '–'}
                  </span>
                </div>

                {activeP && (() => {
                  // Double Out ist hier per Definition der Modus — ein Ziel
                  // zählt nur, wenn es auf ein Doppel gefinisht wird.
                  const suggestion = getCheckoutSuggestion(activeP.currentScore, 'DO', currentRoundDarts.length);
                  return suggestion ? <div className="checkout-pill co-suggestion">{suggestion}</div> : null;
                })()}

                {/* Alle Ziele der Sitzung: erledigte mit den benötigten Darts,
                    das laufende, die kommenden. */}
                <ol className="co-targets">
                  {Array.from({ length: checkoutTargets }).map((_, idx) => {
                    const done = activeP?.checkoutLog[idx];
                    const isCurrent = idx === (activeP?.attempts ?? 0);
                    return (
                      <li
                        key={idx}
                        className={`co-target ${isCurrent ? 'is-current' : ''} ${
                          done ? (done.darts === null ? 'is-missed' : 'is-hit') : ''
                        }`}
                      >
                        <span className="co-target-label">
                          {done ? done.target : isCurrent ? activeP?.targetScore : idx + 1}
                        </span>
                        <span className="co-target-value">
                          {done ? (done.darts === null ? '✗' : `${done.darts}D`) : isCurrent ? '…' : '–'}
                        </span>
                      </li>
                    );
                  })}
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
                      <span className="ps-other-name">{p.isBot ? '🤖 ' : ''}{p.name}</span>
                      <span className="ps-other-score">{p.roundsCompleted}/{p.attempts}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="game-screen-right" style={{ pointerEvents: (!isOnline || isMyTurn) ? 'auto' : 'none' }}>
            <Keypad 
              currentRoundDarts={currentRoundDarts}
              currentMultiplier={currentMultiplier}
              isProcessing={isProcessing}
              roundBust={roundBust}
              addDart={(base) => handleDart(base)}
              toggleMultiplier={(m) => setCurrentMultiplier(m)}
              undoSingleDart={undoSingleDart}
              canUndo={(history.length > 0 || currentRoundDarts.length > 0) && !isProcessing}
            />
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
    </div>
  );
};
