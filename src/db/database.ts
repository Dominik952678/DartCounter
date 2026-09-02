import { createClient } from '@supabase/supabase-js';
import type { MatchHistory, Profile, GuestSyncTokenDoc, ActiveHostConnection, Player } from '../types';

const SUPABASE_URL = 'https://pdbycflxxokbwfsfrmwu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vkBLAop52YK5pN6JrIAjfQ__Q9dvli0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function startSync(_lokaleIp: string) {
  console.log("Connected to Supabase Cloud.");
}

export function getGuestDefaultProfiles(): Record<string, Profile> {
  return {
    "Gast 1": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' },
    "Gast 2": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--orange)' },
    "Bot": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot: true, targetAverage: 45, color: 'var(--purple)' }
  };
}

export async function getProfiles(userId?: string | null, username?: string): Promise<Record<string, Profile>> {
  const docId = userId ? `profiles_${userId}` : 'profiles_guest';

  // Try reading from localStorage cache first for fast offline startup
  let cached: Record<string, Profile> | null = null;
  try {
    const raw = localStorage.getItem(docId);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.error("Error reading cached profiles", e);
  }

  // If not logged in, return cached or default guest profiles
  if (!userId) {
    return cached || getGuestDefaultProfiles();
  }

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .eq('id', docId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Document does not exist yet -> create initial profile with username
        const initialName = username || 'Spieler';
        const initialProfiles: Record<string, Profile> = {
          [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
        };
        await saveProfiles(initialProfiles, userId);
        return initialProfiles;
      }
      if (cached) return cached;
      throw error;
    }

    const fetchedProfiles = (data?.data as any)?.profiles || {};
    if (Object.keys(fetchedProfiles).length === 0) {
      const initialName = username || 'Spieler';
      const initialProfiles: Record<string, Profile> = {
        [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
      };
      await saveProfiles(initialProfiles, userId);
      return initialProfiles;
    }

    // Update local cache
    try {
      localStorage.setItem(docId, JSON.stringify(fetchedProfiles));
    } catch (e) {
      console.error(e);
    }

    return fetchedProfiles;
  } catch (err) {
    console.error("Error getting profiles from Supabase", err);
    if (cached) return cached;
    const initialName = username || 'Spieler';
    return {
      [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
    };
  }
}

export async function saveProfiles(profiles: Record<string, Profile>, userId?: string | null): Promise<void> {
  const docId = userId ? `profiles_${userId}` : 'profiles_guest';

  // Always update local cache
  try {
    localStorage.setItem(docId, JSON.stringify(profiles));
  } catch (e) {
    console.error(e);
  }

  if (!userId) return; // Guests do not write to persistent cloud database

  try {
    const docData = { profiles, userId, type: 'profiles' };
    const { error } = await supabase
      .from('documents')
      .upsert({ id: docId, data: docData });

    if (error) throw error;
  } catch (err) {
    console.error("Error saving profiles to Supabase", err);
  }
}

export async function saveMatch(match: MatchHistory, userId?: string | null): Promise<void> {
  const localKey = userId ? `matches_${userId}` : 'matches_guest';
  const matchId = `match_${userId || 'guest'}_${Date.now()}`;
  match.type = 'match';
  match._id = matchId;
  if (userId) (match as any).userId = userId;

  // Update local cache of matches
  try {
    const existing = localStorage.getItem(localKey);
    const list: MatchHistory[] = existing ? JSON.parse(existing) : [];
    list.unshift(match);
    localStorage.setItem(localKey, JSON.stringify(list.slice(0, 100)));
  } catch (e) {
    console.error(e);
  }

  if (!userId) return; // Guests do not save to cloud

  try {
    const { error } = await supabase
      .from('documents')
      .insert({ id: matchId, data: match });

    if (error) throw error;
  } catch (err) {
    console.error("Error saving match to Supabase", err);
  }
}

export async function getMatches(userId?: string | null): Promise<MatchHistory[]> {
  const localKey = userId ? `matches_${userId}` : 'matches_guest';
  let cached: MatchHistory[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  if (!userId) return cached;

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .ilike('id', `match_${userId}_%`)
      .order('id', { ascending: false });

    if (error) {
      if (cached.length > 0) return cached;
      throw error;
    }

    if (!data) return cached;

    const matches = data.map(row => row.data as unknown as MatchHistory);
    try {
      localStorage.setItem(localKey, JSON.stringify(matches.slice(0, 100)));
    } catch (e) {
      console.error(e);
    }
    return matches;
  } catch (err) {
    console.error("Error getting matches from Supabase", err);
    return cached;
  }
}

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
      const fetchedMatches = await getMatches(userId);
      matchesSnapshot = fetchedMatches?.slice(0, 15);
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

  try {
    // 1. Speichern unter sync_code_{code} für schnellen Lookup beim Host
    await supabase
      .from('documents')
      .upsert({ id: `sync_code_${code}`, data: { ...tokenDoc, type: 'sync_code' } });

    // 2. Speichern unter user_sync_{userId} für den Gast (Verwaltung & Widerruf)
    await supabase
      .from('documents')
      .upsert({ id: `user_sync_${userId}`, data: { ...tokenDoc, type: 'user_sync' } });

    localStorage.setItem('dartcounter_active_sync_code', JSON.stringify(tokenDoc));
  } catch (err) {
    console.error("Error generating user sync code in Supabase", err);
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

  try {
    await supabase
      .from('documents')
      .upsert({ id: `user_sync_${userId}`, data: { ...disabledDoc, type: 'user_sync' } });
    localStorage.removeItem('dartcounter_active_sync_code');
  } catch (err) {
    console.error("Error disabling user sync in Supabase", err);
  }

  return disabledDoc;
}

/**
 * Ruft die aktiven Sync-Informationen und gekoppelten Host-Geräte des Nutzers ab.
 */
export async function getActiveUserSyncInfo(userId: string): Promise<GuestSyncTokenDoc | null> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .eq('id', `user_sync_${userId}`)
      .single();

    if (error || !data?.data) return null;
    const tokenDoc = data.data as GuestSyncTokenDoc;
    
    // Prüfen ob abgelaufen oder deaktiviert
    if (tokenDoc.syncEnabled === false || new Date(tokenDoc.expiresAt) <= new Date()) {
      return tokenDoc;
    }
    return tokenDoc;
  } catch (err) {
    console.error("Error fetching active user sync info", err);
    return null;
  }
}

