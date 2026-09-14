import { describe, it, expect } from 'vitest';
import { matchProgressLabel, matchSides, matchTitle } from '../matchProgress';

const side = (name: string, legs = 0, sets = 0, score = 501, team?: 1 | 2) => ({ name, legs, sets, score, team });

describe('matchProgressLabel', () => {
  it('counts the legs played so far', () => {
    expect(matchProgressLabel([side('A', 1), side('B', 1)], { setsToWin: 1 })).toBe('Leg 3');
  });

  it('names the set when the match is played in sets', () => {
    expect(matchProgressLabel([side('A', 2, 1), side('B', 1, 0)], { setsToWin: 3 })).toBe('Satz 2 · Leg 4');
  });

  /** Partner zählen dasselbe Leg — es darf nicht doppelt in die Zählung eingehen. */
  it('counts a leg won by a team once', () => {
    const players = [side('A', 1, 0, 200, 1), side('B', 0, 0, 180, 2), side('C', 1, 0, 200, 1), side('D', 0, 0, 180, 2)];
    expect(matchProgressLabel(players, { setsToWin: 1, is2v2: true })).toBe('Leg 2');
  });
});

describe('matchSides', () => {
  it('pairs the partners in doubles', () => {
    const players = [side('Marcus', 0, 0, 200, 1), side('Lena', 0, 0, 180, 2), side('Tom', 0, 0, 200, 1), side('Kai', 0, 0, 180, 2)];
    expect(matchSides(players, { is2v2: true }).map(s => s.name)).toEqual(['Marcus & Tom', 'Lena & Kai']);
  });
});

describe('matchTitle', () => {
  it('names score, finish and doubles', () => {
    expect(matchTitle({ startScore: 501, outMode: 'DO' })).toBe('501 · Double Out');
    expect(matchTitle({ startScore: 301, outMode: 'MO', is2v2: true })).toBe('301 · Master Out · 2v2');
  });
});
