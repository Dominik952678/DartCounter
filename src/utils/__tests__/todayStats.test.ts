import { describe, it, expect } from 'vitest';
import { todayStats } from '../todayStats';
import type { MatchHistory, PlayerStats } from '../../types';

const player = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  name: 'Anna', sets: 0, legs: 0, avg: '0.0', first9: '0.0', ...over
});

const match = (createdAt: string | undefined, players: PlayerStats[]): MatchHistory => ({
  date: 'irgendwann', winner: 'Anna', players, createdAt
});

const NOW = new Date('2026-09-09T20:15:00');
const iso = (s: string) => new Date(s).toISOString();

describe('todayStats', () => {
  it('counts nothing out of nothing', () => {
    expect(todayStats([], NOW)).toEqual({ matches: 0, oneEighty: 0, bestLeg: 0 });
    expect(todayStats(undefined, NOW)).toEqual({ matches: 0, oneEighty: 0, bestLeg: 0 });
  });

  it('counts only matches from the same calendar day', () => {
    const stats = todayStats([
      match(iso('2026-09-09T08:00:00'), [player()]),
      match(iso('2026-09-09T23:50:00'), [player()]),
      match(iso('2026-09-08T23:50:00'), [player()]),
      match(iso('2026-09-10T00:10:00'), [player()])
    ], NOW);

    expect(stats.matches).toBe(2);
  });

  /**
   * `date` ist ein für Menschen formatierter String, den man laut Typ-Kommentar
   * nicht vergleichen soll. Ein Match aus der Zeit vor `createdAt` gilt deshalb
   * als nicht von heute — eine falsche Zuordnung wäre schlimmer als eine
   * fehlende, weil die Kachel sonst Würfe von letzter Woche behauptet.
   */
  it.each([
    ['no timestamp', undefined],
    ['an unparseable one', 'gestern abend']
  ])('leaves out a match with %s', (_label, stamp) => {
    expect(todayStats([match(stamp, [player({ oneEighty: 3 })])], NOW).matches).toBe(0);
  });

  it('adds up the 180s of everyone who played today', () => {
    const stats = todayStats([
      match(iso('2026-09-09T10:00:00'), [player({ oneEighty: 2 }), player({ name: 'Ben', oneEighty: 1 })]),
      match(iso('2026-09-09T12:00:00'), [player({ oneEighty: 1 })])
    ], NOW);

    expect(stats.oneEighty).toBe(4);
  });

  /** Beim kürzesten Leg gewinnt die kleinere Zahl — kein Math.max. */
  it('takes the fewest darts as the best leg', () => {
    const stats = todayStats([
      match(iso('2026-09-09T10:00:00'), [player({ bestMatchLeg: 21 }), player({ name: 'Ben', bestMatchLeg: 15 })]),
      match(iso('2026-09-09T12:00:00'), [player({ bestMatchLeg: 18 })])
    ], NOW);

    expect(stats.bestLeg).toBe(15);
  });

  /** 0 heißt „nicht aufgezeichnet" und darf nicht als Rekord durchgehen. */
  it('ignores a leg of zero darts', () => {
    const stats = todayStats([
      match(iso('2026-09-09T10:00:00'), [player({ bestMatchLeg: 0 }), player({ name: 'Ben', bestMatchLeg: 19 })])
    ], NOW);

    expect(stats.bestLeg).toBe(19);
  });

  it('survives a match with a missing player list', () => {
    const broken = { date: 'x', winner: 'Anna', createdAt: iso('2026-09-09T10:00:00') } as MatchHistory;
    expect(todayStats([broken], NOW)).toEqual({ matches: 1, oneEighty: 0, bestLeg: 0 });
  });
});
