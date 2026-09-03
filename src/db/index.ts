/**
 * The persistence layer. `database.ts` held all of it — client, profiles,
 * matches and the guest-sync protocol in one 1200-line file; the modules behind
 * this barrel are the same code, grouped by what it talks to.
 */
export { supabase, PersistenceError } from './supabase';
export {
  profilesCacheKey,
  matchesCacheKey,
  clearCachedUserData,
  ACTIVE_SYNC_CODE_KEY,
  GUEST_MATCHES_PREFIX
} from './localCache';
export {
  MATCH_PAGE_SIZE,
  isMatchWinner,
  parseWinningTeam,
  matchTimestamp,
  saveMatch,
  getCachedMatches,
  getMatchPage,
  getMatches
} from './matches';
export type { MatchPage } from './matches';
export {
  getGuestDefaultProfiles,
  reconstructProfileFromMatches,
  reconstructAllProfilesFromMatches,
  getProfiles,
  saveProfiles,
  removeLinkedGuestProfiles,
  applyMatchStatsToProfile,
  recordMatchForSelf
} from './profiles';
export {
  generateUserSyncCode,
  toggleUserSync,
  getActiveUserSyncInfo,
  readUserSyncDoc,
  redeemSyncCode,
  setGuestLiveMatchStatus,
  abortGuestMatchRemote,
  revokeHostAccess,
  validateGuestSyncTokens,
  getGuestSyncStatus,
  syncMatchesAndProfilesForGuests
} from './guestSync';
