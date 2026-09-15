import React from 'react';

export interface LineSeries {
  values: (number | null)[];
  color: string;
  name?: string;
}

interface LineChartProps {
  series: LineSeries[];
  min?: number;
  max?: number;
  height?: number;
  /** Beschreibt, was die Linie zeigt — das Diagramm selbst ist für Screenreader stumm. */
  label: string;
}

const W = 320;

/**
 * Ein Verlauf nach Entwurf G1: Linie, Fläche darunter, der letzte Punkt groß.
 *
 * Das SVG streckt sich über die Kartenbreite (`preserveAspectRatio="none"`),
 * deshalb liegen die Punkte als HTML darüber — ein SVG-Kreis würde mitgestreckt.
 */
export const LineChart: React.FC<LineChartProps> = ({ series, min, max, height = 90, label }) => {
  const all = series.flatMap(s => s.values.filter((v): v is number => v !== null));
  if (all.length === 0) return null;

  const lo = min ?? Math.floor(Math.min(...all)) - 2;
  const hi = max ?? Math.ceil(Math.max(...all)) + 2;
  const span = hi - lo || 1;
  const length = Math.max(...series.map(s => s.values.length));
  const x = (i: number) => (length > 1 ? (i / (length - 1)) * W : W / 2);
  const y = (v: number) => height - ((v - lo) / span) * height;

  const points = (s: LineSeries) =>
    s.values.flatMap((v, i) => (v === null ? [] : [{ i, v, px: x(i), py: y(v) }]));

  return (
    <div className="line-chart" style={{ height }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} className="line-chart-grid" x1="0" x2={W} y1={height * f} y2={height * f} vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s, si) => {
          const pts = points(s);
          if (pts.length === 0) return null;
          const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.px} ${p.py}`).join(' ');
          return (
            <g key={s.name ?? si}>
              {series.length === 1 && pts.length > 1 && (
                <path
                  d={`${path} L${pts[pts.length - 1].px} ${height} L${pts[0].px} ${height} Z`}
                  style={{ fill: s.color }}
                  className="line-chart-area"
                />
              )}
              <path d={path} style={{ stroke: s.color }} className="line-chart-line" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
      {series.map((s, si) => {
        const pts = points(s);
        return pts.map((p, i) => (
          <span
            key={`${si}-${p.i}`}
            className={`line-chart-dot ${i === pts.length - 1 ? 'is-last' : ''}`}
            style={{ left: `${(p.px / W) * 100}%`, top: `${(p.py / height) * 100}%`, background: s.color }}
          />
        ));
      })}
    </div>
  );
};
