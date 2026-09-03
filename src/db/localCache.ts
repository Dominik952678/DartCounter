import type { MatchHistory } from '../types';

/**
 * The names the browser cache is kept under.
 *
 * Every read and write used to spell these out inline, in two conventions and
 * a dozen places, which is how sign-out came to leave the previous account's
 * data behind: nothing owned the list of keys that belong to a user.
 */

/** Guest data has no account to hang from and lives under its own key. */
export const profilesCacheKey = (userId?: string | null): string =>
  userId ? `profiles_${userId}` : 'profiles_guest';

export const matchesCacheKey = (userId?: string | null): string =>
  userId ? `matches_${userId}` : 'matches_guest';

/** Match data borrowed from a linked cloud guest, keyed by that guest's id. */
export const GUEST_MATCHES_PREFIX = 'guest_matches_';

/** The signed-in user's own guest-sync code. */
export const ACTIVE_SYNC_CODE_KEY = 'dartcounter_active_sync_code';

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
      localStorage.removeItem(profilesCacheKey(userId));
      localStorage.removeItem(matchesCacheKey(userId));
    }
    localStorage.removeItem('dartcounter_active_sync_code');

    // Guest caches are keyed by the linked guest's id, not by the host's, so
    // they have to be found by prefix.
    Object.keys(localStorage)
      .filter(key => key.startsWith(GUEST_MATCHES_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Could not clear cached user data', e);
  }
}

/**
 * The matches a linked cloud guest played on this device.
 *
 * They are cached under the guest's own user id so their dashboard can show a
 * full picture while they are borrowed here, and the screen that reads them
 * used to reach into localStorage itself, key spelling and all.
 */
export const getCachedGuestMatches = (linkedUserId?: string | null): MatchHistory[] => {
  if (!linkedUserId) return [];
  try {
    const raw = localStorage.getItem(`${GUEST_MATCHES_PREFIX}${linkedUserId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Could not read cached guest matches', e);
    return [];
  }
};
