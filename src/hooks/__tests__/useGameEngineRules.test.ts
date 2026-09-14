import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, type RenderHookResult } from '@testing-library/react';
import { useGameEngine } from '../useGameEngine';
import type { Profile, GameConfig, GameState } from '../../types';

/**
 * The rulebook itself: busts, legs, sets, match end and the statistics the
 * engine derives while a match runs.
 *
 * None of this was covered before. The gap is why a set win could zero the leg
 * scoreline before the match was written to history, and why every visit that
 * ended in a bust vanished from the checkout denominator.
 */

type Engine = ReturnType<typeof useGameEngine>;
type Harness = RenderHookResult<Engine, unknown>;

const profile = (): Profile => ({ wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 });

const makeProps = () => ({
  profiles: { Dominik: profile(), Gegner: profile() } as Record<string, Profile>,
  setProfiles: vi.fn(),
  setScreen: vi.fn(),
  setStatsModalData: vi.fn()
});

const config = (over: Partial<GameConfig> = {}): GameConfig => ({
  startScore: 501,
  outMode: 'DO',
  setsToWin: 1,
  legsToWin: 3,
  ...over
});

/** Puts a player on `score` and on throw, so a visit can be aimed at a rule. */
const setUp = (result: Harness['result'], playerIndex: number, score: number) => {
  act(() => {
    result.current.setGameState((prev: GameState) => {
      const players = prev.players.map(p => ({ ...p }));
      players[playerIndex] = { ...players[playerIndex], score };
      return { ...prev, players, activePlayer: playerIndex, currentRoundDarts: [] };
    });
  });
};

const throwDarts = (result: Harness['result'], darts: [number, number][]) => {
  for (const [base, mult] of darts) {
    act(() => { result.current.addDart(base, mult); });
  }
  act(() => { vi.runAllTimers(); });
};

describe('X01 bust rules', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('busts when the visit goes below zero and restores the start-of-visit score', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 60);
    // 60 -> 0 would be a finish, but T20 T20 overshoots to -60.
    throwDarts(result, [[20, 3], [20, 3]]);

    expect(result.current.gameState.players[0].score).toBe(60);
    expect(result.current.gameState.players[0].legs).toBe(0);
    // The visit is forfeited: play moves on.
    expect(result.current.gameState.activePlayer).toBe(1);
  });

  it('busts on exactly 1 remaining in double out', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 21);
    throwDarts(result, [[20, 1]]);

    expect(result.current.gameState.players[0].score).toBe(21);
    expect(result.current.gameState.activePlayer).toBe(1);
  });

  it('busts when zero is reached on a single in double out', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 20);
    throwDarts(result, [[20, 1]]);

    expect(result.current.gameState.players[0].score).toBe(20);
    expect(result.current.gameState.players[0].legs).toBe(0);
  });

  it('restores the score from the start of the visit, not from the last dart', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 100);
    // 100 -> 40 -> bust on the second dart. The 60 must not stick.
    throwDarts(result, [[20, 3], [20, 3]]);

    expect(result.current.gameState.players[0].score).toBe(100);
  });

  it('finishes on a double and awards the leg', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 40);
    throwDarts(result, [[20, 2]]);

    expect(result.current.gameState.players[0].legs).toBe(1);
    expect(result.current.gameState.players[0].score).toBe(501);
  });
});

describe('checkout statistics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('counts darts thrown at a double even when the visit busts', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    // 32 -> 16 -> 8 -> 0 on a single: three darts thrown from a checkout
    // position, and the visit busts on the last one.
    setUp(result, 0, 32);
    throwDarts(result, [[16, 1], [8, 1], [8, 1]]);

    expect(result.current.gameState.players[0].checkoutAttempts).toBe(3);
    expect(result.current.gameState.players[0].checkoutSuccesses).toBe(0);
  });

  it('does not inflate the quote after a busted visit', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 32);
    throwDarts(result, [[16, 1], [8, 1], [8, 1]]);
    setUp(result, 0, 32);
    throwDarts(result, [[16, 2]]);

    const p = result.current.gameState.players[0];
    expect(p.checkoutSuccesses).toBe(1);
    expect(p.checkoutAttempts).toBe(4);
  });
});

describe('legs, sets and match end', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('alternates who throws first in the next leg', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    expect(result.current.gameState.startingPlayerOfLeg).toBe(0);

    setUp(result, 0, 40);
    throwDarts(result, [[20, 2]]);

    expect(result.current.gameState.startingPlayerOfLeg).toBe(1);
    expect(result.current.gameState.activePlayer).toBe(1);
  });

  it('records the leg scoreline of the deciding set in the match history', () => {
    const props = makeProps();
    const { result } = renderHook(() => useGameEngine(props));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config({ legsToWin: 2, setsToWin: 1 })); });

    // Gegner takes one leg, Dominik takes two and the match.
    setUp(result, 1, 40);
    throwDarts(result, [[20, 2]]);
    setUp(result, 0, 40);
    throwDarts(result, [[20, 2]]);
    setUp(result, 0, 40);
    throwDarts(result, [[20, 2]]);

    const call = props.setStatsModalData.mock.calls.at(-1)?.[0];
    expect(call).toBeDefined();
    expect(call.matchData.winner).toBe('Dominik');
    expect(call.matchData.players[0].sets).toBe(1);
    // The 2-1 scoreline must survive the set being awarded.
    expect(call.matchData.players[0].legs).toBe(2);
    expect(call.matchData.players[1].legs).toBe(1);
  });

  it('resets the leg counters when a further set follows', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config({ legsToWin: 1, setsToWin: 2 })); });

    setUp(result, 0, 40);
    throwDarts(result, [[20, 2]]);

    // Set one is won; the match continues, so the leg counters start over.
    expect(result.current.gameState.players[0].sets).toBe(1);
    expect(result.current.gameState.players[0].legs).toBe(0);
  });
});

