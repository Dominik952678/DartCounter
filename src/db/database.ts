import { createClient } from '@supabase/supabase-js';
import type { MatchHistory, Profile, GuestSyncTokenDoc, ActiveHostConnection, Player, PlayerStats } from '../types';

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

/**
 * Reconstructs or updates a Profile object with all accumulated historical data
 * from the complete MatchHistory list. This ensures Win Rate, Best Leg, Segmentverteilung,
 * 180s, Heatmap, and minigame scores are never lost even if the profiles table was reset.
 */
export function reconstructProfileFromMatches(
  profileName: string,
  baseProfile: Profile | undefined,
  matches: MatchHistory[]
): Profile {
  const prof: Profile = {
    wins: baseProfile?.wins || 0,
    matches: baseProfile?.matches || 0,
    dartsThrown: baseProfile?.dartsThrown || 0,
    pointsScored: baseProfile?.pointsScored || 0,
    highestThrow: baseProfile?.highestThrow || 0,
    bestLegDarts: baseProfile?.bestLegDarts,
    highestCheckout: baseProfile?.highestCheckout,
    sixtyPlus: baseProfile?.sixtyPlus || 0,
    hundredPlus: baseProfile?.hundredPlus || 0,
    oneFortyPlus: baseProfile?.oneFortyPlus || 0,
    oneEighty: baseProfile?.oneEighty || 0,
    checkoutAttempts: baseProfile?.checkoutAttempts || 0,
    checkoutSuccesses: baseProfile?.checkoutSuccesses || 0,
    first9Pts: baseProfile?.first9Pts || 0,
    first9Darts: baseProfile?.first9Darts || 0,
    triplesHit: baseProfile?.triplesHit || 0,
    segmentHits: { ...(baseProfile?.segmentHits || {}) },
    isBot: baseProfile?.isBot,
    targetAverage: baseProfile?.targetAverage,
    color: baseProfile?.color || 'var(--blue)',
    powerScoring: baseProfile?.powerScoring ? { ...baseProfile.powerScoring } : undefined,
    splitScore: baseProfile?.splitScore ? { ...baseProfile.splitScore } : undefined,
    checkoutTraining: baseProfile?.checkoutTraining ? { ...baseProfile.checkoutTraining } : undefined,
    linkedUserId: baseProfile?.linkedUserId,
    linkedUsername: baseProfile?.linkedUsername,
    isLinkedCloudGuest: baseProfile?.isLinkedCloudGuest,
    syncAuthToken: baseProfile?.syncAuthToken,
    lastSyncedAt: baseProfile?.lastSyncedAt
  };

  const safeMatches = Array.isArray(matches) ? matches : [];
  const playerMatches = safeMatches.filter(
    m => m && Array.isArray(m.players) && m.players.some(p => p && p.name === profileName)
  );

  if (playerMatches.length === 0) return prof;

  let matchWins = 0;
  let matchDarts = 0;
  let matchPts = 0;
  let matchFirst9Pts = 0;
  let matchFirst9Darts = 0;
  let matchCheckAtt = 0;
  let matchCheckSucc = 0;
  let matchSixtyPlus = 0;
  let matchHundredPlus = 0;
  let matchOneFortyPlus = 0;
  let matchOneEighty = 0;
  let matchTriples = 0;
  let matchHighestCheckout = 0;
  let matchBestLeg = 0;
  const matchSegmentHits: Record<string, number> = {};

  playerMatches.forEach(m => {
    const isWinner = m.winner === profileName || (!!m.is2v2 && m.winner?.includes(profileName));
    if (isWinner) matchWins++;

    const pStat = m.players?.find(p => p && p.name === profileName);
    if (!pStat) return;

    if (pStat.matchDarts) matchDarts += pStat.matchDarts;
    if (pStat.matchPts) matchPts += pStat.matchPts;
    if (pStat.first9Pts) matchFirst9Pts += pStat.first9Pts;
    if (pStat.first9Darts) matchFirst9Darts += pStat.first9Darts;
    if (pStat.checkoutAttempts) matchCheckAtt += pStat.checkoutAttempts;
    if (pStat.checkoutSuccesses) matchCheckSucc += pStat.checkoutSuccesses;
    if (pStat.sixtyPlus) matchSixtyPlus += pStat.sixtyPlus;
    if (pStat.hundredPlus) matchHundredPlus += pStat.hundredPlus;
    if (pStat.oneFortyPlus) matchOneFortyPlus += pStat.oneFortyPlus;
    if (pStat.oneEighty) matchOneEighty += pStat.oneEighty;
    if (pStat.triplesHit) matchTriples += pStat.triplesHit;

    if (pStat.highestCheckout && pStat.highestCheckout > matchHighestCheckout) {
      matchHighestCheckout = pStat.highestCheckout;
    }
    if (pStat.bestMatchLeg && pStat.bestMatchLeg > 0) {
      if (matchBestLeg === 0 || pStat.bestMatchLeg < matchBestLeg) {
        matchBestLeg = pStat.bestMatchLeg;
      }
    }

    if (pStat.segmentHits) {
      Object.entries(pStat.segmentHits).forEach(([seg, count]) => {
        matchSegmentHits[seg] = (matchSegmentHits[seg] || 0) + (count || 0);
      });
    }

    // Minigame stats
    if (m.gameType === 'powerScoring' && pStat.score !== undefined) {
      if (!prof.powerScoring) prof.powerScoring = { bestScore: 0, matchesPlayed: 0, wins: 0, totalScore: 0 };
      prof.powerScoring.bestScore = Math.max(prof.powerScoring.bestScore, pStat.score);
      prof.powerScoring.matchesPlayed = Math.max(
        prof.powerScoring.matchesPlayed,
        playerMatches.filter(pm => pm.gameType === 'powerScoring').length
      );
      prof.powerScoring.totalScore = (prof.powerScoring.totalScore || 0) + pStat.score;
      if (isWinner) {
        prof.powerScoring.wins = Math.max(
          prof.powerScoring.wins,
          playerMatches.filter(pm => pm.gameType === 'powerScoring' && pm.winner === profileName).length
        );
      }
    } else if (m.gameType === 'splitScore' && pStat.score !== undefined) {
      if (!prof.splitScore) prof.splitScore = { bestScore: 0, matchesPlayed: 0, wins: 0, totalScore: 0 };
      prof.splitScore.bestScore = Math.max(prof.splitScore.bestScore, pStat.score);
      prof.splitScore.matchesPlayed = Math.max(
        prof.splitScore.matchesPlayed,
        playerMatches.filter(pm => pm.gameType === 'splitScore').length
      );
      prof.splitScore.totalScore = (prof.splitScore.totalScore || 0) + pStat.score;
      if (isWinner) {
        prof.splitScore.wins = Math.max(
          prof.splitScore.wins,
          playerMatches.filter(pm => pm.gameType === 'splitScore' && pm.winner === profileName).length
        );
      }
    } else if (m.gameType === 'checkoutTraining') {
      if (!prof.checkoutTraining) prof.checkoutTraining = { bestCheckout: 0, roundsCompleted: 0, matchesPlayed: 0, wins: 0, totalAttempts: 0, totalDartsUsed: 0 };
      if (pStat.score) prof.checkoutTraining.bestCheckout = Math.max(prof.checkoutTraining.bestCheckout, pStat.score);
      prof.checkoutTraining.matchesPlayed = Math.max(
        prof.checkoutTraining.matchesPlayed,
        playerMatches.filter(pm => pm.gameType === 'checkoutTraining').length
      );
      if (pStat.attempts) prof.checkoutTraining.totalAttempts = (prof.checkoutTraining.totalAttempts || 0) + pStat.attempts;
      if (pStat.dartsUsed) prof.checkoutTraining.totalDartsUsed = (prof.checkoutTraining.totalDartsUsed || 0) + pStat.dartsUsed;
      if (isWinner) {
        prof.checkoutTraining.wins = Math.max(
          prof.checkoutTraining.wins,
          playerMatches.filter(pm => pm.gameType === 'checkoutTraining' && pm.winner === profileName).length
        );
      }
    }
  });

  // Reconcile standard profile stats with match totals
  prof.matches = Math.max(prof.matches, playerMatches.length);
  prof.wins = Math.max(prof.wins, matchWins);
  prof.dartsThrown = Math.max(prof.dartsThrown, matchDarts);
  prof.pointsScored = Math.max(prof.pointsScored, matchPts);
  prof.first9Pts = Math.max(prof.first9Pts || 0, matchFirst9Pts);
  prof.first9Darts = Math.max(prof.first9Darts || 0, matchFirst9Darts);
  prof.checkoutAttempts = Math.max(prof.checkoutAttempts || 0, matchCheckAtt);
  prof.checkoutSuccesses = Math.max(prof.checkoutSuccesses || 0, matchCheckSucc);
  prof.sixtyPlus = Math.max(prof.sixtyPlus || 0, matchSixtyPlus);
  prof.hundredPlus = Math.max(prof.hundredPlus || 0, matchHundredPlus);
  prof.oneFortyPlus = Math.max(prof.oneFortyPlus || 0, matchOneFortyPlus);
  prof.oneEighty = Math.max(prof.oneEighty || 0, matchOneEighty);
  prof.triplesHit = Math.max(prof.triplesHit || 0, matchTriples);

  if (matchHighestCheckout > 0) {
    prof.highestCheckout = Math.max(prof.highestCheckout || 0, matchHighestCheckout);
  }
  if (matchBestLeg > 0) {
    prof.bestLegDarts = prof.bestLegDarts ? Math.min(prof.bestLegDarts, matchBestLeg) : matchBestLeg;
  }
  if ((prof.highestCheckout || 0) > (prof.highestThrow || 0)) {
    prof.highestThrow = prof.highestCheckout || 0;
  }
  if ((prof.oneEighty || 0) > 0 && (prof.highestThrow || 0) < 180) {
    prof.highestThrow = 180;
  }

  // Merge segment hits
  const baseHitsSum = Object.values(prof.segmentHits || {}).reduce((s, v) => s + (v || 0), 0);
  const matchHitsSum = Object.values(matchSegmentHits).reduce((s, v) => s + (v || 0), 0);
  if (matchHitsSum > baseHitsSum || baseHitsSum === 0) {
    prof.segmentHits = matchSegmentHits;
  } else {
    Object.entries(matchSegmentHits).forEach(([seg, hits]) => {
      if (!prof.segmentHits![seg]) {
        prof.segmentHits![seg] = hits;
      }
    });
  }

  return prof;
}

