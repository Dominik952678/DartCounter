import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard } from '../Scoreboard';
import type { Player, GameConfig, Dart } from '../../types';

describe('2v2 Freeze Lock & Block Display Rules', () => {
  const baseConfig: GameConfig = {
    startScore: 501,
    outMode: 'DO',
    setsToWin: 1,
    legsToWin: 3,
    is2v2: true
  };

  const createPlayers = (scores: [number, number, number, number]): Player[] => [
    { name: 'P0 (T1)', score: scores[0], legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 1 },
    { name: 'P1 (T2)', score: scores[1], legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 2 },
    { name: 'P2 (T1)', score: scores[2], legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 1 },
    { name: 'P3 (T2)', score: scores[3], legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 2 }
  ];

  it('RULE 1: Does NOT show any lock bars when neither team is blocked', () => {
    // Both teams at 501 (501 <= 501 + 501 = 1002). Neither is blocked.
    const players = createPlayers([501, 501, 501, 501]);
    const { container } = render(
      <Scoreboard 
        players={players}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={baseConfig}
        currentRoundDarts={[]}
      />
    );

    // No lock badges in the cards
    expect(container.querySelectorAll('.lock-badge-bar')).toHaveLength(0);
    expect(screen.queryByText(/Geblockt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Blockt mit/i)).not.toBeInTheDocument();
  });

  it('RULE 3: When only one team is blocked, both show a lock and the blocker shows points', () => {
    // Team 1: P0 (40), P2 (200). Partner P2 has 200.
    // Team 2: P1 (50), P3 (50). Total = 100.
    // P2 (200) > T2 (100) -> Team 1 is geblockt! Team 2 blocks Team 1 by 100 points!
    const players = createPlayers([40, 50, 200, 50]);
    render(
      <Scoreboard 
        players={players}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={baseConfig}
        currentRoundDarts={[]}
      />
    );

    // Blocked team shows Geblockt
    expect(screen.getAllByText('Geblockt').length).toBeGreaterThanOrEqual(1);

    // Blocking team shows how many points they are blocking by
    expect(screen.getAllByText(/Blockt mit/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Team 2 blockt Team 1 mit 100 Pkt/i)).toBeInTheDocument();
  });

  it('RULE 4: Updates blocker points live after each dart thrown', () => {
    // Team 1: P0 (40), P2 (200). Partner P2 has 200.
    // Team 2: P1 (50), P3 (50). Total = 100. (Block diff = 100).
    const players = createPlayers([40, 50, 200, 50]);
    
    // Active player is P2 (Partner in Team 1). Throws T20 (60 pts).
    // Live score of P2 becomes 200 - 60 = 140.
    // Live block diff becomes 140 - 100 = 40!
    const roundDarts: Dart[] = [
      { base: 20, mult: 3, value: 60, label: 'T20' }
    ];

    render(
      <Scoreboard 
        players={players}
        activePlayer={2}
        startingPlayerOfLeg={0}
        config={baseConfig}
        currentRoundDarts={roundDarts}
      />
    );

    // Should update live to 40 Pkt!
    expect(screen.getByText(/Team 2 blockt Team 1 mit 40 Pkt/i)).toBeInTheDocument();
  });
});
