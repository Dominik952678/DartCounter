import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameScreen } from './GameScreen';
import { PowerScoring } from './PowerScoring';
import { SplitScore } from './SplitScore';
import { CheckoutTraining } from './CheckoutTraining';
import { useOnlineStore } from '../store/useOnlineStore';
import { useAuthStore } from '../store/useAuthStore';
import { useProfiles } from '../hooks/useProfiles';
import { useGameEngine } from '../hooks/useGameEngine';
import type { GameState, MatchHistory, Profile, StatsModalData } from '../types';
import { StatsModal } from './Modals';
import { DisconnectOverlay } from './DisconnectOverlay';
import { saveProfiles, saveMatch } from '../db/database';

export const OnlineGameWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { roomChannel, isHost, players, roomSettings, leaveRoom } = useOnlineStore();
  const { user } = useAuthStore();
  const { profiles, setProfiles } = useProfiles(user);
  const [syncedState, setSyncedState] = useState<GameState | null>(null);
  const [statsData, setStatsData] = useState<StatsModalData>({
    isOpen: false,
    winnerIndex: null,
    players: [],
    matchData: null
  });
  const [clientMultiplier, setClientMultiplier] = useState(1);
  const [clientCheckoutPrompt, setClientCheckoutPrompt] = useState<{ maxDarts: number; autoDarts: number; isWin: boolean } | null>(null);
  const [clientCelebration, setClientCelebration] = useState<{ type: string; playerIndex: number } | null>(null);
  const [clientRoundBust, setClientRoundBust] = useState(false);
  
  const myUsername = (user ? (user.user_metadata?.username || user.email) : localStorage.getItem('dart_guest_online_name')) || 'Gast';

  const hostEngine = useGameEngine({
     profiles,
     setProfiles,
     setSavedMatches: () => {},
     setScreen: (screen) => { if (screen === 'start') { leaveRoom(); navigate('/online'); } },
     setStatsModalData: setStatsData,
     isOnline: true,
     user
  });

  const handleMinigameFinish = async (
    results: { name: string; score: number; attempts?: number; dartsUsed?: number; roundsCompleted?: number }[],
    gameType: string
  ) => {
    let newProfiles: Record<string, Profile>;
    setProfiles(prev => {
      newProfiles = { ...prev };
      
      if (gameType === 'powerScoring') {
          for (const r of results) {
             if (newProfiles[r.name]) {
                const p = newProfiles[r.name];
                if (!p.powerScoring) p.powerScoring = { bestScore: 0, matchesPlayed: 0, wins: 0, totalScore: 0 };
                p.powerScoring.bestScore = Math.max(p.powerScoring.bestScore, r.score);
                p.powerScoring.matchesPlayed += 1;
                p.powerScoring.totalScore = (p.powerScoring.totalScore || 0) + r.score;
             }
          }
          const maxScore = Math.max(...results.map(r => r.score));
          for (const r of results) {
             if (r.score === maxScore && newProfiles[r.name]) {
                newProfiles[r.name].powerScoring!.wins += 1;
             }
          }
      } else if (gameType === 'splitScore') {
          for (const r of results) {
             if (newProfiles[r.name]) {
                const p = newProfiles[r.name];
                if (!p.splitScore) p.splitScore = { bestScore: 0, matchesPlayed: 0, wins: 0, totalScore: 0 };
                p.splitScore.bestScore = Math.max(p.splitScore.bestScore, r.score);
                p.splitScore.matchesPlayed += 1;
                p.splitScore.totalScore = (p.splitScore.totalScore || 0) + r.score;
             }
          }
          const maxScore = Math.max(...results.map(r => r.score));
          for (const r of results) {
             if (r.score === maxScore && newProfiles[r.name]) {
                newProfiles[r.name].splitScore!.wins += 1;
             }
          }
      } else if (gameType === 'checkoutTraining') {
          for (const r of results) {
             if (newProfiles[r.name]) {
                const p = newProfiles[r.name];
                if (!p.checkoutTraining) p.checkoutTraining = { bestCheckout: 0, roundsCompleted: 0, matchesPlayed: 0, wins: 0, totalAttempts: 0, totalDartsUsed: 0 };
                p.checkoutTraining.bestCheckout = Math.max(p.checkoutTraining.bestCheckout, r.score);
                p.checkoutTraining.roundsCompleted += r.roundsCompleted || 0;
                p.checkoutTraining.matchesPlayed += 1;
                p.checkoutTraining.totalAttempts = (p.checkoutTraining.totalAttempts || 0) + (r.attempts || 0);
                p.checkoutTraining.totalDartsUsed = (p.checkoutTraining.totalDartsUsed || 0) + (r.dartsUsed || 0);
             }
          }
      }

      return newProfiles;
    });

    if (user?.id) {
      await saveProfiles(newProfiles!, user.id);
    }
    
    const matchData: MatchHistory = {
        date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
        winner: results.reduce((prev, current) => (prev.score > current.score) ? prev : current).name,
        gameType: gameType as MatchHistory['gameType'],
        isOnline: true,
        players: results.map(r => ({
            name: r.name, sets: 0, legs: 0, avg: "0.0", first9: "0.0", score: r.score, attempts: r.attempts, dartsUsed: r.dartsUsed
        }))
    };
    if (user?.id) {
      await saveMatch(matchData, user.id);
    }

    leaveRoom(); 
    navigate('/online'); 
  };

  useEffect(() => {
     if (!roomChannel) {
        navigate('/online');
        return;
     }

     if (isHost) {
        if (hostEngine.gameState.players.length === 0 && !syncedState) {
            const config = roomSettings || { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 };
            const playerNames = players.length > 0 ? players.map(p => p.username) : [myUsername];
            hostEngine.startGame(playerNames, config);
        }

        const sub = roomChannel
          .on('broadcast', { event: 'client_throw' }, (payload: unknown) => {
             const data = (payload && typeof payload === 'object' && 'payload' in payload ? (payload as { payload: { base: number; mult: number } }).payload : payload) as { base: number; mult: number };
             if (data && typeof data.base === 'number') {
               hostEngine.addDart(data.base, data.mult);
             }
          })
          .on('broadcast', { event: 'client_undo' }, () => {
             hostEngine.undoSingleDart();
          })
          .on('broadcast', { event: 'client_submit_checkout' }, (payload: unknown) => {
             const data = (payload && typeof payload === 'object' && 'payload' in payload ? (payload as { payload: { darts: number } }).payload : payload) as { darts: number };
             if (data && typeof data.darts === 'number') {
               hostEngine.submitCheckoutPrompt(data.darts);
             }
          })
          .on('broadcast', { event: 'client_request_state' }, () => {
             if (hostEngine.gameState.players.length > 0) {
                 roomChannel.send({
                     type: 'broadcast',
                     event: 'state_update',
                     payload: { 
                       state: hostEngine.gameState,
                       celebration: hostEngine.celebration,
                       roundBust: hostEngine.roundBust,
                       checkoutPrompt: hostEngine.checkoutPrompt
                     }
                 });
             }
          });
        
        return () => { sub.unsubscribe(); };
     } else {
        const sub = roomChannel
          .on('broadcast', { event: 'state_update' }, (payload: unknown) => {
             const data = (payload && typeof payload === 'object' && 'payload' in payload ? (payload as { payload: Record<string, unknown> }).payload : payload) as Record<string, unknown>;
             if (data?.state) setSyncedState(data.state as GameState);
             if (data?.celebration !== undefined) setClientCelebration(data.celebration as { type: string; playerIndex: number } | null);
             if (data?.roundBust !== undefined) setClientRoundBust(data.roundBust as boolean);
             if (data?.checkoutPrompt !== undefined) setClientCheckoutPrompt(data.checkoutPrompt as { maxDarts: number; autoDarts: number; isWin: boolean } | null);
          })
          .on('broadcast', { event: 'game_ended' }, (payload: unknown) => {
             const data = (payload && typeof payload === 'object' && 'payload' in payload ? (payload as { payload: { statsData: StatsModalData } }).payload : payload) as { statsData: StatsModalData };
             if (data?.statsData) setStatsData(data.statsData);
          });
        
        // Immediately request current state from host
        roomChannel.send({
          type: 'broadcast',
          event: 'client_request_state',
          payload: {}
        });

        // Request state periodically until syncedState is received
        const interval = setInterval(() => {
          roomChannel.send({
            type: 'broadcast',
            event: 'client_request_state',
            payload: {}
          });
        }, 1200);

        return () => { 
          clearInterval(interval);
          sub.unsubscribe(); 
        };
     }
  }, [roomChannel, isHost, players, roomSettings, myUsername, navigate, syncedState, hostEngine]);

  // Host broadcasts state, celebrations, busts, and checkout prompts
  useEffect(() => {
     if (isHost && roomChannel && hostEngine.gameState.players.length > 0) {
         roomChannel.send({
             type: 'broadcast',
             event: 'state_update',
             payload: { 
               state: hostEngine.gameState,
               celebration: hostEngine.celebration,
               roundBust: hostEngine.roundBust,
               checkoutPrompt: hostEngine.checkoutPrompt
             }
         });
     }
  }, [isHost, roomChannel, hostEngine.gameState, hostEngine.celebration, hostEngine.roundBust, hostEngine.checkoutPrompt]);

  useEffect(() => {
     if (isHost && roomChannel && statsData.isOpen) {
         roomChannel.send({
             type: 'broadcast',
             event: 'game_ended',
             payload: { statsData }
         });
     }
  }, [isHost, roomChannel, statsData]);

  if (roomSettings && roomSettings.mode && roomSettings.mode !== 'standard') {
    const props = {
      players: players.map(p => p.username),
      profiles,
      onAbort: () => { leaveRoom(); navigate('/online'); },
      onFinish: (r: unknown) => handleMinigameFinish(r as { name: string; score: number; attempts?: number; dartsUsed?: number; roundsCompleted?: number }[], roomSettings.mode || 'standard'),
      isOnline: true,
      isHost,
      roomChannel,
      myUsername
    };
    
    if (roomSettings.mode === 'powerscoring') return <PowerScoring {...props} rounds={roomSettings.rounds || 10} onFinish={(r) => handleMinigameFinish(r, 'powerScoring')} />;
    if (roomSettings.mode === 'splitscore') return <SplitScore {...props} onFinish={(r) => handleMinigameFinish(r, 'splitScore')} />;
    if (roomSettings.mode === 'checkout') return <CheckoutTraining {...props} checkoutTargets={roomSettings.checkoutTargets || 10} checkoutRounds={roomSettings.checkoutRounds || 1} onFinish={(r) => handleMinigameFinish(r, 'checkoutTraining')} />;
  }

  const effectiveGameState = isHost ? hostEngine.gameState : syncedState;

  if (!effectiveGameState || effectiveGameState.players.length === 0) {
    return (
      <div className="screen active-screen app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px', textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>🎯</div>
        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{isHost ? 'Initialisiere Online-Match...' : 'Warte auf Spielstart vom Host...'}</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', maxWidth: '320px', lineHeight: 1.4 }}>
          {isHost 
            ? 'Das Match wird vorbereitet und an alle Spieler übertragen.' 
            : 'Verbindung zum Host wird synchronisiert. Einen Moment bitte...'}
        </p>
        <button
          className="btn-secondary"
          onClick={() => { leaveRoom(); navigate('/online'); }}
          style={{ marginTop: '16px', padding: '10px 20px' }}
        >
          Raum verlassen
        </button>
      </div>
    );
  }

  const activePlayer = effectiveGameState.players[effectiveGameState.activePlayer];
  const isMyTurn = activePlayer?.name === myUsername;
  const isHostDisconnected = !isHost && players.every(p => !p.isHost);

  const handleAddDart = (baseValue: number, overrideMult?: number) => {
      if (!isMyTurn) return;
      if (isHost) {
          hostEngine.addDart(baseValue, overrideMult);
      } else {
          roomChannel?.send({ type: 'broadcast', event: 'client_throw', payload: { base: baseValue, mult: overrideMult ?? clientMultiplier } });
          setClientMultiplier(1);
      }
  };

  const handleUndo = () => {
      if (!isMyTurn) return;
      if (isHost) {
          hostEngine.undoSingleDart();
      } else {
          roomChannel?.send({ type: 'broadcast', event: 'client_undo', payload: {} });
      }
  };

  const handleSubmitCheckout = (darts: number) => {
      if (isHost) {
          hostEngine.submitCheckoutPrompt(darts);
      } else {
          roomChannel?.send({ type: 'broadcast', event: 'client_submit_checkout', payload: { darts } });
          setClientCheckoutPrompt(null);
      }
  };

  const activeCheckoutPrompt = isHost
    ? (hostEngine.checkoutPrompt ? { maxDarts: hostEngine.checkoutPrompt.maxDarts, autoDarts: hostEngine.checkoutPrompt.autoDarts, isWin: hostEngine.checkoutPrompt.isWin } : null)
    : clientCheckoutPrompt;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DisconnectOverlay isHostDisconnected={isHostDisconnected} onTimeout={() => { leaveRoom(); navigate('/online'); }} />

      {!isMyTurn && (
         <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,0,0,0.8)', padding: '5px 15px', borderRadius: '15px', color: 'white', zIndex: 10, fontWeight: 'bold' }}>
            Warte auf {activePlayer?.name}...
         </div>
      )}
      
      <div style={{ opacity: isMyTurn ? 1 : 0.75, height: '100%' }}>
        <GameScreen 
          players={effectiveGameState.players}
          activePlayer={effectiveGameState.activePlayer}
          startingPlayerOfLeg={effectiveGameState.startingPlayerOfLeg}
          config={effectiveGameState.config}
          currentRoundDarts={effectiveGameState.currentRoundDarts}
          currentMultiplier={isHost ? effectiveGameState.currentMultiplier : clientMultiplier}
          isProcessing={effectiveGameState.isProcessing}
          roundBust={isHost ? hostEngine.roundBust : clientRoundBust}
          addDart={handleAddDart}
          toggleMultiplier={isHost ? hostEngine.toggleMultiplier : (m) => setClientMultiplier(prev => prev === m ? 1 : m)}
          undoSingleDart={handleUndo}
          abortGame={() => { leaveRoom(); navigate('/online'); }}
          checkoutPrompt={activeCheckoutPrompt}
          submitCheckoutPrompt={handleSubmitCheckout}
          celebration={isHost ? hostEngine.celebration : clientCelebration}
          canUndo={effectiveGameState.currentRoundDarts.length > 0 || (effectiveGameState.history && effectiveGameState.history.length > 0)}
        />
      </div>

      <StatsModal 
        isOpen={statsData.isOpen}
        winnerIndex={statsData.winnerIndex ?? null}
        players={statsData.players || []}
        matchData={statsData.matchData ?? null}
        onClose={() => {
          setStatsData({ isOpen: false, winnerIndex: null, players: [], matchData: null });
          leaveRoom();
          navigate('/online');
        }}
      />
    </div>
  );
};
