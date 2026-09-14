import React from 'react';
import { BOARD_RADII, segmentAngle } from '../../utils/dartboardGeometry';
import { BOARD_ORDER } from '../../utils/bot';
import { EXPORT_HEAT_COLORS, heatAreas, isShownBy, type HeatArea, type HeatFilter } from '../../utils/heatmap';

export interface HeatBoardProps {
  /** Treffer nach Segment, wie die Engine sie zählt: `S20`, `T20`, `D16`, `SB`, `DB`. */
  hits: Record<string, number>;
  filter?: HeatFilter;
  /** Ein Segment, das umrandet wird — das angetippte, z. B. „T20". */
  focus?: string;
  /** Zahlen am Rand. */
  numbers?: boolean;
  /** Macht die Flächen antippbar. */
  onSelect?: (area: HeatArea) => void;
  /** Farben als Attribute statt über das Stylesheet — für html2canvas. */
  exportColors?: boolean;
  className?: string;
}

/**
 * Die Treffer eines Spielers in Form des Boards: jede Fläche im Orange, so
 * kräftig wie ihr Anteil am meistgetroffenen sichtbaren Segment.
 */
export const HeatBoard: React.FC<HeatBoardProps> = ({
  hits,
  filter = 'all',
  focus,
  numbers = false,
  onSelect,
  exportColors = false,
  className
}) => {
  const areas = heatAreas(hits);
  const shown = isShownBy(filter);
  const max = Math.max(1, ...areas.filter(shown).map(area => area.value));
  // Ein Single sind zwei Flächen, innen und außen — beide werden umrandet.
  const focusKeys = focus ? [focus, focus.startsWith('S') && focus !== 'SB' ? `I${focus.slice(1)}` : ''] : [];

  const colored = (area: HeatArea, visible: boolean, hit: boolean): React.CSSProperties | undefined => {
    const opacity = hit ? 0.16 + (0.84 * area.value) / max : undefined;
    if (!exportColors) return opacity !== undefined ? { fillOpacity: opacity } : undefined;
    return {
      fill: hit ? EXPORT_HEAT_COLORS.hit : visible ? EXPORT_HEAT_COLORS.empty : 'transparent',
      fillOpacity: opacity,
      stroke: EXPORT_HEAT_COLORS.edge,
      strokeWidth: 1.4
    };
  };

  return (
    <svg
      className={['heat-board', className].filter(Boolean).join(' ')}
      viewBox={numbers ? '-200 -200 400 400' : '-172 -172 344 344'}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className="hb-back"
        r={BOARD_RADII.doubleOut + 2}
        style={exportColors ? { fill: EXPORT_HEAT_COLORS.back } : undefined}
      />
      {areas.map(area => {
        const visible = shown(area);
        const hit = visible && area.value > 0;
        return (
          <path
            key={area.key}
            d={area.d}
            fillRule="evenodd"
            className={['hb-seg', !visible ? 'is-off' : hit && 'is-hit', onSelect && visible && 'is-selectable'].filter(Boolean).join(' ')}
            style={colored(area, visible, hit)}
            onClick={onSelect && visible ? () => onSelect(area.key.startsWith('I') ? { ...area, key: `S${area.key.slice(1)}` } : area) : undefined}
          />
        );
      })}
      {areas
        .filter(area => focusKeys.includes(area.key))
        .map(area => <path key={`focus-${area.key}`} className="hb-focus" d={area.d} fillRule="evenodd" />)}
      {numbers && BOARD_ORDER.map(n => {
        const angle = (segmentAngle(n) * Math.PI) / 180;
        return (
          <text
            key={n}
            className="hb-number"
            x={186 * Math.cos(angle)}
            y={186 * Math.sin(angle)}
            style={exportColors ? { fill: EXPORT_HEAT_COLORS.number, fontSize: 14, textAnchor: 'middle', dominantBaseline: 'central' } : undefined}
          >
            {n}
          </text>
        );
      })}
    </svg>
  );
};
