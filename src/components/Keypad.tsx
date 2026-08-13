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
}

export const Keypad: React.FC<KeypadProps> = ({
  currentRoundDarts,
  currentMultiplier,
  roundBust,
  addDart,
  toggleMultiplier,
  undoSingleDart,
  abortGame
}) => {
  const roundTotal = currentRoundDarts.reduce((sum, d) => sum + d.value, 0);

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
        <div className={`round-total ${roundBust ? 'bust' : ''}`}>
          {roundBust ? 'BUST' : roundTotal}
        </div>
      </div>

      {/* Modifier Row */}
      <div className="modifier-grid">
        <button 
          className={`mod-btn ${currentMultiplier === 2 ? 'mod-active-double' : ''}`} 
          onClick={() => toggleMultiplier(2)}
        >
          Double
        </button>
        <button 
          className={`mod-btn ${currentMultiplier === 3 ? 'mod-active-triple' : ''}`} 
          onClick={() => toggleMultiplier(3)}
        >
          Triple
        </button>
        <button className="mod-btn mod-special" onClick={() => addDart(25)}>Bull</button>
        <button className="mod-btn mod-miss" onClick={() => addDart(0)}>Miss</button>
      </div>

      {/* Number Pad */}
      <div className="numpad-grid">
        {Array.from({ length: 20 }, (_, i) => i + 1).map(i => (
          <button key={i} className="num-btn" onClick={() => addDart(i)}>
            {i}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="keypad-actions">
        <button className="btn-warning" onClick={undoSingleDart}>
          ⟲ Zurück
        </button>
        <button className="btn-abort" onClick={abortGame}>
          Abbrechen
        </button>
      </div>
    </div>
  );
};
