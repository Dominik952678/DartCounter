import React, { useState } from 'react';
import type { Profile } from '../types';

interface DartboardHeatmapProps {
  profile?: Profile;
  customHits?: Record<string, number>;
  title?: string;
}

// Standard PDC sector order clockwise from the top (12 o'clock)
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const resolveSegmentHits = (segmentHits: Record<string, number>, key: string): number => {
  if (segmentHits[key] !== undefined) return segmentHits[key];
  // Fallback for legacy data with only numeric sector keys (e.g. "20")
  if (key === 'DB' && segmentHits['50'] !== undefined) return segmentHits['50'];
  if (key === 'SB' && segmentHits['25'] !== undefined) return segmentHits['25'];
  if (key.startsWith('S')) {
    const num = key.slice(1);
    if (segmentHits[num] !== undefined && segmentHits[`T${num}`] === undefined && segmentHits[`D${num}`] === undefined) {
      return segmentHits[num];
    }
  }
  return 0;
};

const EMPTY_HITS: Record<string, number> = {};

export const DartboardHeatmap: React.FC<DartboardHeatmapProps> = ({ profile, customHits, title = "2D Treffer-Heatmap" }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'triples' | 'doubles'>('all');
  const [hoveredSegment, setHoveredSegment] = useState<{ label: string; count: number; percent: number } | null>(null);

  const segmentHits = customHits || profile?.segmentHits || EMPTY_HITS;

  const keys = Object.keys(segmentHits);
  const hasDetailedKeys = keys.some(k => k.startsWith('T') || k.startsWith('D') || k.startsWith('S') || k === 'DB' || k === 'SB');
  const totalRecordedHits = hasDetailedKeys
    ? keys
        .filter(k => k.startsWith('T') || k.startsWith('D') || k.startsWith('S') || k === 'DB' || k === 'SB' || k === 'Miss')
        .reduce((sum, k) => sum + (segmentHits[k] || 0), 0)
    : Object.values(segmentHits).reduce((sum, count) => sum + (count || 0), 0);

  let maxHits = 1;
  SECTORS.forEach(s => {
    if (filterMode === 'all' || filterMode === 'triples') {
      maxHits = Math.max(maxHits, resolveSegmentHits(segmentHits, `T${s}`));
    }
    if (filterMode === 'all' || filterMode === 'doubles') {
      maxHits = Math.max(maxHits, resolveSegmentHits(segmentHits, `D${s}`));
    }
    if (filterMode === 'all') {
      maxHits = Math.max(maxHits, resolveSegmentHits(segmentHits, `S${s}`));
    }
  });
  if (filterMode !== 'triples') {
    maxHits = Math.max(maxHits, resolveSegmentHits(segmentHits, 'DB'), resolveSegmentHits(segmentHits, 'SB'));
  }

  const getSegmentCount = (key: string) => resolveSegmentHits(segmentHits, key);

  // Center and geometry
  const cx = 200;
  const cy = 200;
  const rDBull = 10;
  const rSBull = 24;
  const rTripleInner = 92;
  const rTripleOuter = 107;
  const rDoubleInner = 152;
  const rDoubleOuter = 168;

  // Polar to Cartesian conversion
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Helper to generate SVG annular slice path
  const describeArc = (x: number, y: number, innerR: number, outerR: number, startAngle: number, endAngle: number) => {
    const startOuter = polarToCartesian(x, y, outerR, endAngle);
    const endOuter = polarToCartesian(x, y, outerR, startAngle);
    const startInner = polarToCartesian(x, y, innerR, startAngle);
    const endInner = polarToCartesian(x, y, innerR, endAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', startOuter.x, startOuter.y,
      'A', outerR, outerR, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      'L', startInner.x, startInner.y,
      'A', innerR, innerR, 0, largeArcFlag, 1, endInner.x, endInner.y,
      'Z'
    ].join(' ');
  };

  const getHeatColor = (hits: number) => {
    if (hits <= 0) return 'rgba(255, 255, 255, 0.04)';
    const intensity = Math.min(1, hits / maxHits);

    if (intensity < 0.25) {
      return `rgba(10, 132, 255, ${0.35 + intensity * 1.5})`; // Blue
    } else if (intensity < 0.6) {
      return `rgba(255, 214, 10, ${0.5 + intensity * 0.7})`; // Yellow
    } else {
      return `rgba(255, 69, 58, ${0.7 + intensity * 0.3})`; // Hot Red
    }
  };

  const handleHover = (label: string, count: number) => {
    const percent = totalRecordedHits > 0 ? (count / totalRecordedHits) * 100 : 0;
    setHoveredSegment({ label, count, percent });
  };

  const sectorAngle = 360 / 20;

  return (
    <div className="dash-section" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎯 {title}
        </h3>

        {/* Filter Modes */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.06)', padding: '3px', borderRadius: '10px' }}>
          <button 
            className={`btn-ghost ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75em',
              fontWeight: 700,
              borderRadius: '8px',
              minHeight: '28px',
              background: filterMode === 'all' ? 'var(--blue)' : 'transparent',
              color: filterMode === 'all' ? '#fff' : 'var(--text-dim)'
            }}
          >
            Alle
          </button>
          <button 
            className={`btn-ghost ${filterMode === 'triples' ? 'active' : ''}`}
            onClick={() => setFilterMode('triples')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75em',
              fontWeight: 700,
              borderRadius: '8px',
              minHeight: '28px',
              background: filterMode === 'triples' ? 'var(--blue)' : 'transparent',
              color: filterMode === 'triples' ? '#fff' : 'var(--text-dim)'
            }}
          >
            Triples
          </button>
          <button 
            className={`btn-ghost ${filterMode === 'doubles' ? 'active' : ''}`}
            onClick={() => setFilterMode('doubles')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75em',
              fontWeight: 700,
              borderRadius: '8px',
              minHeight: '28px',
              background: filterMode === 'doubles' ? 'var(--blue)' : 'transparent',
              color: filterMode === 'doubles' ? '#fff' : 'var(--text-dim)'
            }}
          >
            Doppel
          </button>
        </div>
      </div>

      {totalRecordedHits === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎯</div>
          <p style={{ margin: 0, fontSize: '0.9em' }}>Noch keine Trefferdaten erfasst.</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.78em', opacity: 0.7 }}>Spiele Matches, um deine persönliche Treffer-Heatmap zu füllen.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Tooltip Display */}
          <div style={{
            minHeight: '36px',
            marginBottom: '10px',
            textAlign: 'center',
            background: hoveredSegment ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            padding: '4px 14px',
            borderRadius: '16px',
            transition: 'all 0.15s ease',
            border: hoveredSegment ? '1px solid var(--card-border)' : '1px solid transparent'
          }}>
            {hoveredSegment ? (
              <span style={{ fontSize: '0.85em', fontWeight: 800 }}>
                {hoveredSegment.label}: <span style={{ color: 'var(--blue)' }}>{hoveredSegment.count} Treffer</span> ({hoveredSegment.percent.toFixed(1)}%)
              </span>
            ) : (
              <span style={{ fontSize: '0.78em', color: 'var(--text-dim)' }}>
                Tippe oder fahre über ein Segment für Details
              </span>
            )}
          </div>

          <div style={{ width: '100%', maxWidth: '340px', aspectRatio: '1/1', position: 'relative' }}>
            <svg 
              viewBox="0 0 400 400" 
              style={{ 
                width: '100%', 
                height: '100%', 
                filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
                transform: 'rotate(0deg)'
              }}
            >
              {/* Outer Board Ring */}
              <circle cx={cx} cy={cy} r={192} fill="#121214" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />

              {/* Board Segments */}
              {SECTORS.map((sector, index) => {
                const startAngle = index * sectorAngle - sectorAngle / 2;
                const endAngle = index * sectorAngle + sectorAngle / 2;

                const doubleKey = `D${sector}`;
                const tripleKey = `T${sector}`;
                const singleKey = `S${sector}`;

                const dHits = getSegmentCount(doubleKey);
                const tHits = getSegmentCount(tripleKey);
                const sHits = getSegmentCount(singleKey);

                const showDoubles = filterMode === 'all' || filterMode === 'doubles';
                const showTriples = filterMode === 'all' || filterMode === 'triples';
                const showSingles = filterMode === 'all';

                // Number label coordinates
                const labelPos = polarToCartesian(cx, cy, 180, index * sectorAngle);

                return (
                  <g key={sector}>
                    {/* Double Ring */}
                    <path
                      d={describeArc(cx, cy, rDoubleInner, rDoubleOuter, startAngle, endAngle)}
                      fill={showDoubles ? getHeatColor(dHits) : 'rgba(255,255,255,0.02)'}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.8"
                      onMouseEnter={() => handleHover(`Doppel ${sector}`, dHits)}
                      onTouchStart={() => handleHover(`Doppel ${sector}`, dHits)}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                    />

                    {/* Outer Single */}
                    <path
                      d={describeArc(cx, cy, rTripleOuter, rDoubleInner, startAngle, endAngle)}
                      fill={showSingles ? getHeatColor(sHits) : 'rgba(255,255,255,0.02)'}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="0.5"
                      onMouseEnter={() => handleHover(`Single ${sector}`, sHits)}
                      onTouchStart={() => handleHover(`Single ${sector}`, sHits)}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                    />

                    {/* Triple Ring */}
                    <path
                      d={describeArc(cx, cy, rTripleInner, rTripleOuter, startAngle, endAngle)}
                      fill={showTriples ? getHeatColor(tHits) : 'rgba(255,255,255,0.02)'}
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="0.8"
                      onMouseEnter={() => handleHover(`Triple ${sector}`, tHits)}
                      onTouchStart={() => handleHover(`Triple ${sector}`, tHits)}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                    />

                    {/* Inner Single */}
                    <path
                      d={describeArc(cx, cy, rSBull, rTripleInner, startAngle, endAngle)}
                      fill={showSingles ? getHeatColor(sHits) : 'rgba(255,255,255,0.02)'}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="0.5"
                      onMouseEnter={() => handleHover(`Single ${sector}`, sHits)}
                      onTouchStart={() => handleHover(`Single ${sector}`, sHits)}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                    />

                    {/* Sector Number Text */}
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      fill="#e5e5ea"
                      fontSize="12"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      pointerEvents="none"
                    >
                      {sector}
                    </text>
                  </g>
                );
              })}

              {/* Single Bull (25) */}
              <circle
                cx={cx}
                cy={cy}
                r={rSBull}
                fill={filterMode !== 'triples' ? getHeatColor(getSegmentCount('SB') + getSegmentCount('25')) : 'rgba(255,255,255,0.02)'}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                onMouseEnter={() => handleHover('Single Bull (25)', getSegmentCount('SB') + getSegmentCount('25'))}
                onTouchStart={() => handleHover('Single Bull (25)', getSegmentCount('SB') + getSegmentCount('25'))}
                style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
              />

              {/* Double Bull (50) */}
              <circle
                cx={cx}
                cy={cy}
                r={rDBull}
                fill={filterMode !== 'triples' ? getHeatColor(getSegmentCount('DB') + getSegmentCount('50')) : 'rgba(255,255,255,0.02)'}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.2"
                onMouseEnter={() => handleHover('Bullseye (50)', getSegmentCount('DB') + getSegmentCount('50'))}
                onTouchStart={() => handleHover('Bullseye (50)', getSegmentCount('DB') + getSegmentCount('50'))}
                style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
              />
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '16px', fontSize: '0.72em', color: 'var(--text-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }} />
              Keine
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--blue)' }} />
              Niedrig
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--orange)' }} />
              Mittel
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)' }} />
              Hotspot
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
