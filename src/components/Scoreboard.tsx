import React, { useState, useEffect, useRef } from 'react';
import type { Player, GameConfig } from '../types';
import { getCheckoutSuggestion, checkoutRange } from '../utils/checkouts';
import { playerColorBySeat, teamColor } from '../utils/playerColors';

interface ScoreboardProps {
  players: Player[];
  activePlayer: number;
  startingPlayerOfLeg: number;
  config: GameConfig;
  currentRoundDarts: import('../types').Dart[];
  celebration?: { type: string, playerIndex: number } | null;
}

interface TeamSideProps {
  team: 1 | 2;
  total: number;
  justUnlocked: boolean;
  /** Vorher zwei Zweige mit identischem Markup: `isBothBlocked` und `isTXBlocked`. */
  blocked: boolean;
}

/** Eine Seite der 2v2-Leiste: Punkt, Name, Punktzahl und Sperrzustand. */
const TeamSide: React.FC<TeamSideProps> = ({ team, total, justUnlocked, blocked }) => (
  <div
    className="team-bar-side"
    style={{ '--player-color': teamColor(team) } as React.CSSProperties}
  >
    <span className="team-dot" />
    <strong className="team-name">Team {team}:</strong>
    <span className="team-total">{total} Pkt</span>
    {justUnlocked ? (
      <span className="lock-badge-bar unlocking" style={{ padding: '2px 8px', margin: 0 }}>
        🔓 Entblockt!
      </span>
    ) : blocked ? (
      <span className="lock-chip">🔒 Geblockt</span>
    ) : null}
  </div>
);


