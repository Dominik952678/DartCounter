import { createClient } from '@supabase/supabase-js';
import type { MatchHistory, Profile, GuestSyncTokenDoc, Player, PlayerStats } from '../types';

const SUPABASE_URL = 'https://pdbycflxxokbwfsfrmwu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vkBLAop52YK5pN6JrIAjfQ__Q9dvli0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Raised when a write did not reach its destination.
 *
 * The write paths used to swallow these and only `console.error` them: a
 * player could finish a 40-minute match, have the cloud reject the insert, and
 * still be shown the full statistics for data that no longer existed anywhere.
 * Callers are now forced to decide what to tell the user.
 */
export class PersistenceError extends Error {
  /** `local` is the browser cache (usually the storage quota); `cloud` is Supabase. */
  readonly scope: 'local' | 'cloud';

  constructor(message: string, scope: 'local' | 'cloud', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PersistenceError';
    this.scope = scope;
  }
}

export function getGuestDefaultProfiles(): Record<string, Profile> {
  return {
    "Gast 1": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' },
    "Gast 2": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--orange)' },
    "Bot": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot: true, targetAverage: 45, color: 'var(--purple)' }
  };
}

/** Pulls the `1` out of `Team 1 (Anna & Tom)`. */
const parseWinningTeam = (winner: string | undefined): 1 | 2 | null => {
  const match = /^Team\s*([12])\b/.exec(winner?.trim() ?? '');
  return match ? (Number(match[1]) as 1 | 2) : null;
};

/** The names inside `Team 1 (Anna & Tom)`. */
const parseWinningTeamNames = (winner: string | undefined): string[] =>
  (/\(([^)]*)\)\s*$/.exec(winner?.trim() ?? '')?.[1] ?? '')
    .split('&')
    .map(name => name.trim())
    .filter(Boolean);

/**
 * Whether `playerName` played on the winning side of `match`.
 *
 * A 2v2 winner is persisted as the display string `Team 1 (Anna & Tom)`, and
 * this used to be answered with `winner.includes(playerName)` — which credits a
 * win to a profile named "Tom" whenever "Tommy" is on the winning team, a real
 * possibility when both play the same 2v2 on opposite sides. The team number
 * carried on each player row decides it instead; the bracketed names are only
 * consulted for matches stored before that field existed, and then compared
 * whole rather than as substrings.
 */
export function isMatchWinner(match: MatchHistory, playerName: string): boolean {
  if (!match.is2v2) return match.winner === playerName;

  const winningTeam = parseWinningTeam(match.winner);
  const index = match.players?.findIndex(p => p?.name === playerName) ?? -1;

  if (winningTeam !== null && index >= 0) {
    const team = match.players[index].team ?? (index % 2 === 0 ? 1 : 2);
    return team === winningTeam;
  }

  return parseWinningTeamNames(match.winner).includes(playerName);
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
    const isWinner = isMatchWinner(m, profileName);
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
  matches: MatchHistory[],
  ensureNames: string[] = []
): Record<string, Profile> {
  const result: Record<string, Profile> = {};

  Object.entries(currentProfiles).forEach(([name, prof]) => {
    result[name] = reconstructProfileFromMatches(name, prof, matches);
  });

  // Named profiles that are missing but demonstrably played are recreated from
  // the match history. Used to restore the account's own profile; opponents are
  // still never auto-created, which is why this is opt-in per name.
  const safeMatches = Array.isArray(matches) ? matches : [];
  ensureNames.forEach(name => {
    if (!name || result[name]) return;
    const played = safeMatches.some(
      m => m && Array.isArray(m.players) && m.players.some(p => p && p.name === name)
    );
    if (played) {
      result[name] = reconstructProfileFromMatches(name, undefined, matches);
    }
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
    } catch (err) {
      throw new PersistenceError(
        'Profile konnten nicht lokal gespeichert werden. Der Speicher des Browsers ist voll.',
        'local',
        { cause: err }
      );
    }
  }

  if (!userId) return; // Guests do not write to persistent cloud database

  const docData = { profiles, userId, type: 'profiles' };
  const { error } = await supabase
    .from('documents')
    .upsert({ id: docId, data: docData });

  if (error) {
    throw new PersistenceError(
      `Profile konnten nicht in die Cloud gespeichert werden: ${error.message || 'Unbekannter Serverfehler'}`,
      'cloud',
      { cause: error }
    );
  }
}

