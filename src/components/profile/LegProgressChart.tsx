import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MatchHistory, Profile } from '../../types';

interface LegProgressChartProps {
  match: MatchHistory;
  profiles: Record<string, Profile>;
}

/** The colours a player falls back to, in the order they were seated. */
const FALLBACK_COLORS = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)'];

/**
 * How each player's average moved from leg to leg within one match.
 *
 * `legHistory` has been recorded on every standard match, online and offline,
 * and was only ever shown as a row of text badges. Mini games have none, so the
 * caller checks `hasLegProgress` before offering this.
 */
export const LegProgressChart: React.FC<LegProgressChartProps> = ({ match, profiles }) => {
  const players = match.players.filter(p => p.legHistory && p.legHistory.length > 0);
  const legCount = Math.max(...players.map(p => p.legHistory!.length));

  const data = Array.from({ length: legCount }, (_, i) => {
    const row: Record<string, number | string> = { leg: `L${i + 1}` };
    players.forEach(p => {
      const value = parseFloat(String(p.legHistory![i] ?? ''));
      if (!Number.isNaN(value)) row[p.name] = value;
    });
    return row;
  });

  return (
    <div className="chart-container" style={{ marginTop: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis dataKey="leg" stroke="var(--text-dim)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-dim)" tick={{ fontSize: 11 }} domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px'
            }}
            labelStyle={{ color: 'var(--text-dim)' }}
            formatter={(value: unknown, name: unknown) => [`Ø ${value}`, name as string]}
          />
          <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
          {players.map((p, i) => {
            const color = profiles[p.name]?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
            return (
              <Line
                key={p.name}
                type="monotone"
                dataKey={p.name}
                name={p.name}
                stroke={color}
                strokeWidth={2.5}
                dot={{ fill: color, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: color }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
