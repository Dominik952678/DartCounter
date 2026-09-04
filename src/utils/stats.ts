/**
 * The statistics formulas, in one place.
 *
 * These lived as private copies inside `utils/__tests__/stats.test.ts`, where
 * the tests exercised the copies and nothing else: the file read as thorough
 * coverage of the app's statistics while covering none of it. The display
 * precision differs per screen, so it is a parameter rather than four
 * near-identical helpers.
 */

/** Points per three darts. `digits` sets the precision the caller renders at. */
export const threeDartAverage = (points: number, darts: number, digits = 2): string => {
  if (darts <= 0) return (0).toFixed(digits);
  return ((points / darts) * 3).toFixed(digits);
};

/**
 * How many darts a leg takes at this average. Derived rather than measured, so
 * it is only meaningful for a history of legs that share `targetScore`.
 */
export const dartsPerLeg = (targetScore: number, overallAvg: number): string => {
  if (overallAvg <= 0) return '–';
  return ((targetScore * 3) / overallAvg).toFixed(1);
};

/** Share of darts at a double that finished the leg, as a percentage. */
export const checkoutQuote = (successes: number, attempts: number, digits = 1): string => {
  if (attempts <= 0) return '–';
  return ((successes / attempts) * 100).toFixed(digits) + '%';
};

/** Share of matches won, rounded to whole percent. */
export const winRate = (wins: number, matches: number): string => {
  if (matches <= 0) return '0%';
  return Math.round((wins / matches) * 100) + '%';
};
