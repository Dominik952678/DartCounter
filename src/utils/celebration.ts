import type { Celebration, CelebrationType, Dart, GameConfig, Player } from '../types';

/** A visit of at least this many points, without a checkout, gets the big animation. */
export const HIGH_SCORE_MIN = 170;

/** A checkout of at least this many points gets the big animation; below it is a check. */
export const HIGH_FINISH_MIN = 100;

/**
 * How long the stats sheet waits after the match-winning visit is booked.
 * The round itself still ends after 800 ms; only the sheet holds back, so the
 * "Match" moment is not covered the instant it starts.
 */
export const MATCH_STATS_DELAY_MS = 2000;

const TYPES: readonly CelebrationType[] = ['bust', 'highScore', 'highFinish', 'check'];

export const celebrationTypeFor = (visit: { bust: boolean; isWin: boolean; total: number }): CelebrationType | null => {
  if (visit.bust) return 'bust';
  if (visit.isWin) return visit.total >= HIGH_FINISH_MIN ? 'highFinish' : 'check';
  return visit.total >= HIGH_SCORE_MIN ? 'highScore' : null;
};

const teamOf = (players: Player[], index: number): number =>
  players[index]?.team || (index % 2 === 0 ? 1 : 2);

/** Whether winning the current leg also wins the match. */
export const isMatchWinningLeg = (player: Player, config: GameConfig): boolean =>
  player.legs + 1 >= config.legsToWin && player.sets + 1 >= config.setsToWin;

/** The final scoreline as it will read once the winning leg is booked. */
export const matchScoreFor = (players: Player[], winnerIndex: number, config: GameConfig): [number, number] => {
  const bySets = config.setsToWin > 1;
  const count = (p: Player) => (bySets ? p.sets : p.legs);
  const is2v2 = !!config.is2v2 && players.length === 4;
  const winnerTeam = teamOf(players, winnerIndex);
  const opponents = players.filter((_, i) => (is2v2 ? teamOf(players, i) !== winnerTeam : i !== winnerIndex));
  return [count(players[winnerIndex]) + 1, Math.max(0, ...opponents.map(count))];
};

export const celebrationHeadline = (celebration: Celebration): string => {
  switch (celebration.type) {
    case 'highScore': return celebration.total === 180 ? 'Maximum' : 'High Score';
    case 'highFinish': return 'High Finish';
    case 'check': return celebration.matchWin ? 'Match' : 'Check';
    default: return '';
  }
};

export const dartLabel = (dart: Dart | undefined): string => {
  if (!dart) return '';
  return dart.base === 0 ? 'Miss' : dart.label;
};

/** Classes for a player card while a celebration runs. */
export const cardCelebrationClass = (
  celebration: Celebration | null | undefined,
  index: number,
  players: Player[],
  is2v2: boolean
): string => {
  if (!celebration) return '';
  if (celebration.playerIndex !== index) {
    const onWinningSide = is2v2 && teamOf(players, index) === teamOf(players, celebration.playerIndex);
    return celebration.matchWin && !onWinningSide ? 'cel-card-lose' : '';
  }
  switch (celebration.type) {
    case 'bust': return 'shake-bust';
    case 'highScore': return 'cel-card-hit';
    case 'highFinish': return celebration.matchWin ? 'cel-card-hit is-success cel-card-match is-late' : 'cel-card-hit is-success';
    case 'check': return celebration.matchWin ? 'cel-card-match' : 'cel-card-check';
    default: return '';
  }
};

/** The leg counter lights up when the leg lands; after the big animation for a high finish. */
export const legPopClass = (celebration: Celebration | null | undefined, index: number): string => {
  if (!celebration || celebration.playerIndex !== index) return '';
  if (celebration.type === 'check') return 'cel-leg-pop';
  if (celebration.type === 'highFinish') return 'cel-leg-pop is-late';
  return '';
};

/**
 * Guards what an online host sends. An older host still broadcasts
 * `{ type: '180', playerIndex }`, which this screen can no longer draw.
 */
export const isCelebration = (value: unknown): value is Celebration => {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<Celebration>;
  return TYPES.includes(c.type as CelebrationType)
    && typeof c.id === 'number'
    && typeof c.playerIndex === 'number'
    && typeof c.total === 'number'
    && Array.isArray(c.darts);
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
