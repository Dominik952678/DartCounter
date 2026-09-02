import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyMatchStatsToProfile, recordMatchForSelf } from '../database';
import type { PlayerStats, Profile, MatchHistory } from '../../types';

const basePlayerStat = (overrides: Partial<PlayerStats> = {}): PlayerStats => ({
  name: 'Dominik',
  sets: 1,
  legs: 3,
  avg: '62.4',
  first9: '70.1',
  matchPts: 1500,
  matchDarts: 72,
  first9Pts: 210,
  first9Darts: 9,
  checkoutAttempts: 6,
  checkoutSuccesses: 3,
  bestMatchLeg: 18,
  sixtyPlus: 8,
  hundredPlus: 4,
  oneFortyPlus: 2,
  oneEighty: 1,
  highestCheckout: 84,
  triplesHit: 15,
  segmentHits: { T20: 12, D16: 2 },
  ...overrides
});

describe('applyMatchStatsToProfile', () => {
  it('books a win onto an empty profile', () => {
    const result = applyMatchStatsToProfile(undefined, basePlayerStat(), true);

    expect(result.matches).toBe(1);
    expect(result.wins).toBe(1);
    expect(result.dartsThrown).toBe(72);
    expect(result.pointsScored).toBe(1500);
    expect(result.checkoutSuccesses).toBe(3);
    expect(result.highestCheckout).toBe(84);
    expect(result.bestLegDarts).toBe(18);
    expect(result.segmentHits).toEqual({ T20: 12, D16: 2 });
  });

  it('accumulates onto an existing profile without losing prior totals', () => {
    const existing: Profile = {
      wins: 4,
      matches: 10,
      dartsThrown: 500,
      pointsScored: 9000,
      highestThrow: 140,
      hundredPlus: 20,
      bestLegDarts: 21,
      highestCheckout: 100,
      segmentHits: { T20: 50, T19: 5 }
    };

    const result = applyMatchStatsToProfile(existing, basePlayerStat(), false);

    expect(result.matches).toBe(11);
    expect(result.wins).toBe(4); // no win booked
    expect(result.dartsThrown).toBe(572);
    expect(result.hundredPlus).toBe(24);
    // A worse checkout must not replace a better one.
    expect(result.highestCheckout).toBe(100);
    // Fewer darts is a better leg; more darts is not.
    expect(result.bestLegDarts).toBe(18);
    expect(result.segmentHits).toEqual({ T20: 62, T19: 5, D16: 2 });
  });

  it('keeps the existing best leg when this match was slower', () => {
    const existing: Profile = {
      wins: 0, matches: 1, dartsThrown: 0, pointsScored: 0, highestThrow: 0, bestLegDarts: 15
    };
    const result = applyMatchStatsToProfile(existing, basePlayerStat({ bestMatchLeg: 24 }), true);
    expect(result.bestLegDarts).toBe(15);
  });

  it('raises the highest throw to 180 when the match contained one', () => {
    const result = applyMatchStatsToProfile(undefined, basePlayerStat({ oneEighty: 1 }), false);
    expect(result.highestThrow).toBe(180);
  });

  it('does not mutate the profile it was given', () => {
    const existing: Profile = {
      wins: 1, matches: 1, dartsThrown: 10, pointsScored: 100, highestThrow: 0,
      segmentHits: { T20: 1 }
    };
    applyMatchStatsToProfile(existing, basePlayerStat(), true);
    expect(existing.matches).toBe(1);
    expect(existing.segmentHits).toEqual({ T20: 1 });
  });
});

describe('recordMatchForSelf', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const onlineMatch = (): MatchHistory => ({
    date: '01.09.2026, 20:15',
    winner: 'Dominik',
    gameType: 'standard',
    isOnline: true,
    players: [basePlayerStat(), basePlayerStat({ name: 'Gegner', oneEighty: 0, bestMatchLeg: 24 })]
  });

  it('stores the match locally and books only the local seat', async () => {
    const profiles = await recordMatchForSelf(onlineMatch(), 'Dominik');

    expect(profiles).not.toBeNull();
    expect(profiles!['Dominik'].matches).toBe(1);
    expect(profiles!['Dominik'].wins).toBe(1);
    // The opponent plays on their own device and books their own result there.
    expect(profiles!['Gegner']).toBeUndefined();

    const stored = JSON.parse(localStorage.getItem('matches_guest') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].winner).toBe('Dominik');
  });

  it('returns null when this device is not part of the match', async () => {
    const result = await recordMatchForSelf(onlineMatch(), 'Unbeteiligt');
    expect(result).toBeNull();
  });

  it('credits a 2v2 team win to a player named inside the team label', async () => {
    const match: MatchHistory = {
      ...onlineMatch(),
      is2v2: true,
      winner: 'Team 1 (Dominik & Partner)'
    };

    const profiles = await recordMatchForSelf(match, 'Dominik');
    expect(profiles!['Dominik'].wins).toBe(1);
  });
});
