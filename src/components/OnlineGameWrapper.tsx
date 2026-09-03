import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameScreen } from './GameScreen';
import { PowerScoring } from './PowerScoring';
import { SplitScore } from './SplitScore';
import { CheckoutTraining } from './CheckoutTraining';
import { useOnlineStore, isFromActiveSeat } from '../store/useOnlineStore';
import type { RoomEventPayload } from '../store/useOnlineStore';
import { useAuthStore } from '../store/useAuthStore';
import { useProfiles } from '../hooks/useProfiles';
import { useGameEngine } from '../hooks/useGameEngine';
import type { GameState, MatchHistory, Profile, StatsModalData } from '../types';
import { StatsModal } from './Modals';
import { DisconnectOverlay } from './DisconnectOverlay';
import { recordMatchForSelf } from '../db/database';
import { reportPersistenceError } from '../store/useNotificationStore';

/**
 * The undo history is a deep clone of the whole game state per dart. Sending it
 * over the realtime channel would grow every message without bound and blow
 * past the broadcast size limit mid-leg, so guests receive the state with an
 * empty history plus its length (all they need is whether undo is available).
 */
const toWireState = (state: GameState) => ({
  ...state,
  history: [] as GameState[],
  historyLength: state.history.length
});

export const OnlineGameWrapper: React.FC = () => {
  const navigate = useNavigate();
  const {
    roomChannel,
    isHost,
    players,
    myPlayerId,
    roomSettings,
    leaveRoom,
    onRoomEvent,
    sendRoomEvent
  } = useOnlineStore();
  const { user } = useAuthStore();
  const { profiles, setProfiles, applyProfiles } = useProfiles(user);

  const [syncedState, setSyncedState] = useState<(GameState & { historyLength?: number }) | null>(null);
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

  const savedMatchRef = useRef<string | null>(null);

  /**
   * The roster and the outbound state counter, held behind refs so the realtime
   * subscriptions below stay mounted for the whole match instead of being torn
   * down and rebuilt whenever a player joins or a dart lands.
   */
  const playersRef = useRef(players);
  const outboundSeqRef = useRef(0);
  /** Highest state version this guest has rendered; older arrivals are stale. */
  const appliedSeqRef = useRef(-1);

  useLayoutEffect(() => {
    playersRef.current = players;
  });

  const myUsername = useMemo(() => {
    const fromAuth = user ? (user.user_metadata?.username || user.email) : null;
    return fromAuth || localStorage.getItem('dart_guest_online_name') || 'Gast';
  }, [user]);

  const hostEngine = useGameEngine({
    profiles,
    setProfiles,
    setSavedMatches: () => {},
    setScreen: screen => { if (screen === 'start') { leaveRoom(); navigate('/online'); } },
    setStatsModalData: setStatsData,
    isOnline: true,
    user
  });

  // The engine object is recreated on every render; keeping it behind a ref lets
  // the realtime subscriptions below stay mounted for the whole match instead of
  // being torn down and rebuilt continuously.
  const engineRef = useRef(hostEngine);
  useLayoutEffect(() => {
    engineRef.current = hostEngine;
  });

  /**
   * Books a finished online mini-game.
   *
   * The profile set is derived up front and handed to `applyProfiles` as a
   * finished object. It used to be assembled inside a `setProfiles` updater and
   * then persisted through the variable that updater assigned — a value React
   * is under no obligation to have produced yet, which could send an empty
   * profile map to the cloud.
   */
  const handleMinigameFinish = async (
    results: { name: string; score: number; attempts?: number; dartsUsed?: number; roundsCompleted?: number }[],
    gameType: string
  ) => {
    const nextProfiles: Record<string, Profile> = { ...profiles };

    const bump = (name: string, apply: (p: Profile) => void) => {
      if (!nextProfiles[name]) return;
      nextProfiles[name] = { ...nextProfiles[name] };
      apply(nextProfiles[name]);
    };

    if (gameType === 'powerScoring') {
      for (const r of results) {
        bump(r.name, p => {
          p.powerScoring = { ...(p.powerScoring || { bestScore: 0, matchesPlayed: 0, wins: 0, totalScore: 0 }) };
          p.powerScoring.bestScore = Math.max(p.powerScoring.bestScore, r.score);
          p.powerScoring.matchesPlayed += 1;
          p.powerScoring.totalScore = (p.powerScoring.totalScore || 0) + r.score;
        });
      }
      const maxScore = Math.max(...results.map(r => r.score));
      for (const r of results) {
        if (r.score === maxScore) bump(r.name, p => { p.powerScoring!.wins += 1; });
      }
    } else if (gameType === 'splitScore') {
      for (const r of results) {
        bump(r.name, p => {
          p.splitScore = { ...(p.splitScore || { bestScore: 0, matchesPlayed: 0, wins: 0, totalScore: 0 }) };
          p.splitScore.bestScore = Math.max(p.splitScore.bestScore, r.score);
          p.splitScore.matchesPlayed += 1;
          p.splitScore.totalScore = (p.splitScore.totalScore || 0) + r.score;
        });
      }
      const maxScore = Math.max(...results.map(r => r.score));
      for (const r of results) {
        if (r.score === maxScore) bump(r.name, p => { p.splitScore!.wins += 1; });
      }
    } else if (gameType === 'checkoutTraining') {
      for (const r of results) {
        bump(r.name, p => {
          p.checkoutTraining = { ...(p.checkoutTraining || { bestCheckout: 0, roundsCompleted: 0, matchesPlayed: 0, wins: 0, totalAttempts: 0, totalDartsUsed: 0 }) };
          p.checkoutTraining.bestCheckout = Math.max(p.checkoutTraining.bestCheckout, r.score);
          p.checkoutTraining.roundsCompleted += r.roundsCompleted || 0;
          p.checkoutTraining.matchesPlayed += 1;
          p.checkoutTraining.totalAttempts = (p.checkoutTraining.totalAttempts || 0) + (r.attempts || 0);
          p.checkoutTraining.totalDartsUsed = (p.checkoutTraining.totalDartsUsed || 0) + (r.dartsUsed || 0);
        });
      }
    }

    await applyProfiles(nextProfiles);

    const matchData: MatchHistory = {
      createdAt: new Date().toISOString(),
      date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
      winner: results.reduce((prev, current) => (prev.score > current.score ? prev : current)).name,
      gameType: gameType as MatchHistory['gameType'],
      isOnline: true,
      players: results.map(r => ({
        name: r.name, sets: 0, legs: 0, avg: '0.0', first9: '0.0',
        score: r.score, attempts: r.attempts, dartsUsed: r.dartsUsed
      }))
    };
    try {
      await recordMatchForSelf(matchData, myUsername, user?.id, user?.user_metadata?.username);
    } catch (err) {
      reportPersistenceError(err, 'Trainingsergebnis konnte nicht gespeichert werden');
    }

    leaveRoom();
    navigate('/online');
  };

  /** Persists the finished match for this device's own seat, exactly once. */
  const persistOwnResult = useCallback(async (match: MatchHistory | null) => {
    if (!match) return;
    const fingerprint = `${match.date}|${match.winner}|${match.players.map(p => p.name).join(',')}`;
    if (savedMatchRef.current === fingerprint) return;
    savedMatchRef.current = fingerprint;
    try {
      const updated = await recordMatchForSelf(match, myUsername, user?.id, user?.user_metadata?.username);
      if (updated) setProfiles(updated);
    } catch (err) {
      reportPersistenceError(err, 'Match-Ergebnis konnte nicht gespeichert werden');
    }
  }, [myUsername, user, setProfiles]);

  // ── Host: own the game, answer state requests, apply remote throws ──────────
  useEffect(() => {
    if (!roomChannel || !isHost) return;

    // A command is only honoured from the seat that is on throw; the roster and
    // the engine are read through refs so this subscription can stay mounted.
    const fromActiveSeat = (payload: RoomEventPayload) =>
      isFromActiveSeat(payload, playersRef.current, engineRef.current.gameState.activePlayer);

    const unsubs = [
      onRoomEvent('client_throw', payload => {
        if (!fromActiveSeat(payload)) return;
        const base = payload.base;
        const mult = payload.mult;
        if (typeof base === 'number') {
          engineRef.current.addDart(base, typeof mult === 'number' ? mult : undefined);
        }
      }),
      onRoomEvent('client_undo', payload => {
        if (!fromActiveSeat(payload)) return;
        engineRef.current.undoSingleDart();
      }),
      onRoomEvent('client_submit_checkout', payload => {
        if (!fromActiveSeat(payload)) return;
        if (typeof payload.darts === 'number') {
          engineRef.current.submitCheckoutPrompt(payload.darts);
        }
      }),
      onRoomEvent('client_request_state', () => {
        const engine = engineRef.current;
        if (engine.gameState.players.length === 0) return;
        sendRoomEvent('state_update', {
          seq: ++outboundSeqRef.current,
          state: toWireState(engine.gameState),
          celebration: engine.celebration,
          roundBust: engine.roundBust,
          checkoutPrompt: engine.checkoutPrompt
            ? { maxDarts: engine.checkoutPrompt.maxDarts, autoDarts: engine.checkoutPrompt.autoDarts, isWin: engine.checkoutPrompt.isWin }
            : null
        });
      })
    ];

    return () => unsubs.forEach(off => off());
  }, [roomChannel, isHost, onRoomEvent, sendRoomEvent]);

  // Landing here without a live channel means the room is gone (reload, direct
  // link, host closed the lobby).
  useEffect(() => {
    if (!roomChannel) navigate('/online', { replace: true });
  }, [roomChannel, navigate]);

  // ── Host: start the match once the roster and settings are known ───────────
  const gameStartedRef = useRef(false);
  useEffect(() => {
    if (!roomChannel || !isHost || gameStartedRef.current) return;
    gameStartedRef.current = true;
    if (engineRef.current.gameState.players.length > 0) return;
    const config = roomSettings || { startScore: 501, outMode: 'DO' as const, setsToWin: 1, legsToWin: 3 };
    const playerNames = players.length > 0 ? players.map(p => p.username) : [myUsername];
    engineRef.current.startGame(playerNames, config);
  }, [roomChannel, isHost, players, roomSettings, myUsername]);

  // ── Guest: mirror the host's state ─────────────────────────────────────────
  useEffect(() => {
    if (!roomChannel || isHost) return;

    const unsubs = [
      onRoomEvent('state_update', payload => {
        // Broadcasts carry no ordering guarantee. Without this, a late-arriving
        // older state could overwrite a newer one and roll the board back.
        const seq = typeof payload.seq === 'number' ? payload.seq : null;
        if (seq !== null) {
          if (seq <= appliedSeqRef.current) return;
          appliedSeqRef.current = seq;
        }

        if (payload.state) setSyncedState(payload.state as GameState & { historyLength?: number });
        if (payload.celebration !== undefined) setClientCelebration(payload.celebration as { type: string; playerIndex: number } | null);
        if (payload.roundBust !== undefined) setClientRoundBust(!!payload.roundBust);
        if (payload.checkoutPrompt !== undefined) {
          setClientCheckoutPrompt(payload.checkoutPrompt as { maxDarts: number; autoDarts: number; isWin: boolean } | null);
        }
      }),
      onRoomEvent('game_ended', payload => {
        if (payload.statsData) setStatsData(payload.statsData as StatsModalData);
      })
    ];

    sendRoomEvent('client_request_state');

    return () => unsubs.forEach(off => off());
  }, [roomChannel, isHost, onRoomEvent, sendRoomEvent]);

  // Guests keep asking until the first state arrives, then stop polling.
  useEffect(() => {
    if (!roomChannel || isHost || syncedState) return;
    const interval = setInterval(() => sendRoomEvent('client_request_state'), 1200);
    return () => clearInterval(interval);
  }, [roomChannel, isHost, syncedState, sendRoomEvent]);

  // ── Host: publish every state change ──────────────────────────────────────
  useEffect(() => {
    if (!isHost || !roomChannel || hostEngine.gameState.players.length === 0) return;
    sendRoomEvent('state_update', {
      seq: ++outboundSeqRef.current,
      state: toWireState(hostEngine.gameState),
      celebration: hostEngine.celebration,
      roundBust: hostEngine.roundBust,
      checkoutPrompt: hostEngine.checkoutPrompt
        ? { maxDarts: hostEngine.checkoutPrompt.maxDarts, autoDarts: hostEngine.checkoutPrompt.autoDarts, isWin: hostEngine.checkoutPrompt.isWin }
        : null
    });
  }, [isHost, roomChannel, sendRoomEvent, hostEngine.gameState, hostEngine.celebration, hostEngine.roundBust, hostEngine.checkoutPrompt]);

  // ── Match end: broadcast, then every device books its own seat ─────────────
  useEffect(() => {
    if (!statsData.isOpen) return;
    if (isHost && roomChannel) {
      sendRoomEvent('game_ended', {
        statsData: {
          isOpen: true,
          winnerIndex: statsData.winnerIndex,
          players: statsData.players,
          matchData: statsData.matchData
        }
      });
    }
    persistOwnResult(statsData.matchData);
  }, [statsData, isHost, roomChannel, sendRoomEvent, persistOwnResult]);

  if (roomSettings && roomSettings.mode && roomSettings.mode !== 'standard') {
    const props = {
      players: players.map(p => p.username),
      profiles,
      onAbort: () => { leaveRoom(); navigate('/online'); },
      isOnline: true,
      isHost,
      roomChannel,
      myUsername
    };

    if (roomSettings.mode === 'powerscoring') {
      return <PowerScoring {...props} rounds={roomSettings.rounds || 10} onFinish={r => handleMinigameFinish(r, 'powerScoring')} />;
    }
    if (roomSettings.mode === 'splitscore') {
      return <SplitScore {...props} onFinish={r => handleMinigameFinish(r, 'splitScore')} />;
    }
    if (roomSettings.mode === 'checkout') {
      return (
        <CheckoutTraining
          {...props}
          checkoutTargets={roomSettings.checkoutTargets || 10}
          checkoutRounds={roomSettings.checkoutRounds || 1}
          onFinish={r => handleMinigameFinish(r, 'checkoutTraining')}
        />
      );
    }
  }

  const effectiveGameState = isHost ? hostEngine.gameState : syncedState;

  if (!effectiveGameState || effectiveGameState.players.length === 0) {
    return (
      <div className="screen active-screen app-container center-stage">
        <div className="loading-orb">🎯</div>
        <h3 className="center-stage-title">
          {isHost ? 'Match wird vorbereitet…' : 'Warte auf den Host…'}
        </h3>
        <p className="center-stage-text">
          {isHost
            ? 'Alle verbundenen Geräte erhalten gleich das Spielfeld.'
            : 'Dein Gerät synchronisiert sich mit dem Board des Hosts.'}
        </p>
        <button className="btn-secondary" onClick={() => { leaveRoom(); navigate('/online'); }}>
          Raum verlassen
        </button>
      </div>
    );
  }

  // Seat-based turn detection: two players may share a display name, and the
  // same account may sit at two boards — the roster position is authoritative.
  const mySeatIndex = players.findIndex(p => p.id === myPlayerId);
  const activeIndex = effectiveGameState.activePlayer;
  const activePlayer = effectiveGameState.players[activeIndex];
  const isMyTurn = mySeatIndex >= 0
    ? activeIndex === mySeatIndex
    : activePlayer?.name === myUsername;
  const isHostDisconnected = !isHost && players.length > 0 && players.every(p => !p.isHost);

  const handleAddDart = (baseValue: number, overrideMult?: number) => {
    if (!isMyTurn) return;
    if (isHost) {
      hostEngine.addDart(baseValue, overrideMult);
    } else {
      sendRoomEvent('client_throw', { seatId: myPlayerId, base: baseValue, mult: overrideMult ?? clientMultiplier });
      setClientMultiplier(1);
    }
  };

  const handleUndo = () => {
    if (!isMyTurn) return;
    if (isHost) hostEngine.undoSingleDart();
    else sendRoomEvent('client_undo', { seatId: myPlayerId });
  };

  const handleSubmitCheckout = (darts: number) => {
    if (isHost) {
      hostEngine.submitCheckoutPrompt(darts);
    } else {
      sendRoomEvent('client_submit_checkout', { seatId: myPlayerId, darts });
      setClientCheckoutPrompt(null);
    }
  };

  const activeCheckoutPrompt = isHost
    ? (hostEngine.checkoutPrompt
      ? { maxDarts: hostEngine.checkoutPrompt.maxDarts, autoDarts: hostEngine.checkoutPrompt.autoDarts, isWin: hostEngine.checkoutPrompt.isWin }
      : null)
    : clientCheckoutPrompt;

  const canUndo = isHost
    ? hostEngine.gameState.history.length > 0 || hostEngine.gameState.currentRoundDarts.length > 0
    : (syncedState?.historyLength || 0) > 0 || effectiveGameState.currentRoundDarts.length > 0;

  return (
    <div className="online-game-shell">
      <DisconnectOverlay isHostDisconnected={isHostDisconnected} onTimeout={() => { leaveRoom(); navigate('/online'); }} />

      {!isMyTurn && (
        <div className="turn-banner" role="status">
          <span className="turn-banner-dot" aria-hidden="true" />
          {activePlayer?.name} ist am Board
        </div>
      )}

      <div className={isMyTurn ? 'online-board' : 'online-board is-waiting'}>
        <GameScreen
          players={effectiveGameState.players}
          activePlayer={effectiveGameState.activePlayer}
          startingPlayerOfLeg={effectiveGameState.startingPlayerOfLeg}
          config={effectiveGameState.config}
          currentRoundDarts={effectiveGameState.currentRoundDarts}
          currentMultiplier={isHost ? effectiveGameState.currentMultiplier : clientMultiplier}
          isProcessing={effectiveGameState.isProcessing || !isMyTurn}
          roundBust={isHost ? hostEngine.roundBust : clientRoundBust}
          addDart={handleAddDart}
          toggleMultiplier={isHost ? hostEngine.toggleMultiplier : m => setClientMultiplier(prev => (prev === m ? 1 : m))}
          undoSingleDart={handleUndo}
          abortGame={() => { leaveRoom(); navigate('/online'); }}
          checkoutPrompt={activeCheckoutPrompt}
          submitCheckoutPrompt={handleSubmitCheckout}
          celebration={isHost ? hostEngine.celebration : clientCelebration}
          canUndo={canUndo && isMyTurn}
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
