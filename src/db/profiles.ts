import type { MatchHistory, Profile, PlayerStats } from '../types';
import { supabase, PersistenceError } from './supabase';
import { profilesCacheKey } from './localCache';
import { getCachedMatches, isMatchWinner, saveMatch } from './matches';

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
  const docId = profilesCacheKey(userId);
  const useLocalCache = !options?.skipLocalCache;

  // Cached matches reconcile the profile statistics below.
  const localMatches: MatchHistory[] = useLocalCache ? getCachedMatches(userId) : [];

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
  const docId = profilesCacheKey(userId);

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
