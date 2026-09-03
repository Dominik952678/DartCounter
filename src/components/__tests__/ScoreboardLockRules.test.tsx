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

  /**
   * The finish used to be hidden outright while a player was frozen, which
   * reads as "there is no checkout from here". `.checkout-pill-frozen` had been
   * styled for exactly this case and used nowhere.
   */
  it('RULE 2b: A frozen player still sees the finish, marked as blocked', () => {
    // T1 is at 40 + 400, T2 at 2 + 2: P0's partner is far above the opponents,
    // so P0 may not check out yet.
    const players = createPlayers([40, 2, 400, 2]);
    const { container } = render(
      <Scoreboard
        players={players}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={baseConfig}
        currentRoundDarts={[]}
      />
    );

    const frozen = container.querySelector('.checkout-pill-frozen');
    expect(frozen).not.toBeNull();
    expect(frozen?.textContent).toContain('D20');
    expect(container.querySelector('.checkout-pill')).toBeNull();
  });

  it('RULE 3: Only the person who must throw points has a number display, blocked player shows Geblockt, opponents clean', () => {
    // Team 1: P0 (40), P2 (200). Partner P2 has 200.
    // Team 2: P1 (50), P3 (50). Total = 100.
    // P2 (200) > T2 (100) -> Team 1 is geblockt! P2 needs to throw 100 pts!
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

    // Blocked player (P0) shows Geblockt (exactly 1 on the whole card, no duplicate bottom pill!)
    expect(screen.getAllByText('Geblockt').length).toBe(1);

    // Thrower player (P2) shows the required points
    expect(screen.getAllByText(/Muss mind./i).length).toBe(2); // 1 on top banner + 1 on thrower card
    expect(screen.getByText(/Team 1 geblockt \(Partner muss mind. 100 Pkt werfen\)/i)).toBeInTheDocument();
  });

  it('RULE 4: Updates required points live after each dart thrown by the thrower', () => {
    // Team 1: P0 (40), P2 (200). Partner P2 has 200.
    // Team 2: P1 (50), P3 (50). Total = 100. (Block diff = 100).
    const players = createPlayers([40, 50, 200, 50]);
    
    // Active player is P2 (The thrower in Team 1). Throws T20 (60 pts).
    // Live score of P2 becomes 200 - 60 = 140.
    // Points P2 needs to throw becomes 140 - 100 = 40!
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
    expect(screen.getAllByText(/Muss mind./i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/40 Pkt/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Team 1 geblockt \(Partner muss mind. 40 Pkt werfen\)/i)).toBeInTheDocument();
  });

  it('RULE 5: Does NOT show any point numbers if multiple players are blocking (only Geblockt)', () => {
    // Both P0 (200) and P2 (200) have scores > Opponents total (100)
    const players = createPlayers([200, 50, 200, 50]);
    render(
      <Scoreboard 
        players={players}
        activePlayer={0}
        startingPlayerOfLeg={0}
        config={baseConfig}
        currentRoundDarts={[]}
      />
    );

    // No "Muss mind." numbers anywhere
    expect(screen.queryByText(/Muss mind./i)).not.toBeInTheDocument();
    // Cards show clean Geblockt
    expect(screen.getAllByText('Geblockt').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Beide Teams gegenseitig geblockt/i)).toBeInTheDocument();
  });
});
