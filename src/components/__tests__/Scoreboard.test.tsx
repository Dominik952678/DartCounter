import type { ComponentProps } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard } from '../Scoreboard';
import type { Player, GameConfig, Dart } from '../../types';

describe('Scoreboard Component', () => {
  const dummyPlayers: Player[] = [
    {
      name: 'Dominik',
      score: 501,
      legs: 1,
      sets: 0,
      legPts: 0,
      legDarts: 0,
      matchPts: 501,
      matchDarts: 15,
      legHistory: ['100.2'],
      matchFirst9Pts: 300,
      matchFirst9Darts: 9,
      sixtyPlus: 2,
      hundredPlus: 1,
      oneFortyPlus: 0,
      oneEighty: 1,
      highestCheckout: 40,
      checkoutAttempts: 2,
      checkoutSuccesses: 1,
      segmentHits: {}
    },
    {
      name: 'Bot Level 3',
      score: 380,
      legs: 0,
      sets: 0,
      legPts: 0,
      legDarts: 0,
      matchPts: 121,
      matchDarts: 12,
      legHistory: [],
      matchFirst9Pts: 100,
      matchFirst9Darts: 9,
      sixtyPlus: 1,
      hundredPlus: 0,
      oneFortyPlus: 0,
      oneEighty: 0,
      highestCheckout: 0,
      checkoutAttempts: 0,
      checkoutSuccesses: 0,
      isBot: true,
      segmentHits: {}
    }
  ];

  const dummyConfig: GameConfig = {
    startScore: 501,
    outMode: 'DO',
    setsToWin: 1,
    legsToWin: 3
  };

  const renderBoard = (props: Partial<ComponentProps<typeof Scoreboard>> = {}) =>
    render(
      <Scoreboard
        players={dummyPlayers}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={dummyConfig}
        currentRoundDarts={[]}
        {...props}
      />
    );

  it('renders all player names and scores', () => {
    renderBoard();

    expect(screen.getByText('Dominik')).toBeInTheDocument();
    // Der Bot-Kopf ist ein Icon neben dem Namen, kein Zeichen im Namen.
    expect(screen.getByText('Bot Level 3')).toBeInTheDocument();
    expect(screen.getByText('501')).toBeInTheDocument();
    expect(screen.getByText('380')).toBeInTheDocument();
  });

  it('marks the card of the player on throw', () => {
    renderBoard();

    expect(screen.getByText('wirft').closest('.player-card')).toHaveClass('is-active');
  });

  it('shows the match average on the card', () => {
    renderBoard();

    // (501 / 15) · 3
    expect(screen.getByText('100.2')).toBeInTheDocument();
  });

  it('shows the checkout route in the bar when the thrower can finish', () => {
    const { container } = renderBoard({ players: [{ ...dummyPlayers[0], score: 40 }] });

    expect(screen.getByText('D20')).toBeInTheDocument();
    expect(container.querySelector('.status-bar.is-checkout')).not.toBeNull();
  });

  /**
   * The scoreboard used to gate the finish on a hard `<= 170`, so the Master
   * Out finishes from 171 to 180 were never shown to the player they applied to.
   */
  it('shows a Master Out finish above 170', () => {
    renderBoard({ players: [{ ...dummyPlayers[0], score: 171 }], config: { ...dummyConfig, outMode: 'MO' } });

    expect(screen.getByText('T20 · T20 · T17')).toBeInTheDocument();
  });

  it('keeps the bar empty above 170 in Double Out, where no finish exists', () => {
    const { container } = renderBoard({ players: [{ ...dummyPlayers[0], score: 171 }] });

    expect(screen.queryByText(/T20 · T20/)).not.toBeInTheDocument();
    expect(container.querySelector('.status-bar.is-empty')).not.toBeNull();
  });

  it('calls a bogey at the start of a visit', () => {
    renderBoard({ players: [{ ...dummyPlayers[0], score: 169 }] });

    expect(screen.getByText('Bogey')).toBeInTheDocument();
  });

  /** Mit geworfenen Darts heißt „kein Weg" nur „nicht mit den Darts, die übrig sind". */
  it('does not call a bogey in the middle of a visit', () => {
    const single: Dart = { base: 1, mult: 1, value: 1, label: 'S1' };
    renderBoard({ players: [{ ...dummyPlayers[0], score: 170 }], currentRoundDarts: [single] });

    expect(screen.queryByText('Bogey')).not.toBeInTheDocument();
  });

  it('shows BUST for a busted visit', () => {
    renderBoard({ roundBust: true });

    expect(screen.getByText('Bust')).toBeInTheDocument();
  });

  it('hides the routes when checkout hints are switched off', () => {
    renderBoard({ players: [{ ...dummyPlayers[0], score: 40 }], showCheckoutHints: false });

    expect(screen.queryByText('D20')).not.toBeInTheDocument();
  });

  it('names the team on every card that is not on throw in 2v2', () => {
    const teamPlayers: Player[] = [
      { ...dummyPlayers[0], name: 'Dominik', score: 100, team: 1 },
      { ...dummyPlayers[1], name: 'Opponent 1', score: 100, team: 2 },
      { ...dummyPlayers[0], name: 'Partner', score: 100, team: 1 },
      { ...dummyPlayers[1], name: 'Opponent 2', score: 100, team: 2 }
    ];

    renderBoard({ players: teamPlayers, config: { ...dummyConfig, is2v2: true } });

    expect(screen.getByText('wirft')).toBeInTheDocument();
    expect(screen.getAllByText('Team 1')).toHaveLength(1);
    expect(screen.getAllByText('Team 2')).toHaveLength(2);
  });
});