/**
 * Löst einen 6-stelligen Sync-Code auf dem Host-Gerät ein.
 * Überprüft Gültigkeit, registriert das Host-Gerät (exklusiv max. 1 Host) und liefert das vollständige Profil des Gastes.
 */
export async function redeemSyncCode(
  rawCode: string, 
  hostId: string, 
  hostName: string
): Promise<{ success: boolean; error?: string; profile?: Profile; username?: string; userId?: string; authToken?: string; matches?: MatchHistory[] }> {
  const cleanCode = rawCode.replace(/\s+/g, '').trim();
  if (!cleanCode || cleanCode.length < 6) {
    return { success: false, error: 'Ungültiger Code. Bitte 6 Ziffern eingeben.' };
  }

  try {
    // 1. Sync-Code in Supabase suchen
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .eq('id', `sync_code_${cleanCode}`)
      .single();

    if (error || !data?.data) {
      return { success: false, error: 'Code nicht gefunden oder abgelaufen.' };
    }

    const tokenDoc = data.data as GuestSyncTokenDoc;

    if (tokenDoc.syncEnabled === false) {
      return { success: false, error: 'Der Nutzer hat den Gast-Sync aktuell deaktiviert.' };
    }

    if (new Date(tokenDoc.expiresAt) <= new Date()) {
      return { success: false, error: 'Dieser Sync-Code ist abgelaufen. Bitte neuen Code generieren.' };
    }

    // 2. Profil des Gastes aus Snapshot oder Supabase laden
    let baseProfile: Profile = {
      wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0
    };

    if (tokenDoc.profileSnapshot) {
      baseProfile = { ...tokenDoc.profileSnapshot };
    } else {
      const guestProfiles = await getProfiles(tokenDoc.userId, tokenDoc.username);
      const found = guestProfiles[tokenDoc.username] || Object.values(guestProfiles)[0];
      if (found) baseProfile = { ...found };
    }

    // 3. Exklusivität: Genau 1 aktiver Host (bisherige Verbindungen werden abgelöst)
    const hostEntry: ActiveHostConnection = {
      hostId,
      hostName: hostName || 'Unbekanntes Gerät',
      linkedAt: new Date().toISOString()
    };

    const updatedTokenDoc: GuestSyncTokenDoc = {
      ...tokenDoc,
      activeHost: hostEntry,
      activeHosts: [hostEntry]
    };

    // Aktualisiere Token-Docs
    await supabase.from('documents').upsert({ id: `sync_code_${cleanCode}`, data: updatedTokenDoc });
    await supabase.from('documents').upsert({ id: `user_sync_${tokenDoc.userId}`, data: updatedTokenDoc });

    // 4. Speichere Match-Snapshot lokal beim Host, damit alle Stats & Historien sichtbar sind
    if (tokenDoc.matchesSnapshot && tokenDoc.matchesSnapshot.length > 0) {
      try {
        localStorage.setItem(`guest_matches_${tokenDoc.userId}`, JSON.stringify(tokenDoc.matchesSnapshot));
      } catch (e) {
        console.error("Could not save guest matches snapshot", e);
      }
    }

    // 5. Konstruiere das verknüpfte Gast-Profil für den Host
    const linkedProfile: Profile = {
      ...baseProfile,
      linkedUserId: tokenDoc.userId,
      linkedUsername: tokenDoc.username,
      isLinkedCloudGuest: true,
      syncAuthToken: tokenDoc.authToken,
      lastSyncedAt: new Date().toISOString()
    };

    return {
      success: true,
      profile: linkedProfile,
      username: tokenDoc.username,
      userId: tokenDoc.userId,
      authToken: tokenDoc.authToken,
      matches: tokenDoc.matchesSnapshot
    };
  } catch (err: any) {
    console.error("Error redeeming sync code", err);
    return { success: false, error: err?.message || 'Fehler beim Einlösen des Codes.' };
  }
}

