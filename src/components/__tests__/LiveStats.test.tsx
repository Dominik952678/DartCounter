import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveStats } from '../match/LiveStats';
import type { GameConfig, Player } from '../../types';

const config: GameConfig = { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 };

const player = (over: Partial<Player> = {}): Player => ({
  name: 'Dominik', score: 361, legs: 0, sets: 0,
  legPts: 140, legDarts: 3, matchPts: 501, matchDarts: 15, legHistory: [],
  matchFirst9Pts: 300, matchFirst9Darts: 9, sixtyPlus: 0, hundredPlus: 1, oneFortyPlus: 1, oneEighty: 0,
  highestCheckout: 0, checkoutAttempts: 2, checkoutSuccesses: 1, segmentHits: { T20: 2, S20: 1 },
  ...over
});

/** Die Live-Statistik: was heute in der kleinen Kachel stand, und die Aufnahmen des Legs. */
describe('LiveStats', () => {
  it('shows the averages and the checkout quote', () => {
    render(<LiveStats players={[player()]} activePlayer={0} config={config} />);

    expect(screen.getByText('140.0')).toBeInTheDocument(); // Leg Ø
    expect(screen.getByText('100.2')).toBeInTheDocument(); // Match Ø
    expect(screen.getByText('Checkout').nextElementSibling).toHaveTextContent('1/2 50 %');
  });

  it('lists the visits of the running leg', () => {
    render(
      <LiveStats
        players={[player({
          legVisits: [
            { darts: ['T20', 'T20', 'S20'], points: 140, remaining: 361, bust: false },
            { darts: ['T20', 'T20', 'T20'], points: 0, remaining: 361, bust: true }
          ]
        })]}
        activePlayer={0}
        config={config}
      />
    );

    expect(screen.getByText('T20 T20 S20')).toBeInTheDocument();
    expect(screen.getByText('Bust')).toBeInTheDocument();
  });

  it('says so when the leg has no visit yet', () => {
    render(<LiveStats players={[player()]} activePlayer={0} config={config} />);

    expect(screen.getByText('Noch keine Aufnahme in diesem Leg')).toBeInTheDocument();
  });

  it('follows the thrower until another player is picked', () => {
    const players = [player(), player({ name: 'Mara', matchPts: 300, matchDarts: 15 })];
    const { rerender } = render(<LiveStats players={players} activePlayer={0} config={config} />);
    expect(screen.getByText('100.2')).toBeInTheDocument();

    rerender(<LiveStats players={players} activePlayer={1} config={config} />);
    expect(screen.getByText('60.0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Dominik' }));
    expect(screen.getByText('100.2')).toBeInTheDocument();
  });
});
