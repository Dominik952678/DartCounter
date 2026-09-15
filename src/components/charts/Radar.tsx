import React from 'react';

interface RadarProps {
  axes: { label: string; value: number }[];
  color?: string;
  size?: number;
}

/** Wie sich die Treffer auf die Scoring-Felder verteilen (Entwurf G2). */
export const Radar: React.FC<RadarProps> = ({ axes, color = 'var(--accent-primary)', size = 160 }) => {
  const peak = Math.max(5, ...axes.map(a => a.value));
  const r0 = size / 2 - 22;
  const point = (i: number, f: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    return [Math.cos(angle) * r0 * f, Math.sin(angle) * r0 * f] as const;
  };
  const polygon = (f: (i: number) => number) => axes.map((_, i) => point(i, f(i)).join(',')).join(' ');

  return (
    <svg
      className="radar"
      viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
      role="img"
      aria-label={axes.map(a => `${a.label}: ${a.value}`).join(', ')}
    >
      {[1, 0.66, 0.33].map(f => <polygon key={f} className="radar-ring" points={polygon(() => f)} />)}
      {axes.map((a, i) => {
        const [x, y] = point(i, 1);
        return <line key={a.label} className="radar-spoke" x1="0" y1="0" x2={x} y2={y} />;
      })}
      <polygon className="radar-shape" points={polygon(i => axes[i].value / peak)} style={{ fill: color, stroke: color }} />
      {axes.map((a, i) => {
        const [x, y] = point(i, 1.24);
        return <text key={a.label} className="radar-label" x={x} y={y} textAnchor="middle" dominantBaseline="central">{a.label}</text>;
      })}
    </svg>
  );
};
