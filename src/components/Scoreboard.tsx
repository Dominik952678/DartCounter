import React, { useState } from 'react';
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
  const [showExtended, setShowExtended] = useState(false);

  return (
    <div className="scoreboard">
      {players.map((p, i) => {
        const legAvg = p.legDarts > 0 ? ((p.legPts / p.legDarts) * 3).toFixed(1) : "–";
        const matchAvg = p.matchDarts > 0 ? ((p.matchPts / p.matchDarts) * 3).toFixed(1) : "–";
        const isActive = i === activePlayer;
        const isStarter = i === startingPlayerOfLeg;
        
        const currentRoundTotal = isActive ? currentRoundDarts.reduce((sum, d) => sum + d.value, 0) : 0;
        const liveScore = p.score - currentRoundTotal;
        
        let celebrationClass = '';
        if (celebration && celebration.playerIndex === i) {
          if (celebration.type === '180') celebrationClass = 'celebration-180';
          else if (celebration.type === 'checkout') celebrationClass = 'celebration-checkout';
          else if (celebration.type === 'bust') celebrationClass = 'shake-bust';
        }

        const coPercent = p.checkoutAttempts > 0 
          ? ((p.checkoutSuccesses / p.checkoutAttempts) * 100).toFixed(0) 
          : "–";

        return (
          <div 
            key={i} 
            className={`player ${isActive ? 'active' : ''} ${isStarter ? 'is-starter' : ''} ${celebrationClass}`}
            style={isActive && p.color ? { borderLeftColor: p.color } : undefined}
          >
            <span className="starter-dot" style={p.color ? { backgroundColor: p.color } : undefined}></span>
            <h3 className="player-name">{p.isBot ? '🤖 ' : ''}{p.name}</h3>
            <div className="badge-container">
              <span className="badge">S: <span>{p.sets}</span></span>
              <span className="badge badge-legs">L: <span>{p.legs}</span></span>
            </div>
            
            <div className="score-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.9em', color: '#999' }}>
              <span>Darts: <strong>{p.legDarts + (isActive ? currentRoundDarts.length : 0)}</strong></span>
              <span>Runde: <strong>{Math.floor(p.legDarts / 3) + 1}</strong></span>
            </div>

            <div className="score">{liveScore}</div>
            
            {isActive && liveScore <= 170 && getCheckoutSuggestion(liveScore, config.outMode, currentRoundDarts.length) && (
              <div className="checkout-hint">
                {getCheckoutSuggestion(liveScore, config.outMode, currentRoundDarts.length)}
              </div>
            )}

            <div className="stats-preview">
              <span>Leg: {legAvg}</span>
              <span>Match: {matchAvg}</span>
            </div>
            
            {showExtended && (
              <div className="extended-stats">
                <span>CO: {coPercent}%</span>
                <span>100+: {p.hundredPlus}</span>
                <span>180: {p.oneEighty}</span>
              </div>
            )}
          </div>
        );
      })}
      
      <div className="extended-stats-toggle" onClick={() => setShowExtended(!showExtended)}>
        {showExtended ? '▲ Statistiken ausblenden' : '▼ Mehr Statistiken'}
      </div>
    </div>
  );
};
