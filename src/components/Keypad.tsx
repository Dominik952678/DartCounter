import React from 'react';
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
  canUndo
}) => {
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
          aria-pressed={currentMultiplier === 2}
        >
          Double
        </button>
        <button 
          className={`mod-btn ${currentMultiplier === 3 ? 'mod-active-triple' : ''}`}
          onClick={() => handleToggleMultiplier(3)}
          disabled={isProcessing}
          aria-pressed={currentMultiplier === 3}
        >
          Triple
        </button>
      </div>

      {/* Number Pad */}
      <div className={`numpad-grid ${currentMultiplier === 2 ? 'modifier-active-2' : ''} ${currentMultiplier === 3 ? 'modifier-active-3' : ''}`}>
        {numpadButtons.map(i => (
          <button
            key={i}
            className="num-btn"
            onClick={() => handleAddDartClick(i)}
            disabled={isProcessing}
            aria-label={`${currentMultiplier === 3 ? 'Triple ' : currentMultiplier === 2 ? 'Double ' : ''}${i}`}
          >
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
          className="num-btn btn-undo"
          onClick={handleUndo}
          disabled={canUndo !== undefined ? !canUndo : (currentRoundDarts.length === 0)}
          title="Letzten Wurf zurücknehmen"
          aria-label="Letzten Wurf zurücknehmen"
        >
          <span className="btn-undo-icon" aria-hidden="true">⟲</span>
          <span className="btn-undo-label">Zurück</span>
        </button>
      </div>
    </div>
  );
};
