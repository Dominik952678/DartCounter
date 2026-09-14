import React, { useState } from 'react';
import type { Profile } from '../types';
import { totalSegmentHits } from '../utils/segmentStats';
import { heatAreas, type HeatArea, type HeatFilter } from '../utils/heatmap';
import { HeatBoard } from './charts/HeatBoard';
import { DartboardArt, Slider } from './ui';

interface DartboardHeatmapProps {
  profile?: Profile;
  customHits?: Record<string, number>;
  title?: string;
  /**
   * Nur Board und Legende, ohne Filter und ohne Antippen — für den Bild-Export,
   * wo nichts bedienbar ist. Die Farben stehen dann als Attribute am SVG.
   */
  staticView?: boolean;
}

const EMPTY_HITS: Record<string, number> = {};

const FILTERS: readonly { value: HeatFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'triples', label: 'Triples' },
  { value: 'doubles', label: 'Doppel' }
];

const LEGEND: readonly [string, string][] = [
  ['Keine', 'is-none'],
  ['Niedrig', 'is-low'],
  ['Mittel', 'is-mid'],
  ['Hotspot', 'is-high']
];

/**
 * Die Treffer-Heatmap: das Board im Orange, ein Filter auf Triples oder Doppel,
 * und beim Antippen einer Fläche die Zahl dazu.
 */
export const DartboardHeatmap: React.FC<DartboardHeatmapProps> = ({
  profile,
  customHits,
  title = 'Treffer-Heatmap',
  staticView = false
}) => {
  const [filter, setFilter] = useState<HeatFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const segmentHits = customHits || profile?.segmentHits || EMPTY_HITS;
  const total = totalSegmentHits(segmentHits);
  const selected: HeatArea | undefined = selectedKey
    ? heatAreas(segmentHits).find(area => area.key === selectedKey)
    : undefined;

  return (
    <div className={`heatmap-card ${staticView ? 'is-static' : ''}`}>
      <div className="heatmap-head">
        <span className="label-caps">{title}</span>
        {total > 0 && <span className="heatmap-total">{`${total} Darts`}</span>}
      </div>

      {total === 0 ? (
        <div className="heatmap-empty">
          <DartboardArt tone="quiet" className="heatmap-empty-board" />
          <p>Noch keine Trefferdaten erfasst.</p>
        </div>
      ) : (
        <>
          {!staticView && (
            <Slider
              name="heatmapFilter"
              variant="chips"
              value={filter}
              options={FILTERS}
              onChange={value => {
                setFilter(value);
                setSelectedKey(null);
              }}
              ariaLabel="Trefferfilter"
            />
          )}

          {!staticView && selected && (
            <p className="heatmap-detail" role="status">
              {`${selected.label} · ${selected.value} Treffer · ${((selected.value / total) * 100).toFixed(1)} %`}
            </p>
          )}

          <HeatBoard
            hits={segmentHits}
            filter={filter}
            focus={selected?.key}
            numbers
            onSelect={staticView ? undefined : area => setSelectedKey(area.key)}
            exportColors={staticView}
            className="heatmap-board"
          />

          <div className="heatmap-legend" aria-hidden="true">
            {LEGEND.map(([label, tone]) => (
              <span key={label}><i className={tone} />{label}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
