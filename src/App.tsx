import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { HomeContainer } from './components/HomeContainer';
import { MainMenu } from './components/MainMenu';
import { StatsPage } from './components/StatsPage';
import { ProfileTab } from './components/ProfileTab';
import { BottomNav } from './components/BottomNav';
import { AuthScreen } from './components/AuthScreen';
import { LobbyBrowser } from './components/LobbyBrowser';
import { LobbyRoom } from './components/LobbyRoom';
import { OnlineGameWrapper } from './components/OnlineGameWrapper';
import { GameScreen } from './components/GameScreen';
import { PowerScoring } from './components/PowerScoring';
import { SplitScore } from './components/SplitScore';
import { CheckoutTraining } from './components/CheckoutTraining';
import { StatsModal, HistoryModal } from './components/Modals';
import type { Player, MatchHistory } from './types';
import { startSync, saveProfiles, saveMatch, getMatches } from './db/database';
import { isSoundEnabled, setSoundEnabled } from './utils/audio';

import { useProfiles } from './hooks/useProfiles';
import { useGameEngine } from './hooks/useGameEngine';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initialize } = useAuthStore();
  
  const { profiles, setProfiles, handleCreateProfile, handleUpdateProfile, handleDeleteProfile } = useProfiles(user);
  
  const [savedMatches, setSavedMatches] = useState<MatchHistory[]>([]);
  const [miniGameConfig, setMiniGameConfig] = useState<{players: string[], settings: Record<string, any>}>({players: [], settings: {}});
  const [showHistory, setShowHistory] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const hideBottomNavRoutes = ['/game', '/powerscoring', '/splitscore', '/checkout', '/online-game'];
  const isMatchActive = hideBottomNavRoutes.some(route => location.pathname.startsWith(route)) || location.pathname.startsWith('/lobby/');

  const effectiveMiniGamePlayers = miniGameConfig.players.length > 0 
    ? miniGameConfig.players 
    : [user?.user_metadata?.username || Object.keys(profiles)[0] || 'Gast 1'];
  
  const [statsModalData, setStatsModalData] = useState<{
    isOpen: boolean;
    winnerIndex: number | null;
    players: Player[];
    matchData: MatchHistory | null;
  }>({ isOpen: false, winnerIndex: null, players: [], matchData: null });

  // Map 'screen' string to actual routes for backwards compatibility in hooks
  const setScreen = (screen: string) => {
    if (screen === 'start') navigate('/offline');
    else navigate('/' + screen);
  };

  const gameEngine = useGameEngine({
    profiles,
    setProfiles,
    setSavedMatches,
    setScreen,
    setStatsModalData,
    user
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    startSync(window.location.hostname);
    getMatches(user?.id).then(setSavedMatches);
  }, [user?.id]);

  return (
    <div className={`app-container ${isMatchActive ? 'app-container-match' : ''}`}>
      {!isMatchActive && (
        <button 
          className="sound-toggle-btn"
          onClick={() => {
            const newState = !soundOn;
            setSoundEnabled(newState);
            setSoundOn(newState);
          }}
          style={{
            position: 'absolute', top: '15px', right: '15px', zIndex: 1000, 
            background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', 
            borderRadius: '50%', width: '40px', height: '40px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2em', cursor: 'pointer', padding: 0
          }}
          title={soundOn ? "Sound ausschalten" : "Sound einschalten"}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      )}

      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/online" element={<LobbyBrowser />} />
        <Route path="/lobby/:code" element={<LobbyRoom />} />
        <Route path="/online-game" element={<OnlineGameWrapper />} />
        
        <Route path="/offline" element={
          <HomeContainer 
            profiles={profiles}
            setProfiles={setProfiles}
            matches={savedMatches}
            onCreateProfile={handleCreateProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
            onStartGame={gameEngine.startGame}
            hasSavedGame={gameEngine.hasSavedGame}
            onResumeGame={gameEngine.resumeGame}
            onStartMiniGame={(mode, players, settings) => {
               setMiniGameConfig({ players, settings });
               setScreen(mode as string);
            }}
          />
        } />

        <Route path="/game" element={
          <GameScreen 
            players={gameEngine.gameState.players}
            activePlayer={gameEngine.gameState.activePlayer}
            startingPlayerOfLeg={gameEngine.gameState.startingPlayerOfLeg}
            config={gameEngine.gameState.config}
            currentRoundDarts={gameEngine.gameState.currentRoundDarts}
            currentMultiplier={gameEngine.gameState.currentMultiplier}
            isProcessing={gameEngine.gameState.isProcessing}
            roundBust={gameEngine.roundBust}
            addDart={gameEngine.addDart}
            toggleMultiplier={gameEngine.toggleMultiplier}
            undoSingleDart={gameEngine.undoSingleDart}
            abortGame={gameEngine.abortGame}
            checkoutPrompt={gameEngine.checkoutPrompt}
            submitCheckoutPrompt={gameEngine.submitCheckoutPrompt}
            celebration={gameEngine.celebration}
            canUndo={gameEngine.gameState.history.length > 0 || gameEngine.gameState.currentRoundDarts.length > 0}
          />
        } />

        <Route path="/powerscoring" element={
          <PowerScoring 
            players={effectiveMiniGamePlayers}
            profiles={profiles}
            rounds={miniGameConfig.settings.rounds || 10}
            onAbort={() => setScreen('start')}
            onFinish={async (results) => {
               const newProfiles = { ...profiles };
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
               setProfiles(newProfiles);
               await saveProfiles(newProfiles, user?.id);
               
               const matchData: MatchHistory = {
                   date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
                   winner: results.reduce((prev, current) => (prev.score > current.score) ? prev : current).name,
                   gameType: 'powerScoring',
                   players: results.map(r => ({
                       name: r.name, sets: 0, legs: 0, avg: "0.0", first9: "0.0", score: r.score
                   }))
               };
               await saveMatch(matchData, user?.id);
               getMatches(user?.id).then(setSavedMatches);
               
               const winnerIdx = results.findIndex(r => r.name === matchData.winner);
               setStatsModalData({
                 isOpen: true,
                 winnerIndex: winnerIdx >= 0 ? winnerIdx : 0,
                 players: results.map(r => ({
                   name: r.name, score: r.score, legs: 0, sets: 0,
                   legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [],
                   matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
                   oneFortyPlus: 0, oneEighty: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
                   highestCheckout: 0, segmentHits: {}
                 })),
                 matchData
               });
            }}
          />
        } />

        <Route path="/splitscore" element={
          <SplitScore 
            players={effectiveMiniGamePlayers}
            profiles={profiles}
            onAbort={() => setScreen('start')}
            onFinish={async (results) => {
               const newProfiles = { ...profiles };
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
               setProfiles(newProfiles);
               await saveProfiles(newProfiles, user?.id);
               
               const matchData: MatchHistory = {
                   date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
                   winner: results.reduce((prev, current) => (prev.score > current.score) ? prev : current).name,
                   gameType: 'splitScore',
                   players: results.map(r => ({
                       name: r.name, sets: 0, legs: 0, avg: "0.0", first9: "0.0", score: r.score
                   }))
               };
               await saveMatch(matchData, user?.id);
               getMatches(user?.id).then(setSavedMatches);
               
               const winnerIdx = results.findIndex(r => r.name === matchData.winner);
               setStatsModalData({
                 isOpen: true,
                 winnerIndex: winnerIdx >= 0 ? winnerIdx : 0,
                 players: results.map(r => ({
                   name: r.name, score: r.score, legs: 0, sets: 0,
                   legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [],
                   matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
                   oneFortyPlus: 0, oneEighty: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
                   highestCheckout: 0, segmentHits: {}
                 })),
                 matchData
               });
            }}
          />
        } />

        <Route path="/checkout" element={
          <CheckoutTraining 
            players={effectiveMiniGamePlayers}
            profiles={profiles}
            checkoutRounds={miniGameConfig.settings.checkoutRounds || 1}
            checkoutTargets={miniGameConfig.settings.checkoutTargets || 10}
            onAbort={() => setScreen('start')}
            onFinish={async (results) => {
               const newProfiles = { ...profiles };
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
               setProfiles(newProfiles);
               await saveProfiles(newProfiles, user?.id);
               
               const matchData: MatchHistory = {
                   date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
                   winner: results.reduce((prev, current) => (prev.score > current.score) ? prev : current).name,
                   gameType: 'checkoutTraining',
                   players: results.map(r => ({
                       name: r.name, sets: 0, legs: 0, avg: "0.0", first9: "0.0", score: r.score, attempts: r.attempts, dartsUsed: r.dartsUsed
                   }))
               };
               await saveMatch(matchData, user?.id);
               getMatches(user?.id).then(setSavedMatches);
               
               const winnerIdx = results.findIndex(r => r.name === matchData.winner);
               setStatsModalData({
                 isOpen: true,
                 winnerIndex: winnerIdx >= 0 ? winnerIdx : 0,
                 players: results.map(r => ({
                   name: r.name, score: r.score, legs: 0, sets: 0,
                   legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [],
                   matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
                   oneFortyPlus: 0, oneEighty: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
                   highestCheckout: 0, segmentHits: {}
                 })),
                 matchData
               });
            }}
          />
        } />
        
        <Route path="/profile" element={
          <ProfileTab 
            profiles={profiles}
            matches={savedMatches}
            onCreateProfile={handleCreateProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
          />
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isMatchActive && <BottomNav />}

      <StatsModal 
        isOpen={statsModalData.isOpen}
        winnerIndex={statsModalData.winnerIndex}
        players={statsModalData.players}
        matchData={statsModalData.matchData}
        onClose={() => {
          setStatsModalData({ isOpen: false, winnerIndex: null, players: [], matchData: null });
          gameEngine.abortGame();
          navigate('/offline');
        }}
      />

      <HistoryModal 
        isOpen={showHistory}
        history={savedMatches}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
