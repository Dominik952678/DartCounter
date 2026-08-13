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
  color?: string;
  powerScoring?: { bestScore: number; matchesPlayed: number; wins: number; totalScore?: number };
  splitScore?: { bestScore: number; matchesPlayed: number; wins: number; totalScore?: number };
  checkoutTraining?: { bestCheckout: number; roundsCompleted: number; matchesPlayed: number; wins: number; totalAttempts?: number; totalDartsUsed?: number };
}

export interface GameConfig {
  startScore: number;
  outMode: 'SO' | 'DO' | 'MO';
  setsToWin: number;
  legsToWin: number;
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
  color?: string;
  bestMatchLeg?: number;
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
}

export interface MatchHistory {
  _id?: string;
  _rev?: string;
  type?: 'match';
  date: string;
  winner: string;
  players: PlayerStats[];
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
