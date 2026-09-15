import React, { useEffect, useMemo, useState } from 'react';
import type { MatchHistory, PlayerStats, Profile } from '../../types';
import { isMatchWinner } from '../../db/matches';
import { useNotificationStore } from '../../store/useNotificationStore';
import { playerColorBySeat } from '../../utils/playerColors';
import { TRAINING_LABELS } from '../../utils/playerStats';
import type { TrainingGameType } from '../../utils/playerStats';
import { MatchImageExport } from '../MatchImageExport';
import { LegProgressChart } from '../profile/LegProgressChart';
import { hasLegProgress } from '../profile/legProgress';
import { Button, Icons, Slider } from '../ui';

type HistoryFilter = 'all' | 'offline' | 'online' | 'training';

const FILTERS: readonly { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'training', label: 'Training' }
];

const isTraining = (m: MatchHistory) => !!m.gameType && m.gameType !== 'standard';

const passes = (m: MatchHistory, filter: HistoryFilter) => {
  if (filter === 'training') return isTraining(m);
  if (filter === 'online') return !!m.isOnline;
  if (filter === 'offline') return !m.isOnline && !isTraining(m);
  return true;
};

const whenOf = (m: MatchHistory) => (m.createdAt ? new Date(m.createdAt) : null);

const monthOf = (m: MatchHistory) =>
  whenOf(m)?.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) ?? 'Älter';

const dayOf = (m: MatchHistory) =>
  whenOf(m)?.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) ?? m.date;

const teamOf = (m: MatchHistory, p: PlayerStats) => p.team ?? (m.players.indexOf(p) % 2 === 0 ? 1 : 2);

/** Wer auf der anderen Seite stand — im 2v2 ohne den eigenen Partner. */
const opponentsOf = (m: MatchHistory, me: PlayerStats) =>
  m.players.filter(p => p !== me && (!m.is2v2 || teamOf(m, p) !== teamOf(m, me)));

/** „Sieg gegen Jonas" aus Sicht des gewählten Spielers, sonst „Anna gewinnt". */
const matchTitle = (m: MatchHistory, player: string) => {
  if (isTraining(m)) return TRAINING_LABELS[m.gameType as TrainingGameType];
  const me = m.players.find(p => p.name === player);
  if (!me) return `${m.winner} gewinnt`;
  const against = opponentsOf(m, me).map(p => p.name).join(' & ');
  const won = isMatchWinner(m, player);
  if (!against) return won ? 'Sieg' : 'Niederlage';
  return `${won ? 'Sieg' : 'Niederlage'} gegen ${against}`;
};

const metaOf = (m: MatchHistory, player: string) => {
  const place = m.isOnline ? 'online' : 'offline';
  if (isTraining(m)) return [dayOf(m), `${m.players.length} Spieler`].join(' · ');
  const me = m.players.find(p => p.name === player) ?? m.players[0];
  const others = me ? opponentsOf(m, me) : [];
  const bySets = (m.config?.setsToWin ?? 1) > 1;
  const mine = bySets ? me?.sets : me?.legs;
  const theirs = Math.max(0, ...others.map(p => (bySets ? p.sets : p.legs)));
  return [
    `${mine ?? 0}–${theirs} ${bySets ? 'Sätze' : 'Legs'}`,
    m.config ? `${m.config.startScore} ${m.config.outMode}` : null,
    dayOf(m),
    place
  ].filter(Boolean).join(' · ');
};

const valueOf = (m: MatchHistory, player: string) => {
  const me = m.players.find(p => p.name === player) ?? m.players[0];
  if (isTraining(m)) return String(me?.score ?? '–');
  return me?.avg ?? '–';
};

interface MatchRowProps {
  match: MatchHistory;
  player: string;
  onOpen?: () => void;
  open?: boolean;
}

/** Eine Zeile der Historie; auf der Statistikseite ohne Aufklappen. */
export const MatchRow: React.FC<MatchRowProps> = ({ match, player, onOpen, open }) => {
  const lost = !isTraining(match) && match.players.some(p => p.name === player) && !isMatchWinner(match, player);
  return (
    <button type="button" className={`match-row ${lost ? 'is-lost' : ''}`} onClick={onOpen} aria-expanded={open}>
      <span className="match-row-text">
        <span className="match-row-title">{matchTitle(match, player)}</span>
        <span className="match-row-meta">{metaOf(match, player)}</span>
      </span>
      <span className="match-row-value">
        <span className="num">{valueOf(match, player)}</span>
        {!isTraining(match) && <span className="label-caps">Ø</span>}
      </span>
      <Icons.IconChevronRight size={16} className={open ? 'is-open' : undefined} />
    </button>
  );
};

