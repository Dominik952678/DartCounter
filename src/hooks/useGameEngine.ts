import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import type { GameState, Profile, MatchHistory, GameConfig, Player, GuestSyncTokenDoc, StatsModalData, Dart } from '../types';
import { saveProfiles, setGuestLiveMatchStatus, supabase } from '../db/database';
import { getBotDart, type TeamContext } from '../utils/bot';
import { playSciFiHitSound, play180Sound, playBustSound, playHighFinishSound, speak, playDartHitSound, announceScore, announceGameShot } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';

export const get2v2FreezeStatus = (players: Player[], activePlayerIndex: number): {
  is2v2: boolean;
  isFrozen: boolean;
  partnerIndex: number;
  partnerScore: number;
  opponentsTotal: number;
  pointDifference: number;
} => {
  if (!players || players.length < 4) {
    return { is2v2: false, isFrozen: false, partnerIndex: -1, partnerScore: 0, opponentsTotal: 0, pointDifference: 0 };
  }
  const activePlayer = players[activePlayerIndex];
  if (!activePlayer) {
    return { is2v2: false, isFrozen: false, partnerIndex: -1, partnerScore: 0, opponentsTotal: 0, pointDifference: 0 };
  }
  const partnerIndex = (activePlayerIndex + 2) % 4;
  const opponentIndices = activePlayerIndex % 2 === 0 ? [1, 3] : [0, 2];

  const partnerScore = players[partnerIndex]?.score ?? 0;
  const opp1Score = players[opponentIndices[0]]?.score ?? 0;
  const opp2Score = players[opponentIndices[1]]?.score ?? 0;
  const opponentsTotal = opp1Score + opp2Score;
  const pointDifference = partnerScore - opponentsTotal;
  const isFrozen = pointDifference > 0;

  return {
    is2v2: true,
    isFrozen,
    partnerIndex,
    partnerScore,
    opponentsTotal,
    pointDifference
  };
};

interface UseGameEngineProps {
  profiles: Record<string, Profile>;
  setProfiles: (profiles: Record<string, Profile>) => void;
  setSavedMatches?: (matches: MatchHistory[]) => void;
  setScreen: (screen: 'start' | 'game' | 'powerscoring' | 'splitscore' | 'checkout') => void;
  setStatsModalData: React.Dispatch<React.SetStateAction<StatsModalData>> | ((data: StatsModalData | ((prev: StatsModalData) => StatsModalData)) => void);
  isOnline?: boolean;
  user?: { id: string } | null;
}

const SAVED_GAME_KEY = 'dartcounter_saved_game';

