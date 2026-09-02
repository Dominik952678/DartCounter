import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateUserSyncCode, 
  redeemSyncCode, 
  revokeHostAccess,
  syncMatchesAndProfilesForGuests,
  supabase 
} from '../database';
import type { Player, MatchHistory, GuestSyncTokenDoc } from '../../types';

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
    // 1. Short code
    const shortRes = await redeemSyncCode('123', 'host_1', 'Dominik iPad');
    expect(shortRes.success).toBe(false);
    expect(shortRes.error).toContain('Ungültiger Code');

    // 2. Non-existent code
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const notFoundRes = await redeemSyncCode('999999', 'host_1', 'Dominik iPad');
    expect(notFoundRes.success).toBe(false);
    expect(notFoundRes.error).toContain('nicht gefunden');
  });

  it('successfully redeems a valid sync code and attaches guest metadata', async () => {
    const mockTokenDoc: GuestSyncTokenDoc = {
      code: '842195',
      userId: 'user_alex',
      username: 'Alex',
      authToken: 'tok_secret_123',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      activeHosts: []
    };

    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                data: mockTokenDoc
              }
            })
          })
        }),
        upsert: vi.fn().mockResolvedValue({ error: null })
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await redeemSyncCode('842195', 'host_ipad', 'Dominik iPad');
    expect(res.success).toBe(true);
    expect(res.username).toBe('Alex');
    expect(res.userId).toBe('user_alex');
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
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              data: {
                authToken: 'tok_NEW_TOKEN_AFTER_REVOKE'
              }
            }
          })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const mockPlayer: Player = {
      name: 'Alex',
      score: 0,
      legs: 1,
      sets: 0,
      legPts: 0,
      legDarts: 0,
      matchPts: 501,
      matchDarts: 15,
      legHistory: [],
      matchFirst9Pts: 300,
      matchFirst9Darts: 9,
      sixtyPlus: 2,
      hundredPlus: 1,
      oneFortyPlus: 1,
      oneEighty: 1,
      highestCheckout: 80,
      checkoutAttempts: 2,
      checkoutSuccesses: 1,
      segmentHits: {},
      linkedUserId: 'user_alex',
      syncAuthToken: 'tok_OLD_REVOKED_TOKEN'
    };

    const mockMatch: MatchHistory = {
      date: '02.09.2026',
      winner: 'Alex',
      players: []
    };

    const result = await syncMatchesAndProfilesForGuests([mockPlayer], mockMatch, 'Alex', 'host_1', 'Dominik');
    expect(result.syncedGuests).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('widerrufen');
  });

  it('synchronizes matches and updates stats when token is valid', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                data: {
                  authToken: 'tok_VALID_TOKEN',
                  profiles: {
                    Alex: { wins: 5, matches: 10, dartsThrown: 200, pointsScored: 4000, highestThrow: 140 }
                  }
                }
              }
            })
          })
        }),
        insert: mockInsert,
        upsert: mockUpsert
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const mockPlayer: Player = {
      name: 'Alex',
      score: 0,
      legs: 1,
      sets: 0,
      legPts: 0,
      legDarts: 0,
      matchPts: 501,
      matchDarts: 15,
      legHistory: [],
      matchFirst9Pts: 300,
      matchFirst9Darts: 9,
      sixtyPlus: 2,
      hundredPlus: 1,
      oneFortyPlus: 1,
      oneEighty: 1,
      highestCheckout: 80,
      checkoutAttempts: 2,
      checkoutSuccesses: 1,
      segmentHits: { "20": 5, "T20": 2 },
      linkedUserId: 'user_alex',
      linkedUsername: 'Alex',
      syncAuthToken: 'tok_VALID_TOKEN'
    };

    const mockMatch: MatchHistory = {
      date: '02.09.2026',
      winner: 'Alex',
      players: []
    };

    const result = await syncMatchesAndProfilesForGuests([mockPlayer], mockMatch, 'Alex', 'host_1', 'Dominik');
    expect(result.syncedGuests).toContain('Alex');
    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalled();
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
    // 1. Valid token
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              data: {
                authToken: 'tok_CURRENT_VALID',
                expiresAt: new Date(Date.now() + 3600000).toISOString()
              }
            }
          })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

    const validProfiles = {
      Alex: {
        wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
        isLinkedCloudGuest: true,
        linkedUserId: 'user_alex',
        syncAuthToken: 'tok_CURRENT_VALID'
      }
    };

    const { validateGuestSyncTokens } = await import('../database');
    const validRes = await validateGuestSyncTokens(['Alex'], validProfiles);
    expect(validRes.valid).toBe(true);
    expect(validRes.revokedGuests).toHaveLength(0);

    // 2. Revoked token
    const revokedProfiles = {
      Alex: {
        wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
        isLinkedCloudGuest: true,
        linkedUserId: 'user_alex',
        syncAuthToken: 'tok_OLD_REVOKED'
      }
    };

    const revokedRes = await validateGuestSyncTokens(['Alex'], revokedProfiles);
    expect(revokedRes.valid).toBe(false);
    expect(revokedRes.revokedGuests).toContain('Alex');
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

    const { toggleUserSync } = await import('../database');

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

  it('enforces single-host exclusivity by replacing previous host connection upon new redemption', async () => {
    const existingDoc: GuestSyncTokenDoc = {
      code: '123456',
      userId: 'user_123',
      username: 'Alex',
      authToken: 'tok_active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      syncEnabled: true,
      profileSnapshot: { wins: 5, matches: 5, dartsThrown: 100, pointsScored: 2000, highestThrow: 100 },
      activeHost: { hostId: 'host_old', hostName: 'Old Phone', linkedAt: new Date().toISOString() },
      activeHosts: [{ hostId: 'host_old', hostName: 'Old Phone', linkedAt: new Date().toISOString() }]
    };

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { data: existingDoc } })
        })
      }),
      upsert: mockUpsert
    } as unknown as ReturnType<typeof supabase.from>);

    const res = await redeemSyncCode('123456', 'host_new_ipad', 'New iPad');
    expect(res.success).toBe(true);
    
    expect(mockUpsert).toHaveBeenCalled();
    const updatedData = mockUpsert.mock.calls[0][0].data;
    expect(updatedData.activeHost?.hostId).toBe('host_new_ipad');
    expect(updatedData.activeHosts).toHaveLength(1);
    expect(updatedData.activeHosts[0].hostId).toBe('host_new_ipad');
  });

  it('rejects redemption if guest has sync disabled', async () => {
    const disabledDoc: GuestSyncTokenDoc = {
      code: '123456',
      userId: 'user_123',
      username: 'Alex',
      authToken: 'tok_active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      syncEnabled: false
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { data: disabledDoc } })
        })
      })
    } as unknown as ReturnType<typeof supabase.from>);

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

    const { abortGuestMatchRemote } = await import('../database');
    const abortRes = await abortGuestMatchRemote('user_123');
    expect(abortRes.success).toBe(true);

    const updatedDoc = mockUpsert.mock.calls[0][0].data;
    expect(updatedDoc.liveMatch?.isAborted).toBe(true);
    expect(updatedDoc.authToken).not.toBe('tok_active');
    expect(updatedDoc.activeHosts).toHaveLength(0);
  });
});
