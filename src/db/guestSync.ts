import type { MatchHistory, Profile, GuestSyncTokenDoc, Player } from '../types';
import { supabase } from './supabase';
import { ACTIVE_SYNC_CODE_KEY, GUEST_MATCHES_PREFIX } from './localCache';
import { getMatchPage, parseWinningTeam } from './matches';
import { getProfiles } from './profiles';

/* ═══════════════════════════════════════════════════════════════════════════
   📱 GUEST-CLOUD-SYNC SYSTEM (MULTI-USER & ANTI-STAT-WASHING)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Erzeugt einen neuen 6-stelligen Sync-Code für den registrierten Benutzer.
 * Invalidiert vorherige Codes und stellt sicher, dass fremde Geräte sich authentifizieren müssen.
 */
export async function generateUserSyncCode(
  userId: string, 
  username: string,
  localProfile?: Profile,
  localMatches?: MatchHistory[]
): Promise<GuestSyncTokenDoc> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const authToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48 Stunden gültig

  // Snapshot der aktuellen Profil-Statistiken erfassen
  let profileSnapshot: Profile | undefined = localProfile;
  if (!profileSnapshot) {
    try {
      const profilesMap = await getProfiles(userId, username);
      profileSnapshot = profilesMap[username] || Object.values(profilesMap)[0];
    } catch (e) {
      console.warn("Could not fetch profile snapshot for sync code", e);
    }
  }

  // Snapshot der letzten Matches erfassen (für vollständige Statistik auf Host-Gerät)
  let matchesSnapshot: MatchHistory[] | undefined = localMatches?.slice(0, 15);
  if (!matchesSnapshot) {
    try {
      const { matches } = await getMatchPage(userId, 15);
      matchesSnapshot = matches;
    } catch (e) {
      console.warn("Could not fetch matches snapshot", e);
    }
  }

  const tokenDoc: GuestSyncTokenDoc = {
    code,
    userId,
    username,
    authToken,
    createdAt: now.toISOString(),
    expiresAt,
    syncEnabled: true,
    activeHost: null,
    activeHosts: [],
    profileSnapshot,
    matchesSnapshot,
    liveMatch: null
  };

  // 1. Speichern unter sync_code_{code} für schnellen Lookup beim Host
  const { error: codeError } = await supabase
    .from('documents')
    .upsert({ id: `sync_code_${code}`, data: { ...tokenDoc, type: 'sync_code' } });

  // 2. Speichern unter user_sync_{userId} für den Gast (Verwaltung & Widerruf)
  const { error: userError } = await supabase
    .from('documents')
    .upsert({ id: `user_sync_${userId}`, data: { ...tokenDoc, type: 'user_sync' } });

  const writeError = codeError || userError;
  if (writeError) {
    console.error("Error generating user sync code in Supabase", writeError);
    // Surface it: a code that only exists in local state is worse than none,
    // because the host can never redeem it.
    throw new Error(
      `Sync-Code konnte nicht gespeichert werden: ${writeError.message || 'Unbekannter Serverfehler'}`
    );
  }

  try {
    localStorage.setItem(ACTIVE_SYNC_CODE_KEY, JSON.stringify(tokenDoc));
  } catch (e) {
    console.error("Could not cache active sync code", e);
  }

  return tokenDoc;
}

/**
 * Schaltet den Gast-Sync für den Benutzer an oder aus.
 * Wenn ausgeschaltet, werden alle Host-Verbindungen sofort getrennt und laufende Spiele abgebrochen.
 */
