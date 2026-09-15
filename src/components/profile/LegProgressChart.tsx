import React from 'react';
import type { MatchHistory, Profile } from '../../types';
import { playerColorBySeat } from '../../utils/playerColors';
import { LineChart } from '../charts/LineChart';

interface LegProgressChartProps {
  match: MatchHistory;
  profiles: Record<string, Profile>;
}

/**
 * How each player's average moved from leg to leg within one match.
 *
 * `legHistory` has been recorded on every standard match, online and offline.
 * Mini games have none, so the caller checks `hasLegProgress` before offering this.
 */
export const LegProgressChart: React.FC<LegProgressChartProps> = ({ match, profiles }) => {
  const players = match.players.filter(p => p.legHistory && p.legHistory.length > 0);
  const series = players.map((p, i) => ({
    name: p.name,
    color: profiles[p.name]?.color || playerColorBySeat(match.players.indexOf(p) >= 0 ? match.players.indexOf(p) : i),
    values: p.legHistory!.map(value => {
      const n = parseFloat(String(value));
      return Number.isNaN(n) ? null : n;
    })
  }));
  const legs = Math.max(0, ...series.map(s => s.values.length));

  return (
    <div className="leg-chart">
      <LineChart series={series} height={110} label={`Average je Leg über ${legs} Legs`} />
      <div className="leg-chart-axis" aria-hidden="true">
        {Array.from({ length: legs }, (_, i) => <span key={i}>L{i + 1}</span>)}
      </div>
      <ul className="leg-chart-legend">
        {series.map(s => (
          <li key={s.name}>
            <i style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
