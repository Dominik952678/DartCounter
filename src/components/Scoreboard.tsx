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
  return (
    <div className="scoreboard" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`
        @keyframes scorePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); text-shadow: 0 0 20px var(--player-color, rgba(255,255,255,0.5)); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .score-anim-pulse {
          animation: scorePulse 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: inline-block;
          will-change: transform;
        }
        .player-card {
          position: relative;
          background: var(--card, #1e1e1e);
          border-radius: var(--radius, 12px);
          padding: 16px;
          transition: all 0.3s ease;
          overflow: hidden;
          border: 1px solid var(--card-border, #333);
        }
        .player-card.is-inactive {
          opacity: 0.7;
          transform: scale(0.98);
          filter: grayscale(20%);
        }
        .player-card.is-active {
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
          border-left: 6px solid var(--player-color, var(--blue));
          border-color: var(--card-border, #444);
          transform: scale(1);
          opacity: 1;
          filter: grayscale(0%);
        }
        .player-card.is-active::before {
          content: '';
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 30px;
          background: linear-gradient(90deg, var(--player-color, var(--blue)), transparent);
          opacity: 0.15;
          pointer-events: none;
        }
        .player-card.checkout-range {
          background: linear-gradient(145deg, rgba(76, 175, 80, 0.08), var(--card, #1e1e1e));
        }
        .score-display {
          font-size: clamp(3.5rem, 15vw, 6rem);
          font-weight: 900;
          line-height: 1;
          text-align: center;
          margin: 16px 0;
          color: var(--text, #fff);
          text-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .player-card.is-active .score-display {
          color: var(--player-color, var(--text));
        }
        .checkout-pill {
          background: var(--player-color, var(--blue, #2196f3));
          color: #fff;
          border-radius: 9999px;
          padding: 8px 20px;
          font-weight: 800;
          font-size: 1.25rem;
          display: inline-block;
          margin: 0 auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          letter-spacing: 0.5px;
          transform: translateY(0);
          animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .compact-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-dim, #aaa);
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
          text-align: center;
        }
        @media (max-width: 420px) {
          .compact-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
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
          font-size: clamp(1.2rem, 5vw, 2rem);
          color: var(--text-dim, #777);
          margin-left: 12px;
          font-weight: 600;
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
      
      {players.map((p, i) => {
        const legAvg = p.legDarts > 0 ? ((p.legPts / p.legDarts) * 3).toFixed(1) : "–";
        const matchAvg = p.matchDarts > 0 ? ((p.matchPts / p.matchDarts) * 3).toFixed(1) : "–";
        const isActive = i === activePlayer;
        const isStarter = i === startingPlayerOfLeg;
        
        const currentRoundTotal = isActive ? currentRoundDarts.reduce((sum, d) => sum + d.value, 0) : 0;
        const liveScore = p.score - currentRoundTotal;
        const isCheckoutRange = liveScore <= 170 && liveScore >= 2;
        
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="starter-dot" style={{ 
                  backgroundColor: isStarter ? playerColor : 'transparent', 
                  border: `2px solid ${playerColor}`, 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  display: 'inline-block',
                  opacity: isStarter ? 1 : 0.2
                }}></span>
                <h3 className="player-name" style={{ margin: 0, fontSize: '1.4rem', color: isActive ? playerColor : 'inherit', fontWeight: isActive ? 800 : 600 }}>
                  {p.isBot ? '🤖 ' : ''}{p.name}
                </h3>
              </div>
              <div className="badge-container" style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}>S: <strong style={{color: '#fff'}}>{p.sets}</strong></span>
                <span className="badge badge-legs" style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}>L: <strong style={{color: '#fff'}}>{p.legs}</strong></span>
              </div>
            </div>
            
            <div className="score-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.95rem', color: 'var(--text-dim, #999)', fontWeight: 500 }}>
              <span>Darts: <strong style={{color: 'var(--text, #fff)'}}>{p.legDarts + (isActive ? currentRoundDarts.length : 0)}</strong></span>
              <span>Runde: <strong style={{color: 'var(--text, #fff)'}}>{Math.floor(p.legDarts / 3) + 1}</strong></span>
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
            
            <div style={{ minHeight: '44px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isActive && isCheckoutRange && getCheckoutSuggestion(liveScore, config.outMode, currentRoundDarts.length) && (
                <div className="checkout-pill">
                  {getCheckoutSuggestion(liveScore, config.outMode, currentRoundDarts.length)}
                </div>
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
