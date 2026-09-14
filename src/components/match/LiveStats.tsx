import React, { useState } from 'react';
import type { GameConfig, Player } from '../../types';
import { matchPlayerColor } from '../../utils/playerColors';
import { HeatBoard } from '../charts/HeatBoard';
import { Slider } from '../ui';

interface LiveStatsProps {
  players: Player[];
  activePlayer: number;
  config: GameConfig;
}

const average = (points: number, darts: number): string =>
  darts > 0 ? ((points / darts) * 3).toFixed(1) : '–';

/**
 * Die Live-Statistik des Matches (Entwurf C5 als Blatt, D1 daneben): Treffer
 * auf dem Board, die Averages, die Checkout-Quote und die Aufnahmen des
 * laufenden Legs.
 *
 * Sie folgt dem Werfer, bis jemand einen Spieler auswählt.
 */
export const LiveStats: React.FC<LiveStatsProps> = ({ players, activePlayer, config }) => {
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked !== null && picked < players.length ? picked : activePlayer;
  const player = players[shown];
  if (!player) return null;

  const is2v2 = Boolean(config.is2v2);
  const visits = player.legVisits ?? [];

  return (
    <div className="live-stats">
      {players.length > 1 && (
        <Slider
          name="liveStatsPlayer"
          variant="chips"
          value={shown}
          options={players.map((p, i) => ({
            value: i,
            ariaLabel: p.name,
            label: (
              <span className="live-stats-who">
                <span
                  className="player-dot"
                  style={{ '--player-color': matchPlayerColor(p, i, is2v2) } as React.CSSProperties}
                />
                {p.name}
              </span>
            )
          }))}
          onChange={setPicked}
          ariaLabel="Spieler"
        />
      )}

      <div className="live-stats-top">
        <HeatBoard hits={player.segmentHits ?? {}} className="live-stats-board" />
        <dl className="live-stats-kpis">
          <div><dt>Leg Ø</dt><dd>{average(player.legPts, player.legDarts)}</dd></div>
          <div><dt>First 9</dt><dd>{average(player.matchFirst9Pts, player.matchFirst9Darts)}</dd></div>
          <div><dt>Match Ø</dt><dd>{average(player.matchPts, player.matchDarts)}</dd></div>
          <div>
            <dt>Checkout</dt>
            <dd>
              {player.checkoutAttempts > 0 ? (
                <>
                  {`${player.checkoutSuccesses}/${player.checkoutAttempts}`}
                  <small>{` ${Math.round((player.checkoutSuccesses / player.checkoutAttempts) * 100)} %`}</small>
                </>
              ) : '–'}
            </dd>
          </div>
          <div><dt>100+</dt><dd>{player.hundredPlus + player.oneFortyPlus + player.oneEighty}</dd></div>
          <div><dt>180</dt><dd>{player.oneEighty}</dd></div>
        </dl>
      </div>

      <div className="live-stats-visits">
        <span className="label-caps">Aufnahmen</span>
        {visits.length === 0 ? (
          <p className="live-stats-empty">Noch keine Aufnahme in diesem Leg</p>
        ) : (
          <ol>
            {visits.map((visit, i) => (
              <li key={i} className={visit.bust ? 'is-bust' : undefined}>
                <span className="num">{i + 1}</span>
                <span>{visit.darts.join(' ')}</span>
                <span className="num">{visit.bust ? 'Bust' : visit.points}</span>
                <span className="num">{visit.remaining}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
