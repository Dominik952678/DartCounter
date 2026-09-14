import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatsModal } from '../Modals';
import type { MatchHistory, Player, PlayerStats } from '../../types';

/**
 * Der Ergebnis-Screen (Entwurf D3, E6). Alle Kennzahlen, die das Ergebnis bis
 * v1.17 zeigte, bleiben — in einer Vergleichstabelle, der beste Wert orange.
 */

const row = (name: string, over: Partial<PlayerStats> = {}): PlayerStats => ({
  name, sets: 0, legs: 0, avg: '0.0', first9: '0.0', ...over
});

const modalPlayer = (name: string): Player => ({
  name, score: 0, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0,
  legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
  oneFortyPlus: 0, oneEighty: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
  highestCheckout: 0, segmentHits: {}
});

const x01Match: MatchHistory = {
  date: '13.09.2026, 20:15',
  winner: 'Anna',
  gameType: 'standard',
  config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 },
  players: [
    row('Anna', { legs: 3, avg: '61.2', first9: '66.7', bestMatchLeg: 12, checkoutAttempts: 7, checkoutSuccesses: 3, matchDarts: 96, oneEighty: 1, legHistory: ['58.3', '70.5'] }),
    row('Ben', { legs: 1, avg: '54.0', first9: '58.4', bestMatchLeg: 21, checkoutAttempts: 6, checkoutSuccesses: 1, matchDarts: 102, legHistory: ['49.1', '52.4'] })
  ]
};

const renderResult = (match: MatchHistory, handlers: Partial<Record<'onRematch' | 'onUndoLastDart' | 'onClose', () => void>> = {}) =>
  render(
    <StatsModal
      isOpen
      winnerIndex={0}
      players={match.players.map(p => modalPlayer(p.name))}
      matchData={match}
      onClose={handlers.onClose ?? vi.fn()}
      onRematch={handlers.onRematch}
      onUndoLastDart={handlers.onUndoLastDart}
    />
  );

describe('Ergebnis eines X01-Matches', () => {
  it('names the winner and the scoreline', () => {
    renderResult(x01Match);

    expect(screen.getByText('Anna gewinnt das Match')).toBeInTheDocument();
    expect(screen.getByText('3 – 1')).toBeInTheDocument();
    expect(screen.getByText('501 · Double Out · Bis 3 Legs')).toBeInTheDocument();
  });

  it('compares every figure and marks the better one', () => {
    const { container } = renderResult(x01Match);

    ['Average', 'Erste 9', 'Bestes Leg (Darts)', 'Checkout-Quote', 'Triple-Quote', '180', '140+', '100+', 'Höchstes Finish']
      .forEach(label => expect(screen.getByText(label)).toBeInTheDocument());

    const best = Array.from(container.querySelectorAll('td.is-best')).map(td => td.textContent);
    expect(best).toEqual(expect.arrayContaining(['61.2', '66.7', '12']));
    // Weniger Darts im besten Leg ist besser, also nicht Bens 21.
    expect(best).not.toContain('21');
  });

  it('lists the average of every leg', () => {
    renderResult(x01Match);

    expect(screen.getByText('70.5')).toBeInTheDocument();
    expect(screen.getByText('49.1')).toBeInTheDocument();
  });

  it('offers the rematch and taking the last dart back', () => {
    const onRematch = vi.fn();
    const onUndoLastDart = vi.fn();
    renderResult(x01Match, { onRematch, onUndoLastDart });

    fireEvent.click(screen.getByRole('button', { name: /Revanche/ }));
    fireEvent.click(screen.getByRole('button', { name: /Wurf zurück/ }));

    expect(onRematch).toHaveBeenCalledTimes(1);
    expect(onUndoLastDart).toHaveBeenCalledTimes(1);
  });
});

describe('Ergebnis eines Trainings', () => {
  it('shows the best checkout, the attempts and the darts', () => {
    renderResult({
      date: '12.09.2026, 18:00',
      winner: 'Anna',
      gameType: 'checkoutTraining',
      players: [row('Anna', { score: 112, attempts: 10, dartsUsed: 41 }), row('Bot', { score: 64, attempts: 10, dartsUsed: 52 })]
    });

    expect(screen.getByText('Checkout-Training')).toBeInTheDocument();
    expect(screen.getByText('Bestes Checkout')).toBeInTheDocument();
    expect(screen.getByText('Versuche')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fertig' })).toBeInTheDocument();
  });
});
