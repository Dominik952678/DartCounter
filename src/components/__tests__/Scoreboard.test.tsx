import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard } from '../Scoreboard';
import type { Player, GameConfig } from '../../types';

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

  it('renders all player names, scores, sets, and legs', () => {
    render(
      <Scoreboard 
        players={dummyPlayers}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={dummyConfig}
        currentRoundDarts={[]}
      />
    );

    expect(screen.getByText('Dominik')).toBeInTheDocument();
    expect(screen.getByText('🤖 Bot Level 3')).toBeInTheDocument();
    expect(screen.getByText('501')).toBeInTheDocument();
    expect(screen.getByText('380')).toBeInTheDocument();
  });

  it('shows checkout suggestion when active player is in checkout range', () => {
    const playersInCheckout: Player[] = [
      {
        ...dummyPlayers[0],
        score: 40
      }
    ];

    render(
      <Scoreboard 
        players={playersInCheckout}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={dummyConfig}
        currentRoundDarts={[]}
      />
    );

    expect(screen.getByText('D20')).toBeInTheDocument();
  });

  it('displays compact stats correctly (Leg, Match, CO, 100+, 180)', () => {
    render(
      <Scoreboard 
        players={dummyPlayers}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={dummyConfig}
        currentRoundDarts={[]}
      />
    );

    expect(screen.getByText('100.2')).toBeInTheDocument(); // Match Avg: (501/15)*3 = 100.2
    expect(screen.getByText('50%')).toBeInTheDocument(); // CO: 1/2 = 50%
  });
});
