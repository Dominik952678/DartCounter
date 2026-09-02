import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine, get2v2FreezeStatus } from '../useGameEngine';
import { supabase } from '../../db/database';
import type { Profile, GameConfig, Player } from '../../types';

describe('useGameEngine Hook & Undo Logic', () => {
  const dummyProfiles: Record<string, Profile> = {
    'Dominik': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
    'Gegner': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
  };

  const defaultProps = {
    profiles: dummyProfiles,
    setProfiles: vi.fn(),
    setScreen: vi.fn(),
    setStatsModalData: vi.fn()
  };

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('correctly calculates 2v2 freeze status and point difference', () => {
    const players: Player[] = [
      { name: 'P1', score: 40, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 1 },
      { name: 'P2', score: 60, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 2 },
      { name: 'P3', score: 200, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 1 },
      { name: 'P4', score: 40, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0, legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0, oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0, segmentHits: {}, team: 2 }
    ];

    // P1 (active, team 1). Partner P3 has 200. Opponents P2 + P4 have 60 + 40 = 100.
    // Diff = 200 - 100 = 100 > 0 -> FROZEN
    const statusP1 = get2v2FreezeStatus(players, 0);
    expect(statusP1.is2v2).toBe(true);
    expect(statusP1.isFrozen).toBe(true);
    expect(statusP1.pointDifference).toBe(100);

    // P2 (active, team 2). Partner P4 has 40. Opponents P1 + P3 have 40 + 200 = 240.
    // Diff = 40 - 240 = -200 <= 0 -> UNFROZEN
    const statusP2 = get2v2FreezeStatus(players, 1);
    expect(statusP2.isFrozen).toBe(false);
    expect(statusP2.pointDifference).toBe(-200);
  });

  it('undoes a dart within a turn correctly', () => {
    const { result } = renderHook(() => useGameEngine(defaultProps));

    const config: GameConfig = {
      startScore: 501,
      outMode: 'DO',
      setsToWin: 1,
      legsToWin: 3
    };

    act(() => {
      result.current.startGame(['Dominik', 'Gegner'], config);
    });

    expect(result.current.gameState.players[0].score).toBe(501);
    expect(result.current.gameState.currentRoundDarts).toHaveLength(0);

    // Throw T20
    act(() => {
      result.current.addDart(20, 3);
    });

    expect(result.current.gameState.currentRoundDarts).toHaveLength(1);
    expect(result.current.gameState.currentRoundDarts[0].value).toBe(60);

    // Undo throw
    act(() => {
      result.current.undoSingleDart();
    });

    expect(result.current.gameState.currentRoundDarts).toHaveLength(0);
    expect(result.current.gameState.players[0].score).toBe(501);
  });

  it('undoes a leg checkout without corrupting player score to 0', () => {
    const { result } = renderHook(() => useGameEngine(defaultProps));

    const config: GameConfig = {
      startScore: 501,
      outMode: 'DO',
      setsToWin: 1,
      legsToWin: 3
    };

    act(() => {
      result.current.startGame(['Dominik', 'Gegner'], config);
    });

    // Manually set Dominik to 40 points left
    act(() => {
      result.current.setGameState(prev => {
        const newPlayers = [...prev.players];
        newPlayers[0] = { ...newPlayers[0], score: 40 };
        return { ...prev, players: newPlayers };
      });
    });

    expect(result.current.gameState.players[0].score).toBe(40);

    // Throw winning dart D20
    act(() => {
      result.current.addDart(20, 2);
    });

    // Fast-forward timeout for round end / leg win
    act(() => {
      vi.runAllTimers();
    });

    // Leg won! New leg started, scores reset to 501
    expect(result.current.gameState.players[0].legs).toBe(1);
    expect(result.current.gameState.players[0].score).toBe(501);

    // Now undo the checkout!
    act(() => {
      result.current.undoSingleDart();
    });

    // Player 0 should be restored back to score 40, legs 0, NOT corrupted to 0!
    expect(result.current.gameState.activePlayer).toBe(0);
    expect(result.current.gameState.players[0].score).toBe(40);
    expect(result.current.gameState.players[0].legs).toBe(0);
    expect(result.current.gameState.currentRoundDarts).toHaveLength(0);
  });
});

describe('linked cloud guest revoking mid-match', () => {
  const baseProps = {
    setScreen: vi.fn(),
    setStatsModalData: vi.fn()
  };

  const linkedProfiles: Record<string, Profile> = {
    'Dominik': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
    'CloudGast': {
      wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
      isLinkedCloudGuest: true,
      linkedUserId: 'user_guest_1',
      linkedUsername: 'CloudGast',
      syncAuthToken: 'tok_original'
    }
  };

  const config: GameConfig = { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 };

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    // The guest has revoked the link: the cloud token no longer matches.
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { data: { authToken: 'tok_revoked', syncEnabled: false } }
          })
        })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null })
    } as unknown as ReturnType<typeof supabase.from>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const advance = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  it('reports the revocation once, ends the match and removes the guest profile', async () => {
    const setProfiles = vi.fn();
    const { result } = renderHook(() =>
      useGameEngine({ ...baseProps, profiles: linkedProfiles, setProfiles })
    );

    act(() => {
      result.current.startGame(['Dominik', 'CloudGast'], config);
    });
    expect(result.current.gameState.players).toHaveLength(2);

    // First poll detects the revoked token.
    await advance(4500);

    expect(result.current.remoteAbortNotice).toContain('CloudGast');
    // The match is over: an empty roster is what stops the watcher.
    expect(result.current.gameState.players).toHaveLength(0);

    // The borrowed guest profile is gone; the local player survives.
    const written = setProfiles.mock.calls.at(-1)?.[0] as Record<string, Profile>;
    expect(written).toBeDefined();
    expect(written['CloudGast']).toBeUndefined();
    expect(written['Dominik']).toBeDefined();

    // The original bug: the notice re-fired every few seconds forever.
    const callsAfterFirstNotice = setProfiles.mock.calls.length;
    await advance(20000);
    expect(setProfiles.mock.calls.length).toBe(callsAfterFirstNotice);
    expect(result.current.remoteAbortNotice).toContain('CloudGast');
  });

  it('lets the notice be dismissed and does not bring it back', async () => {
    const { result } = renderHook(() =>
      useGameEngine({ ...baseProps, profiles: linkedProfiles, setProfiles: vi.fn() })
    );

    act(() => {
      result.current.startGame(['Dominik', 'CloudGast'], config);
    });
    await advance(4500);
    expect(result.current.remoteAbortNotice).not.toBeNull();

    act(() => {
      result.current.dismissRemoteAbortNotice();
    });
    expect(result.current.remoteAbortNotice).toBeNull();

    await advance(20000);
    expect(result.current.remoteAbortNotice).toBeNull();
  });

  it('keeps playing while the guest link is still valid', async () => {
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { data: { authToken: 'tok_original', syncEnabled: true } }
          })
        })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    } as unknown as ReturnType<typeof supabase.from>);

    const setProfiles = vi.fn();
    const { result } = renderHook(() =>
      useGameEngine({ ...baseProps, profiles: linkedProfiles, setProfiles })
    );

    act(() => {
      result.current.startGame(['Dominik', 'CloudGast'], config);
    });
    await advance(15000);

    expect(result.current.remoteAbortNotice).toBeNull();
    expect(result.current.gameState.players).toHaveLength(2);
  });
});
