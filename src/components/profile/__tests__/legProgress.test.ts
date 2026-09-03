import { describe, it, expect } from 'vitest';
import type { MatchHistory, PlayerStats } from '../../../types';
import { hasLegProgress } from '../legProgress';

const player = (legHistory?: string[]): PlayerStats => ({
  name: 'Dominik', sets: 1, legs: 3, avg: '60.0', first9: '65.0', legHistory
});

const match = (players: PlayerStats[]): MatchHistory => ({
  date: '01.09.26, 20:15',
  winner: 'Dominik',
  players
});

describe('hasLegProgress', () => {
  it('recognises a match with several legs recorded', () => {
    expect(hasLegProgress(match([player(['60.1', '58.4', '62.0'])]))).toBe(true);
  });

  /** One leg is a point, not a line — and mini games record none at all. */
  it('declines a single leg and a match without leg data', () => {
    expect(hasLegProgress(match([player(['60.1'])]))).toBe(false);
    expect(hasLegProgress(match([player()]))).toBe(false);
    expect(hasLegProgress(match([player([])]))).toBe(false);
  });

  it('survives a match row without players', () => {
    expect(hasLegProgress({ date: '', winner: '', players: undefined as unknown as PlayerStats[] })).toBe(false);
  });

  it('is enough for one player to have the data', () => {
    expect(hasLegProgress(match([player(), player(['55.0', '61.2'])]))).toBe(true);
  });
});
