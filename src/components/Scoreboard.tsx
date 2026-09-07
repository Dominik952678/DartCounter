import React, { useState, useEffect, useRef } from 'react';
import type { Player, GameConfig } from '../types';
import { getCheckoutSuggestion, checkoutRange } from '../utils/checkouts';

interface ScoreboardProps {
  players: Player[];
  activePlayer: number;
  startingPlayerOfLeg: number;
  config: GameConfig;
  currentRoundDarts: import('../types').Dart[];
  celebration?: { type: string, playerIndex: number } | null;
}

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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '8px 12px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: '0.85rem',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--blue, #3B82F6)'
            }} />
            <strong style={{ color: 'var(--blue, #3B82F6)' }}>Team 1:</strong>
            <span style={{ fontWeight: 800, color: '#fff' }}>{t1Total} Pkt</span>
            {t1JustUnlocked ? (
              <span className="lock-badge-bar unlocking" style={{ padding: '2px 8px', fontSize: '0.72rem', margin: 0 }}>
                🔓 Entblockt!
              </span>
            ) : isBothBlocked ? (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(255, 30, 30, 0.25)',
                color: '#ff4d4d',
                border: '1px solid #ff3333',
                boxShadow: '0 0 8px rgba(255, 30, 30, 0.35)'
              }}>
                🔒 Geblockt
              </span>
            ) : isT1Blocked ? (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(255, 30, 30, 0.25)',
                color: '#ff4d4d',
                border: '1px solid #ff3333',
                boxShadow: '0 0 8px rgba(255, 30, 30, 0.35)'
              }}>
                🔒 Geblockt
              </span>
            ) : null}
          </div>

          <div style={{
            padding: '4px 12px',
            borderRadius: '12px',
            background: (t1JustUnlocked || t2JustUnlocked) 
              ? 'linear-gradient(135deg, rgba(48, 209, 88, 0.35), rgba(52, 199, 89, 0.18))'
              : isAnyBlocked 
                ? 'linear-gradient(135deg, rgba(255, 30, 30, 0.28), rgba(180, 0, 0, 0.18))' 
                : 'rgba(255, 255, 255, 0.05)',
            border: (t1JustUnlocked || t2JustUnlocked)
              ? '1px solid #30d158'
              : isAnyBlocked 
                ? '1px solid #ff3333' 
                : '1px solid rgba(255, 255, 255, 0.1)',
            color: (t1JustUnlocked || t2JustUnlocked) 
              ? '#30d158' 
              : isAnyBlocked 
                ? '#ff4d4d' 
                : 'var(--text-dim, #aaa)',
            fontSize: '0.82rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: isAnyBlocked ? '0 0 16px rgba(255, 30, 30, 0.45)' : 'none',
            textShadow: isAnyBlocked ? '0 0 8px rgba(255, 50, 50, 0.6)' : 'none'
          }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--orange, #F97316)'
            }} />
            <strong style={{ color: 'var(--orange, #F97316)' }}>Team 2:</strong>
            <span style={{ fontWeight: 800, color: '#fff' }}>{t2Total} Pkt</span>
            {t2JustUnlocked ? (
              <span className="lock-badge-bar unlocking" style={{ padding: '2px 8px', fontSize: '0.72rem', margin: 0 }}>
                🔓 Entblockt!
              </span>
            ) : isBothBlocked ? (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(255, 30, 30, 0.25)',
                color: '#ff4d4d',
                border: '1px solid #ff3333',
                boxShadow: '0 0 8px rgba(255, 30, 30, 0.35)'
              }}>
                🔒 Geblockt
              </span>
            ) : isT2Blocked ? (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(255, 30, 30, 0.25)',
                color: '#ff4d4d',
                border: '1px solid #ff3333',
                boxShadow: '0 0 8px rgba(255, 30, 30, 0.35)'
              }}>
                🔒 Geblockt
              </span>
            ) : null}
          </div>
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

          const playerColor = p.color || (is2v2 ? (i % 2 === 0 ? 'var(--blue)' : 'var(--orange)') : 'var(--blue, #2196f3)');
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                  <span className="starter-dot" style={{ 
                    backgroundColor: isStarter ? playerColor : 'transparent', 
                    border: `2px solid ${playerColor}`, 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    display: 'inline-block',
                    flexShrink: 0,
                    opacity: isStarter ? 1 : 0.2
                  }}></span>
                  <h3 className="player-name" style={{ margin: 0, fontSize: '0.95rem', color: isActive ? playerColor : 'inherit', fontWeight: isActive ? 800 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.isBot ? '🤖 ' : ''}{p.name}
                  </h3>
                </div>
                <div className="badge-container" style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                  {is2v2 && (
                    <span className="badge" style={{ 
                      background: isCardInvolvedInLock 
                        ? 'rgba(239, 68, 68, 0.25)' 
                        : (playerTeamNumber === 1 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(249, 115, 22, 0.25)'), 
                      color: isCardInvolvedInLock 
                        ? '#ff4d4d' 
                        : (playerTeamNumber === 1 ? 'var(--blue)' : 'var(--orange)'),
                      border: `1px solid ${isCardInvolvedInLock ? '#ff3333' : (playerTeamNumber === 1 ? 'var(--blue)' : 'var(--orange)')}`,
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontSize: '0.72rem', 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      {isMyTeamJustUnlocked ? (
                        <span>🔓</span>
                      ) : isCardInvolvedInLock ? (
                        <span>🔒</span>
                      ) : null}
                      <span>T{playerTeamNumber}</span>
                    </span>
                  )}
                  {config.setsToWin > 1 && (
                    <span className="badge" style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 5px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>S: <strong style={{color: '#fff'}}>{p.sets}</strong></span>
                  )}
                  <span className="badge badge-legs" style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 5px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>L: <strong style={{color: '#fff'}}>{p.legs}</strong></span>
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
              
              <div style={{ minHeight: '22px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #888)' }}>
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
