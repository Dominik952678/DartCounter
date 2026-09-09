import React, { useId } from 'react';
import type { MatchSetupAction, MatchSetupConfig, OutMode } from './useMatchSetupConfig';
import { MAX_LEGS, MAX_SETS, START_SCORES } from './useMatchSetupConfig';
import { Card, CardHeader, Slider } from '../ui';

interface GameConfigPanelProps {
  config: MatchSetupConfig;
  dispatch: React.Dispatch<MatchSetupAction>;
}

/* Kurz auf dem Slider, ausgeschrieben für Screenreader — „Master" allein sagt
   nicht, dass es um den Ausgang des Legs geht. */
const OUT_MODE_LABELS: readonly (readonly [OutMode, string, string])[] = [
  ['SO', 'Single', 'Single Out'],
  ['DO', 'Double', 'Double Out'],
  ['MO', 'Master', 'Master Out']
];

interface StepperProps {
  title: string;
  subtitle: string;
  value: number | '';
  max: number;
  label: string;
  onChange: (value: number | '') => void;
}

/** Sets and legs are the same control twice, differing only in their bounds. */
const DistanceStepper: React.FC<StepperProps> = ({ title, subtitle, value, max, label, onChange }) => {
  const current = typeof value === 'number' ? value : 1;
  const inputId = useId();
  return (
    <div className="distance-card">
      <div className="distance-header">
        <span className="distance-title">{title}</span>
        <span className="distance-subtitle">{subtitle}</span>
      </div>
      <div className="stepper-box">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.max(1, current - 1))}
          disabled={current <= 1}
          aria-label={`${label} verringern`}
        >
          −
        </button>
        <div className="stepper-val-wrap">
          <label htmlFor={inputId} className="sr-only">{title} ({subtitle})</label>
          <input
            id={inputId}
            type="number"
            min="1"
            max={max}
            value={value}
            // Clamping is deferred to blur so a value being retyped (e.g. clearing
            // "9" to type "12") isn't snapped back to the limit after every digit.
            onChange={e => onChange(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
            onBlur={() => onChange(Math.min(max, Math.max(1, value === '' ? 1 : value)))}
            className="stepper-input"
          />
          <span className="stepper-unit">Bis {value || 1}</span>
        </div>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.min(max, current + 1))}
          disabled={current >= max}
          aria-label={`${label} erhöhen`}
        >
          +
        </button>
      </div>
    </div>
  );
};

/** Distance, start score and out mode — everything except who is playing. */
export const GameConfigPanel: React.FC<GameConfigPanelProps> = ({ config, dispatch }) => (
  <Card>
    <CardHeader
      heading="Spieleinstellungen"
      style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: 'var(--space-3)' }}
    />

    <div style={{ marginBottom: 'var(--space-6)' }}>
      <h3 className="field-label">Distanz</h3>
      <div className="distance-grid">
        <DistanceStepper
          title="Sets"
          subtitle="Gewinnsätze"
          label="Sets"
          value={config.setsToWin}
          max={MAX_SETS}
          onChange={value => dispatch({ type: 'sets', value })}
        />
        <DistanceStepper
          title="Legs"
          subtitle="pro Satz"
          label="Legs"
          value={config.legsToWin}
          max={MAX_LEGS}
          onChange={value => dispatch({ type: 'legs', value })}
        />
      </div>
    </div>

    <div style={{ marginBottom: 'var(--space-6)' }}>
      <h3 className="field-label">Startpunktzahl</h3>
      <Slider
        name="startScore"
        value={config.startScore}
        options={START_SCORES.map(score => ({
          value: score,
          label: score,
          ariaLabel: `${score} Punkte`
        }))}
        onChange={value => dispatch({ type: 'startScore', value })}
        ariaLabel="Startpunktzahl"
      />
    </div>

    <div>
      <h3 className="field-label">Out-Modus</h3>
      <Slider
        name="outMode"
        value={config.outMode}
        options={OUT_MODE_LABELS.map(([value, label, ariaLabel]) => ({ value, label, ariaLabel }))}
        onChange={value => dispatch({ type: 'outMode', value })}
        ariaLabel="Out-Modus"
      />
    </div>
  </Card>
);
