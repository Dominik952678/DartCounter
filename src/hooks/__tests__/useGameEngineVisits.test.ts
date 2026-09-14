import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from '../useGameEngine';
import type { GameConfig, Profile } from '../../types';

/**
 * Zwei Dinge, die der neue Match-Screen von der Engine braucht: die Aufnahmen
 * des laufenden Legs für die Live-Statistik, und ein Match, das man verlassen
 * kann, ohne es zu beenden.
 */

const profiles: Record<string, Profile> = {
  Dominik: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
  Gegner: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
};

const props = {
  profiles,
  setProfiles: vi.fn(),
  setScreen: vi.fn(),
  setStatsModalData: vi.fn()
};

const config: GameConfig = { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 };

type Engine = ReturnType<typeof useGameEngine>;

const throwDarts = (engine: { current: Engine }, bases: number[]) => {
  bases.forEach(base => {
    act(() => { engine.current.addDart(base); });
  });
  act(() => { vi.runAllTimers(); });
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Aufnahmen des Legs', () => {
  it('records each visit with its darts, points and what is left', () => {
    const { result } = renderHook(() => useGameEngine(props));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config); });

    throwDarts(result, [20, 20, 20]);

    const visits = result.current.gameState.players[0].legVisits ?? [];
    expect(visits).toHaveLength(1);
    expect(visits[0]).toMatchObject({ points: 60, remaining: 441, bust: false });
    expect(visits[0].darts).toHaveLength(3);
  });
});

describe('Match verlassen, ohne es zu beenden', () => {
  it('keeps a match with darts thrown for the start screen', () => {
    const { result } = renderHook(() => useGameEngine(props));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config); });
    throwDarts(result, [20, 20, 20]);

    let kept = false;
    act(() => { kept = result.current.suspendGame(); });

    expect(kept).toBe(true);
    expect(localStorage.getItem('dartcounter_saved_game')).not.toBeNull();
    expect(result.current.hasSavedGame).toBe(true);
  });

  it('keeps nothing when no dart was thrown', () => {
    const { result } = renderHook(() => useGameEngine(props));
    act(() => { result.current.startGame(['Dominik', 'Gegner'], config); });

    let kept = true;
    act(() => { kept = result.current.suspendGame(); });

    expect(kept).toBe(false);
    expect(localStorage.getItem('dartcounter_saved_game')).toBeNull();
  });
});
