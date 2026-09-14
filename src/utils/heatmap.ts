import { BOARD_RADII, segmentPath } from './dartboardGeometry';
import { BOARD_ORDER } from './bot';

export type HeatFilter = 'all' | 'triples' | 'doubles';
export type HeatRing = 'S' | 'T' | 'D' | 'B';

/** One area of the board with the hits recorded on it. */
export interface HeatArea {
  /** `S20` outer single, `I20` inner single, `T20`, `D20`, `SB`, `DB`. */
  key: string;
  d: string;
  value: number;
  ring: HeatRing;
  /** „Triple 20", „Single Bull" — for the detail line. */
  label: string;
}

const circle = (r: number) => `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z`;

/**
 * Every area of the board with its hits.
 *
 * The engine also counts each dart under its bare number, for the radar chart.
 * Those count only where no detailed keys exist — data from before there were
 * any — or every dart would appear twice.
 */
export const heatAreas = (hits: Record<string, number>): HeatArea[] => {
  const detailed = Object.keys(hits).some(key => /^[STD]/.test(key));
  const single = (n: number) => (detailed ? hits[`S${n}`] : hits[String(n)]) ?? 0;

  const areas: HeatArea[] = [];
  BOARD_ORDER.forEach(n => {
    areas.push({ key: `I${n}`, d: segmentPath(n, 'innerSingle'), value: single(n), ring: 'S', label: `Single ${n}` });
    areas.push({ key: `S${n}`, d: segmentPath(n, 'outerSingle'), value: single(n), ring: 'S', label: `Single ${n}` });
    areas.push({ key: `T${n}`, d: segmentPath(n, 'treble'), value: hits[`T${n}`] ?? 0, ring: 'T', label: `Triple ${n}` });
    areas.push({ key: `D${n}`, d: segmentPath(n, 'double'), value: hits[`D${n}`] ?? 0, ring: 'D', label: `Doppel ${n}` });
  });
  areas.push({
    key: 'SB',
    d: `${circle(BOARD_RADII.bullOut)} ${circle(BOARD_RADII.bullIn)}`,
    value: (detailed ? hits.SB : hits['25']) ?? 0,
    ring: 'B',
    label: 'Single Bull'
  });
  areas.push({
    key: 'DB',
    d: circle(BOARD_RADII.bullIn),
    value: (detailed ? hits.DB : hits['50']) ?? 0,
    ring: 'D',
    label: 'Bullseye'
  });
  return areas;
};

/** Which areas a filter keeps: triples only the treble ring, doubles the double ring and both bulls. */
export const isShownBy = (filter: HeatFilter) => (area: HeatArea): boolean =>
  filter === 'all' || (filter === 'triples' ? area.ring === 'T' : area.ring === 'D' || area.ring === 'B');

/**
 * Die Farben als Literale — nur für die Bild-Exporte, die html2canvas abfilmt:
 * in ein SVG, das es als Bild rendert, reicht kein Stylesheet hinein.
 */
export const EXPORT_HEAT_COLORS = {
  back: '#141D19',
  empty: 'rgba(237, 230, 211, 0.07)',
  hit: '#FF6A3D',
  edge: '#0F1613',
  number: 'rgba(237, 230, 211, 0.55)'
} as const;
