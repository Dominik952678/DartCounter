import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Profile } from '../../types';

const getProfiles = vi.fn();
const saveProfiles = vi.fn();

vi.mock('../../db/database', () => ({
  getProfiles: (...args: unknown[]) => getProfiles(...args),
  saveProfiles: (...args: unknown[]) => saveProfiles(...args),
  PersistenceError: class PersistenceError extends Error {
    scope: string;
    constructor(message: string, scope: string) {
      super(message);
      this.scope = scope;
    }
  }
}));

import { useProfiles } from '../useProfiles';
import { useNotificationStore } from '../../store/useNotificationStore';

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const user = { id: 'user-1', user_metadata: { username: 'Dominik' } };

describe('useProfiles', () => {
  beforeEach(() => {
    getProfiles.mockReset().mockResolvedValue({ Dominik: profile({ wins: 3 }) });
    saveProfiles.mockReset().mockResolvedValue(undefined);
    useNotificationStore.getState().clear();
  });

  const mounted = async () => {
    const hook = renderHook(() => useProfiles(user));
    await waitFor(() => expect(hook.result.current.loadedForUserId).toBe('user-1'));
    return hook;
  };

  /**
   * The regression this file exists for.
   *
   * The mutators used to build the next profile set inside a `setProfiles`
   * updater and then persist the variable that updater assigned. React only
   * runs such an updater eagerly when nothing is pending on the fiber, so the
   * captured value could still be `undefined` when it was handed to
   * `saveProfiles` — which then wrote `JSON.stringify(undefined)` to
   * localStorage and `{profiles: undefined}` to Supabase, wiping the account.
   */
  it('never persists an empty or undefined profile set', async () => {
    const { result } = await mounted();

    await act(async () => { await result.current.handleCreateProfile('Gast'); });
    await act(async () => { await result.current.handleUpdateProfile('Gast', { wins: 5 }); });
    await act(async () => { await result.current.handleDeleteProfile('Gast'); });

    expect(saveProfiles).toHaveBeenCalledTimes(3);
    for (const [saved] of saveProfiles.mock.calls) {
      expect(saved).toBeTypeOf('object');
      expect(saved).not.toBeNull();
      // The signed-in user's own profile must survive every mutation.
      expect(Object.keys(saved as object)).toContain('Dominik');
    }
  });

  it('persists exactly what it puts into state', async () => {
    const { result } = await mounted();

    await act(async () => { await result.current.handleCreateProfile('Bot', true, 60) });

    const [saved] = saveProfiles.mock.calls.at(-1)!;
    expect(saved).toEqual(result.current.profiles);
    expect((saved as Record<string, Profile>).Bot).toMatchObject({ isBot: true, targetAverage: 60 });
  });

  /**
   * The sample-data loader calls the mutator once per profile in a synchronous
   * loop without awaiting, so each call has to observe the previous one.
   */
  it('composes back-to-back mutations in the same tick', async () => {
    const { result } = await mounted();

    await act(async () => {
      await Promise.all([
        result.current.handleCreateProfile('A'),
        result.current.handleCreateProfile('B'),
        result.current.handleCreateProfile('C')
      ]);
    });

    expect(Object.keys(result.current.profiles).sort()).toEqual(['A', 'B', 'C', 'Dominik']);
    const [saved] = saveProfiles.mock.calls.at(-1)!;
    expect(Object.keys(saved as object).sort()).toEqual(['A', 'B', 'C', 'Dominik']);
  });

  it('skips the write when the resolver reports no change', async () => {
    const { result } = await mounted();
    saveProfiles.mockClear();

    await act(async () => { await result.current.applyProfiles(current => current); });

    expect(saveProfiles).not.toHaveBeenCalled();
  });

  it('surfaces a failed write instead of swallowing it', async () => {
    const { result } = await mounted();
    saveProfiles.mockRejectedValueOnce(new Error('cloud down'));

    await act(async () => { await result.current.handleCreateProfile('Gast'); });

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('error');
    // State still reflects the change; only the write failed.
    expect(result.current.profiles).toHaveProperty('Gast');
  });
});
