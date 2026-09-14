import React, { useEffect, useState } from 'react';
import type { Profile } from '../../types';
import { throwAtTarget } from '../../utils/bot';
import { Button, Icons, Sheet } from '../ui';
import { botAverage } from '../../utils/botProfiles';

type BullResult = 0 | 25 | 50;

interface BullOffModalProps {
  /** Final line-up (already shuffled if "random order" was also chosen). */
  players: string[];
  profiles: Record<string, Profile>;
  /**
   * Indizes derer, die tatsächlich werfen. Im Einzel sind das alle; im 2v2
   * wirft pro Team nur einer, nämlich der erste seines Teams — die Sitze 0 und
   * 1, weil `startGame` die Teams über die Sitzparität vergibt.
   */
  contenders?: number[];
  onResolved: (startingIndex: number) => void;
  onCancel: () => void;
}

/** Die drei Ergebnisse, wie der Entwurf sie nennt: Bull (50), 25, Außen. */
const RESULTS: readonly BullResult[] = [50, 25, 0];
const RESULT_LABEL: Record<BullResult, string> = { 50: 'Bull', 25: '25', 0: 'Außen' };

const categorize = (base: number, mult: number): BullResult => {
  if (base === 25 && mult === 2) return 50;
  if (base === 25) return 25;
  return 0;
};

/**
 * Ausbullen vor Leg 1 (Entwurf B4): jeder wirft einmal aufs Bull, das beste
 * Ergebnis beginnt. Bei Gleichstand wird nur unter den Gleichen neu geworfen.
 *
 * Bots werfen selbst, über dieselbe Wurfsimulation wie überall sonst — ihr
 * Ergebnis ist also mit einem eingetippten direkt vergleichbar.
 */
export const BullOffModal: React.FC<BullOffModalProps> = ({
  players,
  profiles,
  contenders,
  onResolved,
  onCancel
}) => {
  const throwers = contenders ?? players.map((_, i) => i);
  const [results, setResults] = useState<(BullResult | null)[]>(() => players.map(() => null));
  const [pendingIndices, setPendingIndices] = useState<number[]>(() => throwers);
  const [tieMessage, setTieMessage] = useState<string | null>(null);

  const isTeamBullOff = throwers.length < players.length;
  const currentIndex = pendingIndices.find(i => results[i] === null);
  const currentPlayer = currentIndex !== undefined ? players[currentIndex] : undefined;
  const isCurrentBot = currentPlayer ? !!profiles[currentPlayer]?.isBot : false;

  const submitResult = (index: number, value: BullResult) => {
    setResults(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Bots throw automatically, after a short delay so the sequence stays readable.
  useEffect(() => {
    if (currentIndex === undefined || !currentPlayer || !isCurrentBot) return;
    const targetAverage = botAverage(profiles[currentPlayer]);
    const timer = setTimeout(() => {
      const { base, mult } = throwAtTarget(25, 1, targetAverage);
      submitResult(currentIndex, categorize(base, mult));
    }, 600);
    return () => clearTimeout(timer);
  }, [currentIndex, currentPlayer, isCurrentBot, profiles]);

  // Once every pending player has thrown, resolve the round.
  useEffect(() => {
    if (pendingIndices.some(i => results[i] === null)) return;

    const best = Math.max(...pendingIndices.map(i => results[i] as BullResult));
    const winners = pendingIndices.filter(i => results[i] === best);

    if (winners.length === 1) {
      onResolved(winners[0]);
      return;
    }

    setTieMessage(`Stechen zwischen ${winners.map(i => players[i]).join(' und ')}`);
    setResults(prev => {
      const next = [...prev];
      winners.forEach(i => { next[i] = null; });
      return next;
    });
    setPendingIndices(winners);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, pendingIndices]);

  const note = tieMessage ?? (isTeamBullOff ? 'Ein Wurf pro Team' : null);

  return (
    <Sheet title="Ausbullen" onClose={onCancel}>
      <div className="bulloff">
        {note && <p className="bulloff-note">{note}</p>}

        <ul className="bulloff-list">
          {throwers.map(i => {
            const name = players[i];
            const isPending = pendingIndices.includes(i);
            const result = results[i];
            const isActive = i === currentIndex;
            return (
              <li
                key={i}
                className={['bulloff-row', isActive && 'is-active', !isPending && 'is-out'].filter(Boolean).join(' ')}
              >
                <span className="bulloff-name">
                  {profiles[name]?.isBot && <Icons.IconBot size={13} className="icon-inline" />}{name}
                </span>
                <span className="bulloff-state">
                  {result !== null ? RESULT_LABEL[result] : isActive ? (isCurrentBot ? 'wirft …' : 'ist dran') : '—'}
                </span>
              </li>
            );
          })}
        </ul>

        {currentIndex !== undefined && !isCurrentBot && (
          <div className="bulloff-choices" role="group" aria-label={`Wurf von ${currentPlayer}`}>
            {RESULTS.map(value => (
              <button
                key={value}
                type="button"
                className="bulloff-choice"
                onClick={() => submitResult(currentIndex, value)}
              >
                {RESULT_LABEL[value]}
              </button>
            ))}
          </div>
        )}

        <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
    </Sheet>
  );
};
