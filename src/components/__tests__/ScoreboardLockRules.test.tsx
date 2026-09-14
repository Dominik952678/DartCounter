import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard } from '../Scoreboard';
import type { Player, GameConfig, Dart } from '../../types';

/**
 * Der 2v2-Freeze auf dem Board: ein Team darf erst auschecken, wenn keiner
 * seiner Spieler mehr Punkte hat als das gegnerische Team zusammen.
 *
 * Seit v2.0.0 steht der Zustand als Wort in der Leiste unter den Karten
 * („Freeze · Team 1"), ein Schloss markiert die betroffenen Karten, und wer
 * herunterwerfen muss, trägt „noch X" — ohne erklärenden Satz.
 */
describe('2v2 Freeze Lock & Block Display Rules', () => {
  const baseConfig: GameConfig = {
    startScore: 501,
    outMode: 'DO',
    setsToWin: 1,
    legsToWin: 3,
    is2v2: true
  };

  const createPlayers = (scores: [number, number, number, number]): Player[] =>
    scores.map((score, i) => ({
      name: `P${i} (T${i % 2 === 0 ? 1 : 2})`, score, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0,
      matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
      oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
      segmentHits: {}, team: (i % 2 === 0 ? 1 : 2) as 1 | 2
    }));

  const board = (scores: [number, number, number, number], activePlayer = 0, currentRoundDarts: Dart[] = []) => (
    <Scoreboard
      players={createPlayers(scores)}
      activePlayer={activePlayer}
      startingPlayerOfLeg={0}
      config={baseConfig}
      currentRoundDarts={currentRoundDarts}
    />
  );

  it('RULE 1: shows no freeze when neither team is blocked', () => {
    const { container } = render(board([501, 501, 501, 501]));

    expect(container.querySelectorAll('.card-lock')).toHaveLength(0);
    expect(container.querySelector('.status-bar.is-freeze')).toBeNull();
    expect(screen.queryByText(/noch/)).not.toBeInTheDocument();
  });

  /**
   * A frozen player still sees the finish, marked as frozen: hiding it read as
   * "there is no checkout from here".
   */
  it('RULE 2: a frozen thrower still sees the finish, in the freeze bar', () => {
    // T1 is at 40 + 400, T2 at 2 + 2: P0's partner is far above the opponents.
    const { container } = render(board([40, 2, 400, 2]));

    const freeze = container.querySelector('.status-bar.is-freeze');
    expect(freeze).not.toBeNull();
    expect(freeze?.textContent).toContain('D20');
    expect(container.querySelector('.status-bar.is-checkout')).toBeNull();
  });

  it('RULE 3: marks both cards of the blocked team and names the points to throw down', () => {
    // Team 1: P0 (40), P2 (200). Team 2: P1 (50), P3 (50) = 100.
    // P2 is 100 above the opponents: team 1 is frozen, P2 must throw 100.
    const { container } = render(board([40, 50, 200, 50]));

    expect(container.querySelectorAll('.card-lock')).toHaveLength(2);
    expect(screen.getByText('Freeze · Team 1')).toBeInTheDocument();
    // On P2's card and in the bar of P0, who is on throw.
    expect(screen.getAllByText('noch 100')).toHaveLength(2);
  });

  it('RULE 4: updates the points live with every dart of the thrower', () => {
    // P2 throws T20: 200 → 140, still 40 above the opponents' 100.
    render(board([40, 50, 200, 50], 2, [{ base: 20, mult: 3, value: 60, label: 'T20' }]));

    expect(screen.getAllByText('noch 40').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Freeze · Team 1')).toBeInTheDocument();
  });

  it('RULE 5: names no number when more than one player is too high', () => {
    // P0 (200) and P2 (200) are both above the opponents' 100.
    render(board([200, 50, 200, 50]));

    expect(screen.queryByText(/noch/)).not.toBeInTheDocument();
    expect(screen.getByText('Freeze · Team 1')).toBeInTheDocument();
  });

  /**
   * The freeze flips back and forth within a leg. The short "Frei" notice must
   * not stick afterwards, because it would hide a freeze the engine still
   * enforces.
   */
  it('RULE 6: shows the freeze again after a short release', () => {
    const blocked: [number, number, number, number] = [2, 50, 200, 50];   // T1 frozen: P2 = 200 > 100
    const free: [number, number, number, number] = [2, 150, 200, 100];    // T1 free:   P2 = 200 < 250

    const { rerender } = render(board(blocked));
    expect(screen.getByText('Freeze · Team 1')).toBeInTheDocument();

    rerender(board(free));
    expect(screen.getByText('Frei · Team 1')).toBeInTheDocument();

    // Opponent misses, the score is as before — frozen again, still within the
    // 2.2 seconds of the notice.
    rerender(board(blocked));
    expect(screen.queryByText('Frei · Team 1')).not.toBeInTheDocument();
    expect(screen.getByText('Freeze · Team 1')).toBeInTheDocument();
  });
});
