import React, { useState, useEffect, useLayoutEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Profile, Dart } from '../types';
import { Keypad } from './Keypad';
import { getBotDart } from '../utils/bot';
import { playDartHitSound, playSciFiHitSound, speak, play180Sound } from '../utils/audio';
import type { Celebration } from '../types';
import { HIGH_SCORE_MIN, isCelebration } from '../utils/celebration';
import { CelebrationStage } from './celebration/CelebrationStage';
import { CelebrationBoard } from './celebration/CelebrationBoard';
import { Button, StatStrip, Icons, Dialog } from './ui';
import { MatchShell } from './match/MatchShell';
import { withDartRecorded } from '../utils/segmentStats';
import { liveStats } from '../utils/storyExport';
import { playerColorBySeat } from '../utils/playerColors';
import { botAverage } from '../utils/botProfiles';

interface PowerScoringProps {
  players: string[];
  profiles: Record<string, Profile>;
  rounds: number;
  onFinish: (results: {
    name: string;
    score: number;
    roundScores: (number | null)[];
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
   * Punkte je Runde, `null` solange nicht geworfen. Die Länge steht von Anfang
   * an fest, damit das Raster unten alle Runden zeigen kann — auch die, die
   * noch kommen.
   */
  roundScores: (number | null)[];
  /** Für die Heatmap auf dem Story-Bild. */
  segmentHits: Record<string, number>;
  dartsThrown: number;
  triplesHit: number;
}

interface HistorySnapshot {
  gameState: PlayerState[];
  activePlayer: number;
  currentRound: number;
  currentRoundDarts: Dart[];
}

interface PlayerCardProps {
  player: PlayerState;
  seat: number;
  currentRound: number;
  /** Punkte der laufenden Runde, noch nicht gebucht. */
  liveRoundScore: number;
  /** Runde, deren Feld nach einem High Score aufleuchtet. */
  celebratedRound?: number | null;
}

/**
 * Der Spieler, der gerade wirft: Name, Gesamtpunktzahl und darunter jede Runde
 * als eigener Kasten.
 *
 * Alle Runden sind von Beginn an zu sehen — die noch offenen als „–". Dadurch
 * weiß man jederzeit, wie viel Spiel noch übrig ist, statt es aus „Runde 3 / 10"
 * ableiten zu müssen. Fünf Kästen je Reihe.
 */
const PowerScoringPlayerCard: React.FC<PlayerCardProps> = ({
  player,
  seat,
  currentRound,
  liveRoundScore,
  celebratedRound
}) => {
  const accent = player.color || playerColorBySeat(seat);

  return (
    <div className="ps-card" style={{ '--player-color': accent } as React.CSSProperties}>
      <div className="ps-card-head">
        <span className="ps-card-name">{player.isBot && <Icons.IconBot size={15} className="icon-inline" />}{player.name}</span>
        <span className="ps-card-total">{player.score + liveRoundScore}</span>
      </div>

      {/* Dieselbe Rechnung wie auf dem Story-Bild — Average durchgehend
          sichtbar, nicht erst am Ende. */}
      <StatStrip
        items={liveStats(
          {
            name: player.name, sets: 0, legs: 0, avg: '0.0', first9: '0.0',
            score: player.score,
            roundScores: player.roundScores,
            dartsThrown: player.dartsThrown,
            triplesHit: player.triplesHit
          },
          'powerScoring'
        )}
      />

      <ol className="ps-rounds">
        {player.roundScores.map((value, idx) => {
          const isCurrent = idx === currentRound - 1;
          const shown = value ?? (isCurrent && liveRoundScore > 0 ? liveRoundScore : null);
          return (
            <li
              key={idx}
              data-round={idx}
              className={`ps-round ${isCurrent ? 'is-current' : ''} ${shown !== null ? 'is-filled' : ''} ${celebratedRound === idx ? 'cel-tile-pop is-late' : ''}`}
            >
              <span className="ps-round-no">{idx + 1}</span>
              <span className="ps-round-value">{shown ?? '–'}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const PowerScoring: React.FC<PowerScoringProps> = ({ players, profiles, rounds, onFinish, onAbort, isOnline, isHost, roomChannel, myUsername }) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [gameState, setGameState] = useState<PlayerState[]>(() => 
    players.map(p => ({
      name: p,
      score: 0,
      isBot: profiles[p]?.isBot || false,
      targetAverage: botAverage(profiles[p]),
      color: profiles[p]?.color,
      roundScores: Array<number | null>(rounds).fill(null),
      segmentHits: {},
      dartsThrown: 0,
      triplesHit: 0
    }))
  );
  
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentRoundDarts, setCurrentRoundDarts] = useState<Dart[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  /** Ab 170 dieselbe große Animation wie im Match; die id zählt hoch, damit sie erneut abläuft. */
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const celebrationIdRef = React.useRef(0);

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeP = gameState[activePlayer];
  const liveRoundScore = currentRoundDarts.reduce((sum, d) => sum + d.value, 0);
  const isMyTurn = isOnline ? (activeP.name === myUsername) : true;

  const stateRef = React.useRef({ gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier, celebration });

  // Before paint, so the `isProcessing` guard in `handleDart` cannot be passed
  // twice by two taps inside one frame.
  useLayoutEffect(() => {
    stateRef.current = { gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier, celebration };
  }, [gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier, celebration]);

  // Aborting inside the 500 ms result delay must not still book the session.
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
  }, []);

  const processRoundEnd = React.useCallback((darts: Dart[]) => {
    const roundScore = darts.reduce((sum, d) => sum + d.value, 0);
    if (roundScore === 180) play180Sound();
    else speak(roundScore.toString());
    
    const st = stateRef.current;

    // Built outside the updater and without touching `prev`: `[...prev]` shares
    // the player objects, so `score +=` inside the updater also edited the
    // previous state, and StrictMode's second invocation booked the round
    // twice. The final results are read from this same value, which is why the
    // last round used to be counted once more on top.
    const nextState = st.gameState.map((p, i) => {
      if (i !== st.activePlayer) return p;

      // Trefferdatensatz und Rundenliste werden neu aufgebaut, nicht mutiert:
      // die Snapshots im Undo-Verlauf teilen sich sonst dieselben Objekte.
      let segmentHits = p.segmentHits;
      let triplesHit = p.triplesHit;
      for (const dart of darts) {
        segmentHits = withDartRecorded(segmentHits, dart);
        if (dart.mult === 3) triplesHit += 1;
      }

      const roundScores = [...p.roundScores];
      roundScores[st.currentRound - 1] = roundScore;

      return {
        ...p,
        score: p.score + roundScore,
        roundScores,
        segmentHits,
        triplesHit,
        dartsThrown: p.dartsThrown + darts.length
      };
    });
    setGameState(nextState);

    if (st.activePlayer === players.length - 1) {
      if (st.currentRound === rounds) {
        setCurrentRoundDarts([]);
        setIsProcessing(true);
        const finalResults = nextState.map(p => ({
          name: p.name,
          score: p.score,
          roundScores: p.roundScores,
          segmentHits: p.segmentHits,
          dartsThrown: p.dartsThrown,
          triplesHit: p.triplesHit
        }));
        finishTimeoutRef.current = setTimeout(() => onFinish(finalResults), 500);
        return;
      } else {
        setCurrentRound(prev => prev + 1);
      }
    }
    
    setActivePlayer((st.activePlayer + 1) % players.length);
    setCurrentRoundDarts([]);
    setIsProcessing(false);
  }, [players.length, rounds, onFinish]);

  const handleDart = React.useCallback((base: number, overrideMult?: number) => {
    if (stateRef.current.isProcessing) return;

    if (isOnline && !isHost) {
       roomChannel?.send({ type: 'broadcast', event: 'ps_throw', payload: { base, overrideMult } });
       return;
    }

    // Der erste Dart einer neuen Aufnahme räumt die letzte Feier ab.
    if (stateRef.current.currentRoundDarts.length === 0) setCelebration(null);

    // Save snapshot before dart
    setHistory(prev => [...prev, {
      gameState: stateRef.current.gameState.map(p => ({ ...p })),
      activePlayer: stateRef.current.activePlayer,
      currentRound: stateRef.current.currentRound,
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
      const visitTotal = newDarts.reduce((sum, d) => sum + d.value, 0);
      if (visitTotal >= HIGH_SCORE_MIN) {
        setCelebration({
          id: ++celebrationIdRef.current,
          type: 'highScore',
          playerIndex: stateRef.current.activePlayer,
          total: visitTotal,
          darts: newDarts,
          matchWin: false,
          targetIndex: stateRef.current.currentRound - 1
        });
      }
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => {
        processRoundEnd(newDarts);
      }, 1000);
    }
  }, [isOnline, isHost, roomChannel, processRoundEnd]);

  useEffect(() => {
    if (isOnline && roomChannel) {
      if (isHost) {
         roomChannel.send({ type: 'broadcast', event: 'ps_state', payload: stateRef.current });
         const sub = roomChannel.on('broadcast', { event: 'ps_throw' }, (p: unknown) => {
            const data = (p && typeof p === 'object' && 'payload' in p ? (p as { payload: { base: number; overrideMult?: number } }).payload : p) as { base: number; overrideMult?: number };
            if (data && typeof data.base === 'number') {
              handleDart(data.base, data.overrideMult);
            }
         });
         return () => { sub.unsubscribe(); };
      } else {
         const sub = roomChannel.on('broadcast', { event: 'ps_state' }, (p: unknown) => {
            const data = (p && typeof p === 'object' && 'payload' in p ? (p as { payload: Record<string, unknown> }).payload : p) as Record<string, unknown>;
            if (data?.gameState) setGameState(data.gameState as PlayerState[]);
            if (data?.activePlayer !== undefined) setActivePlayer(data.activePlayer as number);
            if (data?.currentRound !== undefined) setCurrentRound(data.currentRound as number);
            if (data?.currentRoundDarts) setCurrentRoundDarts(data.currentRoundDarts as Dart[]);
            if (data?.isProcessing !== undefined) setIsProcessing(data.isProcessing as boolean);
            if (data?.currentMultiplier !== undefined) setCurrentMultiplier(data.currentMultiplier as number);
            if (data?.celebration !== undefined) setCelebration(isCelebration(data.celebration) ? data.celebration : null);
         });
         return () => { sub.unsubscribe(); };
      }
    }
  }, [isOnline, isHost, roomChannel, handleDart]);

  useEffect(() => {
    if (isOnline && isHost && roomChannel) {
       roomChannel.send({ type: 'broadcast', event: 'ps_state', payload: stateRef.current });
    }
  }, [gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier, celebration, isOnline, isHost, roomChannel]);

  // `currentRoundDarts.length` is what makes the bot throw more than once:
  // nothing else in this list changes between darts of the same visit, so the
  // effect never re-ran and the bot stopped after its first dart with no way
  // for the player to continue.
  useEffect(() => {
    if (activeP.isBot && !isProcessing && currentRound <= rounds && (!isOnline || isHost)) {
      const timer = setTimeout(() => {
        const botThrow = getBotDart(activeP.targetAverage, 501, 'DO');
        handleDart(botThrow.base, botThrow.mult);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeP.isBot, activeP.targetAverage, currentRound, currentRoundDarts.length, isProcessing, isOnline, isHost, rounds, handleDart]);
  const undoSingleDart = () => {
    if (isOnline && !isHost) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsProcessing(false);
    setCelebration(null);

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
      setCurrentRound(lastSnapshot.currentRound);
      setCurrentRoundDarts(lastSnapshot.currentRoundDarts);

      return newHistory;
    });
  };

  return (
    <MatchShell
      title="Power Scoring"
      meta={`Runde ${currentRound} / ${rounds}`}
      onMenu={() => setShowAbortConfirm(true)}
      rightDisabled={Boolean(isOnline) && !isMyTurn}
      left={
        <>

            {celebration && gameState[celebration.playerIndex] && (
              <CelebrationStage
                key={celebration.id}
                celebration={celebration}
                playerName={gameState[celebration.playerIndex].name}
                playerColor={gameState[celebration.playerIndex].color || playerColorBySeat(celebration.playerIndex)}
                flyTarget={`.ps-round[data-round="${celebration.targetIndex ?? 0}"]`}
              />
            )}
            <div className="ps-board">
              <PowerScoringPlayerCard
                player={activeP}
                seat={activePlayer}
                currentRound={currentRound}
                liveRoundScore={liveRoundScore}
                celebratedRound={celebration?.playerIndex === activePlayer ? celebration.targetIndex : null}
              />

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
        </>
      }
      right={
        <>

            <Keypad 
              currentRoundDarts={currentRoundDarts}
              currentMultiplier={currentMultiplier}
              isProcessing={isProcessing}
              roundBust={false}
              addDart={(base) => handleDart(base)}
              toggleMultiplier={(m) => setCurrentMultiplier(m)}
              undoSingleDart={undoSingleDart}
              canUndo={(history.length > 0 || currentRoundDarts.length > 0) && !isProcessing}
              overlay={celebration ? <CelebrationBoard key={celebration.id} celebration={celebration} /> : null}
            />
        </>
      }
    >
      {isOnline && !isMyTurn && (
        <div className="turn-banner" role="status">
          <span className="turn-banner-dot" aria-hidden="true" />
          {activeP.name} ist am Board
        </div>
      )}

      {showAbortConfirm && (
        <Dialog title="Training beenden?" onClose={() => setShowAbortConfirm(false)}>
          <div className="dialog-actions">
            <Button variant="dangerText" size="large" onClick={() => { setShowAbortConfirm(false); onAbort(); }}>
              Training abbrechen
            </Button>
            <Button variant="ghost" onClick={() => setShowAbortConfirm(false)}>
              Weiterspielen
            </Button>
          </div>
        </Dialog>
      )}
    </MatchShell>
  );
};