/**
 * Reconstructs existing profiles in a Record using the provided MatchHistory list.
 * Note: Only profiles already present in currentProfiles are updated. New profiles are NOT created.
 */
export function reconstructAllProfilesFromMatches(
  currentProfiles: Record<string, Profile>,
  matches: MatchHistory[]
): Record<string, Profile> {
  const result: Record<string, Profile> = {};
  
  Object.entries(currentProfiles).forEach(([name, prof]) => {
    result[name] = reconstructProfileFromMatches(name, prof, matches);
  });

  return result;
}

export async function getProfiles(
  userId?: string | null,
  username?: string,
  options?: { skipLocalCache?: boolean }
): Promise<Record<string, Profile>> {
  const docId = userId ? `profiles_${userId}` : 'profiles_guest';
  const matchesDocKey = userId ? `matches_${userId}` : 'matches_guest';
  const useLocalCache = !options?.skipLocalCache;

  // Try reading cached matches for reconciling profile statistics
  let localMatches: MatchHistory[] = [];
  try {
    const rawMatches = useLocalCache ? localStorage.getItem(matchesDocKey) : null;
    if (rawMatches) localMatches = JSON.parse(rawMatches);
  } catch (e) {
    console.error("Error reading cached matches for profile reconciliation", e);
  }

  // Try reading from localStorage cache first for fast offline startup
  let cached: Record<string, Profile> | null = null;
  try {
    const raw = useLocalCache ? localStorage.getItem(docId) : null;
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.error("Error reading cached profiles", e);
  }

  // If not logged in, return cached or default guest profiles reconciled with matches
  if (!userId) {
    let guestProfiles = cached || getGuestDefaultProfiles();
    if (localMatches.length > 0) {
      guestProfiles = reconstructAllProfilesFromMatches(guestProfiles, localMatches);
      try {
        localStorage.setItem(docId, JSON.stringify(guestProfiles));
      } catch (e) {
        console.error(e);
      }
    }
    return guestProfiles;
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
        let initialProfiles: Record<string, Profile> = {
          [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
        };
        if (localMatches.length > 0) {
          initialProfiles = reconstructAllProfilesFromMatches(initialProfiles, localMatches);
        }
        await saveProfiles(initialProfiles, userId);
        return initialProfiles;
      }
      if (cached) {
        if (localMatches.length > 0) {
          return reconstructAllProfilesFromMatches(cached, localMatches);
        }
        return cached;
      }
      throw error;
    }

    let fetchedProfiles = (data?.data as { profiles?: Record<string, Profile> })?.profiles || {};
    if (Object.keys(fetchedProfiles).length === 0) {
      const initialName = username || 'Spieler';
      fetchedProfiles = {
        [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
      };
    }

    // Reconcile fetched profiles with matches to restore any missing stats
    if (localMatches.length > 0) {
      fetchedProfiles = reconstructAllProfilesFromMatches(fetchedProfiles, localMatches);
    }

    if (useLocalCache) {
      try {
        localStorage.setItem(docId, JSON.stringify(fetchedProfiles));
      } catch (e) {
        console.error(e);
      }
    }

    return fetchedProfiles;
  } catch (err) {
    console.error("Error getting profiles from Supabase", err);
    if (cached) {
      if (localMatches.length > 0) {
        return reconstructAllProfilesFromMatches(cached, localMatches);
      }
      return cached;
    }
    const initialName = username || 'Spieler';
    let fallbackProfiles: Record<string, Profile> = {
      [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
    };
    if (localMatches.length > 0) {
      fallbackProfiles = reconstructAllProfilesFromMatches(fallbackProfiles, localMatches);
    }
    return fallbackProfiles;
  }
}

export async function saveProfiles(
  profiles: Record<string, Profile>,
  userId?: string | null,
  options?: { skipLocalCache?: boolean }
): Promise<void> {
  const docId = userId ? `profiles_${userId}` : 'profiles_guest';

  // The local cache belongs to whoever is signed in on this device. When we
  // write on behalf of a linked cloud guest, their data must go to the cloud
  // only — leaving it in a stranger's browser is both a privacy leak and a
  // source of stale reads on the next match.
  if (!options?.skipLocalCache) {
    try {
      localStorage.setItem(docId, JSON.stringify(profiles));
    } catch (e) {
      console.error(e);
    }
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
  if (userId) (match as MatchHistory & { userId?: string }).userId = userId;

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

/**
 * Folds a single match result into a profile. Used wherever a device has to
 * book stats for one specific player rather than for a whole local match —
 * notably online play, where every device only ever owns one seat.
 */
export function applyMatchStatsToProfile(
  base: Profile | undefined,
  pStat: PlayerStats,
  isWinner: boolean
): Profile {
  const prof: Profile = {
    wins: 0,
    matches: 0,
    dartsThrown: 0,
    pointsScored: 0,
    highestThrow: 0,
    ...(base || {})
  };

  prof.matches += 1;
  if (isWinner) prof.wins += 1;
  prof.dartsThrown += pStat.matchDarts || 0;
  prof.pointsScored += pStat.matchPts || 0;
  prof.sixtyPlus = (prof.sixtyPlus || 0) + (pStat.sixtyPlus || 0);
  prof.hundredPlus = (prof.hundredPlus || 0) + (pStat.hundredPlus || 0);
  prof.oneFortyPlus = (prof.oneFortyPlus || 0) + (pStat.oneFortyPlus || 0);
  prof.oneEighty = (prof.oneEighty || 0) + (pStat.oneEighty || 0);
  prof.checkoutAttempts = (prof.checkoutAttempts || 0) + (pStat.checkoutAttempts || 0);
  prof.checkoutSuccesses = (prof.checkoutSuccesses || 0) + (pStat.checkoutSuccesses || 0);
  prof.first9Pts = (prof.first9Pts || 0) + (pStat.first9Pts || 0);
  prof.first9Darts = (prof.first9Darts || 0) + (pStat.first9Darts || 0);
  prof.triplesHit = (prof.triplesHit || 0) + (pStat.triplesHit || 0);

  if ((pStat.highestCheckout || 0) > (prof.highestCheckout || 0)) {
    prof.highestCheckout = pStat.highestCheckout;
  }
  if ((pStat.oneEighty || 0) > 0 && prof.highestThrow < 180) {
    prof.highestThrow = 180;
  } else if ((pStat.highestCheckout || 0) > prof.highestThrow) {
    prof.highestThrow = pStat.highestCheckout || prof.highestThrow;
  }
  if (pStat.bestMatchLeg && (!prof.bestLegDarts || pStat.bestMatchLeg < prof.bestLegDarts)) {
    prof.bestLegDarts = pStat.bestMatchLeg;
  }

  if (pStat.segmentHits) {
    prof.segmentHits = { ...(prof.segmentHits || {}) };
    Object.entries(pStat.segmentHits).forEach(([seg, hits]) => {
      prof.segmentHits![seg] = (prof.segmentHits![seg] || 0) + (hits || 0);
    });
  }

  return prof;
}

/**
 * Persists a finished match on *this* device and books the result onto the
 * local player's own profile. Every participant in an online match calls this
 * for their own seat, so personal statistics survive online play instead of
 * only existing on the host.
 */
export async function recordMatchForSelf(
  match: MatchHistory,
  myPlayerName: string,
  userId?: string | null,
  username?: string
): Promise<Record<string, Profile> | null> {
  await saveMatch(match, userId);

  const pStat = match.players?.find(p => p && p.name === myPlayerName);
  if (!pStat) return null;

  const profiles = await getProfiles(userId, username);
  const key = profiles[myPlayerName] ? myPlayerName : (username && profiles[username] ? username : myPlayerName);
  const isWinner = match.is2v2
    ? !!match.winner && match.winner.includes(myPlayerName)
    : match.winner === myPlayerName;

  profiles[key] = applyMatchStatsToProfile(profiles[key], pStat, isWinner);
  await saveProfiles(profiles, userId);
  return profiles;
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
    localStorage.setItem('dartcounter_active_sync_code', JSON.stringify(tokenDoc));
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

  localStorage.removeItem('dartcounter_active_sync_code');
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
  userId: string, 
  hostId: string, 
  hostName: string, 
  matchInfo: { gameType?: string; players?: string[]; mode?: string; isAborted?: boolean } | null
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
        if (tokenDoc.authToken !== profile.syncAuthToken || tokenDoc.syncEnabled === false) {
          revokedGuests.push(name);
          continue;
        }

        const isExpired = new Date(tokenDoc.expiresAt) < new Date();
        if (isExpired) {
          revokedGuests.push(name);
        }
      } catch {
        revokedGuests.push(name);
      }
    }
  }

  return {
    valid: revokedGuests.length === 0,
    revokedGuests
  };
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

  for (let i = 0; i < finalPlayers.length; i++) {
    const player = finalPlayers[i];
    
    // Prüfen ob dieser Spieler ein verknüpfter Cloud-Gast ist
    const linkedUserId = player.linkedUserId;
    const syncAuthToken = player.syncAuthToken;
    const linkedUsername = player.linkedUsername || player.name;

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
      const guestProfiles = await getProfiles(linkedUserId, linkedUsername, { skipLocalCache: true });
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
      await saveProfiles(guestProfiles, linkedUserId, { skipLocalCache: true });

      syncedGuests.push(linkedUsername);
    } catch (guestErr: unknown) {
      const error = guestErr as Error;
      console.error(`Error syncing for guest ${linkedUsername}`, error);
      errors.push(`${linkedUsername}: ${error?.message || 'Sync-Fehler'}`);
    }
  }

  return { syncedGuests, errors };
}
