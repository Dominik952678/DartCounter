import React, { useState } from 'react';
import { readStoredMatchConfig, START_SCORES, MAX_LEGS, MAX_SETS } from '../matchSetup/useMatchSetupConfig';
import type { OutMode } from '../matchSetup/useMatchSetupConfig';
import { clearDefaultGame, defaultGameDistance, saveDefaultGame } from '../../utils/deviceSettings';
import type { DefaultGame } from '../../utils/deviceSettings';
import { Button, Sheet, Slider, Stepper } from '../ui';

const FINISHES: readonly (readonly [OutMode, string])[] = [
  ['DO', 'Double Out'],
  ['SO', 'Single Out'],
  ['MO', 'Master Out']
];

interface DefaultGameSheetProps {
  initial: DefaultGame | null;
  /** `null`, wenn das Standardspiel entfernt wurde. */
  onSaved: (game: DefaultGame | null) => void;
  onClose: () => void;
}

/** Ohne Standardspiel beginnt die Auswahl beim zuletzt gespielten X01. */
const startingPoint = (): DefaultGame => {
  const last = readStoredMatchConfig();
  return {
    startScore: typeof last.startScore === 'number' && START_SCORES.includes(last.startScore) ? last.startScore : 501,
    outMode: last.outMode,
    setsToWin: typeof last.setsToWin === 'number' ? last.setsToWin : 1,
    legsToWin: typeof last.legsToWin === 'number' ? last.legsToWin : 3
  };
};

/** Das Spiel, das die orange Karte auf Start mit einem Tap beginnt (Entwurf H1). */
export const DefaultGameSheet: React.FC<DefaultGameSheetProps> = ({ initial, onSaved, onClose }) => {
  const [game, setGame] = useState<DefaultGame>(() => initial ?? startingPoint());
  const set = (patch: Partial<DefaultGame>) => setGame(prev => ({ ...prev, ...patch }));

  return (
    <Sheet title="Standardspiel" onClose={onClose}>
      <div className="room-settings">
        <section className="setup-section">
          <h3 className="setup-section-title">Startpunktzahl</h3>
          <Slider
            name="defaultStartScore"
            variant="tiles"
            value={game.startScore}
            options={START_SCORES.map(score => ({ value: score, label: score, ariaLabel: `${score} Punkte` }))}
            onChange={startScore => set({ startScore })}
            ariaLabel="Startpunktzahl"
          />
        </section>
        <div className="setup-distance">
          <Stepper title="Sätze" value={game.setsToWin} max={MAX_SETS} onChange={v => { if (v !== '') set({ setsToWin: Math.min(MAX_SETS, Math.max(1, v)) }); }} />
          <Stepper title="Legs" value={game.legsToWin} max={MAX_LEGS} onChange={v => { if (v !== '') set({ legsToWin: Math.min(MAX_LEGS, Math.max(1, v)) }); }} />
        </div>
        <section className="setup-section">
          <h3 className="setup-section-title">Finish</h3>
          <Slider
            name="defaultOutMode"
            value={game.outMode}
            options={FINISHES.map(([value, label]) => ({ value, label }))}
            onChange={outMode => set({ outMode })}
            ariaLabel="Finish"
          />
        </section>

        <Button variant="primary" size="large" fullWidth onClick={() => { saveDefaultGame(game); onSaved(game); }}>
          Als Standard speichern · {defaultGameDistance(game)}
        </Button>
        {initial && (
          <Button variant="dangerText" fullWidth onClick={() => { clearDefaultGame(); onSaved(null); }}>
            Standardspiel entfernen
          </Button>
        )}
      </div>
    </Sheet>
  );
};
