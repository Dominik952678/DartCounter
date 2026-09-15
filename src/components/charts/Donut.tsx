import React from 'react';
import { chartColor } from '../../utils/chartColors';
import type { Share } from '../../utils/playerStats';

interface DonutProps {
  parts: Share[];
  size?: number;
  stroke?: number;
}

/** Die Segment-Verteilung als Ring, in der Mitte die Zahl der Treffer (Entwurf G2). */
export const Donut: React.FC<DonutProps> = ({ parts, size = 124, stroke = 18 }) => {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arcs = parts.map((part, i) => {
    const before = parts.slice(0, i).reduce((sum, p) => sum + p.value, 0);
    return {
      part,
      length: total > 0 ? (part.value / total) * circumference : 0,
      offset: total > 0 ? (before / total) * circumference : 0
    };
  });

  return (
    <div className="donut">
      <div className="donut-ring" style={{ width: size, height: size }}>
        <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} aria-hidden="true">
          {arcs.map(({ part, length, offset }, i) => (
            <circle
              key={part.name}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, length - 3)} ${circumference}`}
              strokeDashoffset={-offset}
              transform="rotate(-90)"
              style={{ stroke: chartColor(i, part.name) }}
            />
          ))}
        </svg>
        <span className="donut-center">
          <span className="num">{total}</span>
          <span className="label-caps">Treffer</span>
        </span>
      </div>
      <ul className="donut-legend">
        {parts.map((part, i) => (
          <li key={part.name}>
            <i style={{ background: chartColor(i, part.name) }} aria-hidden="true" />
            {part.name}
            <span>{total > 0 ? Math.round((part.value / total) * 100) : 0} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
