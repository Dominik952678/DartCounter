export interface Profile {
  wins: number;
  matches: number;
  dartsThrown: number;
  pointsScored: number;
  highestThrow: number;
  bestLegDarts?: number;
  highestCheckout?: number;
  sixtyPlus?: number;
  hundredPlus?: number;
  oneFortyPlus?: number;
  oneEighty?: number;
  checkoutAttempts?: number;
  checkoutSuccesses?: number;
  first9Pts?: number;
  first9Darts?: number;
  isBot?: boolean;
  targetAverage?: number;
  segmentHits?: Record<string, number>;
  triplesHit?: number;
  color?: string;
  powerScoring?: { bestScore: number; matchesPlayed: number; wins: number; totalScore?: number };
  splitScore?: { bestScore: number; matchesPlayed: number; wins: number; totalScore?: number };
  checkoutTraining?: { bestCheckout: number; roundsCompleted: number; matchesPlayed: number; wins: number; totalAttempts?: number; totalDartsUsed?: number };
  // Cloud Guest Sync metadata
  linkedUserId?: string;
  linkedUsername?: string;
  isLinkedCloudGuest?: boolean;
  syncAuthToken?: string;
  lastSyncedAt?: string;
}

export interface ActiveHostConnection {
  hostId: string;
  hostName: string;
  linkedAt: string;
  lastMatchAt?: string;
}

export interface LiveMatchInfo {
  hostId: string;
  hostName: string;
  startedAt: string;
  gameType?: string;
  isAborted?: boolean;
}

export interface GuestSyncTokenDoc {
  code: string;
  userId: string;
  username: string;
  authToken: string;
  createdAt: string;
  expiresAt: string;
  syncEnabled?: boolean;
  activeHost?: ActiveHostConnection | null;
  activeHosts?: ActiveHostConnection[];
  profileSnapshot?: Profile;
  matchesSnapshot?: MatchHistory[];
  liveMatch?: LiveMatchInfo | null;
}

export interface GameConfig {
  mode?: 'standard' | 'powerscoring' | 'splitscore' | 'checkout';
  startScore: number;
  outMode: 'SO' | 'DO' | 'MO';
  setsToWin: number;
  legsToWin: number;
  is2v2?: boolean;
  // Minigame config
  rounds?: number;
  checkoutRounds?: number;
  checkoutTargets?: number;
}

export interface Player {
  name: string;
  score: number;
  legs: number;
  sets: number;
  legPts: number;
  legDarts: number;
  matchPts: number;
  matchDarts: number;
  legHistory: string[];
  matchFirst9Pts: number;
  matchFirst9Darts: number;
  sixtyPlus: number;
  hundredPlus: number;
  oneFortyPlus: number;
  oneEighty: number;
  highestCheckout: number;
  checkoutAttempts: number;
  checkoutSuccesses: number;
  isBot?: boolean;
  targetAverage?: number;
  segmentHits: Record<string, number>;
  triplesHit?: number;
  color?: string;
  bestMatchLeg?: number;
  team?: 1 | 2;
  linkedUserId?: string;
  linkedUsername?: string;
  isLinkedCloudGuest?: boolean;
  syncAuthToken?: string;
}

export interface Dart {
  base: number;
  mult: number;
  value: number;
  label: string;
}

export interface PlayerStats {
  name: string;
  sets: number;
  legs: number;
  avg: string;
  first9: string;
  matchPts?: number;
  matchDarts?: number;
  first9Pts?: number;
  first9Darts?: number;
  checkoutAttempts?: number;
  checkoutSuccesses?: number;
  bestMatchLeg?: number;
  legHistory?: string[];
  hundredPlus?: number;
  oneFortyPlus?: number;
  oneEighty?: number;
  highestCheckout?: number;
  segmentHits?: Record<string, number>;
  triplesHit?: number;
  team?: 1 | 2;
  linkedUserId?: string;
  linkedUsername?: string;
  isLinkedCloudGuest?: boolean;
  
  // Minigame specific
  score?: number;
  attempts?: number;
  dartsUsed?: number;
}

export interface MatchHistory {
  _id?: string;
  _rev?: string;
  type?: 'match';
  isOnline?: boolean;
  gameType?: 'standard' | 'powerScoring' | 'splitScore' | 'checkoutTraining';
  config?: GameConfig;
  is2v2?: boolean;
  date: string;
  winner: string;
  players: PlayerStats[];
  isGuestMatch?: boolean;
  hostName?: string;
}

export interface TeamContext {
  is2v2: boolean;
  partnerScore: number;
  opponent1Score: number;
  opponent2Score: number;
}

export interface ProfilesDoc {
  _id: string;
  _rev?: string;
  type?: 'profiles';
  profiles: Record<string, Profile>;
}

export interface GameState {
  players: Player[];
  activePlayer: number;
  startingPlayerOfLeg: number;
  config: GameConfig;
  currentRoundDarts: Dart[];
  currentMultiplier: number;
  isProcessing: boolean;
  history: GameState[];
}

export interface StatsModalData {
  isOpen: boolean;
  winnerIndex: number | null;
  players: Player[];
  matchData: MatchHistory | null;
  pendingProfiles?: Record<string, Profile>;
  pendingMatchData?: MatchHistory;
}
