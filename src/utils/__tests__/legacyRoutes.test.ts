import { describe, it, expect } from 'vitest';
import { legacyOfflineTarget } from '../legacyRoutes';

/**
 * Alte Adressen aus v1.x — Lesezeichen, installierte PWAs — landen auf den
 * Routen, die seit v2.0.0 dasselbe tun.
 */
describe('legacyOfflineTarget', () => {
  it.each([
    ['', '/play'],
    ['?start=1', '/play?start=1'],
    ['?tab=match', '/play'],
    ['?tab=match&start=1', '/play?start=1'],
    ['?tab=training', '/training'],
    ['?tab=training&mode=splitscore', '/training?mode=splitscore']
  ])('sends /offline%s to %s', (search, target) => {
    expect(legacyOfflineTarget(search)).toBe(target);
  });
});