describe('celebrations', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('celebrates a visit of 170 or more, and nothing just below', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    // 168: T20 T20 T16.
    throwDarts(result, [[20, 3], [20, 3], [16, 3]]);
    expect(result.current.celebration).toBeNull();

    // 171 by the next player: T19 T19 T19.
    throwDarts(result, [[19, 3], [19, 3], [19, 3]]);
    expect(result.current.celebration).toMatchObject({ type: 'highScore', total: 171, playerIndex: 1 });
    expect(result.current.celebration?.darts.map(d => d.label)).toEqual(['T19', 'T19', 'T19']);
  });

  it('calls a finish of 100 a high finish and one below it a check', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 100);
    throwDarts(result, [[20, 3], [20, 2]]);
    expect(result.current.celebration).toMatchObject({ type: 'highFinish', total: 100, matchWin: false });

    setUp(result, 0, 40);
    throwDarts(result, [[20, 2]]);
    expect(result.current.celebration).toMatchObject({ type: 'check', total: 40, matchWin: false });
  });

  it('gives the same kind twice in a row a new id, so it replays', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    throwDarts(result, [[20, 3], [20, 3], [20, 3]]);
    const first = result.current.celebration?.id;
    throwDarts(result, [[20, 3], [20, 3], [20, 3]]);
    expect(result.current.celebration?.id).not.toBe(first);
  });

  it('flags the match-winning check and holds the stats sheet until it has played', () => {
    const props = makeProps();
    const { result } = renderHook(() => useGameEngine(props));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config({ legsToWin: 1 })); });

    setUp(result, 0, 40);
    act(() => { result.current.addDart(20, 2); });
    expect(result.current.celebration).toMatchObject({ type: 'check', matchWin: true, matchScore: [1, 0] });

    // The round is booked after 800 ms, the sheet only after the delay.
    act(() => { vi.advanceTimersByTime(800); });
    expect(props.setStatsModalData).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(props.setStatsModalData).toHaveBeenCalledWith(expect.objectContaining({ isOpen: true }));
  });

  it('asks about darts at the double only after the check has played', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    // 50 finished on the bull is the one ambiguous case that asks.
    setUp(result, 0, 50);
    act(() => { result.current.addDart(25, 2); });
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.checkoutPrompt).toBeNull();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.checkoutPrompt).toMatchObject({ isWin: true, playerIndex: 0 });
  });

  it('still asks at once after a missed setup, where nothing is celebrated', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 50);
    act(() => { result.current.addDart(1, 1); });
    act(() => { result.current.addDart(1, 1); });
    act(() => { result.current.addDart(1, 1); });
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.checkoutPrompt).toMatchObject({ isWin: false });
  });

  it('drops the pending question when the finishing dart is undone', () => {
    const { result } = renderHook(() => useGameEngine(makeProps()));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config()); });

    setUp(result, 0, 50);
    act(() => { result.current.addDart(25, 2); });
    act(() => { vi.advanceTimersByTime(900); });
    act(() => { result.current.undoSingleDart(); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.checkoutPrompt).toBeNull();
  });

  it('never opens the stats sheet when the winning dart is undone in time', () => {
    const props = makeProps();
    const { result } = renderHook(() => useGameEngine(props));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config({ legsToWin: 1 })); });

    setUp(result, 0, 40);
    act(() => { result.current.addDart(20, 2); });
    act(() => { vi.advanceTimersByTime(900); });
    act(() => { result.current.undoSingleDart(); });
    act(() => { vi.advanceTimersByTime(5000); });

    const opened = props.setStatsModalData.mock.calls.some(([arg]) => typeof arg === 'object' && arg?.isOpen);
    expect(opened).toBe(false);
  });
});

describe('profile bests written by the match-winning visit', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('keeps a personal best set by the very last visit of the match', () => {
    const props = makeProps();
    const { result } = renderHook(() => useGameEngine(props));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config({ legsToWin: 1, setsToWin: 1 })); });

    // 160 finish: T20 T20 D20 wins the leg, the set and the match at once.
    setUp(result, 0, 160);
    throwDarts(result, [[20, 3], [20, 3], [20, 2]]);

    const call = props.setStatsModalData.mock.calls.at(-1)?.[0];
    expect(call).toBeDefined();
    expect(call.pendingProfiles.Dominik.highestThrow).toBe(160);
  });
});
