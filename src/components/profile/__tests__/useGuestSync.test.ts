import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { GuestSyncTokenDoc, Profile } from '../../../types';

const readUserSyncDoc = vi.fn();
const generateUserSyncCode = vi.fn();
const toggleUserSync = vi.fn();
const revokeHostAccess = vi.fn();
const abortGuestMatchRemote = vi.fn();
const removeChannel = vi.fn();

vi.mock('../../../db', () => ({
  readUserSyncDoc: (...args: unknown[]) => readUserSyncDoc(...args),
  generateUserSyncCode: (...args: unknown[]) => generateUserSyncCode(...args),
  toggleUserSync: (...args: unknown[]) => toggleUserSync(...args),
  revokeHostAccess: (...args: unknown[]) => revokeHostAccess(...args),
  abortGuestMatchRemote: (...args: unknown[]) => abortGuestMatchRemote(...args),
  supabase: {
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: (...args: unknown[]) => removeChannel(...args)
  }
}));

import { useGuestSync } from '../useGuestSync';

const user = { id: 'user_1', user_metadata: { username: 'Dominik' } };
const profiles: Record<string, Profile> = {
  Dominik: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
};

const inAnHour = () => new Date(Date.now() + 3600_000).toISOString();

const doc = (over: Partial<GuestSyncTokenDoc> = {}): GuestSyncTokenDoc => ({
  code: '482195',
  userId: 'user_1',
  username: 'Dominik',
  authToken: 'tok_1',
  createdAt: new Date().toISOString(),
  expiresAt: inAnHour(),
  ...over
});

const render = () => renderHook(() => useGuestSync(user, profiles, []));

describe('useGuestSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readUserSyncDoc.mockResolvedValue({ doc: null, ok: true });
  });

  /**
   * `syncEnabled !== false` treated a missing document — a user who never
   * enabled sync — as active, and the panel greeted everyone with "Sync Aktiv".
   */
  it('is off for an account that never enabled sync', async () => {
    const { result } = render();
    await waitFor(() => expect(readUserSyncDoc).toHaveBeenCalled());

    expect(result.current.isEnabled).toBe(false);
  });

  it('follows the flag when the document carries one', async () => {
    readUserSyncDoc.mockResolvedValue({ doc: doc({ syncEnabled: false }), ok: true });
    const { result } = render();

    await waitFor(() => expect(result.current.info).not.toBeNull());
    expect(result.current.isEnabled).toBe(false);
  });

  /** Documents written before the flag existed: an unexpired code means on. */
  it('counts a legacy document with a live code as enabled', async () => {
    readUserSyncDoc.mockResolvedValue({ doc: doc(), ok: true });
    const { result } = render();

    await waitFor(() => expect(result.current.isEnabled).toBe(true));
  });

  it('treats a legacy document with an expired code as off', async () => {
    readUserSyncDoc.mockResolvedValue({
      doc: doc({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
      ok: true
    });
    const { result } = render();

    await waitFor(() => expect(result.current.info).not.toBeNull());
    expect(result.current.isEnabled).toBe(false);
  });

  /**
   * A failed request is not evidence that the code is gone. Overwriting state
   * with null on a flaky read is what made a freshly generated code vanish a
   * couple of seconds after it appeared.
   */
  it('keeps the code it has when a refresh fails', async () => {
    const generated = doc({ code: '111222' });
    generateUserSyncCode.mockResolvedValue(generated);
    const { result } = render();
    await waitFor(() => expect(readUserSyncDoc).toHaveBeenCalled());

    await act(() => result.current.generateCode());
    expect(result.current.info?.code).toBe('111222');

    // The next refresh fails; `revokeHost` runs one on the way back.
    readUserSyncDoc.mockResolvedValue({ doc: null, ok: false });
    revokeHostAccess.mockResolvedValue({ success: true });
    await act(() => result.current.revokeHost('host_1'));

    expect(result.current.info?.code).toBe('111222');
  });

  it('reports why a code could not be created', async () => {
    generateUserSyncCode.mockRejectedValue(new Error('Server sagt nein'));
    const { result } = render();

    await act(() => result.current.generateCode());

    expect(result.current.error).toBe('Server sagt nein');
    expect(result.current.loading).toBe(false);
  });

  it('says so after switching sync off', async () => {
    toggleUserSync.mockResolvedValue(doc({ syncEnabled: false }));
    const { result } = render();

    await act(() => result.current.setEnabled(false));

    expect(toggleUserSync).toHaveBeenCalledWith('user_1', 'Dominik', false, profiles.Dominik, []);
    expect(result.current.notice).toMatch(/deaktiviert/);
  });
});