interface MatchHistoryListProps {
  matches: MatchHistory[];
  profiles: Record<string, Profile>;
  player: string;
  hasMoreMatches: boolean;
  onLoadMoreMatches?: () => void;
  onBack: () => void;
}

/** Alle Matches nach Monat, aufklappbar mit Spielern, Leg-Verlauf und Bild (Entwurf G6). */
export const MatchHistoryList: React.FC<MatchHistoryListProps> = ({
  matches,
  profiles,
  player,
  hasMoreMatches,
  onLoadMoreMatches,
  onBack
}) => {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [openMatch, setOpenMatch] = useState<MatchHistory | null>(null);
  const [exporting, setExporting] = useState<MatchHistory | null>(null);
  const notify = useNotificationStore(state => state.notify);

  const groups = useMemo(() => {
    const byMonth = new Map<string, MatchHistory[]>();
    matches.filter(m => passes(m, filter)).forEach(m => {
      const month = monthOf(m);
      byMonth.set(month, [...(byMonth.get(month) ?? []), m]);
    });
    return [...byMonth];
  }, [matches, filter]);

  // html2canvas kommt erst beim ersten Teilen, und nur das geteilte Match bekommt einen Export-Knoten.
  useEffect(() => {
    if (!exporting) return;
    const label = exporting.date.replace(/[^a-zA-Z0-9]/g, '-');
    let cancelled = false;
    (async () => {
      try {
        const { exportElementAsImage } = await import('../../utils/exportImage');
        await exportElementAsImage('history-export-node', `Dartcounter-Match-${label}.png`);
      } catch (err) {
        console.error('Bild-Export fehlgeschlagen', err);
        notify('error', 'Export fehlgeschlagen', 'Das Bild konnte nicht erstellt werden.');
      } finally {
        if (!cancelled) setExporting(null);
      }
    })();
    return () => { cancelled = true; };
  }, [exporting, notify]);

  return (
    <div className="screen active-screen stats-screen">
      <button type="button" className="stats-back" onClick={onBack}>
        <Icons.IconArrowLeft size={16} />
        <span className="label-caps">Statistik</span>
      </button>
      <h1 className="setup-title">Matches</h1>

      <Slider name="historyFilter" variant="chips" value={filter} options={FILTERS} onChange={setFilter} ariaLabel="Welche Matches" />

      {groups.length === 0 && <p className="online-hint">Noch keine Matches gespeichert.</p>}

      {groups.map(([month, items]) => (
        <section key={month} className="setup-section">
          <h2 className="setup-section-title">{month}</h2>
          <ul className="stats-card match-list">
            {items.map((m, i) => {
              const open = openMatch === m;
              return (
                <li key={m._id ?? `${m.date}-${i}`}>
                  <MatchRow match={m} player={player} open={open} onOpen={() => setOpenMatch(open ? null : m)} />
                  {open && (
                    <div className="match-detail">
                      <table className="match-detail-table">
                        <thead>
                          <tr>
                            <th scope="col"><span className="sr-only">Spieler</span></th>
                            <th scope="col">{isTraining(m) ? 'Punkte' : 'S : L'}</th>
                            <th scope="col">Ø</th>
                            {!isTraining(m) && <th scope="col">Erste 9</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {m.players.map((p, j) => (
                            <tr key={p.name}>
                              <th scope="row">
                                <span className="player-dot" style={{ '--player-color': profiles[p.name]?.color || playerColorBySeat(j) } as React.CSSProperties} aria-hidden="true" />
                                {p.name}
                              </th>
                              <td>{isTraining(m) ? (p.score ?? '–') : `${p.sets} : ${p.legs}`}</td>
                              <td>{p.avg}</td>
                              {!isTraining(m) && <td>{p.first9}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {hasLegProgress(m) && (
                        <>
                          <span className="label-caps match-detail-label">Leg-Verlauf</span>
                          <LegProgressChart match={m} profiles={profiles} />
                        </>
                      )}

                      <Button variant="secondary" onClick={() => setExporting(m)} disabled={exporting !== null}>
                        {exporting === m ? 'Wird erstellt …' : <><Icons.IconCamera size={17} /> Als Bild teilen</>}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {hasMoreMatches && onLoadMoreMatches && (
        <Button variant="secondary" onClick={onLoadMoreMatches}>Mehr laden</Button>
      )}

      {exporting && (
        <div className="offscreen-export" aria-hidden="true">
          <MatchImageExport matchData={exporting} profiles={profiles} exportId="history-export-node" />
        </div>
      )}
    </div>
  );
};
