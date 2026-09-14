import React from 'react';
import type { Dart } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { Icons } from './ui';

interface KeypadProps {
  currentRoundDarts: Dart[];
  currentMultiplier: number;
  isProcessing: boolean;
  roundBust: boolean;
  addDart: (baseValue: number) => void;
  toggleMultiplier: (mult: number) => void;
  undoSingleDart: () => void;
  canUndo?: boolean;
  /** Laid over the modifier row and number pad; the dart boxes stay visible. */
  overlay?: React.ReactNode;
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

/**
 * Die Eingabe (Entwurf C1): drei Dart-Felder mit „Zurück" in einer Zeile,
 * darunter Double/Triple, 1–20 und Bull/Miss.
 *
 * Die Dart-Felder bleiben die ersten drei Kinder ihrer Zeile und liegen
 * außerhalb von `.keypad-input`: die Feier-Animation leuchtet sie per
 * `:nth-child` an und legt ihre Scheibe genau über `.keypad-input`
 * (styles/celebration.css).
 */
export const Keypad: React.FC<KeypadProps> = ({
  currentRoundDarts,
  currentMultiplier,
  isProcessing,
  roundBust,
  addDart,
  toggleMultiplier,
  undoSingleDart,
  canUndo,
  overlay
}) => {
  const handleAddDartClick = (baseValue: number) => {
    if (baseValue === 0) triggerHaptic('click');
    else if (currentMultiplier === 3) triggerHaptic('triple');
    else if (currentMultiplier === 2) triggerHaptic('double');
    else triggerHaptic('single');
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

  const multiplierWord = currentMultiplier === 3 ? 'Triple ' : currentMultiplier === 2 ? 'Double ' : '';

  return (
    <div className="keypad">
      <div className="dart-display">
        {[0, 1, 2].map(i => {
          const dart = currentRoundDarts[i];
          const multClass = dart?.mult === 2 ? 'dart-double' : dart?.mult === 3 ? 'dart-triple' : '';
          return (
            <div
              key={i}
              className={['dart-box', dart && 'dart-filled', multClass, dart && roundBust && 'is-struck'].filter(Boolean).join(' ')}
            >
              {dart ? (
                <>
                  <span className="dart-label">{dart.label}</span>
                  <span className="dart-value">{dart.value}</span>
                </>
              ) : (
                <span className="dart-empty">{i + 1}. Dart</span>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="btn-undo"
          onClick={handleUndo}
          disabled={canUndo !== undefined ? !canUndo : currentRoundDarts.length === 0}
          title="Letzten Wurf zurücknehmen"
          aria-label="Letzten Wurf zurücknehmen"
        >
          <Icons.IconUndo size={18} />
          <span className="btn-undo-label" aria-hidden="true">Zurück</span>
        </button>
      </div>

      <div className="keypad-input">
        <div className="modifier-grid">
          <button
            type="button"
            className={`mod-btn ${currentMultiplier === 2 ? 'mod-active-double' : ''}`}
            onClick={() => handleToggleMultiplier(2)}
            disabled={isProcessing}
            aria-pressed={currentMultiplier === 2}
          >
            Double
          </button>
          <button
            type="button"
            className={`mod-btn ${currentMultiplier === 3 ? 'mod-active-triple' : ''}`}
            onClick={() => handleToggleMultiplier(3)}
            disabled={isProcessing}
            aria-pressed={currentMultiplier === 3}
          >
            Triple
          </button>
        </div>

        <div className="numpad-grid">
          {NUMBERS.map(n => (
            <button
              type="button"
              key={n}
              className="num-btn"
              onClick={() => handleAddDartClick(n)}
              disabled={isProcessing}
              aria-label={`${multiplierWord}${n}`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="numpad-extra">
          <button
            type="button"
            className="num-btn mod-special"
            onClick={() => handleAddDartClick(25)}
            disabled={isProcessing || currentMultiplier === 3}
            title={currentMultiplier === 3 ? 'Triple Bull existiert nicht' : undefined}
          >
            Bull
          </button>
          <button
            type="button"
            className="num-btn mod-miss"
            onClick={() => handleAddDartClick(0)}
            disabled={isProcessing}
          >
            Miss
          </button>
        </div>

        {overlay}
      </div>
    </div>
  );
};
