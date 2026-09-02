import { useState, useRef, useEffect, useCallback } from 'react';
import type { GameState, Profile, MatchHistory, GameConfig, Player, GuestSyncTokenDoc, StatsModalData } from '../types';
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

  const [hasSavedGame, setHasSavedGame] = useState(() => typeof window !== 'undefined' && !!localStorage.getItem('dartcounter_saved_game'));
  const [roundBust, setRoundBust] = useState(false);
  const [celebration, setCelebration] = useState<{ type: string, playerIndex: number } | null>(null);
  
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Live Auto-Save to localStorage
  useEffect(() => {
    if (!isOnline && gameState.players.length > 0 && gameState.players.some(p => p.legs > 0 || p.sets > 0 || p.matchDarts > 0)) {
      try {
        localStorage.setItem('dartcounter_saved_game', JSON.stringify(gameState));
      } catch (e) {
        console.error("Auto-save error", e);
      }
    }
  }, [gameState, isOnline]);

  const saveStateToHistory = (currentState: GameState): GameState => {
    const clone = JSON.parse(JSON.stringify(currentState));
    clone.history = []; 
    return clone;
  };

  const discardSavedGame = () => {
    localStorage.removeItem('dartcounter_saved_game');
    setHasSavedGame(false);
  };

  const startGame = (playerNames: string[], config: GameConfig) => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }

    const playerObjs: Player[] = playerNames.map((name) => {
      const p = profiles[name];
      return {
        name,
        score: config.startScore,
        legs: 0,
        sets: 0,
        legDarts: 0,
        matchDarts: 0,
        legPts: 0,
        matchPts: 0,
        first9Pts: 0,
        first9Darts: 0,
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
        syncAuthToken: p?.syncAuthToken,
        segmentHits: {},
        legHistory: []
      };
    });

    // Notify cloud profile of any linked guest about the active match
    playerObjs.forEach(p => {
      if (p.linkedUserId && p.syncAuthToken) {
        setGuestLiveMatchStatus(p.linkedUserId, p.syncAuthToken, `Match (${config.startScore} ${config.outMode})`, {
          players: playerObjs.map(pl => pl.name),
          mode: `${config.startScore} ${config.outMode}`,
          isAborted: false
        });
      }
    });

    setGameState({
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
    setHasSavedGame(true);
    setScreen('game');
  };

  const abortGame = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Clear live match status for any linked guest
    gameState.players.forEach(p => {
      if (p.linkedUserId) {
        setGuestLiveMatchStatus(p.linkedUserId, '', '', null);
      }
    });
    localStorage.removeItem('dartcounter_saved_game');
    setHasSavedGame(false);
    setScreen('start');
  }, [gameState.players, setScreen]);

  // Monitor active match for remote abort from linked guests
  useEffect(() => {
    if (!gameState.players || gameState.players.length === 0) return;
    const linkedGuests = gameState.players.filter(p => p.linkedUserId && p.syncAuthToken);
    if (linkedGuests.length === 0) return;

    const interval = setInterval(async () => {
      for (const guest of linkedGuests) {
        try {
          const { data } = await supabase
            .from('documents')
            .select('data')
            .eq('id', `user_sync_${guest.linkedUserId}`)
            .single();

          if (data?.data) {
            const tokenDoc = data.data as GuestSyncTokenDoc;
            if (tokenDoc.liveMatch?.isAborted || tokenDoc.authToken !== guest.syncAuthToken || tokenDoc.syncEnabled === false) {
              alert(`⚠️ Match abgebrochen: @${guest.name} hat das Match aus der Ferne beendet (oder die Verbindung getrennt).`);
              abortGame();
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [gameState.players, abortGame]);

  const resumeGame = () => {
    const saved = localStorage.getItem('dartcounter_saved_game');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGameState(parsed);
        setScreen('game');
      } catch (e) {
        console.error("Fehler beim Laden", e);
        localStorage.removeItem('dartcounter_saved_game');
        setHasSavedGame(false);
      }
    }
  };

  const addDart = (baseValue: number, overrideMult?: number) => {
    if (gameState.currentRoundDarts.length === 0) {
      setCelebration(null);
    }

    setGameState(prev => {
      if (prev.isProcessing || prev.currentRoundDarts.length >= 3) return prev;
      
      const mult = overrideMult !== undefined ? overrideMult : prev.currentMultiplier;
      
      if (baseValue === 25 && mult === 3) {
        // Triple Bull does not exist - fallback silently to Single Bull
        return { ...prev, currentMultiplier: 1 };
      }

      const stateSnapshot = saveStateToHistory(prev);
      const newHistory = [...prev.history, stateSnapshot];

      let multString = mult === 1 ? "" : (mult === 2 ? "D" : "T");
      if (baseValue === 25) multString = mult === 2 ? "DB" : "B";
      if (baseValue === 0) multString = "Miss";
      const displayString = baseValue === 0 ? "0" : `${multString}${baseValue === 25 && mult === 1 ? "" : (baseValue === 25 ? "" : baseValue)}`;

      const newDart = {
        base: baseValue,
        mult: baseValue === 0 ? 1 : mult,
        value: baseValue * mult,
        label: displayString
      };

      const newRoundDarts = [...prev.currentRoundDarts, newDart];
      
      if (newDart.base === 20 && newDart.mult === 3) {
        playSciFiHitSound('T20');
      } else if (newDart.base === 19 && newDart.mult === 3) {
        playSciFiHitSound('T19');
      } else if (newDart.base === 25 && newDart.mult === 2) {
        playSciFiHitSound('Bull');
      } else {
        playDartHitSound();
      }

      const newState = {
        ...prev,
        currentRoundDarts: newRoundDarts,
        currentMultiplier: 1,
        history: newHistory
      };

      checkEndOfRound(newState);
      return newState;
    });
  };

  const checkEndOfRound = (state: GameState) => {
    const roundTotal = state.currentRoundDarts.reduce((sum, dart) => sum + dart.value, 0);
    const p = state.players[state.activePlayer];
    const newScore = p.score - roundTotal;
    const lastDart = state.currentRoundDarts[state.currentRoundDarts.length - 1];
    
    let bust = false, isWin = false;

    if (newScore < 0) bust = true;
    if (newScore === 1 && (state.config.outMode === 'DO' || state.config.outMode === 'MO')) bust = true;
    if (newScore === 0) {
        if (state.config.outMode === 'DO' && lastDart.mult !== 2) bust = true;
        if (state.config.outMode === 'MO' && lastDart.mult !== 2 && lastDart.mult !== 3) bust = true;
        
        // 2v2 Freeze Rule Check:
        if (!bust && state.config.is2v2) {
            const freezeInfo = get2v2FreezeStatus(state.players, state.activePlayer);
            if (freezeInfo.isFrozen) {
                bust = true; // Attempted checkout while frozen is a BUST
            }
        }

        if (!bust) isWin = true;
    }

    if (bust || isWin || state.currentRoundDarts.length === 3) {
      if (bust) {
        setCelebration({ type: 'bust', playerIndex: state.activePlayer });
        triggerHaptic('bust');
        playBustSound();
        if (newScore === 0 && state.config.is2v2) {
            speak("Frozen!");
        }
      } else if (isWin) {
        setCelebration({ type: 'checkout', playerIndex: state.activePlayer });
        triggerHaptic('victory');
        if (roundTotal >= 100) {
            playHighFinishSound();
        }
        announceGameShot(false);
      } else if (state.currentRoundDarts.length === 3 && roundTotal === 180) {
        setCelebration({ type: '180', playerIndex: state.activePlayer });
        triggerHaptic('180');
        play180Sound();
      } else if (state.currentRoundDarts.length === 3) {
        announceScore(roundTotal);
      }

      setGameState(s => ({ ...s, isProcessing: true }));
      setRoundBust(bust);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        processRoundEnd(state, bust, isWin, roundTotal);
      }, 800);
    }
  };

  const isOnCheckout = (score: number, outMode: 'DO' | 'SO' | 'MO'): boolean => {
      if (score <= 0) return false;
      if (outMode === 'SO') return score <= 60; // Can finish with any single/double/triple
      if (outMode === 'MO') return (score <= 40 && score % 2 === 0) || score === 50 || (score <= 60 && score % 3 === 0);
      // DO
      return (score <= 40 && score % 2 === 0) || score === 50;
  };

  const processRoundEnd = (_stateSnapshotBeforeTimeout: GameState, bust: boolean, isWin: boolean, roundTotal: number) => {
    setGameState(prevState => {
      const p = prevState.players[prevState.activePlayer];
      const dartsThrown = prevState.currentRoundDarts.length;
      
      let tempScore = p.score;
      let wasOnDouble = isOnCheckout(tempScore, prevState.config.outMode);
      for (const dart of prevState.currentRoundDarts) {
          tempScore -= dart.value;
          if (tempScore > 0 && isOnCheckout(tempScore, prevState.config.outMode)) {
              wasOnDouble = true;
          }
      }
      if (bust) wasOnDouble = false;
      
      const newPlayers = [...prevState.players];
      const currentPlayerIndex = prevState.activePlayer;
      const updatedPlayer = { ...p };

      const startDartCount = updatedPlayer.legDarts;
      for (let i = 0; i < dartsThrown; i++) {
          if (startDartCount + i < 9) {
              updatedPlayer.matchFirst9Darts += 1;
              if (!bust) {
                  updatedPlayer.matchFirst9Pts += prevState.currentRoundDarts[i].value;
              }
          }
      }

      updatedPlayer.legDarts += dartsThrown;
      updatedPlayer.matchDarts += dartsThrown;

      let highestThrow = profiles[updatedPlayer.name]?.highestThrow || 0;

      if (!updatedPlayer.segmentHits) updatedPlayer.segmentHits = {};
      for (const dart of prevState.currentRoundDarts) {
          let segmentKey: string;
          if (dart.base === 25) {
              segmentKey = dart.mult === 2 ? 'DB' : 'SB';
          } else if (dart.base === 0) {
              segmentKey = 'Miss';
          } else {
              const prefix = dart.mult === 3 ? 'T' : (dart.mult === 2 ? 'D' : 'S');
              segmentKey = `${prefix}${dart.base}`;
          }

          if (segmentKey) {
              updatedPlayer.segmentHits[segmentKey] = (updatedPlayer.segmentHits[segmentKey] || 0) + 1;
          }
          // Also record numeric key for legacy charts / radar
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
          if (roundTotal > highestThrow) {
              highestThrow = roundTotal;
          }
          if (roundTotal === 180) updatedPlayer.oneEighty += 1;
          else if (roundTotal >= 140) updatedPlayer.oneFortyPlus += 1;
          else if (roundTotal >= 100) updatedPlayer.hundredPlus += 1;
          else if (roundTotal >= 60) updatedPlayer.sixtyPlus += 1;
      }
      
      newPlayers[currentPlayerIndex] = updatedPlayer;

      const stateAfterDart: GameState = {
        ...prevState,
        players: newPlayers
      };

      if (p.isBot && !bust && (isWin || wasOnDouble)) {
          let botAttempts = 0;
          let botSuccesses = 0;
          let tScore = p.score;
          for (const dart of prevState.currentRoundDarts) {
              if (isOnCheckout(tScore, prevState.config.outMode)) {
                  botAttempts++;
                  if (tScore - dart.value === 0 && (
                      (prevState.config.outMode === 'DO' && dart.mult === 2) ||
                      (prevState.config.outMode === 'MO' && (dart.mult === 2 || dart.mult === 3)) ||
                      (prevState.config.outMode === 'SO')
                  )) {
                      botSuccesses++;
                  }
              }
              tScore -= dart.value;
          }
          updatedPlayer.checkoutAttempts += botAttempts;
          updatedPlayer.checkoutSuccesses += botSuccesses;
          if (botSuccesses > 0 && p.score > updatedPlayer.highestCheckout) {
              updatedPlayer.highestCheckout = p.score;
          }
      } else if (!p.isBot && !bust && (isWin || wasOnDouble)) {
         let autoCheckoutDarts = 0;
         let tScore = p.score;
         let needsPrompt = false;
         
         for (const dart of prevState.currentRoundDarts) {
             if (isOnCheckout(tScore, prevState.config.outMode)) {
                 autoCheckoutDarts++;
                 // At 50, it's ambiguous (D25 vs going for setup)
                 if (tScore === 50 && prevState.config.outMode !== 'SO') needsPrompt = true;
             }
             tScore -= dart.value;
         }

         if (needsPrompt) {
             setCheckoutPrompt({
                 isOpen: true,
                 maxDarts: dartsThrown,
                 autoDarts: autoCheckoutDarts,
                 playerIndex: currentPlayerIndex,
                 isWin,
                 highestThrow,
                 stateAfterDart
             });
             return prevState;
         } else {
             // Auto-submit checkout darts
             updatedPlayer.checkoutAttempts += autoCheckoutDarts;
             if (isWin) {
                 updatedPlayer.checkoutSuccesses += 1;
                 if (p.score > updatedPlayer.highestCheckout) {
                     updatedPlayer.highestCheckout = p.score;
                 }
             }
         }
      }

      return continueProcessRoundEnd(stateAfterDart, isWin, currentPlayerIndex, highestThrow);
    });
  };

  const continueProcessRoundEnd = (stateAfterDart: GameState, isWin: boolean, currentPlayerIndex: number, highestThrow: number) => {
      const nextState = {
        ...stateAfterDart,
        history: stateAfterDart.history
      };

      if (isWin) {
        return handleLegWin(nextState, currentPlayerIndex, highestThrow);
      } else {
        nextState.activePlayer = (stateAfterDart.activePlayer + 1) % stateAfterDart.players.length;
        nextState.currentRoundDarts = [];
        nextState.isProcessing = false;
        
        const updatedPlayer = nextState.players[currentPlayerIndex];
        if (highestThrow > (profiles[updatedPlayer.name]?.highestThrow || 0)) {
          const newProfiles = {
            ...profiles,
            [updatedPlayer.name]: { ...profiles[updatedPlayer.name], highestThrow }
          };
          setProfiles(newProfiles);
          saveProfiles(newProfiles);
        }

        const nextP = nextState.players[nextState.activePlayer];
        const bogeys = [169, 168, 166, 165, 163, 162, 159];
        if (!nextP.isBot && nextP.score <= 170 && !bogeys.includes(nextP.score)) {
            setTimeout(() => {
                speak(`${nextP.name}, you require ${nextP.score}`);
            }, 1200);
        }

        setRoundBust(false);
        return nextState;
      }
  };

  const submitCheckoutPrompt = (checkoutDarts: number) => {
     if (!checkoutPrompt) return;
     
     setGameState(prevState => {
         const newPlayers = [...checkoutPrompt.stateAfterDart.players];
         const p = { ...newPlayers[checkoutPrompt.playerIndex] };
         
         p.checkoutAttempts += checkoutDarts;
         if (checkoutPrompt.isWin) {
             p.checkoutSuccesses += 1;
             const checkoutScore = prevState.players[checkoutPrompt.playerIndex].score;
             if (checkoutScore > p.highestCheckout) {
                 p.highestCheckout = checkoutScore;
             }
         }
         
         newPlayers[checkoutPrompt.playerIndex] = p;
         const finalStateAfterDart = { ...checkoutPrompt.stateAfterDart, players: newPlayers };
         
         const resultState = continueProcessRoundEnd(finalStateAfterDart, checkoutPrompt.isWin, checkoutPrompt.playerIndex, checkoutPrompt.highestThrow);
         
         setCheckoutPrompt(null);
         return resultState;
     });
  };

  const handleLegWin = (currentState: GameState, winnerIndex: number, newHighestThrow: number): GameState => {
    const newPlayers = [...currentState.players];
    const winningPlayer = newPlayers[winnerIndex];
    const is2v2 = !!currentState.config.is2v2 && newPlayers.length === 4;
    const winningTeam = winningPlayer.team || (winnerIndex % 2 === 0 ? 1 : 2);

    if (is2v2) {
        for (let i = 0; i < newPlayers.length; i++) {
            const pTeam = newPlayers[i].team || (i % 2 === 0 ? 1 : 2);
            if (pTeam === winningTeam) {
                newPlayers[i] = { ...newPlayers[i], legs: newPlayers[i].legs + 1 };
            }
        }
    } else {
        newPlayers[winnerIndex] = { ...newPlayers[winnerIndex], legs: newPlayers[winnerIndex].legs + 1 };
    }

    for (let i = 0; i < newPlayers.length; i++) {
        const p = { ...newPlayers[i] };
        const legAvg = p.legDarts > 0 ? ((p.legPts / p.legDarts) * 3).toFixed(1) : "0.0";
        p.legHistory = [...p.legHistory, legAvg];
        p.legPts = 0; 
        p.legDarts = 0; 
        p.score = currentState.config.startScore;
        newPlayers[i] = p;
    }

    const legDartsTaken = currentState.players[winnerIndex].legDarts;
    if (legDartsTaken > 0) {
        newPlayers[winnerIndex].bestMatchLeg = (!newPlayers[winnerIndex].bestMatchLeg || legDartsTaken < newPlayers[winnerIndex].bestMatchLeg!) ? legDartsTaken : newPlayers[winnerIndex].bestMatchLeg;
    }

    const teamWonLegs = newPlayers[winnerIndex].legs;

    if (teamWonLegs >= currentState.config.legsToWin) {
        if (is2v2) {
            for (let i = 0; i < newPlayers.length; i++) {
                const pTeam = newPlayers[i].team || (i % 2 === 0 ? 1 : 2);
                if (pTeam === winningTeam) {
                    newPlayers[i] = { ...newPlayers[i], sets: newPlayers[i].sets + 1, legs: 0 };
                } else {
                    newPlayers[i] = { ...newPlayers[i], legs: 0 };
                }
            }
        } else {
            newPlayers[winnerIndex] = { ...newPlayers[winnerIndex], sets: newPlayers[winnerIndex].sets + 1 };
            for (let i = 0; i < newPlayers.length; i++) {
                newPlayers[i].legs = 0;
            }
        }
        
        const teamWonSets = newPlayers[winnerIndex].sets;
        if (teamWonSets >= currentState.config.setsToWin) {
            showMatchStats(currentState, winnerIndex, newPlayers, newHighestThrow);
            localStorage.removeItem('dartcounter_saved_game');
            setHasSavedGame(false);
            return {
              ...currentState,
              players: newPlayers,
              isProcessing: true
            };
        }
    }

    const nextStarter = (currentState.startingPlayerOfLeg + 1) % currentState.players.length;
    const nextP = newPlayers[nextStarter];
    if (!nextP.isBot) {
        setTimeout(() => {
            speak("Game on");
        }, 1500);
    }

    const updatedProfiles = { ...profiles };
    let profilesChanged = false;
    
    if (newHighestThrow > (updatedProfiles[winningPlayer.name]?.highestThrow || 0)) {
       updatedProfiles[winningPlayer.name] = { ...updatedProfiles[winningPlayer.name], highestThrow: newHighestThrow };
       profilesChanged = true;
    }
    
    const currentBestLeg = updatedProfiles[winningPlayer.name]?.bestLegDarts;
    if (!currentBestLeg || legDartsTaken < currentBestLeg) {
       updatedProfiles[winningPlayer.name] = { ...updatedProfiles[winningPlayer.name], bestLegDarts: legDartsTaken };
       profilesChanged = true;
    }

    newPlayers[winnerIndex].bestMatchLeg = (!newPlayers[winnerIndex].bestMatchLeg || legDartsTaken < newPlayers[winnerIndex].bestMatchLeg!) ? legDartsTaken : newPlayers[winnerIndex].bestMatchLeg;

    if (profilesChanged) {
       setProfiles(updatedProfiles);
       if (user?.id) {
          saveProfiles(updatedProfiles, user.id);
       }
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
  };

  const showMatchStats = async (_currentState: GameState, winnerIndex: number, finalPlayers: Player[], highestThrow: number) => {
    const is2v2 = !!_currentState.config.is2v2 && finalPlayers.length === 4;
    const winningPlayer = finalPlayers[winnerIndex];
    const winningTeam = winningPlayer.team || (winnerIndex % 2 === 0 ? 1 : 2);
    const winnerName = is2v2
        ? `Team ${winningTeam} (${finalPlayers.filter((_, i) => ((finalPlayers[i].team || (i % 2 === 0 ? 1 : 2)) === winningTeam)).map(p => p.name).join(' & ')})`
        : finalPlayers[winnerIndex].name;
    
    const newProfiles = { ...profiles };
    finalPlayers.forEach((p, i) => {
        if (!newProfiles[p.name]) return;
        const prof = { ...newProfiles[p.name] };
        const pTeam = p.team || (i % 2 === 0 ? 1 : 2);
        const didWin = is2v2 ? (pTeam === winningTeam) : (i === winnerIndex);
        if (didWin) prof.wins += 1;
        prof.matches += 1;
        prof.dartsThrown += p.matchDarts;
        prof.pointsScored += p.matchPts;
        if (p.name === finalPlayers[winnerIndex].name) {
           if (highestThrow > prof.highestThrow) {
               prof.highestThrow = highestThrow;
           }
           const finalLegDarts = _currentState.players[i].legDarts;
           if (finalLegDarts > 0 && (!prof.bestLegDarts || finalLegDarts < prof.bestLegDarts)) {
               prof.bestLegDarts = finalLegDarts;
           }
        }
        prof.sixtyPlus = (prof.sixtyPlus || 0) + p.sixtyPlus;
        prof.hundredPlus = (prof.hundredPlus || 0) + p.hundredPlus;
        prof.oneFortyPlus = (prof.oneFortyPlus || 0) + p.oneFortyPlus;
        prof.oneEighty = (prof.oneEighty || 0) + p.oneEighty;
        if (p.highestCheckout > (prof.highestCheckout || 0)) {
            prof.highestCheckout = p.highestCheckout;
        }
        prof.checkoutAttempts = (prof.checkoutAttempts || 0) + p.checkoutAttempts;
        prof.checkoutSuccesses = (prof.checkoutSuccesses || 0) + p.checkoutSuccesses;
        prof.first9Pts = (prof.first9Pts || 0) + p.matchFirst9Pts;
        prof.first9Darts = (prof.first9Darts || 0) + p.matchFirst9Darts;
        prof.triplesHit = (prof.triplesHit || 0) + (p.triplesHit || 0);

        if (!prof.segmentHits) prof.segmentHits = {};
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
        isOnline: isOnline,
        is2v2: is2v2,
        config: _currentState.config,
        players: finalPlayers.map((p, i) => ({
            name: p.name, sets: p.sets, legs: p.legs,
            avg: p.matchDarts > 0 ? ((p.matchPts / p.matchDarts) * 3).toFixed(1) : "0.0",
            first9: p.matchFirst9Darts > 0 ? ((p.matchFirst9Pts / p.matchFirst9Darts) * 3).toFixed(1) : "0.0",
            matchPts: p.matchPts,
            matchDarts: p.matchDarts,
            first9Pts: p.matchFirst9Pts,
            first9Darts: p.matchFirst9Darts,
            checkoutAttempts: p.checkoutAttempts,
            checkoutSuccesses: p.checkoutSuccesses,
            bestMatchLeg: p.bestMatchLeg,
            legHistory: [...p.legHistory],
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
  };

  const undoSingleDart = () => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }
    setCelebration(null);
    setCheckoutPrompt(null);
    setRoundBust(false);
    setStatsModalData(prev => ({ ...prev, isOpen: false }));

    setGameState(prev => {
      if (prev.history.length === 0) {
        if (prev.currentRoundDarts.length > 0) {
          return {
            ...prev,
            currentRoundDarts: prev.currentRoundDarts.slice(0, -1),
            isProcessing: false
          };
        }
        return prev;
      }
      
      const previousState = prev.history[prev.history.length - 1];
      const newHistory = prev.history.slice(0, -1);

      return {
        ...previousState,
        history: newHistory,
        isProcessing: false
      };
    });
  };

  const toggleMultiplier = (mult: number) => {
    setGameState(prev => {
      if (prev.isProcessing) return prev;
      return {
        ...prev,
        currentMultiplier: prev.currentMultiplier === mult ? 1 : mult
      };
    });
  };

  const addDartRef = useRef(addDart);
  useEffect(() => {
    addDartRef.current = addDart;
  });

  useEffect(() => {
    if (!gameState.players.length) return;
    const p = gameState.players[gameState.activePlayer];
    if (!p || !p.isBot) return;
    if (gameState.isProcessing || gameState.currentRoundDarts.length >= 3) return;
    if (roundBust || checkoutPrompt) return;

    const timer = setTimeout(() => {
        const currentTurnScore = gameState.currentRoundDarts.reduce((s, d) => s + d.value, 0);
        let teamContext: TeamContext | undefined = undefined;
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
    addDart, timeoutRef
  };
}