/**
 * Meldet den Start oder das Ende eines Live-Matches für den Gast an Supabase.
 */
export async function setGuestLiveMatchStatus(
  userId: string, 
  hostId: string, 
  hostName: string, 
  matchInfo: { gameType?: string } | null
): Promise<void> {
  try {
    const { data: userDoc } = await supabase
      .from('documents')
      .select('data')
      .eq('id', `user_sync_${userId}`)
      .single();

    if (!userDoc?.data) return;
    const tokenDoc = userDoc.data as GuestSyncTokenDoc;

    const liveMatch = matchInfo ? {
      hostId,
      hostName,
      startedAt: new Date().toISOString(),
      gameType: matchInfo.gameType || 'standard',
      isAborted: false
    } : null;

    const updatedDoc: GuestSyncTokenDoc = {
      ...tokenDoc,
      liveMatch
    };

    await supabase.from('documents').upsert({ id: `user_sync_${userId}`, data: updatedDoc });
    if (tokenDoc.code) {
      await supabase.from('documents').upsert({ id: `sync_code_${tokenDoc.code}`, data: updatedDoc });
    }
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
  } catch (err: any) {
    console.error("Error aborting guest match remote", err);
    return { success: false, error: err?.message || 'Fehler beim Abbrechen des Matches' };
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
  } catch (err: any) {
    console.error("Error revoking host access", err);
    return { success: false, error: err?.message || 'Fehler beim Widerrufen.' };
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
    if (profile?.isLinkedCloudGuest && profile.linkedUserId && profile.syncAuthToken) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('data')
          .eq('id', `user_sync_${profile.linkedUserId}`)
          .single();

        if (error || !data?.data) {
          revokedGuests.push(name);
          continue;
        }

        const tokenDoc = data.data as GuestSyncTokenDoc;
        const isExpired = new Date(tokenDoc.expiresAt) <= new Date();
        const isTokenMismatch = tokenDoc.authToken !== profile.syncAuthToken;

        if (isExpired || isTokenMismatch) {
          revokedGuests.push(name);
        }
      } catch (e) {
        console.error("Error validating guest token for " + name, e);
      }
    }
  }

  return {
    valid: revokedGuests.length === 0,
    revokedGuests
  };
}

