import React from 'react';

export interface CompareRow {
  label: string;
  values: (string | number)[];
  /** Welche Richtung gewinnt; ohne Angabe wird nichts hervorgehoben. */
  better?: 'high' | 'low';
}

interface CompareTableProps {
  players: { name: string; color: string }[];
  rows: CompareRow[];
}

/** Index des eindeutig besten Werts einer Zeile, sonst -1 — bei Gleichstand gewinnt niemand. */
const bestIndex = (row: CompareRow): number => {
  if (!row.better) return -1;
  const numbers = row.values.map(v => (typeof v === 'number' ? v : parseFloat(v)));
  const valid = numbers.filter(n => Number.isFinite(n));
  if (valid.length < 2) return -1;
  const best = row.better === 'high' ? Math.max(...valid) : Math.min(...valid);
  const winners = numbers.flatMap((n, i) => (n === best ? [i] : []));
  return winners.length === 1 ? winners[0] : -1;
};

/**
 * Spieler nebeneinander, eine Kennzahl je Zeile; der eindeutig beste Wert steht
 * in Orange (Entwurf D3).
 */
export const CompareTable: React.FC<CompareTableProps> = ({ players, rows }) => (
  <div className="compare-scroll">
    <table className="compare-table">
      <thead>
        <tr>
          <th scope="col"><span className="sr-only">Kennzahl</span></th>
          {players.map(player => (
            <th key={player.name} scope="col">
              <span className="compare-player">
                <span
                  className="player-dot"
                  style={{ '--player-color': player.color } as React.CSSProperties}
                  aria-hidden="true"
                />
                {player.name}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const best = bestIndex(row);
          return (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.values.map((value, i) => (
                <td key={i} className={i === best ? 'is-best' : undefined}>{value}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
