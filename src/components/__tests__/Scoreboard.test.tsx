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

  it('renders 2v2 team header and indicators when in 2v2 mode', () => {
    const teamPlayers: Player[] = [
      { ...dummyPlayers[0], name: 'Dominik', score: 300, team: 1 },
      { ...dummyPlayers[1], name: 'Opponent 1', score: 100, team: 2 },
      { ...dummyPlayers[0], name: 'Partner', score: 150, team: 1 },
      { ...dummyPlayers[1], name: 'Opponent 2', score: 100, team: 2 }
    ];

    const teamConfig: GameConfig = {
      ...dummyConfig,
      is2v2: true
    };

    render(
      <Scoreboard 
        players={teamPlayers}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={teamConfig}
        currentRoundDarts={[]}
      />
    );

    expect(screen.getByText('Team 1:')).toBeInTheDocument();
    expect(screen.getByText('Team 2:')).toBeInTheDocument();
    // Team 1 score = 300 + 150 = 450 Pkt
    expect(screen.getByText('450 Pkt')).toBeInTheDocument();
    // Team 2 score = 100 + 100 = 200 Pkt
    expect(screen.getByText('200 Pkt')).toBeInTheDocument();
  });

  it('shows Frozen warning badge when active player team is behind in 2v2', () => {
    const teamPlayers: Player[] = [
      { ...dummyPlayers[0], name: 'Dominik', score: 40, team: 1 },
      { ...dummyPlayers[1], name: 'Opponent 1', score: 50, team: 2 },
      { ...dummyPlayers[0], name: 'Partner', score: 200, team: 1 },
      { ...dummyPlayers[1], name: 'Opponent 2', score: 50, team: 2 }
    ];

    const teamConfig: GameConfig = {
      ...dummyConfig,
      is2v2: true
    };

    render(
      <Scoreboard 
        players={teamPlayers}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={teamConfig}
        currentRoundDarts={[]}
      />
    );

    // Partner has 200, opponents have 100. Diff = +100 Pkt -> FROZEN
    expect(screen.getByText(/Team 1 Frozen/i)).toBeInTheDocument();
    expect(screen.getByText('❄️ Geblockt (Freeze)')).toBeInTheDocument();
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
