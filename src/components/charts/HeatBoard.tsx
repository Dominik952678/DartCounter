import React from 'react';
import { BOARD_RADII, segmentAngle, segmentPath } from '../../utils/dartboardGeometry';
import { BOARD_ORDER } from '../../utils/bot';

export type HeatFilter = 'all' | 'triples' | 'doubles';

export interface HeatBoardProps {
  /** Treffer nach Segment, wie die Engine sie zählt: `S20`, `T20`, `D16`, `SB`, `DB`. */
  hits: Record<string, number>;
  filter?: HeatFilter;
  /** Ein Segment, das umrandet wird — das angetippte, z. B. „T20". */
  focus?: string;
  /** Zahlen am Rand. */
  numbers?: boolean;
  className?: string;
}

type Ring = 'S' | 'T' | 'D' | 'B';

interface Area {
  key: string;
  d: string;
  value: number;
  ring: Ring;
}

const circle = (r: number) => `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z`;

/**
 * Die Flächen des Boards mit ihren Treffern. Die Engine zählt jeden Dart
 * zusätzlich unter seiner nackten Zahl; die zählt nur, wenn es keine genauen
 * Schlüssel gibt — bei Daten aus der Zeit, bevor es sie gab.
 */
const areasFor = (hits: Record<string, number>): Area[] => {
  const detailed = Object.keys(hits).some(key => /^[STD]/.test(key));
  const single = (n: number) => (detailed ? hits[`S${n}`] : hits[String(n)]) ?? 0;

  const areas: Area[] = [];
  BOARD_ORDER.forEach(n => {
    areas.push({ key: `I${n}`, d: segmentPath(n, 'innerSingle'), value: single(n), ring: 'S' });
    areas.push({ key: `S${n}`, d: segmentPath(n, 'outerSingle'), value: single(n), ring: 'S' });
    areas.push({ key: `T${n}`, d: segmentPath(n, 'treble'), value: hits[`T${n}`] ?? 0, ring: 'T' });
    areas.push({ key: `D${n}`, d: segmentPath(n, 'double'), value: hits[`D${n}`] ?? 0, ring: 'D' });
  });
  areas.push({
    key: 'SB',
    d: `${circle(BOARD_RADII.bullOut)} ${circle(BOARD_RADII.bullIn)}`,
    value: (detailed ? hits.SB : hits['25']) ?? 0,
    ring: 'B'
  });
  areas.push({
    key: 'DB',
    d: circle(BOARD_RADII.bullIn),
    value: (detailed ? hits.DB : hits['50']) ?? 0,
    ring: 'D'
  });
  return areas;
};

const shownBy = (filter: HeatFilter) => (area: Area): boolean =>
  filter === 'all' || (filter === 'triples' ? area.ring === 'T' : area.ring === 'D' || area.ring === 'B');

/**
 * Die Treffer eines Spielers in Form des Boards: jede Fläche im Orange, so
 * kräftig wie ihr Anteil am meistgetroffenen sichtbaren Segment.
 */
export const HeatBoard: React.FC<HeatBoardProps> = ({ hits, filter = 'all', focus, numbers = false, className }) => {
  const areas = areasFor(hits);
  const shown = shownBy(filter);
  const max = Math.max(1, ...areas.filter(shown).map(area => area.value));
  const focusArea = focus ? areas.find(area => area.key === focus) : undefined;

  return (
    <svg
      className={['heat-board', className].filter(Boolean).join(' ')}
      viewBox={numbers ? '-200 -200 400 400' : '-172 -172 344 344'}
      aria-hidden="true"
      focusable="false"
    >
      <circle className="hb-back" r={BOARD_RADII.doubleOut + 2} />
      {areas.map(area => {
        const visible = shown(area);
        const hit = visible && area.value > 0;
        return (
          <path
            key={area.key}
            d={area.d}
            fillRule="evenodd"
            className={`hb-seg ${!visible ? 'is-off' : hit ? 'is-hit' : ''}`}
            style={hit ? { fillOpacity: 0.16 + (0.84 * area.value) / max } : undefined}
          />
        );
      })}
      {focusArea && <path className="hb-focus" d={focusArea.d} fillRule="evenodd" />}
      {numbers && BOARD_ORDER.map(n => {
        const angle = (segmentAngle(n) * Math.PI) / 180;
        return (
          <text key={n} className="hb-number" x={186 * Math.cos(angle)} y={186 * Math.sin(angle)}>
            {n}
          </text>
        );
      })}
    </svg>
  );
};