export async function toggleUserSync(
  userId: string,
  username: string,
  enabled: boolean,
  localProfile?: Profile,
  localMatches?: MatchHistory[]
): Promise<GuestSyncTokenDoc> {
  if (enabled) {
    return generateUserSyncCode(userId, username, localProfile, localMatches);
  }

  // Sync ausschalten: Token ungültig machen, Host trennen und Live-Match abbrechen
  const newToken = `tok_disabled_${Date.now()}`;
  const disabledDoc: GuestSyncTokenDoc = {
    code: '',
    userId,
    username,
    authToken: newToken,
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    syncEnabled: false,
    activeHost: null,
    activeHosts: [],
    liveMatch: { isAborted: true, hostId: '', hostName: '', startedAt: '' }
  };

  const { error } = await supabase
    .from('documents')
    .upsert({ id: `user_sync_${userId}`, data: { ...disabledDoc, type: 'user_sync' } });

  if (error) {
    console.error("Error disabling user sync in Supabase", error);
    throw new Error(
      `Gast-Sync konnte nicht deaktiviert werden: ${error.message || 'Unbekannter Serverfehler'}`
    );
  }

  localStorage.removeItem(ACTIVE_SYNC_CODE_KEY);
  return disabledDoc;
}

/**
 * Ruft die aktiven Sync-Informationen und gekoppelten Host-Geräte des Nutzers ab.
 */
export async function getActiveUserSyncInfo(userId: string): Promise<GuestSyncTokenDoc | null> {
  const result = await readUserSyncDoc(userId);
  return result.doc;
}

/**
 * Reads the user's sync document, distinguishing "there is no document" from
 * "the read failed". Callers that cache the result must not treat a failed
 * request as proof that sync was never configured.
 */
export async function readUserSyncDoc(
  userId: string
): Promise<{ doc: GuestSyncTokenDoc | null; ok: boolean }> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .eq('id', `user_sync_${userId}`)
      .single();

    // PGRST116 is PostgREST's "no rows" — the only result that genuinely means
    // this user has no sync document.
    if (error) {
      if (error.code === 'PGRST116') return { doc: null, ok: true };
      console.error("Error fetching active user sync info", error);
      return { doc: null, ok: false };
    }
    if (!data?.data) return { doc: null, ok: true };
    return { doc: data.data as GuestSyncTokenDoc, ok: true };
  } catch (err) {
    console.error("Error fetching active user sync info", err);
    return { doc: null, ok: false };
  }
}

/**
 * Löst einen 6-stelligen Sync-Code auf dem Host-Gerät ein.
 * Überprüft Gültigkeit, registriert das Host-Gerät (exklusiv max. 1 Host) und liefert das vollständige Profil des Gastes.
 */
