import { describe, it, expect } from 'vitest';
import type { MatchHistory, PlayerStats, Profile } from '../../types';
import {
  headToHeadRows,
  matchesFor,
  miniGameRows,
  radarAxes,
  recordsOfMatches,
  segmentHitsFor,
  segmentShares,
  statsModeOptions,
  trainingSummary,
  x01Summary
} from '../playerStats';

const stat = (name: string, over: Partial<PlayerStats> = {}): PlayerStats => ({
  name, sets: 0, legs: 0, avg: '0', first9: '0', ...over
});

const x01 = (over: Partial<MatchHistory> & { me?: Partial<PlayerStats> } = {}): MatchHistory => {
  const { me, ...rest } = over;
  return {
    date: '01.09.26',
    winner: 'Dominik',
    gameType: 'standard',
    config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 },
    players: [stat('Dominik', me), stat('Jonas')],
    ...rest
  };
};

describe('matchesFor', () => {
  const matches = [
    x01(),
    x01({ isOnline: true }),
    x01({ config: { startScore: 301, outMode: 'SO', setsToWin: 1, legsToWin: 2 } }),
    x01({ gameType: 'powerScoring', config: undefined }),
    x01({ players: [stat('Jonas')] })
  ];

  it('keeps offline and online apart, old matches count as offline', () => {
    expect(matchesFor(matches, 'Dominik', { online: false, mode: 'x01' })).toHaveLength(2);
    expect(matchesFor(matches, 'Dominik', { online: true, mode: 'x01' })).toHaveLength(1);
  });

  it('narrows to one variant or one training', () => {
    expect(matchesFor(matches, 'Dominik', { online: false, mode: 'x01:301:SO' })).toHaveLength(1);
    expect(matchesFor(matches, 'Dominik', { online: false, mode: 'powerScoring' })).toHaveLength(1);
  });

  it('lists every played variant between all X01 and the trainings', () => {
    expect(statsModeOptions(matches).map(o => o.label)).toEqual([
      'Alle X01', '501 · DO', '301 · SO', 'Power Scoring', 'Split Score', 'Checkout-Training'
    ]);
  });
});

describe('x01Summary', () => {
  it('derives average, darts per leg and the checkout rate', () => {
    // 1503 Punkte in 60 Darts sind Ø 75.15, also 501 in 20 Darts.
    const summary = x01Summary([x01({ me: { matchPts: 1503, matchDarts: 60, checkoutAttempts: 6, checkoutSuccesses: 3 } })], 'Dominik');

    expect(summary.average).toBeCloseTo(75.15);
    expect(summary.dartsPerLeg?.toFixed(1)).toBe('20.0');
    expect(summary.checkoutRate).toBe(50);
    expect(summary.winRate).toBe(100);
  });

  it('counts a 2v2 win for both partners', () => {
    const team = x01({
      is2v2: true,
      winner: 'Team 1',
      players: [stat('Dominik', { team: 1 }), stat('Jonas', { team: 2 }), stat('Lena', { team: 1 }), stat('Tom', { team: 2 })]
    });
    expect(x01Summary([team], 'Lena').wins).toBe(1);
    expect(x01Summary([team], 'Tom').wins).toBe(0);
  });

  it('compares the last five with the whole history and charts oldest first', () => {
    const newest = x01({ me: { matchPts: 700, matchDarts: 30 } });
    const older = Array.from({ length: 5 }, () => x01({ me: { matchPts: 500, matchDarts: 30 } }));
    const summary = x01Summary([newest, ...older], 'Dominik');

    expect(summary.last5.average).toBeCloseTo(((700 + 4 * 500) / 150) * 3);
    expect(summary.averageSeries.at(-1)).toBe(70);
  });
});

describe('trainingSummary', () => {
  it('has best, average and the score curve', () => {
    const played = [800, 600, 400].map(score =>
      x01({ gameType: 'powerScoring', players: [stat('Dominik', { score })] })
    );
    expect(trainingSummary(played, 'Dominik')).toMatchObject({ best: 800, average: 600, series: [400, 600, 800] });
  });
});

describe('Treffer', () => {
  it('takes the profile offline and subtracts what was thrown online', () => {
    const profile: Profile = { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, segmentHits: { T20: 10, '20': 10 } };
    const online = x01({ isOnline: true, me: { segmentHits: { T20: 4, '20': 4 } } });

    expect(segmentHitsFor([online], 'Dominik', { online: false, mode: 'x01' }, profile)).toEqual({ T20: 6, '20': 6 });
    expect(segmentHitsFor([online], 'Dominik', { online: true, mode: 'x01' }, profile)).toEqual({ T20: 4, '20': 4 });
  });

  it('groups small segments as rest and never counts a dart twice', () => {
    const hits = { T20: 60, '20': 60, S1: 36, '1': 36, D16: 2, '16': 2, S5: 2, '5': 2 };
    expect(segmentShares(hits)).toEqual([
      { name: 'T20', value: 60 },
      { name: 'S1', value: 36 },
      { name: 'Rest', value: 4 }
    ]);
    expect(radarAxes(hits).find(a => a.label === '20')?.value).toBe(60);
  });
});

describe('Rekorde und Vergleich', () => {
  it('collects online records from the matches', () => {
    const records = recordsOfMatches([
      x01({ me: { bestMatchLeg: 18, highestCheckout: 96, oneEighty: 1 } }),
      x01({ me: { bestMatchLeg: 15, highestCheckout: 121, oneEighty: 2 } })
    ], 'Dominik');
    expect(records).toMatchObject({ bestLeg: 15, highestCheckout: 121, oneEighty: 3, highestThrow: null });
  });

  it('compares eleven figures, fewer darts winning the best leg', () => {
    const a: Profile = { wins: 6, matches: 10, dartsThrown: 300, pointsScored: 6000, highestThrow: 180, bestLegDarts: 12 };
    const b: Profile = { wins: 4, matches: 10, dartsThrown: 300, pointsScored: 5400, highestThrow: 140, bestLegDarts: 15 };
    const rows = headToHeadRows(a, b);

    expect(rows).toHaveLength(11);
    expect(rows[0]).toMatchObject({ label: 'Siegquote', values: ['60 %', '40 %'] });
    expect(rows.find(r => r.label === 'Bestes Leg')).toMatchObject({ values: ['12', '15'], better: 'low' });
  });

  it('describes the three trainings', () => {
    const rows = miniGameRows({
      wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
      powerScoring: { bestScore: 812, matchesPlayed: 4, wins: 2, totalScore: 2560 },
      checkoutTraining: { bestCheckout: 112, roundsCompleted: 18, matchesPlayed: 3, wins: 1, totalAttempts: 25 }
    });
    expect(rows[0]).toEqual({ title: 'Power Scoring', best: '812', detail: 'Ø 640 · 2 Siege' });
    expect(rows[1].best).toBe('–');
    expect(rows[2].detail).toBe('72 % Quote · bestes Finish');
  });
});
