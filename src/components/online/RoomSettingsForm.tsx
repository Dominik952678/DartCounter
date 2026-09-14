import React from 'react';
import type { GameConfig } from '../../types';
import { Slider, Stepper } from '../ui';
import { ONLINE_MODES, ONLINE_START_SCORES, OUT_MODES } from './rules';
import type { OnlineMode } from './rules';

interface RoomSettingsFormProps {
  settings: GameConfig;
  onChange: (settings: GameConfig) => void;
  /** Der Modus steht nur beim Erstellen zur Wahl — im Raum ist er fest. */
  withMode?: boolean;
}

const clampInt = (value: number | '', max: number) => (value === '' ? null : Math.min(max, Math.max(1, value)));

/** Die Regeln eines Online-Raums: beim Erstellen im Blatt und live beim Gastgeber (Entwurf F1, F3). */
export const RoomSettingsForm: React.FC<RoomSettingsFormProps> = ({ settings, onChange, withMode = false }) => {
  const mode: OnlineMode = settings.mode ?? 'standard';
  const set = (patch: Partial<GameConfig>) => onChange({ ...settings, ...patch });

  return (
    <div className="room-settings">
      {withMode && (
        <section className="setup-section">
          <h3 className="setup-section-title">Modus</h3>
          <Slider
            name="roomMode"
            value={mode}
            options={ONLINE_MODES.map(m => ({ value: m.value, label: m.label, ariaLabel: m.title }))}
            onChange={value => set({ mode: value })}
            ariaLabel="Spielmodus"
          />
        </section>
      )}

      {mode === 'standard' && (
        <>
          <section className="setup-section">
            <h3 className="setup-section-title">Startpunktzahl</h3>
            <Slider
              name="roomStartScore"
              variant="tiles"
              value={settings.startScore}
              options={ONLINE_START_SCORES.map(score => ({ value: score, label: score, ariaLabel: `${score} Punkte` }))}
              onChange={value => set({ startScore: value })}
              ariaLabel="Startpunktzahl"
            />
          </section>
          <div className="setup-distance">
            <Stepper
              title="Sätze"
              value={settings.setsToWin}
              max={10}
              onChange={value => { const v = clampInt(value, 10); if (v !== null) set({ setsToWin: v }); }}
            />
            <Stepper
              title="Legs"
              value={settings.legsToWin}
              max={15}
              onChange={value => { const v = clampInt(value, 15); if (v !== null) set({ legsToWin: v }); }}
            />
          </div>
          <section className="setup-section">
            <h3 className="setup-section-title">Finish</h3>
            <Slider
              name="roomOutMode"
              value={settings.outMode}
              options={OUT_MODES.map(([value, label]) => ({ value, label }))}
              onChange={value => set({ outMode: value })}
              ariaLabel="Finish"
            />
          </section>
        </>
      )}

      {mode === 'powerscoring' && (
        <section className="setup-section">
          <h3 className="setup-section-title">Runden</h3>
          <Slider
            name="roomRounds"
            variant="tiles"
            value={settings.rounds || 10}
            options={[5, 10, 15, 20].map(r => ({ value: r, label: r, ariaLabel: `${r} Runden` }))}
            onChange={value => set({ rounds: value })}
            ariaLabel="Runden"
          />
        </section>
      )}

      {mode === 'checkout' && (
        <>
          <section className="setup-section">
            <h3 className="setup-section-title">Ziele</h3>
            <Slider
              name="roomTargets"
              variant="tiles"
              value={settings.checkoutTargets || 10}
              options={[5, 10, 15, 20].map(r => ({ value: r, label: r, ariaLabel: `${r} Ziele` }))}
              onChange={value => set({ checkoutTargets: value })}
              ariaLabel="Anzahl Ziele"
            />
          </section>
          <section className="setup-section">
            <h3 className="setup-section-title">Versuche pro Ziel</h3>
            <Slider
              name="roomAttempts"
              variant="tiles"
              value={settings.checkoutRounds || 1}
              options={[1, 2, 3, 5].map(r => ({ value: r, label: r, ariaLabel: `${r} Versuche` }))}
              onChange={value => set({ checkoutRounds: value })}
              ariaLabel="Versuche pro Ziel"
            />
          </section>
        </>
      )}
    </div>
  );
};
