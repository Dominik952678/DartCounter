import type { MatchHistory } from '../../types';

/**
 * Whether a match recorded per-leg averages worth drawing.
 *
 * Mini games have none at all, and a single leg is a point rather than a line.
 */
export const hasLegProgress = (match: MatchHistory): boolean =>
  (match.players ?? []).some(p => (p.legHistory?.length ?? 0) > 1);