export async function saveMatch(match: MatchHistory, userId?: string | null): Promise<void> {
  const localKey = userId ? `matches_${userId}` : 'matches_guest';
  const matchId = `match_${userId || 'guest'}_${Date.now()}`;

  // A copy, not the caller's object: this used to stamp `type`/`_id`/`userId`
  // onto the match the caller still held a reference to.
  const stored: MatchHistory & { userId?: string } = {
    ...match,
    type: 'match',
    _id: matchId,
    ...(userId ? { userId } : {})
  };

  // Update local cache of matches
  try {
    const existing = localStorage.getItem(localKey);
    const list: MatchHistory[] = existing ? JSON.parse(existing) : [];
    list.unshift(stored);
    localStorage.setItem(localKey, JSON.stringify(list.slice(0, 100)));
  } catch (err) {
    throw new PersistenceError(
      'Das Match konnte nicht lokal gespeichert werden. Der Speicher des Browsers ist voll.',
      'local',
      { cause: err }
    );
  }

  if (!userId) return; // Guests do not save to cloud

  const { error } = await supabase
    .from('documents')
    .insert({ id: matchId, data: stored });

  if (error) {
    throw new PersistenceError(
      `Das Match konnte nicht in die Cloud gespeichert werden: ${error.message || 'Unbekannter Serverfehler'}`,
      'cloud',
      { cause: error }
    );
  }
}

/**
 * Drops everything cached for one account: its profiles, its match history, its
 * guest-sync code and the match data borrowed from its linked guests.
 *
 * Sign-out used to leave all of that behind, so the next person to open the app
 * on this device — signed out, or signed in as somebody else before their own
 * data had loaded — was shown the previous account's profiles and matches. Only
 * account data goes; device preferences (theme, sound, last match settings) are
 * this browser's, not the user's.
 */
export function clearCachedUserData(userId?: string | null): void {
  try {
    if (userId) {
      localStorage.removeItem(`profiles_${userId}`);
      localStorage.removeItem(`matches_${userId}`);
    }
    localStorage.removeItem('dartcounter_active_sync_code');

    // Guest caches are keyed by the linked guest's id, not by the host's, so
    // they have to be found by prefix.
    Object.keys(localStorage)
      .filter(key => key.startsWith('guest_matches_'))
      .forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Could not clear cached user data', e);
  }
}

/** How many matches the app loads before the player asks for more. */
export const MATCH_PAGE_SIZE = 100;

/** A window onto the match history, plus how many matches there are in total. */
export interface MatchPage {
  matches: MatchHistory[];
  /** Rows in the history, including those beyond this window. */
  total: number;
}

/** `01.09.26, 20:15` — the display format matches were stamped with. */
const LEGACY_DATE = /^(\d{2})\.(\d{2})\.(\d{2}),\s*(\d{2}):(\d{2})$/;

/**
 * When a match was played, in milliseconds, or `null` if it cannot be told.
 *
 * `date` is a localised display string ("01.09.26, 20:15") and sample data even
 * uses words ("Gestern, 20:15"), so it sorts alphabetically at best. Matches
 * written from now on carry `createdAt` as ISO; for older ones the id — which
 * ends in the `Date.now()` of the save — and then the German display format are
 * the fallbacks, in that order of reliability.
 */
