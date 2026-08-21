import { useState, useRef, useEffect } from 'react';
import type { GameState, Profile, MatchHistory, GameConfig, Player } from '../types';
import { saveMatch, getMatches, saveProfiles } from '../db/database';
import { getBotDart } from '../utils/bot';
import { playSciFiHitSound, play180Sound, playBustSound, playHighFinishSound, speak, playDartHitSound } from '../utils/audio';

interface UseGameEngineProps {
  profiles: Record<string, Profile>;
  setProfiles: (profiles: Record<string, Profile>) => void;
  setSavedMatches: (matches: MatchHistory[]) => void;
  setScreen: (screen: 'start' | 'game' | 'powerscoring' | 'splitscore' | 'checkout') => void;
  setStatsModalData: (data: any) => void;
  isOnline?: boolean;
  user?: { id: string } | null;
}

export function useGameEngine({ profiles, setProfiles, setSavedMatches, setScreen, setStatsModalData, isOnline = false, user }: UseGameEngineProps) {
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

  const [hasSavedGame, setHasSavedGame] = useState(false);
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
    const saved = localStorage.getItem('dartcounter_saved_game');
    if (saved) setHasSavedGame(true);
  }, []);

  // Live Auto-Save to localStorage
  useEffect(() => {
    if (!isOnline && gameState.players.length > 0 && gameState.players.some(p => p.legs > 0 || p.sets > 0 || p.matchDarts > 0)) {
      try {
        localStorage.setItem('dartcounter_saved_game', JSON.stringify(gameState));
        setHasSavedGame(true);
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

  const startGame = (chosenPlayers: string[], config: GameConfig) => {
    if (hasSavedGame) {
      if (!window.confirm("Es gibt ein noch nicht beendetes Match. Möchtest du dieses verwerfen und ein neues Match starten?")) {
        return;
      }
      localStorage.removeItem('dartcounter_saved_game');
      setHasSavedGame(false);
    }

    const players: Player[] = chosenPlayers.map(name => ({
      name, score: config.startScore, legs: 0, sets: 0,
      legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [],
      matchFirst9Pts: 0, matchFirst9Darts: 0,
      sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0,
      checkoutAttempts: 0, checkoutSuccesses: 0,
      isBot: profiles[name]?.isBot,
      targetAverage: profiles[name]?.targetAverage,
      color: profiles[name]?.color,
      segmentHits: {},
      triplesHit: 0
    }));

    setGameState({
      players,
      activePlayer: 0,
      startingPlayerOfLeg: 0,
      config,
      currentRoundDarts: [],
      currentMultiplier: 1,
      isProcessing: false,
      history: []
    });
    setRoundBust(false);
    setScreen('game');
  };

  const abortGame = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    localStorage.removeItem('dartcounter_saved_game');
    setHasSavedGame(false);
    setScreen('start');
  };

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
      let displayString = baseValue === 0 ? "0" : `${multString}${baseValue === 25 && mult === 1 ? "" : (baseValue === 25 ? "" : baseValue)}`;

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
    let roundTotal = state.currentRoundDarts.reduce((sum, dart) => sum + dart.value, 0);
    let p = state.players[state.activePlayer];
    let newScore = p.score - roundTotal;
    let lastDart = state.currentRoundDarts[state.currentRoundDarts.length - 1];
    
    let bust = false, isWin = false;

    if (newScore < 0) bust = true;
    if (newScore === 1 && (state.config.outMode === 'DO' || state.config.outMode === 'MO')) bust = true;
    if (newScore === 0) {
        if (state.config.outMode === 'DO' && lastDart.mult !== 2) bust = true;
        if (state.config.outMode === 'MO' && lastDart.mult !== 2 && lastDart.mult !== 3) bust = true;
        if (!bust) isWin = true;
    }

    if (bust || isWin || state.currentRoundDarts.length === 3) {
      if (bust) {
        setCelebration({ type: 'bust', playerIndex: state.activePlayer });
        playBustSound();
      } else if (isWin) {
        setCelebration({ type: 'checkout', playerIndex: state.activePlayer });
        if (roundTotal >= 100) {
            playHighFinishSound();
        }
        speak("Game Shot");
      } else if (state.currentRoundDarts.length === 3 && roundTotal === 180) {
        setCelebration({ type: '180', playerIndex: state.activePlayer });
        play180Sound();
      } else if (state.currentRoundDarts.length === 3) {
        speak(roundTotal.toString());
      }

      setGameState(s => ({ ...s, isProcessing: true }));
      setRoundBust(bust);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        processRoundEnd(state, bust, isWin, roundTotal);
      }, 800);
    }
  };

  const processRoundEnd = (_stateSnapshotBeforeTimeout: GameState, bust: boolean, isWin: boolean, roundTotal: number) => {
    setGameState(prevState => {
      let p = prevState.players[prevState.activePlayer];
      let dartsThrown = prevState.currentRoundDarts.length;
      
      let tempScore = p.score;
      let wasOnDouble = false;
      if ((tempScore <= 40 && tempScore % 2 === 0) || tempScore === 50) wasOnDouble = true;
      for (let dart of prevState.currentRoundDarts) {
          tempScore -= dart.value;
          if (tempScore > 0 && ((tempScore <= 40 && tempScore % 2 === 0) || tempScore === 50)) {
              wasOnDouble = true;
          }
      }
      
      const newPlayers = [...prevState.players];
      const currentPlayerIndex = prevState.activePlayer;
      const updatedPlayer = { ...p };

      let startDartCount = updatedPlayer.legDarts;
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
      for (let dart of prevState.currentRoundDarts) {
          const key = String(dart.base);
          updatedPlayer.segmentHits[key] = (updatedPlayer.segmentHits[key] || 0) + 1;
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

      if (p.isBot && (isWin || wasOnDouble)) {
          let botAttempts = 0;
          let botSuccesses = 0;
          let tScore = p.score;
          for (let dart of prevState.currentRoundDarts) {
              if ((tScore <= 40 && tScore % 2 === 0) || tScore === 50) {
                  botAttempts++;
                  if (tScore - dart.value === 0 && dart.mult === 2) {
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
      } else if (!p.isBot && (isWin || wasOnDouble)) {
         let autoCheckoutDarts = 0;
         let tScore = p.score;
         for (let dart of prevState.currentRoundDarts) {
             if ((tScore <= 40 && tScore % 2 === 0) || tScore === 50) {
                 autoCheckoutDarts++;
             }
             tScore -= dart.value;
         }

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
      }

      return continueProcessRoundEnd(stateAfterDart, isWin, currentPlayerIndex, highestThrow);
    });
  };

  const continueProcessRoundEnd = (stateAfterDart: GameState, isWin: boolean, currentPlayerIndex: number, highestThrow: number) => {
      const snapshot = saveStateToHistory(stateAfterDart);
      const newHistory = [...stateAfterDart.history, snapshot];
      
      let nextState = {
        ...stateAfterDart,
        history: newHistory
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
    let winner = { ...newPlayers[winnerIndex] };
    winner.legs += 1;
    newPlayers[winnerIndex] = winner;

    for (let i = 0; i < newPlayers.length; i++) {
        let p = { ...newPlayers[i] };
        let legAvg = p.legDarts > 0 ? ((p.legPts / p.legDarts) * 3).toFixed(1) : "0.0";
        p.legHistory = [...p.legHistory, legAvg];
        p.legPts = 0; 
        p.legDarts = 0; 
        p.score = currentState.config.startScore;
        newPlayers[i] = p;
    }

    winner = newPlayers[winnerIndex];

    if (winner.legs >= currentState.config.legsToWin) {
        winner.sets += 1;
        newPlayers[winnerIndex] = winner;
        
        if (winner.sets >= currentState.config.setsToWin) {
            showMatchStats(currentState, winnerIndex, newPlayers, newHighestThrow);
            localStorage.removeItem('dartcounter_saved_game');
            setHasSavedGame(false);
            return {
              ...currentState,
              players: newPlayers,
              isProcessing: true
            };
        }

        for (let i = 0; i < newPlayers.length; i++) {
            newPlayers[i].legs = 0;
        }
    }

    const nextStarter = (currentState.startingPlayerOfLeg + 1) % currentState.players.length;
    const nextP = newPlayers[nextStarter];
    if (!nextP.isBot) {
        setTimeout(() => {
            speak("Game on");
        }, 1500);
    }

    const legDartsTaken = currentState.players[winnerIndex].legDarts;
    
    let updatedProfiles = { ...profiles };
    let profilesChanged = false;
    
    if (newHighestThrow > (updatedProfiles[winner.name]?.highestThrow || 0)) {
       updatedProfiles[winner.name] = { ...updatedProfiles[winner.name], highestThrow: newHighestThrow };
       profilesChanged = true;
    }
    
    const currentBestLeg = updatedProfiles[winner.name]?.bestLegDarts;
    if (!currentBestLeg || legDartsTaken < currentBestLeg) {
       updatedProfiles[winner.name] = { ...updatedProfiles[winner.name], bestLegDarts: legDartsTaken };
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
    let winnerName = finalPlayers[winnerIndex].name;
    
    const newProfiles = { ...profiles };
    finalPlayers.forEach((p, i) => {
        if (!newProfiles[p.name]) return;
        const prof = { ...newProfiles[p.name] };
        if (i === winnerIndex) prof.wins += 1;
        prof.matches += 1;
        prof.dartsThrown += p.matchDarts;
        prof.pointsScored += p.matchPts;
        if (p.name === winnerName) {
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

    setProfiles(newProfiles);
    if (user?.id) {
      await saveProfiles(newProfiles, user.id);
    }

    let matchData: MatchHistory = {
        date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
        winner: winnerName,
        gameType: 'standard',
        isOnline: isOnline,
        config: _currentState.config,
        players: finalPlayers.map(p => ({
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
            triplesHit: p.triplesHit || 0
        }))
    };
    
    if (user?.id) {
      await saveMatch(matchData, user.id);
      getMatches(user.id).then(setSavedMatches);
    }

    setStatsModalData({
      isOpen: true,
      winnerIndex,
      players: finalPlayers,
      matchData
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

  useEffect(() => {
    if (!gameState.players.length) return;
    const p = gameState.players[gameState.activePlayer];
    if (!p || !p.isBot) return;
    if (gameState.isProcessing || gameState.currentRoundDarts.length >= 3) return;
    if (roundBust || checkoutPrompt) return;

    const timer = setTimeout(() => {
        const currentTurnScore = gameState.currentRoundDarts.reduce((s, d) => s + d.value, 0);
        const dart = getBotDart(p.targetAverage || 40, p.score - currentTurnScore);
        addDart(dart.base, dart.mult);
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameState.activePlayer, gameState.currentRoundDarts, gameState.isProcessing, roundBust, checkoutPrompt, gameState.players]);

  return {
    gameState, setGameState, roundBust, celebration, setCelebration,
    checkoutPrompt, startGame, abortGame, resumeGame, undoSingleDart,
    toggleMultiplier, submitCheckoutPrompt, hasSavedGame, setHasSavedGame,
    addDart, timeoutRef
  };
}
