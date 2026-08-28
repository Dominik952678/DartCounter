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
import type { GameState, MatchHistory, Profile } from '../types';
import { StatsModal } from './Modals';
import { DisconnectOverlay } from './DisconnectOverlay';
import { saveProfiles, saveMatch } from '../db/database';

export const OnlineGameWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { roomChannel, isHost, players, roomSettings, leaveRoom } = useOnlineStore();
  const { user } = useAuthStore();
  const { profiles, setProfiles } = useProfiles(user);
  const [syncedState, setSyncedState] = useState<GameState | null>(null);
  const [statsData, setStatsData] = useState<any>({ isOpen: false });
  const [clientMultiplier, setClientMultiplier] = useState(1);
  const [clientCheckoutPrompt, setClientCheckoutPrompt] = useState<any>(null);
  const [clientCelebration, setClientCelebration] = useState<any>(null);
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

  const handleMinigameFinish = async (results: any, gameType: string) => {
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
          const maxScore = Math.max(...results.map((r:any) => r.score));
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
          const maxScore = Math.max(...results.map((r:any) => r.score));
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
                p.checkoutTraining.roundsCompleted += r.roundsCompleted;
                p.checkoutTraining.matchesPlayed += 1;
                p.checkoutTraining.totalAttempts = (p.checkoutTraining.totalAttempts || 0) + r.attempts;
                p.checkoutTraining.totalDartsUsed = (p.checkoutTraining.totalDartsUsed || 0) + r.dartsUsed;
             }
          }
      }

      return newProfiles;
    });

    if (user?.id) {
      await saveProfiles(newProfiles!, user.id);
    }
    
    let matchData: MatchHistory = {
        date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
        winner: results.reduce((prev:any, current:any) => (prev.score > current.score) ? prev : current).name,
        gameType: gameType as any,
        isOnline: true,
        players: results.map((r:any) => ({
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
        if (roomSettings && hostEngine.gameState.players.length === 0 && !syncedState) {
            const playerNames = players.map(p => p.username);
            hostEngine.startGame(playerNames, roomSettings);
        }

        const sub = roomChannel
          .on('broadcast', { event: 'client_throw' }, (payload) => {
             const data = payload?.payload ?? payload;
             hostEngine.addDart(data.base, data.mult);
          })
          .on('broadcast', { event: 'client_undo' }, () => {
             hostEngine.undoSingleDart();
          })
          .on('broadcast', { event: 'client_submit_checkout' }, (payload) => {
             const data = payload?.payload ?? payload;
             hostEngine.submitCheckoutPrompt(data.darts);
          });
        
        return () => { sub.unsubscribe(); };
     } else {
        const sub = roomChannel
          .on('broadcast', { event: 'state_update' }, (payload) => {
             const data = payload?.payload ?? payload;
             setSyncedState(data.state);
             if (data.celebration !== undefined) setClientCelebration(data.celebration);
             if (data.roundBust !== undefined) setClientRoundBust(data.roundBust);
             if (data.checkoutPrompt !== undefined) setClientCheckoutPrompt(data.checkoutPrompt);
          })
          .on('broadcast', { event: 'game_ended' }, (payload) => {
             const data = payload?.payload ?? payload;
             setStatsData(data.statsData);
          });
        
        return () => { sub.unsubscribe(); };
     }
  }, [roomChannel, isHost, players, navigate]);

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
         setSyncedState(hostEngine.gameState);
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
      onFinish: (r: any) => handleMinigameFinish(r, roomSettings.mode || 'standard'),
      isOnline: true,
      isHost,
      roomChannel,
      myUsername
    };
    
    if (roomSettings.mode === 'powerscoring') return <PowerScoring {...props} rounds={roomSettings.rounds || 10} onFinish={(r) => handleMinigameFinish(r, 'powerScoring')} />;
    if (roomSettings.mode === 'splitscore') return <SplitScore {...props} onFinish={(r) => handleMinigameFinish(r, 'splitScore')} />;
    if (roomSettings.mode === 'checkout') return <CheckoutTraining {...props} checkoutTargets={roomSettings.checkoutTargets || 10} checkoutRounds={roomSettings.checkoutRounds || 1} onFinish={(r) => handleMinigameFinish(r, 'checkoutTraining')} />;
  }

  if (!syncedState || syncedState.players.length === 0) {
      return <div>Lade Spiel...</div>;
  }

  const activePlayer = syncedState.players[syncedState.activePlayer];
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

  const activeCheckoutPrompt = isHost ? hostEngine.checkoutPrompt : clientCheckoutPrompt;

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
          players={syncedState.players}
          activePlayer={syncedState.activePlayer}
          startingPlayerOfLeg={syncedState.startingPlayerOfLeg}
          config={syncedState.config}
          currentRoundDarts={syncedState.currentRoundDarts}
          currentMultiplier={isHost ? syncedState.currentMultiplier : clientMultiplier}
          isProcessing={syncedState.isProcessing}
          roundBust={isHost ? hostEngine.roundBust : clientRoundBust}
          addDart={handleAddDart}
          toggleMultiplier={isHost ? hostEngine.toggleMultiplier : (m) => setClientMultiplier(prev => prev === m ? 1 : m)}
          undoSingleDart={handleUndo}
          abortGame={() => { leaveRoom(); navigate('/online'); }}
          checkoutPrompt={activeCheckoutPrompt}
          submitCheckoutPrompt={handleSubmitCheckout}
          celebration={isHost ? hostEngine.celebration : clientCelebration}
          canUndo={syncedState.currentRoundDarts.length > 0 || (syncedState.history && syncedState.history.length > 0)}
        />
      </div>

      <StatsModal 
        isOpen={statsData.isOpen}
        winnerIndex={statsData.winnerIndex}
        players={statsData.players || []}
        matchData={statsData.matchData}
        onClose={() => {
          setStatsData({ isOpen: false, winnerIndex: null, players: [], matchData: null });
          leaveRoom();
          navigate('/online');
        }}
      />
    </div>
  );
};