export function matchTimestamp(match: MatchHistory): number | null {
  if (match.createdAt) {
    const fromIso = Date.parse(match.createdAt);
    if (!Number.isNaN(fromIso)) return fromIso;
  }

  const fromId = /_(\d{10,})$/.exec(match._id ?? '');
  if (fromId) return Number(fromId[1]);

  const legacy = LEGACY_DATE.exec(match.date?.trim() ?? '');
  if (legacy) {
    const [, day, month, year, hour, minute] = legacy;
    return new Date(2000 + Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
  }

  return null;
}

/**
 * Fills in `createdAt` for matches stored before the field existed, so that
 * everything downstream can sort and filter on one comparable value. Undatable
 * matches are left alone rather than stamped with a made-up time.
 */
const withCreatedAt = (match: MatchHistory): MatchHistory => {
  if (match.createdAt) return match;
  const timestamp = matchTimestamp(match);
  return timestamp === null ? match : { ...match, createdAt: new Date(timestamp).toISOString() };
};

/** Newest first; matches with no discoverable date sink to the bottom. */
const byNewestFirst = (a: MatchHistory, b: MatchHistory): number =>
  (matchTimestamp(b) ?? 0) - (matchTimestamp(a) ?? 0);

const readCachedMatches = (localKey: string): MatchHistory[] => {
  try {
    const raw = localStorage.getItem(localKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(withCreatedAt).sort(byNewestFirst) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

/**
 * The newest `limit` matches, plus the total the account has.
 *
 * The query used to have no bound at all: every launch pulled the account's
 * entire match history, full documents and all, before the first screen could
 * render. The count comes back with the same request, so the caller can offer
 * "load more" without a second round trip.
 */
export async function getMatchPage(
  userId?: string | null,
  limit: number = MATCH_PAGE_SIZE
): Promise<MatchPage> {
  const localKey = userId ? `matches_${userId}` : 'matches_guest';
  const cached = readCachedMatches(localKey);

  if (!userId) return { matches: cached.slice(0, limit), total: cached.length };

  try {
    let query = supabase
      .from('documents')
      .select('data', { count: 'exact' })
      .ilike('id', `match_${userId}_%`)
      .order('id', { ascending: false });

    if (Number.isFinite(limit)) query = query.range(0, limit - 1);

    const { data, error, count } = await query;

    if (error) {
      if (cached.length > 0) return { matches: cached.slice(0, limit), total: cached.length };
      throw error;
    }

    if (!data) return { matches: cached.slice(0, limit), total: cached.length };

    const matches = data.map(row => withCreatedAt(row.data as unknown as MatchHistory)).sort(byNewestFirst);
    try {
      localStorage.setItem(localKey, JSON.stringify(matches.slice(0, MATCH_PAGE_SIZE)));
    } catch (e) {
      console.error(e);
    }
    return { matches, total: count ?? matches.length };
  } catch (err) {
    console.error("Error getting matches from Supabase", err);
    return { matches: cached.slice(0, limit), total: cached.length };
  }
}

/**
 * The complete history. Only for the places whose numbers are lifetime totals
 * (the stats screen, profile reconstruction) — everywhere else takes a page.
 */
export async function getMatches(userId?: string | null): Promise<MatchHistory[]> {
  const { matches } = await getMatchPage(userId, Number.POSITIVE_INFINITY);
  return matches;
}

/**
 * Removes borrowed cloud-guest profiles by name. Once a link is cut their stats
 * are no longer ours to show, so the entry must leave the profile list instead
 * of lingering as a dead option in every player selector.
 *
 * Only profiles flagged `isLinkedCloudGuest` are ever removed — a local profile
 * that happens to share a name is left alone.
 */
export function removeLinkedGuestProfiles(
  profiles: Record<string, Profile>,
  names: string[]
): { profiles: Record<string, Profile>; removed: string[] } {
  const removed: string[] = [];
  const next = { ...profiles };
  for (const name of names) {
    if (next[name]?.isLinkedCloudGuest) {
      delete next[name];
      removed.push(name);
    }
  }
  return { profiles: removed.length > 0 ? next : profiles, removed };
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
  const isWinner = isMatchWinner(match, myPlayerName);

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
        localStorage.setItem(`guest_matches_${result.userId}`, JSON.stringify(matches));
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
