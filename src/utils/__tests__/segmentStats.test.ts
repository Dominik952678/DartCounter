import { describe, it, expect } from 'vitest';
import { hasDetailedSegmentKeys, countedSegmentHits, totalSegmentHits } from '../segmentStats';

describe('segment hit counting', () => {
  it('counts three treble twenties as three darts, not six', () => {
    // What the engine actually records for T20, T20, T20.
    const hits = { T20: 3, '20': 3 };

    expect(totalSegmentHits(hits)).toBe(3);
    expect(countedSegmentHits(hits)).toEqual({ T20: 3 });
  });

  it('keeps bull and miss, drops the bare numbers beside them', () => {
    const hits = { DB: 1, SB: 2, Miss: 1, '25': 3, '0': 1 };

    expect(totalSegmentHits(hits)).toBe(4);
    expect(countedSegmentHits(hits)).toEqual({ DB: 1, SB: 2, Miss: 1 });
  });

  it('falls back to the whole record for older numeric-only profiles', () => {
    const hits = { '20': 10, '19': 5, '25': 2 };

    expect(hasDetailedSegmentKeys(hits)).toBe(false);
    expect(totalSegmentHits(hits)).toBe(17);
    expect(countedSegmentHits(hits)).toEqual(hits);
  });

  it('reports nothing for an empty record', () => {
    expect(totalSegmentHits({})).toBe(0);
    expect(hasDetailedSegmentKeys({})).toBe(false);
  });
});
