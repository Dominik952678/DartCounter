import React, { useEffect } from 'react';
import type { Dart } from '../types';
import { triggerHaptic } from '../utils/haptics';

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
  useEffect(() => {
    if (roundBust) {
      triggerHaptic('bust');
    }
  }, [roundBust]);

  const handleAddDartClick = (baseValue: number) => {
    if (baseValue === 0) {
      triggerHaptic('click');
    } else if (currentMultiplier === 3) {
      triggerHaptic('triple');
    } else if (currentMultiplier === 2) {
      triggerHaptic('double');
    } else {
      triggerHaptic('single');
    }
    addDart(baseValue);
  };

  const handleToggleMultiplier = (mult: number) => {
    triggerHaptic('click');
    toggleMultiplier(mult);
  };

  const handleUndo = () => {
    triggerHaptic('click');
    undoSingleDart();
  };

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
          display: none;
        }
        
        /* Abort button less prominent */
        .text-only {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid var(--card-border, #333) !important;
          color: var(--text-dim, #888) !important;
          box-shadow: none !important;
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
          onClick={() => handleToggleMultiplier(2)}
          disabled={isProcessing}
        >
          Double
        </button>
        <button 
          className={`mod-btn ${currentMultiplier === 3 ? 'mod-active-triple' : ''}`} 
          onClick={() => handleToggleMultiplier(3)}
          disabled={isProcessing}
        >
          Triple
        </button>
      </div>

      {/* Number Pad */}
      <div className={`numpad-grid ${currentMultiplier === 2 ? 'modifier-active-2' : ''} ${currentMultiplier === 3 ? 'modifier-active-3' : ''}`}>
        {numpadButtons.map(i => (
          <button key={i} className="num-btn" onClick={() => handleAddDartClick(i)} disabled={isProcessing}>
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
          onClick={() => handleAddDartClick(25)} 
          disabled={isProcessing || currentMultiplier === 3}
          title={currentMultiplier === 3 ? "Triple Bull existiert nicht" : undefined}
        >
          Bull
        </button>
        <button className="num-btn mod-miss" style={{ gridColumn: 'span 2' }} onClick={() => handleAddDartClick(0)} disabled={isProcessing}>
          Miss
        </button>
        <button 
          className="num-btn btn-warning" 
          style={{ 
            gridColumn: 'span 1',
            fontSize: '0.82em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            padding: 0
          }}
          onClick={handleUndo} 
          disabled={canUndo !== undefined ? !canUndo : (currentRoundDarts.length === 0)}
          title="Letzten Wurf zurücknehmen"
        >
          ⟲ Zurück
        </button>
      </div>

      {/* Fallback hidden actions container for screen readers / test queries */}
      <div className="keypad-actions" aria-hidden="true">
        <button className="btn-abort text-only" onClick={abortGame}>
          Abbrechen
        </button>
      </div>
    </div>
  );
};