export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  activePlayer,
  startingPlayerOfLeg,
  config,
  currentRoundDarts,
  celebration
}) => {
  const is2v2 = Boolean(config?.is2v2 || (players.length === 4 && (players[0]?.team !== undefined || players.some(p => p.team !== undefined))));

  // Live effective scores including current round darts of active player
  const liveScores = players.map((p, idx) => {
    const roundTotal = idx === activePlayer ? currentRoundDarts.reduce((sum, d) => sum + d.value, 0) : 0;
    return Math.max(0, p.score - roundTotal);
  });

  const t1Total = is2v2 ? (liveScores[0] + liveScores[2]) : 0;
  const t2Total = is2v2 ? (liveScores[1] + liveScores[3]) : 0;

  // Team 1 is blocked if Partner score > Opponents Team total
  const t1DiffP0 = is2v2 ? liveScores[2] - t2Total : 0;
  const t1DiffP2 = is2v2 ? liveScores[0] - t2Total : 0;
  const t1Diff = Math.max(t1DiffP0, t1DiffP2);
  const isT1Blocked = is2v2 && t1Diff > 0;

  // Team 2 is blocked if Partner score > Opponents Team total
  const t2DiffP1 = is2v2 ? liveScores[3] - t1Total : 0;
  const t2DiffP3 = is2v2 ? liveScores[1] - t1Total : 0;
  const t2Diff = Math.max(t2DiffP1, t2DiffP3);
  const isT2Blocked = is2v2 && t2Diff > 0;

  const isBothBlocked = isT1Blocked && isT2Blocked;
  const isAnyBlocked = isT1Blocked || isT2Blocked;

  // Strict check: find which individual players in the whole match have score > opposing team total
  const throwerIndices = is2v2
    ? [0, 1, 2, 3].filter(idx => (idx % 2 === 0 ? liveScores[idx] > t2Total : liveScores[idx] > t1Total))
    : [];
  const isOnlySinglePersonBlocking = is2v2 && (throwerIndices.length === 1);
  const singleThrowerIndex = isOnlySinglePersonBlocking ? throwerIndices[0] : -1;

  // Unlock animation state handling
  const prevT1Blocked = useRef(isT1Blocked);
  const prevT2Blocked = useRef(isT2Blocked);
  const [t1JustUnlocked, setT1JustUnlocked] = useState(false);
  const [t2JustUnlocked, setT2JustUnlocked] = useState(false);

  useEffect(() => {
    if (prevT1Blocked.current && !isT1Blocked) {
      setT1JustUnlocked(true);
      const timer = setTimeout(() => setT1JustUnlocked(false), 2200);
      return () => clearTimeout(timer);
    }
    prevT1Blocked.current = isT1Blocked;
  }, [isT1Blocked]);

  useEffect(() => {
    if (prevT2Blocked.current && !isT2Blocked) {
      setT2JustUnlocked(true);
      const timer = setTimeout(() => setT2JustUnlocked(false), 2200);
      return () => clearTimeout(timer);
    }
    prevT2Blocked.current = isT2Blocked;
  }, [isT2Blocked]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '6px' }}>
      {is2v2 && (
        <div className="team-bar">
          <TeamSide
            team={1}
            total={t1Total}
            justUnlocked={t1JustUnlocked}
            blocked={isBothBlocked || isT1Blocked}
          />

          <div className={`team-status ${
            (t1JustUnlocked || t2JustUnlocked) ? 'is-unlocked' : isAnyBlocked ? 'is-blocked' : ''
          }`}>
            {t1JustUnlocked ? (
              <span>🔓 Team 1 wurde entblockt!</span>
            ) : t2JustUnlocked ? (
              <span>🔓 Team 2 wurde entblockt!</span>
            ) : isOnlySinglePersonBlocking && singleThrowerIndex !== -1 ? (
              <span>🔒 {singleThrowerIndex % 2 === 0 ? 'Team 1' : 'Team 2'} geblockt (Partner muss mind. {singleThrowerIndex % 2 === 0 ? t1Diff : t2Diff} Pkt werfen)</span>
            ) : isAnyBlocked ? (
              <span>🔒 Beide Teams gegenseitig geblockt</span>
            ) : (
              <span>🎯 2v2 Doppel Modus (Freeze)</span>
            )}
          </div>

          <TeamSide
            team={2}
            total={t2Total}
            justUnlocked={t2JustUnlocked}
            blocked={isBothBlocked || isT2Blocked}
          />
        </div>
      )}

      {/* The column count is a layout decision, so it lives in CSS: in landscape
          the board sits in a tall, narrow column where stacked rows read far
          better than squeezed side-by-side cards. */}
      <div className="scoreboard" data-players={players.length} style={{ flex: 1, height: '100%', width: '100%', minWidth: 0, minHeight: 0 }}>
        {players.map((p, i) => {
          const legAvg = p.legDarts > 0 ? ((p.legPts / p.legDarts) * 3).toFixed(1) : "–";
          const matchAvg = p.matchDarts > 0 ? ((p.matchPts / p.matchDarts) * 3).toFixed(1) : "–";
          const isActive = i === activePlayer;
          const isStarter = i === startingPlayerOfLeg;
          
          const currentRoundTotal = isActive ? currentRoundDarts.reduce((sum, d) => sum + d.value, 0) : 0;
          const liveScore = liveScores[i];
          const { min: checkoutMin, max: checkoutMax } = checkoutRange(config.outMode);
          const isCheckoutRange = liveScore >= checkoutMin && liveScore <= checkoutMax;
          
          let celebrationClass = '';
          if (celebration && celebration.playerIndex === i) {
            if (celebration.type === '180') celebrationClass = 'celebration-180';
            else if (celebration.type === 'checkout') celebrationClass = 'celebration-checkout';
            else if (celebration.type === 'bust') celebrationClass = 'shake-bust';
          }

          const coPercent = p.checkoutAttempts > 0 
            ? ((p.checkoutSuccesses / p.checkoutAttempts) * 100).toFixed(0) 
            : "–";

          // Eigene Farbe des Profils schlägt alles; sonst die Palette — in 2v2
          // nach Team, sonst nach Sitzplatz.
          const playerColor = p.color
            || (is2v2 ? teamColor(i % 2 === 0 ? 1 : 2) : playerColorBySeat(i));
          const playerTeamNumber = p.team || (i % 2 === 0 ? 1 : 2);

          const partnerIdx = is2v2 ? (i + 2) % 4 : 0;
          const opp1Idx = is2v2 ? (i % 2 === 0 ? 1 : 0) : 0;
          const opp2Idx = is2v2 ? (i % 2 === 0 ? 3 : 2) : 0;
          const oppTeamTotal = is2v2 ? (liveScores[opp1Idx] + liveScores[opp2Idx]) : 0;

          // If partner's score > opponents total, this player is blocked from checking out
          const pointsToUnblockMe = is2v2 ? liveScores[partnerIdx] - oppTeamTotal : 0;
          const isThisPlayerBlockedFromFinishing = pointsToUnblockMe > 0;

          // If this player's score > opponents total, this player is the one whose score is too high and must throw points down
          const pointsINeedToThrow = is2v2 ? liveScores[i] - oppTeamTotal : 0;
          const isThisPlayerTheThrower = pointsINeedToThrow > 0;

          const isCardInvolvedInLock = isThisPlayerBlockedFromFinishing || isThisPlayerTheThrower;
          const isMyTeamJustUnlocked = playerTeamNumber === 1 ? t1JustUnlocked : t2JustUnlocked;

          const checkoutSuggestion = isActive && isCheckoutRange ? getCheckoutSuggestion(liveScore, config.outMode, currentRoundDarts.length) : null;

          return (
            <div 
              key={i} 
              className={`player-card ${isActive ? 'is-active' : 'is-inactive'} ${isStarter ? 'is-starter' : ''} ${celebrationClass} ${isCheckoutRange ? 'checkout-range' : ''}`}
              style={{ 
                '--player-color': playerColor,
                borderLeftColor: isActive ? playerColor : undefined
              } as React.CSSProperties}
            >
              <div className="player-card-head">
                <div className="player-card-ident">
                  <span className={`starter-dot ${isStarter ? 'is-starter' : ''}`} />
                  <h3
                    className={`player-name ${isActive ? 'is-active' : ''}`}
                    style={isActive ? { color: playerColor } : undefined}
                  >
                    {p.isBot ? '🤖 ' : ''}{p.name}
                  </h3>
                </div>
                <div className="badge-container">
                  {is2v2 && (
                    <span className={`badge-team ${isCardInvolvedInLock ? 'is-locked' : ''}`}>
                      {isMyTeamJustUnlocked ? (
                        <span>🔓</span>
                      ) : isCardInvolvedInLock ? (
                        <span>🔒</span>
                      ) : null}
                      <span>T{playerTeamNumber}</span>
                    </span>
                  )}
                  {config.setsToWin > 1 && (
                    <span className="badge-count">S: <strong>{p.sets}</strong></span>
                  )}
                  <span className="badge-count">L: <strong>{p.legs}</strong></span>
                </div>
              </div>

              {/* 2v2 Lock Status Bar */}
              {is2v2 && isMyTeamJustUnlocked && (
                <div className="lock-badge-bar unlocking">
                  <span className="lock-icon-opening">🔓</span>
                  <span><strong>Schloss geöffnet!</strong> Entblockt</span>
                </div>
              )}

              {is2v2 && !isMyTeamJustUnlocked && isOnlySinglePersonBlocking && i === singleThrowerIndex && (
                <div className="lock-badge-bar must-throw">
                  <span>🔒</span>
                  <span>Muss mind. <strong>{pointsINeedToThrow} Pkt</strong> werfen</span>
                </div>
              )}

              {is2v2 && !isMyTeamJustUnlocked && (!isOnlySinglePersonBlocking || i !== singleThrowerIndex) && isCardInvolvedInLock && (
                <div className="lock-badge-bar locked">
                  <span>🔒</span>
                  <span><strong>Geblockt</strong></span>
                </div>
              )}

              <div className="score-display">
                <span className="score-anim-pulse" key={liveScore}>
                  {liveScore}
                </span>
                {isActive && currentRoundTotal > 0 && (
                  <span className="live-preview-darts">
                    -{currentRoundTotal}
                  </span>
                )}
              </div>
              
              <div className="checkout-slot">
                {/* A frozen player still gets to see the finish, marked as blocked:
                    hiding it looked like there was none, and `.checkout-pill-frozen`
                    had been styled for this since the freeze rule was written. */}
                {checkoutSuggestion ? (
                  <div
                    className={isThisPlayerBlockedFromFinishing ? 'checkout-pill-frozen' : 'checkout-pill'}
                    title={isThisPlayerBlockedFromFinishing ? 'Freeze: Dein Team darf noch nicht auschecken' : undefined}
                  >
                    {isThisPlayerBlockedFromFinishing ? `❄️ ${checkoutSuggestion}` : checkoutSuggestion}
                  </div>
                ) : (
                  <span className="player-darts-note">
                    {p.legDarts + (isActive ? currentRoundDarts.length : 0)} Darts im Leg
                  </span>
                )}
              </div>

              <div className="compact-stats">
                <span>Leg <strong>{legAvg}</strong></span>
                <span>Match <strong>{matchAvg}</strong></span>
                <span>CO <strong>{coPercent}%</strong></span>
                <span className="stat-secondary">100+: <strong>{p.hundredPlus}</strong></span>
                <span className="stat-secondary">180: <strong>{p.oneEighty}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
