import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateUserSyncCode,
  redeemSyncCode,
  revokeHostAccess,
  syncMatchesAndProfilesForGuests,
  validateGuestSyncTokens,
  supabase
} from '../index';
import type { Player, MatchHistory, Profile, GuestSyncTokenDoc } from '../../types';

describe('📱 Guest-Cloud-Sync System (Multi-User & Anti-Stat-Washing)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('generates a valid 6-digit sync code with authToken and expiration', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: mockUpsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await generateUserSyncCode('user_123', 'AlexDarts');
    
    expect(result.code).toHaveLength(6);
    expect(/^\d{6}$/.test(result.code)).toBe(true);
    expect(result.userId).toBe('user_123');
    expect(result.username).toBe('AlexDarts');
    expect(result.authToken).toContain('tok_');
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects redeeming invalid or expired sync code', async () => {
    // Too short to be a code: rejected before any request is made.
    const shortRes = await redeemSyncCode('123', 'host_1', 'Dominik iPad');
    expect(shortRes.success).toBe(false);
    expect(shortRes.error).toContain('Ungültiger Code');

    // The server owns the verdict now; the client relays it.
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: { success: false, error: 'Code nicht gefunden oder abgelaufen.' },
      error: null
    } as never);

    const notFoundRes = await redeemSyncCode('999999', 'host_1', 'Dominik iPad');
    expect(notFoundRes.success).toBe(false);
    expect(notFoundRes.error).toContain('nicht gefunden');
  });

  it('successfully redeems a valid sync code and attaches guest metadata', async () => {
    const rpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: {
        success: true,
        userId: 'user_alex',
        username: 'Alex',
        authToken: 'tok_secret_123',
        profile: { wins: 3, matches: 10, dartsThrown: 400, pointsScored: 8000, highestThrow: 140 },
        matches: []
      },
      error: null
    } as never);

    const res = await redeemSyncCode('842195', 'host_ipad', 'Dominik iPad');

    expect(rpc).toHaveBeenCalledWith('redeem_sync_code', {
      p_code: '842195',
      p_host_name: 'Dominik iPad'
    });
    expect(res.success).toBe(true);
    expect(res.username).toBe('Alex');
    expect(res.userId).toBe('user_alex');
    expect(res.profile?.wins).toBe(3);
    expect(res.profile?.isLinkedCloudGuest).toBe(true);
    expect(res.profile?.linkedUserId).toBe('user_alex');
    expect(res.profile?.syncAuthToken).toBe('tok_secret_123');
  });

  it('revokes host access and rolls authToken for anti-stat-washing protection', async () => {
    const mockTokenDoc: GuestSyncTokenDoc = {
      code: '842195',
      userId: 'user_alex',
      username: 'Alex',
      authToken: 'tok_secret_old',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      activeHosts: [
        { hostId: 'host_ipad', hostName: 'Dominik iPad', linkedAt: new Date().toISOString() }
      ]
    };

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { data: mockTokenDoc } })
        })
      }),
      upsert: mockUpsert
    } as unknown as ReturnType<typeof supabase.from>);

    const res = await revokeHostAccess('user_alex', 'host_ipad');
    expect(res.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
    const updatedCall = mockUpsert.mock.calls[0][0];
    expect(updatedCall.data.authToken).not.toBe('tok_secret_old');
    expect(updatedCall.data.activeHosts).toHaveLength(0);
  });

  it('rejects match sync if guest has revoked access (Anti-Stat-Washing)', async () => {
    // The server refuses the write and returns false; nothing is booked.
    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: false, error: null } as never);

    const players: Player[] = [{
      name: 'Alex', score: 0, legs: 3, sets: 1, legPts: 0, legDarts: 0, matchPts: 1200, matchDarts: 60,
      legHistory: [], matchFirst9Pts: 200, matchFirst9Darts: 9, sixtyPlus: 5, hundredPlus: 3,
      oneFortyPlus: 1, oneEighty: 0, highestCheckout: 60, checkoutAttempts: 4, checkoutSuccesses: 3,
      segmentHits: {}, linkedUserId: 'user_alex', syncAuthToken: 'tok_stale'
    }];

    const matchData: MatchHistory = {
      date: '01.01.2026, 20:00', winner: 'Alex', gameType: 'standard',
      players: [{ name: 'Alex', sets: 1, legs: 3, avg: '60.0', first9: '66.7' }]
    };

    const res = await syncMatchesAndProfilesForGuests(players, matchData, 'Alex', 'host_user', 'Host');

    expect(res.syncedGuests).toHaveLength(0);
    expect(res.errors[0]).toContain('widerrufen');
  });

  it('submits the match for server-side booking when the token is valid', async () => {
    const rpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: true, error: null } as never);

    const players: Player[] = [{
      name: 'Alex', score: 0, legs: 3, sets: 1, legPts: 0, legDarts: 0, matchPts: 1200, matchDarts: 60,
      legHistory: [], matchFirst9Pts: 200, matchFirst9Darts: 9, sixtyPlus: 5, hundredPlus: 3,
      oneFortyPlus: 1, oneEighty: 2, highestCheckout: 96, checkoutAttempts: 4, checkoutSuccesses: 3,
      segmentHits: { T20: 10 }, linkedUserId: 'user_alex', linkedUsername: 'Alex', syncAuthToken: 'tok_valid'
    }];

    const matchData: MatchHistory = {
      date: '01.01.2026, 20:00', winner: 'Alex', gameType: 'standard',
      players: [{ name: 'Alex', sets: 1, legs: 3, avg: '60.0', first9: '66.7', matchDarts: 60, matchPts: 1200 }]
    };

    const res = await syncMatchesAndProfilesForGuests(players, matchData, 'Alex', 'host_user', 'Dominik');

    expect(res.syncedGuests).toEqual(['Alex']);
    expect(res.errors).toHaveLength(0);

    // The host submits the match and its own seat; the totals are derived on
    // the server, so no stat figures are sent as parameters.
    const [fn, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe('sync_guest_match_result');
    expect(args.p_guest_id).toBe('user_alex');
    expect(args.p_auth_token).toBe('tok_valid');
    expect(args.p_player_name).toBe('Alex');
    expect(args.p_is_winner).toBe(true);
  });

  it('correctly captures profileSnapshot during code generation and transfers full stats to host', async () => {
    const mockProfile = {
      wins: 15,
      matches: 20,
      dartsThrown: 800,
      pointsScored: 20000,
      highestThrow: 180,
      bestLegDarts: 13,
      highestCheckout: 140,
      oneEighty: 6
    };

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: mockUpsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const tokenDoc = await generateUserSyncCode('user_pro', 'ProDarts', mockProfile);
    expect(tokenDoc.profileSnapshot).toEqual(mockProfile);
    expect(tokenDoc.profileSnapshot?.bestLegDarts).toBe(13);
    expect(tokenDoc.profileSnapshot?.highestCheckout).toBe(140);
  });

  it('validates guest sync tokens and blocks start if token was revoked', async () => {
    const profiles: Record<string, Profile> = {
      'Alex': {
        wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
        isLinkedCloudGuest: true, linkedUserId: 'user_alex', syncAuthToken: 'tok_old'
      },
      'Dominik': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
    };

    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: { valid: false }, error: null } as never);
    const revoked = await validateGuestSyncTokens(['Dominik', 'Alex'], profiles);
    expect(revoked.valid).toBe(false);
    expect(revoked.revokedGuests).toEqual(['Alex']);

    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: { valid: true }, error: null } as never);
    const ok = await validateGuestSyncTokens(['Dominik', 'Alex'], profiles);
    expect(ok.valid).toBe(true);
    expect(ok.revokedGuests).toHaveLength(0);
  });

  it('does not treat an unreachable server as a revoked guest', async () => {
    const profiles: Record<string, Profile> = {
      'Alex': {
        wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
        isLinkedCloudGuest: true, linkedUserId: 'user_alex', syncAuthToken: 'tok_old'
      }
    };

    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'network down' } } as never);

    // A failed request proves nothing; blocking the match here would strand the
    // players every time the connection hiccuped.
    const res = await validateGuestSyncTokens(['Alex'], profiles);
    expect(res.valid).toBe(true);
    expect(res.revokedGuests).toHaveLength(0);
  });

  it('toggles user sync off and on, immediately invalidating tokens when off', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: mockUpsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const { toggleUserSync } = await import('../index');

    // 1. Toggle OFF
    const disabledDoc = await toggleUserSync('user_123', 'Alex', false);
    expect(disabledDoc.syncEnabled).toBe(false);
    expect(disabledDoc.authToken).toContain('tok_disabled_');
    expect(disabledDoc.liveMatch?.isAborted).toBe(true);

    // 2. Toggle ON
    const enabledDoc = await toggleUserSync('user_123', 'Alex', true);
    expect(enabledDoc.syncEnabled).toBe(true);
    expect(enabledDoc.code).toHaveLength(6);
  });

  it('sends the redeeming host name so the server can record a single active host', async () => {
    // Exclusivity is enforced inside redeem_sync_code(); the client's job is
    // simply to identify itself.
    const rpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: { success: true, userId: 'user_alex', username: 'Alex', authToken: 'tok_1', profile: {}, matches: [] },
      error: null
    } as never);

    await redeemSyncCode('123456', 'host_new_ipad', 'New iPad');

    expect(rpc).toHaveBeenCalledWith('redeem_sync_code', {
      p_code: '123456',
      p_host_name: 'New iPad'
    });
  });

  it('rejects redemption if guest has sync disabled', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: { success: false, error: 'Der Nutzer hat den Gast-Sync aktuell deaktiviert.' },
      error: null
    } as never);

    const res = await redeemSyncCode('123456', 'host_1', 'Dominik iPad');
    expect(res.success).toBe(false);
    expect(res.error).toContain('deaktiviert');
  });

  it('reports live match status and allows remote aborting from main account', async () => {
    const mockTokenDoc: GuestSyncTokenDoc = {
      code: '123456',
      userId: 'user_123',
      username: 'Alex',
      authToken: 'tok_active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      syncEnabled: true,
      liveMatch: { hostId: 'host_ipad', hostName: 'Dominik iPad', startedAt: new Date().toISOString(), isAborted: false }
    };

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { data: mockTokenDoc } })
        })
      }),
      upsert: mockUpsert
    } as unknown as ReturnType<typeof supabase.from>);

    const { abortGuestMatchRemote } = await import('../index');
    const abortRes = await abortGuestMatchRemote('user_123');
    expect(abortRes.success).toBe(true);

    const updatedDoc = mockUpsert.mock.calls[0][0].data;
    expect(updatedDoc.liveMatch?.isAborted).toBe(true);
    expect(updatedDoc.authToken).not.toBe('tok_active');
    expect(updatedDoc.activeHosts).toHaveLength(0);
  });
});

