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

/**
 * Der Schlüssel, unter dem ein Wurf gezählt wird: `T20`, `D16`, `S5`, `DB`,
 * `SB` oder `Miss`.
 *
 * Stand nur in der X01-Engine, während die Trainingsmodi gar keine
 * Segmenttreffer sammelten. Damit deren Heatmap dieselbe Form hat wie die aus
 * einem Match, liegt die Regel jetzt hier.
 */
export const segmentKeyFor = (dart: { base: number; mult: number }): string => {
  if (dart.base === 25) return dart.mult === 2 ? 'DB' : 'SB';
  if (dart.base === 0) return 'Miss';
  const prefix = dart.mult === 3 ? 'T' : dart.mult === 2 ? 'D' : 'S';
  return `${prefix}${dart.base}`;
};

/**
 * Zählt einen Wurf in einen Trefferdatensatz — als neues Objekt, damit sich
 * ein Snapshot im Undo-Verlauf nicht mitverändert.
 *
 * Geschrieben werden zwei Schlüssel je Wurf: der genaue und die nackte Zahl,
 * die Radar und Heatmap lesen. `countedSegmentHits` oben trennt sie wieder,
 * damit nichts doppelt gezählt wird.
 */
export const withDartRecorded = (
  hits: Record<string, number>,
  dart: { base: number; mult: number }
): Record<string, number> => {
  const next = { ...hits };
  const key = segmentKeyFor(dart);
  next[key] = (next[key] || 0) + 1;
  const baseKey = String(dart.base);
  next[baseKey] = (next[baseKey] || 0) + 1;
  return next;
};
