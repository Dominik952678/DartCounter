import { describe, it, expect } from 'vitest';
import type { Celebration, GameConfig, Player } from '../../types';
import {
  cardCelebrationClass,
  celebrationHeadline,
  celebrationTypeFor,
  dartLabel,
  isCelebration,
  isMatchWinningLeg,
  legPopClass,
  matchScoreFor
} from '../celebration';
import { dartPath, segmentAngle } from '../dartboardGeometry';

const player = (over: Partial<Player> = {}): Player => ({
  name: 'P', score: 501, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0,
  legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
  oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
  segmentHits: {}, ...over
});

const config = (over: Partial<GameConfig> = {}): GameConfig => ({
  startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3, ...over
});

const celebration = (over: Partial<Celebration> = {}): Celebration => ({
  id: 1, type: 'highScore', playerIndex: 0, total: 180, darts: [], matchWin: false, ...over
});

describe('which visits are celebrated', () => {
  it('starts the high score at 170 and leaves everything below alone', () => {
    expect(celebrationTypeFor({ bust: false, isWin: false, total: 168 })).toBeNull();
    expect(celebrationTypeFor({ bust: false, isWin: false, total: 170 })).toBe('highScore');
    expect(celebrationTypeFor({ bust: false, isWin: false, total: 180 })).toBe('highScore');
  });

  it('splits finishes at 100 into high finish and check', () => {
    expect(celebrationTypeFor({ bust: false, isWin: true, total: 99 })).toBe('check');
    expect(celebrationTypeFor({ bust: false, isWin: true, total: 100 })).toBe('highFinish');
  });

  it('keeps a bust a bust, whatever the total', () => {
    expect(celebrationTypeFor({ bust: true, isWin: false, total: 177 })).toBe('bust');
  });

  it('calls only 180 a maximum', () => {
    expect(celebrationHeadline(celebration({ total: 180 }))).toBe('Maximum');
    expect(celebrationHeadline(celebration({ total: 174 }))).toBe('High Score');
    expect(celebrationHeadline(celebration({ type: 'check', total: 40 }))).toBe('Check');
    expect(celebrationHeadline(celebration({ type: 'check', total: 40, matchWin: true }))).toBe('Match');
  });

  it('writes a missed dart as Miss', () => {
    expect(dartLabel({ base: 0, mult: 1, value: 0, label: '0' })).toBe('Miss');
    expect(dartLabel({ base: 20, mult: 3, value: 60, label: 'T20' })).toBe('T20');
  });
});

describe('match win and scoreline', () => {
  it('wins the match on the last leg of the last set only', () => {
    expect(isMatchWinningLeg(player({ legs: 2 }), config({ legsToWin: 3 }))).toBe(true);
    expect(isMatchWinningLeg(player({ legs: 1 }), config({ legsToWin: 3 }))).toBe(false);
    expect(isMatchWinningLeg(player({ legs: 2, sets: 0 }), config({ legsToWin: 3, setsToWin: 2 }))).toBe(false);
  });

  it('reads the scoreline in legs, or in sets over a set match', () => {
    const players = [player({ legs: 2 }), player({ legs: 1 })];
    expect(matchScoreFor(players, 0, config())).toEqual([3, 1]);

    const inSets = [player({ sets: 1, legs: 2 }), player({ sets: 1, legs: 0 })];
    expect(matchScoreFor(inSets, 0, config({ setsToWin: 2 }))).toEqual([2, 1]);
  });

  it('counts the other team in 2v2, not the partner', () => {
    const players = [player({ legs: 2, team: 1 }), player({ legs: 0, team: 2 }), player({ legs: 2, team: 1 }), player({ legs: 1, team: 2 })];
    expect(matchScoreFor(players, 0, config({ is2v2: true }))).toEqual([3, 1]);
  });
});

describe('card classes', () => {
  const players = [player(), player(), player(), player()];

  it('dims the losing cards on a match win but not the partner in 2v2', () => {
    const c = celebration({ type: 'check', total: 40, matchWin: true, playerIndex: 0 });
    expect(cardCelebrationClass(c, 0, players, true)).toBe('cel-card-match');
    expect(cardCelebrationClass(c, 1, players, true)).toBe('cel-card-lose');
    expect(cardCelebrationClass(c, 2, players, true)).toBe('');
  });

  it('holds the stamp and the leg counter back after a match-winning high finish', () => {
    const c = celebration({ type: 'highFinish', total: 121, matchWin: true });
    expect(cardCelebrationClass(c, 0, players, false)).toContain('is-late');
    expect(legPopClass(c, 0)).toBe('cel-leg-pop is-late');
    expect(legPopClass(c, 1)).toBe('');
  });
});

describe('online payload guard', () => {
  it('rejects the celebration shape an older host still sends', () => {
    expect(isCelebration({ type: '180', playerIndex: 0 })).toBe(false);
    expect(isCelebration(null)).toBe(false);
    expect(isCelebration(celebration())).toBe(true);
  });
});

describe('dartboard geometry', () => {
  it('puts the 20 at the top and the 6 to the right', () => {
    expect(segmentAngle(20)).toBe(-90);
    expect(segmentAngle(6)).toBe(0);
  });

  it('draws nothing for a miss and different areas for treble and double', () => {
    expect(dartPath({ base: 0, mult: 1, value: 0, label: '0' })).toBeNull();
    const treble = dartPath({ base: 20, mult: 3, value: 60, label: 'T20' });
    const double = dartPath({ base: 20, mult: 2, value: 40, label: 'D20' });
    expect(treble).toBeTruthy();
    expect(treble).not.toBe(double);
  });
});