describe('sync code persistence and read failures', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reports a failed write instead of returning a phantom code', async () => {
    // supabase-js reports write failures in `{ error }` rather than throwing.
    // Swallowing that produced a code the UI displayed but the host could never
    // redeem — and which vanished on the next poll.
    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'permission denied' } }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    await expect(generateUserSyncCode('user_1', 'Alex')).rejects.toThrow(/permission denied/);
    expect(localStorage.getItem('dartcounter_active_sync_code')).toBeNull();
  });

  it('caches the code locally only once the write succeeded', async () => {
    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const doc = await generateUserSyncCode('user_1', 'Alex');
    expect(doc.code).toHaveLength(6);
    expect(doc.syncEnabled).toBe(true);
    expect(localStorage.getItem('dartcounter_active_sync_code')).toContain(doc.code);
  });

  it('distinguishes a missing sync document from a failed read', async () => {
    const { readUserSyncDoc } = await import('../index');

    // No rows: the user genuinely has no sync document.
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);
    await expect(readUserSyncDoc('user_1')).resolves.toEqual({ doc: null, ok: true });

    // Transient failure: absence here proves nothing, so callers must not cache it.
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '500', message: 'boom' } })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);
    await expect(readUserSyncDoc('user_1')).resolves.toEqual({ doc: null, ok: false });
  });

  it('returns the stored document when the read succeeds', async () => {
    const { readUserSyncDoc } = await import('../index');
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { data: { code: '123456', syncEnabled: true, userId: 'user_1' } }
          })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const { doc, ok } = await readUserSyncDoc('user_1');
    expect(ok).toBe(true);
    expect(doc?.code).toBe('123456');
  });
});
