import React, { useState, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Profile, Dart } from '../types';
import { Keypad } from './Keypad';
import { getBotDart } from '../utils/bot';
import { playDartHitSound, playSciFiHitSound, speak, play180Sound, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { ConfirmModal } from './ConfirmModal';

interface PowerScoringProps {
  players: string[];
  profiles: Record<string, Profile>;
  rounds: number;
  onFinish: (results: { name: string; score: number }[]) => void;
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
}

interface HistorySnapshot {
  gameState: PlayerState[];
  activePlayer: number;
  currentRound: number;
  currentRoundDarts: Dart[];
}

export const PowerScoring: React.FC<PowerScoringProps> = ({ players, profiles, rounds, onFinish, onAbort, isOnline, isHost, roomChannel, myUsername }) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [gameState, setGameState] = useState<PlayerState[]>(() => 
    players.map(p => ({
      name: p,
      score: 0,
      isBot: profiles[p]?.isBot || false,
      targetAverage: profiles[p]?.targetAverage || 40,
      color: profiles[p]?.color
    }))
  );
  
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentRoundDarts, setCurrentRoundDarts] = useState<Dart[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeP = gameState[activePlayer];
  const isMyTurn = isOnline ? (activeP.name === myUsername) : true;

  const stateRef = React.useRef({ gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier });

  useEffect(() => {
    stateRef.current = { gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier };
  }, [gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier]);

  const processRoundEnd = React.useCallback((darts: Dart[]) => {
    const roundScore = darts.reduce((sum, d) => sum + d.value, 0);
    if (roundScore === 180) play180Sound();
    else speak(roundScore.toString());
    
    const st = stateRef.current;
    
    setGameState(prev => {
      const newState = [...prev];
      newState[st.activePlayer].score += roundScore;
      return newState;
    });

    if (st.activePlayer === players.length - 1) {
      if (st.currentRound === rounds) {
        setCurrentRoundDarts([]);
        setIsProcessing(true);
        const finalResults = st.gameState.map((p, i) => ({
           name: p.name,
           score: p.score + (i === st.activePlayer ? roundScore : 0)
        }));
        setTimeout(() => onFinish(finalResults), 500);
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
         });
         return () => { sub.unsubscribe(); };
      }
    }
  }, [isOnline, isHost, roomChannel, handleDart]);

  useEffect(() => {
    if (isOnline && isHost && roomChannel) {
       roomChannel.send({ type: 'broadcast', event: 'ps_state', payload: stateRef.current });
    }
  }, [gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier, isOnline, isHost, roomChannel]);

  useEffect(() => {
    if (activeP.isBot && !isProcessing && currentRound <= rounds && (!isOnline || isHost)) {
      const timer = setTimeout(() => {
        const botThrow = getBotDart(activeP.targetAverage, 501, 'DO'); 
        handleDart(botThrow.base, botThrow.mult);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeP.isBot, activeP.targetAverage, currentRound, isProcessing, isOnline, isHost, rounds, handleDart]);
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
      setCurrentRound(lastSnapshot.currentRound);
      setCurrentRoundDarts(lastSnapshot.currentRoundDarts);

      return newHistory;
    });
  };

  return (
    <div className="screen active-screen game-screen-layout">
      {isOnline && !isMyTurn && (
         <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,0,0,0.8)', padding: '5px 15px', borderRadius: '15px', color: 'white', zIndex: 10 }}>
            Warte auf {activeP.name}...
         </div>
      )}
      
      <div style={{ opacity: (!isOnline || isMyTurn) ? 1 : 0.6, height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="match-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: '1.05em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
              🔥 Power Scoring
            </span>
            <span style={{ fontSize: '0.78em', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              Runde {currentRound} / {rounds}
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

            <button 
              className="btn-ghost" 
              onClick={() => setShowAbortConfirm(true)}
              style={{ 
                fontSize: '0.85em', 
                color: 'var(--red)', 
                padding: '6px 12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 69, 58, 0.25)',
                background: 'rgba(255, 69, 58, 0.08)',
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ <span className="btn-abort-text">Beenden</span>
            </button>
          </div>
        </div>

        <div className="game-screen-body">
          <div className="game-screen-left">
            <div className="scoreboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', padding: '10px 0' }}>
              {gameState.map((p, i) => (
                <div 
                  key={i} 
                  className={`player ${i === activePlayer ? 'active' : ''}`}
                  style={{ flex: 1, minWidth: '140px', borderLeftColor: i === activePlayer ? p.color : undefined }}
                >
                  <h3 className="player-name">{p.isBot ? '🤖 ' : ''}{p.name}</h3>
                  <div className="score" style={{ fontSize: '3em', margin: '10px 0' }}>
                    {p.score + (i === activePlayer ? currentRoundDarts.reduce((s, d) => s + d.value, 0) : 0)}
                  </div>
                  {i === activePlayer && (
                     <div style={{ color: '#0a84ff', fontWeight: 'bold' }}>
                       Diese Runde: {currentRoundDarts.reduce((s, d) => s + d.value, 0)}
                     </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="game-screen-right" style={{ pointerEvents: (!isOnline || isMyTurn) ? 'auto' : 'none' }}>
            <Keypad 
              currentRoundDarts={currentRoundDarts}
              currentMultiplier={currentMultiplier}
              isProcessing={isProcessing}
              roundBust={false}
              addDart={(base) => handleDart(base)}
              toggleMultiplier={(m) => setCurrentMultiplier(m)}
              undoSingleDart={undoSingleDart}
              abortGame={() => setShowAbortConfirm(true)}
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
