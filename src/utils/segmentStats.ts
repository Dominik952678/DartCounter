/**
 * Reading the `segmentHits` record without double-counting.
 *
 * The engine records two keys for every dart: a detailed one (`T20`, `D16`,
 * `DB`, `Miss`) and the bare number (`20`, `16`, `25`) that the radar chart
 * reads. Summing the record as it stands therefore counts each dart twice —
 * three treble twenties read as six hits, and the distribution showed "T20 50 %"
 * next to "20 50 %".
 *
 * Older profiles hold only the numeric keys, so the detailed ones are used when
 * they are present and the whole record when they are not.
 */

const isDetailedKey = (key: string): boolean =>
  key === 'DB' || key === 'SB' || key === 'Miss' ||
  key.startsWith('T') || key.startsWith('D') || key.startsWith('S');

/** True when this record uses the per-segment keys rather than bare numbers. */
export const hasDetailedSegmentKeys = (hits: Record<string, number>): boolean =>
  Object.keys(hits).some(isDetailedKey);

/** The subset of `hits` that may be summed or charted without double-counting. */
export const countedSegmentHits = (hits: Record<string, number>): Record<string, number> => {
  if (!hasDetailedSegmentKeys(hits)) return hits;
  const counted: Record<string, number> = {};
  Object.entries(hits).forEach(([key, value]) => {
    if (isDetailedKey(key)) counted[key] = value;
  });
  return counted;
};

/** How many darts the record actually represents. */
export const totalSegmentHits = (hits: Record<string, number>): number =>
  Object.values(countedSegmentHits(hits)).reduce((sum, value) => sum + (value || 0), 0);
