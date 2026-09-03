import { describe, it, expect } from 'vitest';
import { reconstructAllProfilesFromMatches, getGuestDefaultProfiles } from '../index';
import type { MatchHistory, Profile } from '../../types';

const matchWith = (names: string[]): MatchHistory => ({
  date: '01.09.2026, 20:15',
  winner: names[0],
  gameType: 'standard',
  players: names.map(name => ({
    name, sets: 1, legs: 3, avg: '61.0', first9: '70.0',
    matchDarts: 60, matchPts: 1220, oneEighty: 1, bestMatchLeg: 18
  }))
});

describe('reconstructAllProfilesFromMatches', () => {
  it('rebuilds a named profile that is missing but appears in the match history', () => {
    // The recovery path: the account's own profile was lost, but its matches
    // are stored as separate rows and still carry every figure.
    const guestOnly = getGuestDefaultProfiles();
    expect(guestOnly['Dominik']).toBeUndefined();

    const restored = reconstructAllProfilesFromMatches(
      guestOnly,
      [matchWith(['Dominik', 'Gegner']), matchWith(['Dominik', 'Gegner'])],
      ['Dominik']
    );

    expect(restored['Dominik']).toBeDefined();
    expect(restored['Dominik'].matches).toBe(2);
    expect(restored['Dominik'].wins).toBe(2);
    expect(restored['Dominik'].dartsThrown).toBe(120);
    expect(restored['Dominik'].bestLegDarts).toBe(18);
    expect(restored['Dominik'].oneEighty).toBe(2);
  });

  it('still refuses to invent profiles for opponents', () => {
    const restored = reconstructAllProfilesFromMatches(
      getGuestDefaultProfiles(),
      [matchWith(['Dominik', 'Gegner'])],
      ['Dominik']
    );
    expect(restored['Dominik']).toBeDefined();
    // Only the explicitly named profile comes back; opponents stay out of the list.
    expect(restored['Gegner']).toBeUndefined();
  });

  it('does not create a profile for a name with no matches', () => {
    const restored = reconstructAllProfilesFromMatches(
      getGuestDefaultProfiles(),
      [matchWith(['Dominik'])],
      ['NieGespielt']
    );
    expect(restored['NieGespielt']).toBeUndefined();
  });

  it('leaves an existing profile in place rather than resetting it', () => {
    const existing: Record<string, Profile> = {
      'Dominik': { wins: 9, matches: 20, dartsThrown: 1000, pointsScored: 20000, highestThrow: 180 }
    };
    const restored = reconstructAllProfilesFromMatches(existing, [matchWith(['Dominik'])], ['Dominik']);
    // Reconciliation only ever raises totals; it must not shrink a real profile.
    expect(restored['Dominik'].matches).toBeGreaterThanOrEqual(20);
    expect(restored['Dominik'].wins).toBeGreaterThanOrEqual(9);
  });
});
