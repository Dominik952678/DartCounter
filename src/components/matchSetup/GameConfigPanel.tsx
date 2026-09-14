import React, { useId } from 'react';
import type { MatchSetupAction, MatchSetupConfig, OutMode } from './useMatchSetupConfig';
import {
  MAX_LEGS,
  MAX_SETS,
  MAX_START_SCORE,
  MIN_START_SCORE,
  START_SCORES,
  isValidStartScore
} from './useMatchSetupConfig';
import { Slider, Stepper } from '../ui';

interface GameConfigPanelProps {
  config: MatchSetupConfig;
  dispatch: React.Dispatch<MatchSetupAction>;
}

const FINISHES: readonly (readonly [OutMode, string])[] = [
  ['DO', 'Double Out'],
  ['SO', 'Single Out'],
  ['MO', 'Master Out']
];

/** Startpunktzahl, Distanz und Finish (Entwurf B1, B3). */
export const GameConfigPanel: React.FC<GameConfigPanelProps> = ({ config, dispatch }) => {
  const customId = useId();
  const customInvalid = config.customScore && !isValidStartScore(config.startScore);

  return (
    <>
      <section className="setup-section">
        <h2 className="setup-section-title">Startpunktzahl</h2>
        <Slider
          name="startScore"
          variant="tiles"
          value={config.customScore ? 'custom' : String(config.startScore)}
          options={[
            ...START_SCORES.map(score => ({ value: String(score), label: score, ariaLabel: `${score} Punkte` })),
            { value: 'custom', label: 'Custom', ariaLabel: 'Eigene Startpunktzahl' }
          ]}
          onChange={value =>
            value === 'custom'
              ? dispatch({ type: 'customScore', value: config.startScore })
              : dispatch({ type: 'startScore', value: Number(value) })
          }
          ariaLabel="Startpunktzahl"
        />
        {config.customScore && (
          <>
            <div className={`setup-custom ${customInvalid ? 'is-invalid' : ''}`}>
              <label className="label-caps" htmlFor={customId}>Eigene Punktzahl</label>
              <input
                id={customId}
                type="number"
                inputMode="numeric"
                min={MIN_START_SCORE}
                max={MAX_START_SCORE}
                value={config.startScore}
                aria-invalid={customInvalid}
                onChange={e =>
                  dispatch({ type: 'customScore', value: e.target.value === '' ? '' : parseInt(e.target.value, 10) })
                }
                className="setup-custom-input"
              />
            </div>
            {customInvalid && (
              <p className="setup-error-text" role="alert">
                {`Die Startpunktzahl muss zwischen ${MIN_START_SCORE} und ${MAX_START_SCORE} liegen.`}
              </p>
            )}
          </>
        )}
      </section>

      <div className="setup-distance">
        <Stepper
          title="Sätze"
          hint={config.setsToWin === 1 ? 'nur Legs' : 'Gewinnsätze'}
          value={config.setsToWin}
          max={MAX_SETS}
          onChange={value => dispatch({ type: 'sets', value })}
        />
        <Stepper
          title="Legs"
          hint="pro Satz"
          value={config.legsToWin}
          max={MAX_LEGS}
          onChange={value => dispatch({ type: 'legs', value })}
        />
      </div>

      <section className="setup-section">
        <h2 className="setup-section-title">Finish</h2>
        <Slider
          name="outMode"
          value={config.outMode}
          options={FINISHES.map(([value, label]) => ({ value, label }))}
          onChange={value => dispatch({ type: 'outMode', value })}
          ariaLabel="Finish"
        />
      </section>
    </>
  );
};