export function useGameEngine({ profiles, setProfiles, setSavedMatches: _setSavedMatches, setScreen, setStatsModalData, isOnline = false, user }: UseGameEngineProps) {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    activePlayer: 0,
    startingPlayerOfLeg: 0,
    config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 },
    currentRoundDarts: [],
    currentMultiplier: 1,
    isProcessing: false,
    history: []
  });

  const [hasSavedGame, setHasSavedGame] = useState(() => typeof window !== 'undefined' && !!localStorage.getItem(SAVED_GAME_KEY));
  const [roundBust, setRoundBust] = useState(false);
  const [celebration, setCelebration] = useState<{ type: string, playerIndex: number } | null>(null);
  /** Set when a linked cloud guest revokes the session from their own device. */
  const [remoteAbortNotice, setRemoteAbortNotice] = useState<string | null>(null);

  const [checkoutPrompt, setCheckoutPrompt] = useState<{
    isOpen: boolean;
    maxDarts: number;
    autoDarts: number;
    playerIndex: number;
    isWin: boolean;
    highestThrow: number;
    stateAfterDart: GameState;
  } | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Mirror of the current state that is updated *synchronously* on every write.
   *
   * Scoring is a chain of effects (sounds, haptics, celebration, the 800 ms
   * round-end timer) that must fire exactly once per dart. Running them inside a
   * `setState` updater made them fire twice under StrictMode and made the whole
   * flow depend on React's batching; reading and writing through this ref keeps
   * the updates correct for rapid successive taps while the effects stay outside
   * the reducer.
   */
  const stateRef = useRef<GameState>(gameState);
  const profilesRef = useRef(profiles);
  const userIdRef = useRef(user?.id);

  // Synced before paint so no interaction can observe a stale mirror, and after
  // commit so React never sees a ref written during render.
  useLayoutEffect(() => {
    stateRef.current = gameState;
    profilesRef.current = profiles;
    userIdRef.current = user?.id;
  });

  const applyState = useCallback((next: GameState) => {
    stateRef.current = next;
    setGameState(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (callerTimeoutRef.current) {
      clearTimeout(callerTimeoutRef.current);
      callerTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Live auto-save so a reload or an accidental close never loses a match.
  useEffect(() => {
    if (isOnline) return;
    if (gameState.players.length === 0) return;
    if (!gameState.players.some(p => p.legs > 0 || p.sets > 0 || p.matchDarts > 0)) return;
    try {
      localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(gameState));
    } catch (e) {
      console.error('Auto-save error', e);
    }
  }, [gameState, isOnline]);

  const saveStateToHistory = (currentState: GameState): GameState => {
    const clone: GameState = JSON.parse(JSON.stringify(currentState));
    clone.history = [];
    return clone;
  };

  const discardSavedGame = useCallback(() => {
    localStorage.removeItem(SAVED_GAME_KEY);
    setHasSavedGame(false);
  }, []);

  const persistProfiles = useCallback((next: Record<string, Profile>) => {
    setProfiles(next);
    saveProfiles(next, userIdRef.current).catch(err => console.error('Could not persist profiles', err));
  }, [setProfiles]);

  const startGame = useCallback((playerNames: string[], config: GameConfig) => {
    clearTimers();

    const playerObjs: Player[] = playerNames.map((name, index) => {
      const p = profilesRef.current[name];
      return {
        name,
        score: config.startScore,
        legs: 0,
        sets: 0,
        legDarts: 0,
        matchDarts: 0,
        legPts: 0,
        matchPts: 0,
        matchFirst9Pts: 0,
        matchFirst9Darts: 0,
        sixtyPlus: 0,
        hundredPlus: 0,
        oneFortyPlus: 0,
        oneEighty: 0,
        highestCheckout: 0,
        triplesHit: 0,
        checkoutAttempts: 0,
        checkoutSuccesses: 0,
        isBot: p?.isBot || false,
        targetAverage: p?.targetAverage || 40,
        linkedUserId: p?.linkedUserId,
        linkedUsername: p?.linkedUsername,
        isLinkedCloudGuest: p?.isLinkedCloudGuest,
        syncAuthToken: p?.syncAuthToken,
        color: p?.color,
        team: config.is2v2 ? ((index % 2 === 0 ? 1 : 2) as 1 | 2) : undefined,
        segmentHits: {},
        legHistory: []
      };
    });

    // Tell the cloud profile of every linked guest that a match is running on
    // this device, so they can see (and abort) it from their own phone.
    playerObjs.forEach(p => {
      if (p.linkedUserId && p.syncAuthToken) {
        setGuestLiveMatchStatus(p.linkedUserId, p.syncAuthToken, `Match (${config.startScore} ${config.outMode})`, {
          players: playerObjs.map(pl => pl.name),
          mode: `${config.startScore} ${config.outMode}`,
          isAborted: false
        });
      }
    });

    applyState({
      players: playerObjs,
      activePlayer: 0,
      startingPlayerOfLeg: 0,
      config,
      currentRoundDarts: [],
      currentMultiplier: 1,
      isProcessing: false,
      history: []
    });
    setRoundBust(false);
    setCelebration(null);
    setCheckoutPrompt(null);
    setRemoteAbortNotice(null);
    setHasSavedGame(true);
    setScreen('game');
  }, [applyState, clearTimers, setScreen]);

  const abortGame = useCallback(() => {
    clearTimers();
    stateRef.current.players.forEach(p => {
      if (p.linkedUserId) {
        setGuestLiveMatchStatus(p.linkedUserId, '', '', null);
      }
    });
    localStorage.removeItem(SAVED_GAME_KEY);
    setHasSavedGame(false);
    setCelebration(null);
    setCheckoutPrompt(null);
    setRoundBust(false);
    setScreen('start');
  }, [clearTimers, setScreen]);

  // Watch for a linked guest revoking the session from their own device.
  useEffect(() => {
    if (gameState.players.length === 0) return;
    const linkedGuests = gameState.players.filter(p => p.linkedUserId && p.syncAuthToken);
    if (linkedGuests.length === 0) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      for (const guest of linkedGuests) {
        if (cancelled) return;
        try {
          const { data } = await supabase
            .from('documents')
            .select('data')
            .eq('id', `user_sync_${guest.linkedUserId}`)
            .single();

          if (!data?.data) continue;
          const tokenDoc = data.data as GuestSyncTokenDoc;
          if (tokenDoc.liveMatch?.isAborted || tokenDoc.authToken !== guest.syncAuthToken || tokenDoc.syncEnabled === false) {
            if (cancelled) return;
            setRemoteAbortNotice(`@${guest.name} hat das Match aus der Ferne beendet oder die Verbindung getrennt.`);
            abortGame();
            return;
          }
        } catch {
          // Offline or transient error: keep playing, try again on the next tick.
        }
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [gameState.players, abortGame]);

  const resumeGame = useCallback(() => {
    const saved = localStorage.getItem(SAVED_GAME_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as GameState;
      if (!parsed?.players?.length || !parsed.config) throw new Error('Unvollständiger Spielstand');
      applyState({ ...parsed, isProcessing: false, history: parsed.history || [] });
      setRoundBust(false);
      setCelebration(null);
      setScreen('game');
    } catch (e) {
      console.error('Gespeichertes Spiel konnte nicht geladen werden', e);
      localStorage.removeItem(SAVED_GAME_KEY);
      setHasSavedGame(false);
    }
  }, [applyState, setScreen]);

  const isOnCheckout = (score: number, outMode: 'DO' | 'SO' | 'MO'): boolean => {
    if (score <= 0) return false;
    if (outMode === 'SO') return score <= 60;
    if (outMode === 'MO') return (score <= 40 && score % 2 === 0) || score === 50 || (score <= 60 && score % 3 === 0);
    return (score <= 40 && score % 2 === 0) || score === 50;
  };

  const showMatchStats = useCallback((finalState: GameState, winnerIndex: number, finalPlayers: Player[]) => {
    const is2v2 = !!finalState.config.is2v2 && finalPlayers.length === 4;
    const winningPlayer = finalPlayers[winnerIndex];
    const winningTeam = winningPlayer.team || (winnerIndex % 2 === 0 ? 1 : 2);
    const winnerName = is2v2
      ? `Team ${winningTeam} (${finalPlayers.filter((_, i) => ((finalPlayers[i].team || (i % 2 === 0 ? 1 : 2)) === winningTeam)).map(p => p.name).join(' & ')})`
      : winningPlayer.name;

    const newProfiles = { ...profilesRef.current };
    finalPlayers.forEach((p, i) => {
      if (!newProfiles[p.name]) return;
      const prof = { ...newProfiles[p.name] };
      const pTeam = p.team || (i % 2 === 0 ? 1 : 2);
      const didWin = is2v2 ? (pTeam === winningTeam) : (i === winnerIndex);
      if (didWin) prof.wins += 1;
      prof.matches += 1;
      prof.dartsThrown += p.matchDarts;
      prof.pointsScored += p.matchPts;
      prof.sixtyPlus = (prof.sixtyPlus || 0) + p.sixtyPlus;
      prof.hundredPlus = (prof.hundredPlus || 0) + p.hundredPlus;
      prof.oneFortyPlus = (prof.oneFortyPlus || 0) + p.oneFortyPlus;
      prof.oneEighty = (prof.oneEighty || 0) + p.oneEighty;
      if (p.highestCheckout > (prof.highestCheckout || 0)) {
        prof.highestCheckout = p.highestCheckout;
      }
      // Every player's own best leg counts, not just the match winner's.
      if (p.bestMatchLeg && (!prof.bestLegDarts || p.bestMatchLeg < prof.bestLegDarts)) {
        prof.bestLegDarts = p.bestMatchLeg;
      }
      if (p.oneEighty > 0 && (prof.highestThrow || 0) < 180) {
        prof.highestThrow = 180;
      }
      prof.checkoutAttempts = (prof.checkoutAttempts || 0) + p.checkoutAttempts;
      prof.checkoutSuccesses = (prof.checkoutSuccesses || 0) + p.checkoutSuccesses;
      prof.first9Pts = (prof.first9Pts || 0) + p.matchFirst9Pts;
      prof.first9Darts = (prof.first9Darts || 0) + p.matchFirst9Darts;
      prof.triplesHit = (prof.triplesHit || 0) + (p.triplesHit || 0);

      if (!prof.segmentHits) prof.segmentHits = {};
      else prof.segmentHits = { ...prof.segmentHits };
      if (p.segmentHits) {
        Object.entries(p.segmentHits).forEach(([key, val]) => {
          prof.segmentHits![key] = (prof.segmentHits![key] || 0) + val;
        });
      }

      newProfiles[p.name] = prof;
    });

    const matchData: MatchHistory = {
      date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
      winner: winnerName,
      gameType: 'standard',
      isOnline,
      is2v2,
      config: finalState.config,
      players: finalPlayers.map((p, i) => ({
        name: p.name,
        sets: p.sets,
        legs: p.legs,
        avg: p.matchDarts > 0 ? ((p.matchPts / p.matchDarts) * 3).toFixed(1) : '0.0',
        first9: p.matchFirst9Darts > 0 ? ((p.matchFirst9Pts / p.matchFirst9Darts) * 3).toFixed(1) : '0.0',
        matchPts: p.matchPts,
        matchDarts: p.matchDarts,
        first9Pts: p.matchFirst9Pts,
        first9Darts: p.matchFirst9Darts,
        checkoutAttempts: p.checkoutAttempts,
        checkoutSuccesses: p.checkoutSuccesses,
        bestMatchLeg: p.bestMatchLeg,
        legHistory: [...p.legHistory],
        sixtyPlus: p.sixtyPlus,
        hundredPlus: p.hundredPlus,
        oneFortyPlus: p.oneFortyPlus,
        oneEighty: p.oneEighty,
        highestCheckout: p.highestCheckout,
        segmentHits: { ...(p.segmentHits || {}) },
        triplesHit: p.triplesHit || 0,
        team: is2v2 ? (p.team || (i % 2 === 0 ? 1 : 2)) : undefined,
        linkedUserId: p.linkedUserId,
        linkedUsername: p.linkedUsername,
        isLinkedCloudGuest: p.isLinkedCloudGuest
      }))
    };

    setStatsModalData({
      isOpen: true,
      winnerIndex,
      players: finalPlayers,
      matchData,
      pendingProfiles: newProfiles,
      pendingMatchData: matchData
    });
  }, [isOnline, setStatsModalData]);

  const handleLegWin = useCallback((currentState: GameState, winnerIndex: number, newHighestThrow: number): GameState => {
    const newPlayers = currentState.players.map(p => ({ ...p }));
    const winningPlayer = newPlayers[winnerIndex];
    const is2v2 = !!currentState.config.is2v2 && newPlayers.length === 4;
    const winningTeam = winningPlayer.team || (winnerIndex % 2 === 0 ? 1 : 2);

    newPlayers.forEach((p, i) => {
      const pTeam = p.team || (i % 2 === 0 ? 1 : 2);
      if (is2v2 ? pTeam === winningTeam : i === winnerIndex) {
        p.legs += 1;
      }
    });

    // The winner's leg is measured before the per-leg counters are reset.
    const legDartsTaken = currentState.players[winnerIndex].legDarts;
    if (legDartsTaken > 0) {
      newPlayers[winnerIndex].bestMatchLeg =
        !newPlayers[winnerIndex].bestMatchLeg || legDartsTaken < newPlayers[winnerIndex].bestMatchLeg!
          ? legDartsTaken
          : newPlayers[winnerIndex].bestMatchLeg;
    }

    newPlayers.forEach(p => {
      p.legHistory = [...p.legHistory, p.legDarts > 0 ? ((p.legPts / p.legDarts) * 3).toFixed(1) : '0.0'];
      p.legPts = 0;
      p.legDarts = 0;
      p.score = currentState.config.startScore;
    });

    const updatedProfiles = { ...profilesRef.current };
    let profilesChanged = false;
    const winnerProfile = updatedProfiles[winningPlayer.name];
    if (winnerProfile) {
      if (newHighestThrow > (winnerProfile.highestThrow || 0)) {
        updatedProfiles[winningPlayer.name] = { ...winnerProfile, highestThrow: newHighestThrow };
        profilesChanged = true;
      }
      const currentBestLeg = updatedProfiles[winningPlayer.name].bestLegDarts;
      if (legDartsTaken > 0 && (!currentBestLeg || legDartsTaken < currentBestLeg)) {
        updatedProfiles[winningPlayer.name] = { ...updatedProfiles[winningPlayer.name], bestLegDarts: legDartsTaken };
        profilesChanged = true;
      }
    }
    if (profilesChanged) persistProfiles(updatedProfiles);

    if (newPlayers[winnerIndex].legs >= currentState.config.legsToWin) {
      newPlayers.forEach((p, i) => {
        const pTeam = p.team || (i % 2 === 0 ? 1 : 2);
        if (is2v2 ? pTeam === winningTeam : i === winnerIndex) p.sets += 1;
        p.legs = 0;
      });

      if (newPlayers[winnerIndex].sets >= currentState.config.setsToWin) {
        const finalState: GameState = { ...currentState, players: newPlayers, isProcessing: true };
        localStorage.removeItem(SAVED_GAME_KEY);
        setHasSavedGame(false);
        showMatchStats(finalState, winnerIndex, newPlayers);
        return finalState;
      }
    }

    const nextStarter = (currentState.startingPlayerOfLeg + 1) % currentState.players.length;
    if (!newPlayers[nextStarter].isBot) {
      callerTimeoutRef.current = setTimeout(() => speak('Game on'), 1500);
    }

    setRoundBust(false);

    return {
      ...currentState,
      players: newPlayers,
      startingPlayerOfLeg: nextStarter,
      activePlayer: nextStarter,
      currentRoundDarts: [],
      isProcessing: false
    };
  }, [persistProfiles, showMatchStats]);

  const continueProcessRoundEnd = useCallback((stateAfterDart: GameState, isWin: boolean, currentPlayerIndex: number, highestThrow: number): GameState => {
    if (isWin) {
      return handleLegWin(stateAfterDart, currentPlayerIndex, highestThrow);
    }

    const nextState: GameState = {
      ...stateAfterDart,
      activePlayer: (stateAfterDart.activePlayer + 1) % stateAfterDart.players.length,
      currentRoundDarts: [],
      isProcessing: false
    };

    const thrower = nextState.players[currentPlayerIndex];
    const throwerProfile = profilesRef.current[thrower.name];
    if (throwerProfile && highestThrow > (throwerProfile.highestThrow || 0)) {
      persistProfiles({
        ...profilesRef.current,
        [thrower.name]: { ...throwerProfile, highestThrow }
      });
    }

    const nextP = nextState.players[nextState.activePlayer];
    const bogeys = [169, 168, 166, 165, 163, 162, 159];
    if (!nextP.isBot && nextP.score <= 170 && !bogeys.includes(nextP.score)) {
      callerTimeoutRef.current = setTimeout(() => {
        speak(`${nextP.name}, you require ${nextP.score}`);
      }, 1200);
    }

    setRoundBust(false);
    return nextState;
  }, [handleLegWin, persistProfiles]);

  const processRoundEnd = useCallback((bust: boolean, isWin: boolean, roundTotal: number) => {
    const prevState = stateRef.current;
    const p = prevState.players[prevState.activePlayer];
    if (!p) return;

    const roundDarts = prevState.currentRoundDarts;
    const dartsThrown = roundDarts.length;

    let tempScore = p.score;
    let wasOnDouble = isOnCheckout(tempScore, prevState.config.outMode);
    for (const dart of roundDarts) {
      tempScore -= dart.value;
      if (tempScore > 0 && isOnCheckout(tempScore, prevState.config.outMode)) {
        wasOnDouble = true;
      }
    }
    if (bust) wasOnDouble = false;

    const newPlayers = prevState.players.map(pl => ({ ...pl }));
    const currentPlayerIndex = prevState.activePlayer;
    const updatedPlayer = newPlayers[currentPlayerIndex];

    const startDartCount = updatedPlayer.legDarts;
    for (let i = 0; i < dartsThrown; i++) {
      if (startDartCount + i < 9) {
        updatedPlayer.matchFirst9Darts += 1;
        if (!bust) updatedPlayer.matchFirst9Pts += roundDarts[i].value;
      }
    }

    updatedPlayer.legDarts += dartsThrown;
    updatedPlayer.matchDarts += dartsThrown;

    let highestThrow = profilesRef.current[updatedPlayer.name]?.highestThrow || 0;

    updatedPlayer.segmentHits = { ...(updatedPlayer.segmentHits || {}) };
    for (const dart of roundDarts) {
      let segmentKey: string;
      if (dart.base === 25) {
        segmentKey = dart.mult === 2 ? 'DB' : 'SB';
      } else if (dart.base === 0) {
        segmentKey = 'Miss';
      } else {
        const prefix = dart.mult === 3 ? 'T' : (dart.mult === 2 ? 'D' : 'S');
        segmentKey = `${prefix}${dart.base}`;
      }
      updatedPlayer.segmentHits[segmentKey] = (updatedPlayer.segmentHits[segmentKey] || 0) + 1;
      // Numeric key kept for the legacy radar/heatmap charts.
      const baseKey = String(dart.base);
      updatedPlayer.segmentHits[baseKey] = (updatedPlayer.segmentHits[baseKey] || 0) + 1;

      if (dart.mult === 3) {
        updatedPlayer.triplesHit = (updatedPlayer.triplesHit || 0) + 1;
      }
    }

    if (!bust) {
      updatedPlayer.score -= roundTotal;
      updatedPlayer.legPts += roundTotal;
      updatedPlayer.matchPts += roundTotal;
      if (roundTotal > highestThrow) highestThrow = roundTotal;
      if (roundTotal === 180) updatedPlayer.oneEighty += 1;
      else if (roundTotal >= 140) updatedPlayer.oneFortyPlus += 1;
      else if (roundTotal >= 100) updatedPlayer.hundredPlus += 1;
      else if (roundTotal >= 60) updatedPlayer.sixtyPlus += 1;
    }

    const stateAfterDart: GameState = { ...prevState, players: newPlayers };

    if (!bust && (isWin || wasOnDouble)) {
      let checkoutDarts = 0;
      let needsPrompt = false;
      let tScore = p.score;

      for (const dart of roundDarts) {
        if (isOnCheckout(tScore, prevState.config.outMode)) {
          checkoutDarts++;
          // 50 is ambiguous: a dart at the bull may have been a setup attempt.
          if (!p.isBot && tScore === 50 && prevState.config.outMode !== 'SO') needsPrompt = true;
        }
        tScore -= dart.value;
      }

      if (needsPrompt) {
        setCheckoutPrompt({
          isOpen: true,
          maxDarts: dartsThrown,
          autoDarts: checkoutDarts,
          playerIndex: currentPlayerIndex,
          isWin,
          highestThrow,
          stateAfterDart
        });
        return;
      }

      updatedPlayer.checkoutAttempts += checkoutDarts;
      if (isWin) {
        updatedPlayer.checkoutSuccesses += 1;
        if (p.score > updatedPlayer.highestCheckout) {
          updatedPlayer.highestCheckout = p.score;
        }
      }
    }

    applyState(continueProcessRoundEnd(stateAfterDart, isWin, currentPlayerIndex, highestThrow));
  }, [applyState, continueProcessRoundEnd]);

  const checkEndOfRound = useCallback((state: GameState) => {
    const roundTotal = state.currentRoundDarts.reduce((sum, dart) => sum + dart.value, 0);
    const p = state.players[state.activePlayer];
    const newScore = p.score - roundTotal;
    const lastDart = state.currentRoundDarts[state.currentRoundDarts.length - 1];

    let bust = false;
    let isWin = false;

    if (newScore < 0) bust = true;
    if (newScore === 1 && (state.config.outMode === 'DO' || state.config.outMode === 'MO')) bust = true;
    if (newScore === 0) {
      if (state.config.outMode === 'DO' && lastDart.mult !== 2) bust = true;
      if (state.config.outMode === 'MO' && lastDart.mult !== 2 && lastDart.mult !== 3) bust = true;

      if (!bust && state.config.is2v2 && get2v2FreezeStatus(state.players, state.activePlayer).isFrozen) {
        bust = true; // Checking out while frozen is a bust.
      }

      if (!bust) isWin = true;
    }

    if (!bust && !isWin && state.currentRoundDarts.length < 3) return;

    if (bust) {
      setCelebration({ type: 'bust', playerIndex: state.activePlayer });
      triggerHaptic('bust');
      playBustSound();
      if (newScore === 0 && state.config.is2v2) speak('Frozen!');
    } else if (isWin) {
      setCelebration({ type: 'checkout', playerIndex: state.activePlayer });
      triggerHaptic('victory');
      if (roundTotal >= 100) playHighFinishSound();
      announceGameShot(false);
    } else if (roundTotal === 180) {
      setCelebration({ type: '180', playerIndex: state.activePlayer });
      triggerHaptic('180');
      play180Sound();
    } else {
      announceScore(roundTotal);
    }

    setRoundBust(bust);
    applyState({ ...state, isProcessing: true });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      processRoundEnd(bust, isWin, roundTotal);
    }, 800);
  }, [applyState, processRoundEnd]);

  const addDart = useCallback((baseValue: number, overrideMult?: number) => {
    const prev = stateRef.current;
    if (prev.isProcessing || prev.currentRoundDarts.length >= 3) return;
    if (prev.players.length === 0) return;

    const mult = overrideMult !== undefined ? overrideMult : prev.currentMultiplier;

    if (baseValue === 25 && mult === 3) {
      // A triple bull does not exist — silently drop back to a single bull.
      applyState({ ...prev, currentMultiplier: 1 });
      return;
    }

    if (prev.currentRoundDarts.length === 0) setCelebration(null);

    let multString = mult === 1 ? '' : (mult === 2 ? 'D' : 'T');
    if (baseValue === 25) multString = mult === 2 ? 'DB' : 'B';
    const label = baseValue === 0 ? '0' : (baseValue === 25 ? multString : `${multString}${baseValue}`);

    const newDart: Dart = {
      base: baseValue,
      mult: baseValue === 0 ? 1 : mult,
      value: baseValue * mult,
      label
    };

    const newState: GameState = {
      ...prev,
      currentRoundDarts: [...prev.currentRoundDarts, newDart],
      currentMultiplier: 1,
      history: [...prev.history, saveStateToHistory(prev)]
    };

    applyState(newState);

    if (newDart.base === 20 && newDart.mult === 3) playSciFiHitSound('T20');
    else if (newDart.base === 19 && newDart.mult === 3) playSciFiHitSound('T19');
    else if (newDart.base === 25 && newDart.mult === 2) playSciFiHitSound('Bull');
    else playDartHitSound();

    checkEndOfRound(newState);
  }, [applyState, checkEndOfRound]);

  const submitCheckoutPrompt = useCallback((checkoutDarts: number) => {
    const prompt = checkoutPrompt;
    if (!prompt) return;

    const newPlayers = prompt.stateAfterDart.players.map(p => ({ ...p }));
    const p = newPlayers[prompt.playerIndex];
    const scoreBeforeRound = stateRef.current.players[prompt.playerIndex]?.score ?? 0;

    p.checkoutAttempts += checkoutDarts;
    if (prompt.isWin) {
      p.checkoutSuccesses += 1;
      if (scoreBeforeRound > p.highestCheckout) p.highestCheckout = scoreBeforeRound;
    }

    setCheckoutPrompt(null);
    applyState(continueProcessRoundEnd(
      { ...prompt.stateAfterDart, players: newPlayers },
      prompt.isWin,
      prompt.playerIndex,
      prompt.highestThrow
    ));
  }, [applyState, checkoutPrompt, continueProcessRoundEnd]);

  const undoSingleDart = useCallback(() => {
    clearTimers();
    setCelebration(null);
    setCheckoutPrompt(null);
    setRoundBust(false);
    setStatsModalData(prev => ({ ...prev, isOpen: false }));

    const prev = stateRef.current;

    if (prev.history.length === 0) {
      if (prev.currentRoundDarts.length > 0) {
        applyState({ ...prev, currentRoundDarts: prev.currentRoundDarts.slice(0, -1), isProcessing: false });
      }
      return;
    }

    const previousState = prev.history[prev.history.length - 1];
    applyState({
      ...previousState,
      history: prev.history.slice(0, -1),
      isProcessing: false
    });
  }, [applyState, clearTimers, setStatsModalData]);

  const toggleMultiplier = useCallback((mult: number) => {
    const prev = stateRef.current;
    if (prev.isProcessing) return;
    applyState({ ...prev, currentMultiplier: prev.currentMultiplier === mult ? 1 : mult });
  }, [applyState]);

  const addDartRef = useRef(addDart);
  useEffect(() => {
    addDartRef.current = addDart;
  });

  // Bot turns
  useEffect(() => {
    if (!gameState.players.length) return;
    const p = gameState.players[gameState.activePlayer];
    if (!p || !p.isBot) return;
    if (gameState.isProcessing || gameState.currentRoundDarts.length >= 3) return;
    if (roundBust || checkoutPrompt) return;

    const timer = setTimeout(() => {
      const currentTurnScore = gameState.currentRoundDarts.reduce((s, d) => s + d.value, 0);
      let teamContext: TeamContext | undefined;
      if (gameState.config.is2v2 && gameState.players.length === 4) {
        const freezeInfo = get2v2FreezeStatus(gameState.players, gameState.activePlayer);
        const opponentIndices = gameState.activePlayer % 2 === 0 ? [1, 3] : [0, 2];
        teamContext = {
          is2v2: true,
          partnerScore: freezeInfo.partnerScore,
          opponent1Score: gameState.players[opponentIndices[0]]?.score ?? 0,
          opponent2Score: gameState.players[opponentIndices[1]]?.score ?? 0
        };
      }
      const dart = getBotDart(p.targetAverage || 40, p.score - currentTurnScore, gameState.config.outMode, teamContext);
      addDartRef.current(dart.base, dart.mult);
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameState.activePlayer, gameState.currentRoundDarts, gameState.isProcessing, roundBust, checkoutPrompt, gameState.players, gameState.config]);

  return {
    gameState, setGameState, roundBust, celebration, setCelebration,
    checkoutPrompt, startGame, abortGame, resumeGame, discardSavedGame, undoSingleDart,
    toggleMultiplier, submitCheckoutPrompt, hasSavedGame, setHasSavedGame,
    addDart, timeoutRef,
    remoteAbortNotice, dismissRemoteAbortNotice: () => setRemoteAbortNotice(null)
  };
}
