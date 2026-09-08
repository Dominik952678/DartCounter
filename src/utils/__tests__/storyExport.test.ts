import { describe, it, expect } from 'vitest';
import { buildStoryData, hasStoryData, type MiniGameType } from '../storyExport';
import type { PlayerStats } from '../../types';

const row = (over: Partial<PlayerStats>): PlayerStats => ({
  name: 'Anna', sets: 0, legs: 0, avg: '0.0', first9: '0.0', ...over
});

describe('hasStoryData', () => {
  it.each<[MiniGameType, Partial<PlayerStats>]>([
    ['powerScoring', { roundScores: [60] }],
    ['splitScore', { splitLog: [{ target: '15', gained: 30 }] }],
    ['checkoutTraining', { checkoutLog: [{ target: 80, darts: 3 }] }]
  ])('accepts a %s result that carries its log', (type, fields) => {
    expect(hasStoryData(row(fields), type)).toBe(true);
  });

  // Ergebnisse aus der Zeit vor dieser Aufzeichnung, und X01-Matches.
  it.each(['powerScoring', 'splitScore', 'checkoutTraining', 'standard'] as const)(
    'rejects a %s result without one',
    type => expect(hasStoryData(row({ score: 100 }), type)).toBe(false)
  );
});

describe('buildStoryData: Power Scoring', () => {
  it('reads average and best round from the rounds thrown', () => {
    const data = buildStoryData(
      row({ score: 180, roundScores: [60, 45, 75, null], dartsThrown: 9, triplesHit: 3 }),
      'powerScoring'
    );
    expect(data.headline).toBe('180');
    expect(data.stats[0]).toEqual({ label: 'Average', value: '60.0' });
    expect(data.stats[1]).toEqual({ label: 'Triple-Quote', value: '33 %' });
    expect(data.stats[2]).toEqual({ label: 'Beste Runde', value: '75' });
    expect(data.entries.map(e => e.value)).toEqual(['60', '45', '75', '–']);
    expect(data.entries.map(e => e.state)).toEqual(['hit', 'hit', 'hit', 'open']);
  });
});

describe('buildStoryData: Split Score', () => {
  it('marks a halved target as a miss and labels it SPLIT', () => {
    const data = buildStoryData(
      row({
        score: 95,
        splitLog: [
          { target: '15', gained: 30 },
          { target: '16', gained: null },
          { target: 'Double', gained: 40 }
        ],
        dartsThrown: 9,
        triplesHit: 0
      }),
      'splitScore'
    );
    expect(data.mode).toContain('SPLIT SCORE');
    expect(data.stats[0]).toEqual({ label: 'Treffer', value: '2/3' });
    expect(data.stats[1]).toEqual({ label: 'Splits', value: '1' });
    expect(data.entries.map(e => e.value)).toEqual(['+30', 'SPLIT', '+40']);
    expect(data.entries.map(e => e.state)).toEqual(['hit', 'miss', 'hit']);
    expect(data.footnote).toContain('1 Split');
  });

  it('says Splits in the plural', () => {
    const data = buildStoryData(
      row({ splitLog: [{ target: '15', gained: null }, { target: '16', gained: null }], dartsThrown: 6 }),
      'splitScore'
    );
    expect(data.footnote).toContain('2 Splits');
  });
});

describe('buildStoryData: Checkout Training', () => {
  it('counts finishes and averages the darts of the ones that landed', () => {
    const data = buildStoryData(
      row({
        checkoutLog: [
          { target: 80, darts: 3 },
          { target: 120, darts: null },
          { target: 40, darts: 5 }
        ],
        dartsThrown: 14,
        triplesHit: 2
      }),
      'checkoutTraining'
    );
    expect(data.headline).toBe('2/3');
    expect(data.stats[0]).toEqual({ label: 'Trefferquote', value: '67 %' });
    // Nur die gefinishten zählen in den Schnitt: (3 + 5) / 2.
    expect(data.stats[1]).toEqual({ label: 'Ø Darts', value: '4.0' });
    // Das verpasste 120er zählt nicht als höchstes Finish.
    expect(data.stats[2]).toEqual({ label: 'Höchstes Finish', value: '80' });
    expect(data.entries.map(e => e.value)).toEqual(['3D', '✗', '5D']);
  });

  it('does not divide by zero when nothing was finished', () => {
    const data = buildStoryData(
      row({ checkoutLog: [{ target: 100, darts: null }], dartsThrown: 3 }),
      'checkoutTraining'
    );
    expect(data.headline).toBe('0/1');
    expect(data.stats[1].value).toBe('–');
    expect(data.stats[2].value).toBe('–');
  });
});
