import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { StatsModal } from './components/Modals';
import type { Player, MatchHistory, Profile } from './types';
import { saveMatch, getMatches, syncMatchesAndProfilesForGuests, reconstructAllProfilesFromMatches } from './db/database';
import { reportPersistenceError, useNotificationStore } from './store/useNotificationStore';

import { useProfiles } from './hooks/useProfiles';
import { useGameEngine } from './hooks/useGameEngine';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';

type MiniGameResult = {
  name: string;
  score: number;
  attempts?: number;
  dartsUsed?: number;
  roundsCompleted?: number;
};

/** Placeholder player rows so the result modal can render mini-game scores. */
const toModalPlayer = (r: MiniGameResult): Player => ({
  name: r.name, score: r.score, legs: 0, sets: 0,
  legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [],
  matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
  oneFortyPlus: 0, oneEighty: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
  highestCheckout: 0, segmentHits: {}
});

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initialize } = useAuthStore();
  const { theme, scanlines, gridAnimation } = useThemeStore();
  const notifications = useNotificationStore(s => s.notifications);
  const dismissNotification = useNotificationStore(s => s.dismiss);

  const { profiles, setProfiles, applyProfiles, loadedForUserId, handleCreateProfile, handleUpdateProfile, handleDeleteProfile } = useProfiles(user);

  const [savedMatches, setSavedMatches] = useState<MatchHistory[]>([]);
  const [miniGameConfig, setMiniGameConfig] = useState<{ players: string[], settings: Record<string, unknown> }>({ players: [], settings: {} });
  const [matchSessionId, setMatchSessionId] = useState<number>(1);

  // Two different things, previously conflated: a live board takes over the
  // viewport (fixed, no scrolling), while the lobby only hides the dock. Giving
  // the lobby the fullscreen treatment clipped its "Spiel starten" button off
  // the bottom of a phone with no way to scroll to it.
  const fullscreenMatchRoutes = ['/game', '/powerscoring', '/splitscore', '/checkout', '/online-game'];
  const isMatchActive = fullscreenMatchRoutes.some(route => location.pathname.startsWith(route));
  const hideBottomNav = isMatchActive || location.pathname.startsWith('/lobby/');

  const effectiveMiniGamePlayers = miniGameConfig.players.length > 0
    ? miniGameConfig.players
    : [user?.user_metadata?.username || Object.keys(profiles)[0] || 'Gast 1'];

  const [statsModalData, setStatsModalData] = useState<{
    isOpen: boolean;
    winnerIndex: number | null;
    players: Player[];
    matchData: MatchHistory | null;
    pendingProfiles?: Record<string, Profile>;
    pendingMatchData?: MatchHistory;
  }>({ isOpen: false, winnerIndex: null, players: [], matchData: null });

  // Bridges the hook's legacy `screen` strings onto the router.
  const setScreen = useCallback((screen: string) => {
    if (screen === 'start') navigate('/offline');
    else navigate('/' + screen);
  }, [navigate]);

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
    let cancelled = false;

    getMatches(user?.id).then(matches => {
      if (cancelled) return;
      setSavedMatches(matches);
      if (matches.length === 0) return;

      // Reconciliation writes back to the cloud, so it must never run against a
      // profile set that belongs to someone else. This effect and the loader in
      // useProfiles both key off user?.id and race; when the match query won,
      // `prev` still held the guest defaults and this saved them over the
      // signed-in user's real profiles.
      if (loadedForUserId !== (user?.id ?? null)) return;

      const username = user?.user_metadata?.username;
      // `applyProfiles` resolves this against the live profile set and persists
      // the result itself. The reconciliation used to run inside a `setProfiles`
      // updater with the save call in its body — a side effect in a function
      // React may invoke twice, and whose result the save could not observe.
      applyProfiles(prev => {
        if (Object.keys(prev).length === 0) return prev;
        const updated = reconstructAllProfilesFromMatches(prev, matches, username ? [username] : []);
        if (JSON.stringify(updated) === JSON.stringify(prev)) return prev;
        return updated;
      });
    });

    return () => { cancelled = true; };
  }, [user?.id, user?.user_metadata?.username, loadedForUserId, applyProfiles]);

  /**
   * Books a finished mini-game. The profile update is computed from the current
   * profiles rather than inside a `setState` updater — updaters must stay pure,
   * and the previous inline version double-counted every match under StrictMode.
   */
  const finishMiniGame = useCallback(async (
    results: MiniGameResult[],
    gameType: 'powerScoring' | 'splitScore' | 'checkoutTraining'
  ) => {
    const updatedProfiles: Record<string, Profile> = { ...profiles };
    const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;

    for (const r of results) {
      const existing = updatedProfiles[r.name];
      if (!existing) continue;
      const p: Profile = { ...existing };

      if (gameType === 'powerScoring' || gameType === 'splitScore') {
        const stats = { ...(p[gameType] || { bestScore: 0, matchesPlayed: 0, wins: 0, totalScore: 0 }) };
        stats.bestScore = Math.max(stats.bestScore, r.score);
        stats.matchesPlayed += 1;
        stats.totalScore = (stats.totalScore || 0) + r.score;
        if (r.score === maxScore) stats.wins += 1;
        p[gameType] = stats;
      } else {
        const stats = { ...(p.checkoutTraining || { bestCheckout: 0, roundsCompleted: 0, matchesPlayed: 0, wins: 0, totalAttempts: 0, totalDartsUsed: 0 }) };
        stats.bestCheckout = Math.max(stats.bestCheckout, r.score);
        stats.roundsCompleted += r.roundsCompleted || 0;
        stats.matchesPlayed += 1;
        stats.totalAttempts = (stats.totalAttempts || 0) + (r.attempts || 0);
        stats.totalDartsUsed = (stats.totalDartsUsed || 0) + (r.dartsUsed || 0);
        if (r.score === maxScore) stats.wins += 1;
        p.checkoutTraining = stats;
      }

      updatedProfiles[r.name] = p;
    }

    await applyProfiles(updatedProfiles);

    const winner = results.reduce((prev, current) => (prev.score > current.score ? prev : current));
    const matchData: MatchHistory = {
      date: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
      winner: winner.name,
      gameType,
      players: results.map(r => ({
        name: r.name, sets: 0, legs: 0, avg: '0.0', first9: '0.0',
        score: r.score,
        ...(gameType === 'checkoutTraining' ? { attempts: r.attempts, dartsUsed: r.dartsUsed } : {})
      }))
    };
    try {
      await saveMatch(matchData, user?.id);
    } catch (err) {
      reportPersistenceError(err, 'Trainingsergebnis konnte nicht gespeichert werden');
    }
    getMatches(user?.id).then(setSavedMatches);

    const winnerIdx = results.findIndex(r => r.name === winner.name);
    setStatsModalData({
      isOpen: true,
      winnerIndex: winnerIdx >= 0 ? winnerIdx : 0,
      players: results.map(toModalPlayer),
      matchData
    });
  }, [profiles, applyProfiles, user]);

  const commitPendingMatch = useCallback(async () => {
    if (!statsModalData.pendingProfiles || !statsModalData.pendingMatchData) return;
    await applyProfiles(statsModalData.pendingProfiles);
    try {
      await saveMatch(statsModalData.pendingMatchData, user?.id);
    } catch (err) {
      reportPersistenceError(err, 'Match konnte nicht gespeichert werden');
    }
    getMatches(user?.id).then(setSavedMatches);

    // Push each linked cloud guest's share of the match to their own account.
    const hostName = user?.user_metadata?.username || user?.email || 'Host';
    syncMatchesAndProfilesForGuests(
      statsModalData.players,
      statsModalData.pendingMatchData,
      statsModalData.pendingMatchData.winner,
      user?.id,
      hostName
    ).catch(err => console.error('Guest sync error in background', err));
  }, [statsModalData, applyProfiles, user]);

  const themeOverlays = useMemo(() => {
    if (theme === 'vaporwave') {
      return (
        <>
          <div className="vaporwave-sun" />
          {gridAnimation && <div className="vaporwave-grid-floor" />}
          {scanlines && <div className="crt-scanlines" />}
        </>
      );
    }
    if (theme === 'cyberpunk') {
      return (
        <>
          {gridAnimation && <div className="cyberpunk-circuit-grid" />}
          {scanlines && <div className="cyberpunk-scanlines" />}
        </>
      );
    }
    return null;
  }, [theme, gridAnimation, scanlines]);

  return (
    <div className={`app-container ${isMatchActive ? 'app-container-match' : ''}`}>
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
            onStartGame={gameEngine.startGame}
            hasSavedGame={gameEngine.hasSavedGame}
            onResumeGame={gameEngine.resumeGame}
            onDiscardSavedGame={gameEngine.discardSavedGame}
            onStartMiniGame={(mode, players, settings) => {
              setMiniGameConfig({ players, settings });
              setMatchSessionId(prev => prev + 1);
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
            key={matchSessionId}
            players={effectiveMiniGamePlayers}
            profiles={profiles}
            rounds={(miniGameConfig.settings.rounds as number) || 10}
            onAbort={() => setScreen('start')}
            onFinish={results => finishMiniGame(results, 'powerScoring')}
          />
        } />

        <Route path="/splitscore" element={
          <SplitScore
            key={matchSessionId}
            players={effectiveMiniGamePlayers}
            profiles={profiles}
            onAbort={() => setScreen('start')}
            onFinish={results => finishMiniGame(results, 'splitScore')}
          />
        } />

        <Route path="/checkout" element={
          <CheckoutTraining
            key={matchSessionId}
            players={effectiveMiniGamePlayers}
            profiles={profiles}
            checkoutRounds={(miniGameConfig.settings.checkoutRounds as number) || 1}
            checkoutTargets={(miniGameConfig.settings.checkoutTargets as number) || 10}
            onAbort={() => setScreen('start')}
            onFinish={results => finishMiniGame(results, 'checkoutTraining')}
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

      {!hideBottomNav && <BottomNav />}

      {gameEngine.remoteAbortNotice && (
        <div className="global-toast" role="alert">
          <span aria-hidden="true">⚠️</span>
          <div className="global-toast-body">
            <strong>Match beendet</strong>
            <span>{gameEngine.remoteAbortNotice}</span>
          </div>
          <button className="btn-close" onClick={gameEngine.dismissRemoteAbortNotice} aria-label="Hinweis schließen">✕</button>
        </div>
      )}

      {/* Failed writes used to be console-only; the player kept scoring against
          data that was no longer being saved anywhere. */}
      {notifications.map(n => (
        <div key={n.id} className="global-toast" role="alert">
          <span aria-hidden="true">{n.type === 'error' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'}</span>
          <div className="global-toast-body">
            <strong>{n.title}</strong>
            <span>{n.message}</span>
          </div>
          <button className="btn-close" onClick={() => dismissNotification(n.id)} aria-label="Hinweis schließen">✕</button>
        </div>
      ))}

      <StatsModal
        isOpen={statsModalData.isOpen}
        winnerIndex={statsModalData.winnerIndex}
        players={statsModalData.players}
        matchData={statsModalData.matchData}
        onClose={async () => {
          await commitPendingMatch();
          setStatsModalData({ isOpen: false, winnerIndex: null, players: [], matchData: null });
          gameEngine.abortGame();
          navigate('/');
        }}
        onRematch={async () => {
          await commitPendingMatch();
          const mData = statsModalData.matchData;
          const playerNames = statsModalData.players.map(p => p.name);
          setStatsModalData({ isOpen: false, winnerIndex: null, players: [], matchData: null });
          setMatchSessionId(prev => prev + 1);

          if (mData?.gameType === 'powerScoring') navigate('/powerscoring');
          else if (mData?.gameType === 'splitScore') navigate('/splitscore');
          else if (mData?.gameType === 'checkoutTraining') navigate('/checkout');
          else {
            gameEngine.startGame(playerNames, mData?.config || gameEngine.gameState.config);
            navigate('/game');
          }
        }}
        onUndoLastDart={() => {
          const mData = statsModalData.matchData;
          setStatsModalData({ isOpen: false, winnerIndex: null, players: [], matchData: null });
          gameEngine.undoSingleDart();
          if (!mData?.gameType || mData?.gameType === 'standard') {
            navigate('/game');
          }
        }}
      />

      {themeOverlays}
    </div>
  );
}
