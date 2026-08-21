import React from 'react';
import type { Dart } from '../types';

interface KeypadProps {
  currentRoundDarts: Dart[];
  currentMultiplier: number;
  isProcessing: boolean;
  roundBust: boolean;
  addDart: (baseValue: number) => void;
  toggleMultiplier: (mult: number) => void;
  undoSingleDart: () => void;
  abortGame: () => void;
  canUndo?: boolean;
}

export const Keypad: React.FC<KeypadProps> = ({
  currentRoundDarts,
  currentMultiplier,
  isProcessing,
  roundBust,
  addDart,
  toggleMultiplier,
  undoSingleDart,
  abortGame,
  canUndo
}) => {
  const roundTotal = currentRoundDarts.reduce((sum, d) => sum + d.value, 0);

  const getTotalColorClass = (total: number) => {
    if (total >= 100) return 'total-high';
    if (total >= 60) return 'total-medium';
    return 'total-low';
  };

  const numpadButtons = [
    1, 2, 3, 4,
    5, 6, 7, 8,
    9, 10, 11, 12,
    13, 14, 15, 16,
    17, 18, 19, 20
  ];

  return (
    <div className="keypad">
      <style>{`
        /* Min touch targets and haptic visual feedback */
        .keypad button {
          min-height: 52px;
          transition: transform 0.05s ease-out, background-color 0.15s, border-color 0.2s;
        }
        .keypad button:active {
          transform: scale(0.92);
          filter: brightness(1.2);
        }
        
        /* Dart box bounce animation */
        @keyframes dartBounce {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .dart-filled {
          animation: dartBounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        /* BUST shake and flash */
        @keyframes bustShake {
          0%, 100% { transform: translateX(0); color: var(--red, red); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .bust-active {
          animation: bustShake 0.4s ease-in-out;
          color: var(--red, red) !important;
          font-weight: bold;
        }
        
        /* Round total color transition */
        .total-low { color: var(--text, white); transition: color 0.4s ease; }
        .total-medium { color: var(--orange, orange); transition: color 0.4s ease; }
        .total-high { color: var(--green, #4ade80); transition: color 0.4s ease; }
        
        /* Modifier active states applying to numpad borders */
        .modifier-active-2 .num-btn {
          border-color: var(--orange, orange) !important;
        }
        .modifier-active-3 .num-btn {
          border-color: var(--red, red) !important;
        }
        
        /* Action Buttons Grid */
        .keypad-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 14px;
        }
        .keypad-actions button {
          min-height: 48px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95em;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Abort button less prominent */
        .text-only {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid var(--card-border, #333) !important;
          color: var(--text-dim, #888) !important;
          box-shadow: none !important;
        }
        .text-only:hover {
          background: rgba(255, 69, 58, 0.1) !important;
          color: var(--red, #ff453a) !important;
          border-color: rgba(255, 69, 58, 0.3) !important;
        }
        .text-only:active {
          background: rgba(255, 69, 58, 0.2) !important;
        }
      `}</style>

      {/* Dart Display */}
      <div className="dart-display">
        {[1, 2, 3].map(i => {
          const dart = currentRoundDarts[i - 1];
          const filled = !!dart;
          const multClass = dart ? (dart.mult === 2 ? 'dart-double' : (dart.mult === 3 ? 'dart-triple' : '')) : '';
          return (
            <div key={i} className={`dart-box ${filled ? 'dart-filled' : ''} ${multClass}`}>
              {dart ? dart.label : ''}
            </div>
          );
        })}
        <div className={`round-total ${roundBust ? 'bust-active' : getTotalColorClass(roundTotal)}`}>
          {roundBust ? 'BUST' : roundTotal}
        </div>
      </div>

      {/* Modifier Row */}
      <div className="modifier-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button 
          className={`mod-btn ${currentMultiplier === 2 ? 'mod-active-double' : ''}`} 
          onClick={() => toggleMultiplier(2)}
          disabled={isProcessing}
        >
          Double
        </button>
        <button 
          className={`mod-btn ${currentMultiplier === 3 ? 'mod-active-triple' : ''}`} 
          onClick={() => toggleMultiplier(3)}
          disabled={isProcessing}
        >
          Triple
        </button>
      </div>

      <div className="modifier-separator" style={{ height: '1px', background: 'var(--card-border, #333)', margin: '12px 0' }} />

      {/* Number Pad */}
      <div className={`numpad-grid ${currentMultiplier === 2 ? 'modifier-active-2' : ''} ${currentMultiplier === 3 ? 'modifier-active-3' : ''}`}>
        {numpadButtons.map(i => (
          <button key={i} className="num-btn" onClick={() => addDart(i)} disabled={isProcessing}>
            {i}
          </button>
        ))}
        <button 
          className="num-btn mod-special" 
          style={{ 
            gridColumn: 'span 2',
            opacity: currentMultiplier === 3 ? 0.35 : 1,
            cursor: currentMultiplier === 3 ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s'
          }} 
          onClick={() => addDart(25)} 
          disabled={isProcessing || currentMultiplier === 3}
          title={currentMultiplier === 3 ? "Triple Bull existiert nicht" : undefined}
        >
          Bull
        </button>
        <button className="num-btn mod-miss" style={{ gridColumn: 'span 2' }} onClick={() => addDart(0)} disabled={isProcessing}>
          Miss
        </button>
      </div>

      {/* Action Buttons */}
      <div className="keypad-actions">
        <button 
          className="btn-warning" 
          onClick={undoSingleDart} 
          disabled={canUndo !== undefined ? !canUndo : (currentRoundDarts.length === 0)}
        >
          ⟲ Zurück
        </button>
        <button className="btn-abort text-only" onClick={abortGame}>
          Abbrechen
        </button>
      </div>
    </div>
  );
};
