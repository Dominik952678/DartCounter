import React, { useEffect, useId, useState } from 'react';
import type { Profile } from '../../types';
import { useModalA11y } from '../../hooks/useModalA11y';
import { throwAtTarget } from '../../utils/bot';

type BullResult = 0 | 25 | 50;

interface BullOffModalProps {
  /** Final line-up (already shuffled if "random order" was also chosen). */
  players: string[];
  profiles: Record<string, Profile>;
  onResolved: (startingIndex: number) => void;
  onCancel: () => void;
}

const RESULT_LABEL: Record<BullResult, string> = {
  50: '🎯 Bullseye',
  25: '🔴 Bull',
  0: '⚪ Daneben'
};

const categorize = (base: number, mult: number): BullResult => {
  if (base === 25 && mult === 2) return 50;
  if (base === 25) return 25;
  return 0;
};

/**
 * Bull-off before leg 1: every player throws once at the bull, highest
 * category starts. Ties re-throw among only the tied players ("Stechen").
 *
 * Bots resolve automatically via the same throw simulation used everywhere
 * else (`throwAtTarget`), so a category from a bot and a category typed in by
 * a human are directly comparable.
 */
export const BullOffModal: React.FC<BullOffModalProps> = ({ players, profiles, onResolved, onCancel }) => {
  const [results, setResults] = useState<(BullResult | null)[]>(() => players.map(() => null));
  const [pendingIndices, setPendingIndices] = useState<number[]>(() => players.map((_, i) => i));
  const [tieMessage, setTieMessage] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useModalA11y<HTMLDivElement>();

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
    const targetAverage = profiles[currentPlayer]?.targetAverage ?? 40;
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

  return (
    <div className="modal-overlay">
      <div
        ref={dialogRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: '420px', padding: '24px 20px' }}
      >
        <h3 id={titleId} style={{ textAlign: 'center', marginBottom: '6px' }}>🎯 Ausbullen</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9em', marginBottom: '18px' }}>
          {tieMessage ?? 'Wer den Bull am nächsten trifft, beginnt Leg 1'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {players.map((name, i) => {
            const isPending = pendingIndices.includes(i);
            const result = results[i];
            const isActive = i === currentIndex;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  background: isActive ? 'rgba(10, 132, 255, 0.12)' : 'var(--surface)',
                  border: isActive ? '1px solid var(--blue)' : '1px solid var(--card-border)',
                  opacity: isPending ? 1 : 0.5
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {profiles[name]?.isBot ? '🤖 ' : ''}{name}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.9em' }}>
                  {result !== null ? RESULT_LABEL[result] : (isActive && isCurrentBot ? 'wirft…' : isActive ? 'ist dran' : '—')}
                </span>
              </div>
            );
          })}
        </div>

        {currentIndex !== undefined && !isCurrentBot && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => submitResult(currentIndex, 50)}>
              🎯 Bullseye
            </button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => submitResult(currentIndex, 25)}>
              🔴 Bull
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => submitResult(currentIndex, 0)}>
              ⚪ Daneben
            </button>
          </div>
        )}

        <button className="btn-secondary" style={{ width: '100%' }} onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  );
};