/**
 * Synchronisiert nach einem beendeten Match alle beteiligten Cloud-Gast-Spieler parallel mit ihren Supabase-Konten.
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

  for (let i = 0; i < finalPlayers.length; i++) {
    const player = finalPlayers[i];
    
    // Prüfen ob dieser Spieler ein verknüpfter Cloud-Gast ist
    const linkedUserId = (player as any).linkedUserId;
    const syncAuthToken = (player as any).syncAuthToken;
    const linkedUsername = (player as any).linkedUsername || player.name;

    if (!linkedUserId || !syncAuthToken) continue;

    try {
      // 1. Auth-Token gegen Cloud validieren (Anti-Stat-Washing Schutz)
      const { data: userSyncData, error: syncErr } = await supabase
        .from('documents')
        .select('data')
        .eq('id', `user_sync_${linkedUserId}`)
        .single();

      if (syncErr || !userSyncData?.data) {
        errors.push(`${linkedUsername}: Verbindung nicht mehr gültig.`);
        continue;
      }

      const activeToken = (userSyncData.data as GuestSyncTokenDoc).authToken;
      if (activeToken !== syncAuthToken) {
        errors.push(`${linkedUsername}: Zugriff wurde vom Nutzer widerrufen.`);
        continue;
      }

      // 2. Match für das Gast-Konto speichern
      const guestMatchId = `match_${linkedUserId}_${Date.now()}_guest`;
      const guestMatch: MatchHistory = {
        ...matchData,
        _id: guestMatchId,
        type: 'match',
        isGuestMatch: true,
        hostName: hostName || 'Freund'
      };

      await supabase.from('documents').insert({ id: guestMatchId, data: guestMatch });

      // 3. Cloud-Profil des Gastes aktualisieren
      const guestProfiles = await getProfiles(linkedUserId, linkedUsername);
      const profKey = guestProfiles[linkedUsername] ? linkedUsername : Object.keys(guestProfiles)[0] || linkedUsername;
      const currentProf = guestProfiles[profKey] || {
        wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0
      };

      const is2v2 = !!matchData.is2v2 && finalPlayers.length === 4;
      const pTeam = player.team || (i % 2 === 0 ? 1 : 2);
      const isWinner = is2v2 ? (winnerName.includes(`Team ${pTeam}`)) : (player.name === winnerName);

      const updatedProf: Profile = {
        ...currentProf,
        matches: (currentProf.matches || 0) + 1,
        wins: (currentProf.wins || 0) + (isWinner ? 1 : 0),
        dartsThrown: (currentProf.dartsThrown || 0) + (player.matchDarts || 0),
        pointsScored: (currentProf.pointsScored || 0) + (player.matchPts || 0),
        sixtyPlus: (currentProf.sixtyPlus || 0) + (player.sixtyPlus || 0),
        hundredPlus: (currentProf.hundredPlus || 0) + (player.hundredPlus || 0),
        oneFortyPlus: (currentProf.oneFortyPlus || 0) + (player.oneFortyPlus || 0),
        oneEighty: (currentProf.oneEighty || 0) + (player.oneEighty || 0),
        checkoutAttempts: (currentProf.checkoutAttempts || 0) + (player.checkoutAttempts || 0),
        checkoutSuccesses: (currentProf.checkoutSuccesses || 0) + (player.checkoutSuccesses || 0),
        first9Pts: (currentProf.first9Pts || 0) + (player.matchFirst9Pts || 0),
        first9Darts: (currentProf.first9Darts || 0) + (player.matchFirst9Darts || 0),
        triplesHit: (currentProf.triplesHit || 0) + (player.triplesHit || 0),
        highestCheckout: Math.max(currentProf.highestCheckout || 0, player.highestCheckout || 0),
        lastSyncedAt: new Date().toISOString()
      };

      if (player.bestMatchLeg && (!currentProf.bestLegDarts || player.bestMatchLeg < currentProf.bestLegDarts)) {
        updatedProf.bestLegDarts = player.bestMatchLeg;
      }

      if (player.segmentHits) {
        if (!updatedProf.segmentHits) updatedProf.segmentHits = {};
        Object.entries(player.segmentHits).forEach(([seg, hits]) => {
          updatedProf.segmentHits![seg] = (updatedProf.segmentHits![seg] || 0) + hits;
        });
      }

      guestProfiles[profKey] = updatedProf;
      await saveProfiles(guestProfiles, linkedUserId);

      syncedGuests.push(linkedUsername);
    } catch (guestErr: any) {
      console.error(`Error syncing for guest ${linkedUsername}`, guestErr);
      errors.push(`${linkedUsername}: ${guestErr?.message || 'Sync-Fehler'}`);
    }
  }

  return { syncedGuests, errors };
}
