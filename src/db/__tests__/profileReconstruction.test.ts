import { describe, it, expect } from 'vitest';
import { reconstructProfileFromMatches, reconstructAllProfilesFromMatches } from '../database';
import type { Profile, MatchHistory } from '../../types';

describe('Profile Reconstruction from MatchHistory', () => {
  it('reconstructs full profile statistics from match history when profile was empty', () => {
    const emptyProfile: Profile = {
      wins: 0,
      matches: 0,
      dartsThrown: 0,
      pointsScored: 0,
      highestThrow: 0,
      color: 'var(--blue)'
    };

    const mockMatches: MatchHistory[] = [
      {
        date: '01.09.2026, 14:00',
        winner: 'Dominik',
        gameType: 'standard',
        players: [
          {
            name: 'Dominik',
            sets: 1,
            legs: 3,
            avg: '75.0',
            first9: '85.0',
            matchPts: 1503,
            matchDarts: 60,
            first9Pts: 510,
            first9Darts: 18,
            checkoutAttempts: 5,
            checkoutSuccesses: 3,
            bestMatchLeg: 14,
            hundredPlus: 8,
            oneFortyPlus: 3,
            oneEighty: 2,
            highestCheckout: 116,
            triplesHit: 12,
            segmentHits: { '20': 25, 'T20': 10, 'D20': 3, '25': 2, 'DB': 1 }
          },
          {
            name: 'Alex',
            sets: 0,
            legs: 1,
            avg: '60.0',
            first9: '65.0',
            matchPts: 1200,
            matchDarts: 60
          }
        ]
      },
      {
        date: '02.09.2026, 11:00',
        winner: 'Alex',
        gameType: 'standard',
        players: [
          {
            name: 'Dominik',
            sets: 0,
            legs: 1,
            avg: '70.0',
            first9: '75.0',
            matchPts: 900,
            matchDarts: 39,
            first9Pts: 225,
            first9Darts: 9,
            checkoutAttempts: 2,
            checkoutSuccesses: 1,
            bestMatchLeg: 18,
            hundredPlus: 4,
            oneFortyPlus: 1,
            oneEighty: 0,
            highestCheckout: 40,
            triplesHit: 4,
            segmentHits: { '20': 15, 'T20': 4, '19': 8 }
          },
          {
            name: 'Alex',
            sets: 1,
            legs: 3,
            avg: '72.0',
            first9: '78.0',
            matchPts: 1503,
            matchDarts: 63
          }
        ]
      }
    ];

    const reconstructed = reconstructProfileFromMatches('Dominik', emptyProfile, mockMatches);

    expect(reconstructed.matches).toBe(2);
    expect(reconstructed.wins).toBe(1);
    expect(reconstructed.dartsThrown).toBe(99);
    expect(reconstructed.pointsScored).toBe(2403);
    expect(reconstructed.highestCheckout).toBe(116);
    expect(reconstructed.bestLegDarts).toBe(14);
    expect(reconstructed.oneEighty).toBe(2);
    expect(reconstructed.oneFortyPlus).toBe(4);
    expect(reconstructed.hundredPlus).toBe(12);
    expect(reconstructed.triplesHit).toBe(16);
    expect(reconstructed.checkoutAttempts).toBe(7);
    expect(reconstructed.checkoutSuccesses).toBe(4);
    expect(reconstructed.highestThrow).toBe(180);
    expect(reconstructed.segmentHits?.['20']).toBe(40);
    expect(reconstructed.segmentHits?.['T20']).toBe(14);
    expect(reconstructed.segmentHits?.['19']).toBe(8);
    expect(reconstructed.segmentHits?.['DB']).toBe(1);
  });

  it('reconstructs minigame stats from matches', () => {
    const base: Profile = {
      wins: 0,
      matches: 0,
      dartsThrown: 0,
      pointsScored: 0,
      highestThrow: 0
    };

    const matches: MatchHistory[] = [
      {
        date: '01.09.2026',
        winner: 'Dominik',
        gameType: 'powerScoring',
        players: [{ name: 'Dominik', sets: 0, legs: 0, avg: '0', first9: '0', score: 650 }]
      },
      {
        date: '02.09.2026',
        winner: 'Dominik',
        gameType: 'splitScore',
        players: [{ name: 'Dominik', sets: 0, legs: 0, avg: '0', first9: '0', score: 320 }]
      }
    ];

    const res = reconstructProfileFromMatches('Dominik', base, matches);
    expect(res.powerScoring?.bestScore).toBe(650);
    expect(res.powerScoring?.matchesPlayed).toBe(1);
    expect(res.powerScoring?.wins).toBe(1);

    expect(res.splitScore?.bestScore).toBe(320);
    expect(res.splitScore?.matchesPlayed).toBe(1);
    expect(res.splitScore?.wins).toBe(1);
  });

  it('reconstructs all profiles including newly discovered players', () => {
    const initialProfiles: Record<string, Profile> = {
      Dominik: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
    };

    const matches: MatchHistory[] = [
      {
        date: '01.09.2026',
        winner: 'Dominik',
        gameType: 'standard',
        players: [
          { name: 'Dominik', sets: 1, legs: 3, avg: '80.0', first9: '80.0', matchPts: 1503, matchDarts: 56, bestMatchLeg: 15 },
          { name: 'Sarah', sets: 0, legs: 1, avg: '65.0', first9: '65.0', matchPts: 1100, matchDarts: 51 }
        ]
      }
    ];

    const result = reconstructAllProfilesFromMatches(initialProfiles, matches);
    expect(result.Dominik.matches).toBe(1);
    expect(result.Dominik.wins).toBe(1);
    expect(result.Dominik.bestLegDarts).toBe(15);

    expect(result.Sarah).toBeDefined();
    expect(result.Sarah.matches).toBe(1);
    expect(result.Sarah.wins).toBe(0);
    expect(result.Sarah.dartsThrown).toBe(51);
  });
});
