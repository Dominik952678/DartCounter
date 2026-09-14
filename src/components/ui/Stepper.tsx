import React, { useId } from 'react';
import { IconMinus, IconPlus } from './Icons';

export interface StepperProps {
  title: string;
  hint?: string;
  value: number | '';
  min?: number;
  max: number;
  onChange: (value: number | '') => void;
}

/**
 * Eine Zahl mit Minus und Plus, dazwischen frei eintippbar (Entwurf B1 „Sätze"
 * und „Legs"). Begrenzt wird erst beim Verlassen des Felds, damit ein Wert beim
 * Neutippen (aus „9" wird „12") nicht nach jeder Ziffer zurückspringt.
 */
export const Stepper: React.FC<StepperProps> = ({ title, hint, value, min = 1, max, onChange }) => {
  const current = typeof value === 'number' ? value : min;
  const inputId = useId();

  return (
    <div className="setup-stepper">
      <div className="setup-stepper-head">
        <label className="label-caps" htmlFor={inputId}>{title}</label>
        {hint && <span className="label-caps setup-stepper-hint">{hint}</span>}
      </div>
      <div className="setup-stepper-row">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.max(min, current - 1))}
          disabled={current <= min}
          aria-label={`${title} verringern`}
        >
          <IconMinus size={18} />
        </button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10) || min)}
          onBlur={() => onChange(Math.min(max, Math.max(min, value === '' ? min : value)))}
          className="stepper-input"
        />
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.min(max, current + 1))}
          disabled={current >= max}
          aria-label={`${title} erhöhen`}
        >
          <IconPlus size={18} />
        </button>
      </div>
    </div>
  );
};
