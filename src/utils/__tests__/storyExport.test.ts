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
    const by = Object.fromEntries(data.stats.map(s => [s.label, s.value]));
    expect(by['Average']).toBe('60.0');          // 180 Punkte / 9 Darts * 3
    expect(by['Ø Runde']).toBe('60.0');          // 180 / 3 geworfene Runden
    expect(by['Beste Runde']).toBe('75');
    expect(by['Triple-Quote']).toBe('33 %');
    expect(by['100+']).toBe('0');
    expect(by['Darts']).toBe('9');
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
          { target: '15', gained: 30, hits: 2 },
          { target: '16', gained: null, hits: 0 },
          { target: 'Double', gained: 40, hits: 2 }
        ],
        dartsThrown: 9,
        triplesHit: 0
      }),
      'splitScore'
    );
    expect(data.mode).toContain('SPLIT SCORE');
    const by = Object.fromEntries(data.stats.map(s => [s.label, s.value]));
    // Vier Darts im Ziel bei neun geworfenen.
    expect(by['Trefferquote']).toBe('44 %');
    expect(by['Treffer']).toBe('4/9');
    expect(by['Splits']).toBe('1');
    expect(by['Ziele']).toBe('2/3');
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
    const by = Object.fromEntries(data.stats.map(s => [s.label, s.value]));
    expect(by['Checkquote']).toBe('67 %');
    // Nur die gefinishten zählen in den Schnitt: (3 + 5) / 2.
    expect(by['Ø Darts']).toBe('4.0');
    // Das verpasste 120er zählt nicht als höchstes Finish.
    expect(by['Höchstes Finish']).toBe('80');
    expect(by['Bestes Finish']).toBe('3 Darts');
    expect(data.entries.map(e => e.value)).toEqual(['3D', '✗', '5D']);
  });

  it('does not divide by zero when nothing was finished', () => {
    const data = buildStoryData(
      row({ checkoutLog: [{ target: 100, darts: null }], dartsThrown: 3 }),
      'checkoutTraining'
    );
    expect(data.headline).toBe('0/1');
    const by = Object.fromEntries(data.stats.map(s => [s.label, s.value]));
    expect(by['Ø Darts']).toBe('–');
    expect(by['Höchstes Finish']).toBe('–');
    expect(by['Bestes Finish']).toBe('–');
  });
});

/**
 * Die Trefferquote im Split Score zählt Darts, nicht Punkte: ein Triple im Ziel
 * ist ein Treffer, genau wie ein Single. Bei neun Zielen à drei Darts ist der
 * Nenner eine volle Sitzung lang 27.
 */
describe('Split Score: Trefferquote', () => {
  it('counts a treble in the target as one hit, not three', () => {
    const data = buildStoryData(
      row({
        // Runde eins: alle drei im Ziel, davon Treffer als Triple.
        splitLog: [{ target: '20', gained: 180, hits: 3 }],
        dartsThrown: 3,
        triplesHit: 3
      }),
      'splitScore'
    );
    const by = Object.fromEntries(data.stats.map(s => [s.label, s.value]));
    expect(by['Trefferquote']).toBe('100 %');
    expect(by['Treffer']).toBe('3/3');
  });

  it('reaches 27 darts over a full session', () => {
    const data = buildStoryData(
      row({
        splitLog: Array.from({ length: 9 }, (_, i) => ({ target: String(i), gained: 20, hits: 2 })),
        dartsThrown: 27
      }),
      'splitScore'
    );
    const by = Object.fromEntries(data.stats.map(s => [s.label, s.value]));
    expect(by['Treffer']).toBe('18/27');
    expect(by['Trefferquote']).toBe('67 %');
  });
});
