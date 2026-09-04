import type { MatchHistory } from '../types';
import { supabase, PersistenceError } from './supabase';
import { matchesCacheKey } from './localCache';

/** Pulls the `1` out of `Team 1 (Anna & Tom)`. */
export const parseWinningTeam = (winner: string | undefined): 1 | 2 | null => {
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

export async function saveMatch(match: MatchHistory, userId?: string | null): Promise<void> {
  const localKey = matchesCacheKey(userId);
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

/**
 * What a match is recognised by when asking whether it is already known.
 *
 * The document id where there is one; older rows and rows that never reached
 * the cloud are identified by what they record instead.
 */
export const matchFingerprint = (m: MatchHistory): string =>
  m._id || `${m.createdAt || m.date}|${m.winner}|${m.players?.map(p => p.name).join(',')}`;

/** Newest first; matches with no discoverable date sink to the bottom. */
const byNewestFirst = (a: MatchHistory, b: MatchHistory): number =>
  (matchTimestamp(b) ?? 0) - (matchTimestamp(a) ?? 0);

/** The matches this browser has cached for an account, newest first. */
export const getCachedMatches = (userId?: string | null): MatchHistory[] => {
  const localKey = matchesCacheKey(userId);
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
  const localKey = matchesCacheKey(userId);
  const cached = getCachedMatches(userId);

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

    // Merged into the cache rather than written over it. A caller may ask for a
    // small page — the guest-sync snapshot takes 15 — and overwriting would
    // have thrown away the offline history down to those 15 rows.
    const known = new Set(matches.map(matchFingerprint));
    const mergedCache = [...matches, ...cached.filter(m => !known.has(matchFingerprint(m)))]
      .sort(byNewestFirst)
      .slice(0, MATCH_PAGE_SIZE);
    try {
      localStorage.setItem(localKey, JSON.stringify(mergedCache));
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
