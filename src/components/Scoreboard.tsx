import React from 'react';
import type { Player, GameConfig } from '../types';
import { getCheckoutSuggestion } from '../utils/checkouts';

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
  const gridColumns = players.length === 1 
    ? '1fr' 
    : (players.length === 2 ? '1fr 1fr' : (players.length === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'));

  return (
    <div className="scoreboard" style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: '8px', height: '100%', width: '100%', minWidth: 0, minHeight: 0 }}>
      <style>{`
        @keyframes scorePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); text-shadow: 0 0 16px var(--player-color, rgba(255,255,255,0.5)); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .score-anim-pulse {
          animation: scorePulse 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: inline-block;
          will-change: transform;
        }
        .player-card {
          position: relative;
          background: rgba(26, 26, 32, 0.9);
          border-radius: 14px;
          padding: 8px 10px;
          transition: all 0.2s ease;
          overflow: hidden;
          border: 1px solid var(--card-border, #333);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .player-card.is-inactive {
          opacity: 0.6;
          filter: grayscale(20%);
        }
        .player-card.is-active {
          box-shadow: 0 0 20px rgba(10, 132, 255, 0.2);
          border-left: 5px solid var(--player-color, var(--blue));
          border-color: rgba(255, 255, 255, 0.25);
          opacity: 1;
          filter: grayscale(0%);
          background: rgba(30, 30, 38, 0.98);
        }
        .player-card.checkout-range {
          background: linear-gradient(145deg, rgba(76, 175, 80, 0.14), rgba(26, 26, 32, 0.95));
        }
        .score-display {
          font-size: clamp(3rem, 10vw, 5.5rem);
          font-weight: 900;
          line-height: 0.95;
          text-align: center;
          margin: auto 0;
          color: var(--text, #fff);
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: -0.02em;
        }
        .player-card.is-active .score-display {
          color: var(--player-color, var(--text));
        }
        .checkout-pill {
          background: var(--player-color, var(--blue, #2196f3));
          color: #fff;
          border-radius: 8px;
          padding: 4px 10px;
          font-weight: 800;
          font-size: 0.92rem;
          display: inline-block;
          margin: 0 auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          letter-spacing: 0.4px;
          animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .compact-stats {
          display: none;
        }
        @media (min-width: 768px) {
          .scoreboard {
            gap: 12px;
            margin-bottom: 0;
            min-width: 0;
            height: 100%;
            width: 100%;
          }
          .player-card {
            padding: 14px 16px;
            min-width: 0;
          }
          .score-display {
            margin: 10px 0;
          }
          .compact-stats {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
            font-size: 0.85rem;
            color: var(--text-dim, #aaa);
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.08);
            text-align: center;
          }
          .compact-stats span {
            flex: 1 1 auto;
            min-width: 60px;
          }
        }
        .compact-stats span {
          white-space: nowrap;
          background: rgba(0,0,0,0.25);
          padding: 4px 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .compact-stats strong {
          color: var(--text, #fff);
          font-weight: 700;
        }
        .live-preview-darts {
          font-size: clamp(1rem, 4vw, 1.8rem);
          color: var(--text-dim, #777);
          margin-left: 8px;
          font-weight: 600;
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
      
      {players.map((p, i) => {
        const legAvg = p.legDarts > 0 ? ((p.legPts / p.legDarts) * 3).toFixed(1) : "–";
        const matchAvg = p.matchDarts > 0 ? ((p.matchPts / p.matchDarts) * 3).toFixed(1) : "–";
        const isActive = i === activePlayer;
        const isStarter = i === startingPlayerOfLeg;
        
        const currentRoundTotal = isActive ? currentRoundDarts.reduce((sum, d) => sum + d.value, 0) : 0;
        const liveScore = p.score - currentRoundTotal;
        const isCheckoutRange = liveScore <= 170 && (config.outMode === 'SO' ? liveScore >= 1 : liveScore >= 2);
        
        let celebrationClass = '';
        if (celebration && celebration.playerIndex === i) {
          if (celebration.type === '180') celebrationClass = 'celebration-180';
          else if (celebration.type === 'checkout') celebrationClass = 'celebration-checkout';
          else if (celebration.type === 'bust') celebrationClass = 'shake-bust';
        }

        const coPercent = p.checkoutAttempts > 0 
          ? ((p.checkoutSuccesses / p.checkoutAttempts) * 100).toFixed(0) 
          : "–";

        const playerColor = p.color || 'var(--blue, #2196f3)';
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
              <div className="badge-container" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {config.setsToWin > 1 && (
                  <span className="badge" style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 5px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>S: <strong style={{color: '#fff'}}>{p.sets}</strong></span>
                )}
                <span className="badge badge-legs" style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 5px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>L: <strong style={{color: '#fff'}}>{p.legs}</strong></span>
              </div>
            </div>

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
              {checkoutSuggestion ? (
                <div className="checkout-pill">
                  {checkoutSuggestion}
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #888)' }}>
                  Darts: {p.legDarts + (isActive ? currentRoundDarts.length : 0)} · Ø {matchAvg}
                </span>
              )}
            </div>

            <div className="compact-stats">
              <span>Leg: <strong>{legAvg}</strong></span>
              <span>Match: <strong>{matchAvg}</strong></span>
              <span>CO: <strong>{coPercent}%</strong></span>
              <span>100+: <strong>{p.hundredPlus}</strong></span>
              <span>180: <strong>{p.oneEighty}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