export async function redeemSyncCode(
  rawCode: string,
  _hostId: string,
  hostName: string
): Promise<{ success: boolean; error?: string; profile?: Profile; username?: string; userId?: string; authToken?: string; matches?: MatchHistory[] }> {
  const cleanCode = rawCode.replace(/\s+/g, '').trim();
  if (!cleanCode || cleanCode.length < 6) {
    return { success: false, error: 'Ungültiger Code. Bitte 6 Ziffern eingeben.' };
  }

  try {
    // Redemption runs server-side: the sync_code_* rows are not client-readable,
    // because a readable table of codes could be enumerated and every code
    // grants access to somebody's profile.
    const { data, error } = await supabase.rpc('redeem_sync_code', {
      p_code: cleanCode,
      p_host_name: hostName || 'Unbekanntes Gerät'
    });

    if (error) {
      console.error("Error redeeming sync code", error);
      return { success: false, error: error.message || 'Fehler beim Einlösen des Codes.' };
    }

    const result = data as {
      success: boolean; error?: string; userId?: string; username?: string;
      authToken?: string; profile?: Profile; matches?: MatchHistory[];
    } | null;

    if (!result?.success) {
      return { success: false, error: result?.error || 'Code nicht gefunden oder abgelaufen.' };
    }

    const matches = Array.isArray(result.matches) ? result.matches : [];
    if (matches.length > 0 && result.userId) {
      try {
        localStorage.setItem(`${GUEST_MATCHES_PREFIX}${result.userId}`, JSON.stringify(matches));
      } catch (e) {
        console.error("Could not save guest matches snapshot", e);
      }
    }

    const baseProfile: Profile = result.profile && Object.keys(result.profile).length > 0
      ? result.profile
      : { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 };

    return {
      success: true,
      profile: {
        ...baseProfile,
        linkedUserId: result.userId,
        linkedUsername: result.username,
        isLinkedCloudGuest: true,
        syncAuthToken: result.authToken,
        lastSyncedAt: new Date().toISOString()
      },
      username: result.username,
      userId: result.userId,
      authToken: result.authToken,
      matches
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error redeeming sync code", error);
    return { success: false, error: error?.message || 'Fehler beim Einlösen des Codes.' };
  }
}

/**
 * Meldet den Start oder das Ende eines Live-Matches für den Gast an Supabase.
 */
export async function setGuestLiveMatchStatus(
  guestUserId: string,
  authToken: string,
  hostName: string,
  matchInfo: { gameType?: string; players?: string[]; mode?: string; isAborted?: boolean } | null
): Promise<void> {
  if (!guestUserId || !authToken) return;
  try {
    // The server checks the token before touching the guest's document, so a
    // revoked host can no longer post a live-match banner to someone's profile.
    const { error } = await supabase.rpc('set_guest_live_match', {
      p_guest_id: guestUserId,
      p_auth_token: authToken,
      p_host_name: hostName || 'Host-Gerät',
      p_game_type: matchInfo?.gameType || matchInfo?.mode || 'standard',
      p_active: !!matchInfo
    });
    if (error) throw error;
  } catch (err) {
    console.error("Error setting guest live match status", err);
  }
}

/**
 * Bricht ein laufendes Match auf einem fremden Host-Gerät aus der Ferne ab und entkoppelt sofort.
 */
export async function abortGuestMatchRemote(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userDoc } = await supabase
      .from('documents')
      .select('data')
      .eq('id', `user_sync_${userId}`)
      .single();

    if (!userDoc?.data) return { success: false, error: 'Kein Profil gefunden' };
    const tokenDoc = userDoc.data as GuestSyncTokenDoc;

    const newAuthToken = `tok_revoked_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const updatedDoc: GuestSyncTokenDoc = {
      ...tokenDoc,
      authToken: newAuthToken,
      activeHost: null,
      activeHosts: [],
      liveMatch: {
        isAborted: true,
        hostId: tokenDoc.liveMatch?.hostId || '',
        hostName: tokenDoc.liveMatch?.hostName || '',
        startedAt: tokenDoc.liveMatch?.startedAt || ''
      }
    };

    await supabase.from('documents').upsert({ id: `user_sync_${userId}`, data: updatedDoc });
    if (tokenDoc.code) {
      await supabase.from('documents').upsert({ id: `sync_code_${tokenDoc.code}`, data: updatedDoc });
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error aborting guest match remote", error);
    return { success: false, error: error?.message || 'Fehler beim Abbrechen des Matches' };
  }
}

/**
 * Ermöglicht dem Gast, den Zugriff für einen bestimmten Host oder alle Hosts zu widerrufen (Anti-Stat-Washing).
 */
export async function revokeHostAccess(userId: string, _hostIdToRevoke?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userDoc } = await supabase
      .from('documents')
      .select('data')
      .eq('id', `user_sync_${userId}`)
      .single();

    if (!userDoc?.data) return { success: false, error: 'Kein Dokument gefunden.' };
    const tokenDoc = userDoc.data as GuestSyncTokenDoc;

    const newAuthToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const updatedTokenDoc: GuestSyncTokenDoc = {
      ...tokenDoc,
      authToken: newAuthToken,
      activeHost: null,
      activeHosts: [],
      liveMatch: { isAborted: true, hostId: '', hostName: '', startedAt: '' }
    };

    await supabase.from('documents').upsert({ id: `user_sync_${userId}`, data: updatedTokenDoc });
    if (tokenDoc.code) {
      await supabase.from('documents').upsert({ id: `sync_code_${tokenDoc.code}`, data: updatedTokenDoc });
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error revoking host access", error);
    return { success: false, error: error?.message || 'Fehler beim Widerrufen.' };
  }
}

/**
 * Überprüft vor Spielstart, ob verknüpfte Cloud-Gäste noch autorisiert sind.
 * Falls ein Gast den Zugriff widerrufen hat oder der Code abgelaufen ist,
 * wird der Gast als entkoppelt gemeldet.
 */
export async function validateGuestSyncTokens(
  playerNames: string[],
  profiles: Record<string, Profile>
): Promise<{ valid: boolean; revokedGuests: string[] }> {
  const revokedGuests: string[] = [];

  for (const name of playerNames) {
    const profile = profiles[name];
    if (!profile?.isLinkedCloudGuest || !profile.linkedUserId || !profile.syncAuthToken) continue;

    try {
      const { data, error } = await supabase.rpc('guest_sync_status', {
        p_guest_id: profile.linkedUserId,
        p_auth_token: profile.syncAuthToken
      });
      // A failed request proves nothing about the link. Treating it as a
      // revocation used to block matches whenever the connection hiccuped.
      if (error) {
        console.error("Could not verify guest sync token", error);
        continue;
      }
      const status = data as { valid?: boolean } | null;
      if (status?.valid !== true) revokedGuests.push(name);
    } catch (err) {
      console.error("Could not verify guest sync token", err);
    }
  }

  return { valid: revokedGuests.length === 0, revokedGuests };
}

/**
 * Fragt serverseitig ab, ob die Kopplung zu einem Cloud-Gast noch gültig ist.
 * Wird während eines laufenden Matches gepollt.
 */
export async function getGuestSyncStatus(
  guestUserId: string,
  authToken: string
): Promise<{ valid: boolean; aborted: boolean; reachable: boolean }> {
  try {
    const { data, error } = await supabase.rpc('guest_sync_status', {
      p_guest_id: guestUserId,
      p_auth_token: authToken
    });
    if (error) return { valid: true, aborted: false, reachable: false };
    const status = data as { valid?: boolean; aborted?: boolean } | null;
    return {
      valid: status?.valid === true,
      aborted: status?.aborted === true,
      reachable: true
    };
  } catch {
    // Offline: assume the link still holds rather than aborting a live match.
    return { valid: true, aborted: false, reachable: false };
  }
}

/**
 * Synchronisiert nach einem beendeten Match die Statistiken von verknüpften Cloud-Gästen
 * direkt auf deren jeweilige Supabase-Profile.
 */
export async function syncMatchesAndProfilesForGuests(
  finalPlayers: Player[],
  matchData: MatchHistory,
  winnerName: string,
  _hostUserId?: string | null,
  hostName?: string
): Promise<{ syncedGuests: string[]; errors: string[] }> {
  const syncedGuests: string[] = [];
  const errors: string[] = [];

  const is2v2 = !!matchData.is2v2 && finalPlayers.length === 4;

  for (let i = 0; i < finalPlayers.length; i++) {
    const player = finalPlayers[i];
    const linkedUserId = player.linkedUserId;
    const syncAuthToken = player.syncAuthToken;
    const linkedUsername = player.linkedUsername || player.name;

    if (!linkedUserId || !syncAuthToken) continue;

    const pTeam = player.team || (i % 2 === 0 ? 1 : 2);
    const isWinner = is2v2 ? parseWinningTeam(winnerName) === pTeam : player.name === winnerName;

    try {
      // The host submits the match; the server validates the token and derives
      // the stat changes from the guest's own line in it. A host can therefore
      // no longer post arbitrary totals to somebody else's profile.
      const { data, error } = await supabase.rpc('sync_guest_match_result', {
        p_guest_id: linkedUserId,
        p_auth_token: syncAuthToken,
        p_match: { ...matchData, hostName: hostName || 'Freund' },
        p_player_name: player.name,
        p_is_winner: isWinner
      });

      if (error) {
        errors.push(`${linkedUsername}: ${error.message || 'Sync-Fehler'}`);
        continue;
      }
      if (data !== true) {
        errors.push(`${linkedUsername}: Zugriff wurde vom Nutzer widerrufen.`);
        continue;
      }

      syncedGuests.push(linkedUsername);
    } catch (guestErr: unknown) {
      const error = guestErr as Error;
      console.error(`Error syncing for guest ${linkedUsername}`, error);
      errors.push(`${linkedUsername}: ${error?.message || 'Sync-Fehler'}`);
    }
  }

  return { syncedGuests, errors };
}
