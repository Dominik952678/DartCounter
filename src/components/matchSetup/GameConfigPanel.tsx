import React from 'react';
import type { MatchSetupAction, MatchSetupConfig, OutMode } from './useMatchSetupConfig';
import { MAX_LEGS, MAX_SETS, START_SCORES } from './useMatchSetupConfig';

interface GameConfigPanelProps {
  config: MatchSetupConfig;
  dispatch: React.Dispatch<MatchSetupAction>;
}

const OUT_MODE_LABELS: readonly (readonly [OutMode, string])[] = [
  ['SO', 'Single'],
  ['DO', 'Double'],
  ['MO', 'Master']
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
          <input
            type="number"
            min="1"
            max={max}
            value={value}
            onChange={e => onChange(e.target.value === '' ? '' : Math.min(max, Math.max(1, parseInt(e.target.value) || 1)))}
            onBlur={() => { if (value === '') onChange(1); }}
            className="stepper-input"
          />
          <span className="stepper-unit">First to {value || 1}</span>
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
  <div className="card">
    <div className="card-header" style={{ marginBottom: '15px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
      <h2>Spieleinstellungen</h2>
    </div>

    <div style={{ marginBottom: '25px' }}>
      <h3 style={{ fontSize: '1.1em', marginBottom: '14px', color: 'var(--text)' }}>Distanz</h3>
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

    <div style={{ marginBottom: '25px' }}>
      <h3 style={{ fontSize: '1.1em', marginBottom: '15px', color: 'var(--text)' }}>Startpunktzahl</h3>
      <div className="segment-control">
        {START_SCORES.map(score => (
          <label key={score} className={config.startScore === score ? 'active' : ''}>
            <input
              type="radio"
              name="startScore"
              value={score}
              checked={config.startScore === score}
              onChange={() => dispatch({ type: 'startScore', value: score })}
            />
            <span>{score}</span>
          </label>
        ))}
      </div>
    </div>

    <div>
      <h3 style={{ fontSize: '1.1em', marginBottom: '15px', color: 'var(--text)' }}>Out-Modus</h3>
      <div className="segment-control">
        {OUT_MODE_LABELS.map(([value, label]) => (
          <label key={value} className={config.outMode === value ? 'active' : ''}>
            <input
              type="radio"
              name="outMode"
              value={value}
              checked={config.outMode === value}
              onChange={() => dispatch({ type: 'outMode', value })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
);
