import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { MatchHistory, Profile } from '../types';
import { getCachedGuestMatches, getMatches, reconstructProfileFromMatches } from '../db';
import { reportPersistenceError } from '../store/useNotificationStore';
import { playerColorByName, playerColorBySeat } from '../utils/playerColors';
import {
  TRAINING_LABELS,
  formatNumber,
  formatPercent,
  headToHeadRows,
  isTrainingMode,
  matchesFor,
  miniGameRows,
  radarAxes,
  recordsOfMatches,
  recordsOfProfile,
  segmentHitsFor,
  segmentShares,
  statsModeOptions,
  trainingSummary,
  x01Summary
} from '../utils/playerStats';
import type { StatsMode } from '../utils/playerStats';
import { CompareTable } from './charts/CompareTable';
import { Donut } from './charts/Donut';
import { LineChart } from './charts/LineChart';
import { Radar } from './charts/Radar';
import { DartboardHeatmap } from './DartboardHeatmap';
import { MatchHistoryList, MatchRow } from './stats/MatchHistoryList';
import { Button, DartboardArt, Icons, Slider } from './ui';

interface StatsPageProps {
  profiles: Record<string, Profile>;
  /** Das Fenster, das App geladen hat — für die Historie mit „Mehr laden". */
  matches: MatchHistory[];
  hasMoreMatches?: boolean;
  onLoadMoreMatches?: () => void;
}

type Section = 'overview' | 'hits' | 'records';

const SECTIONS: readonly { value: Section; label: string }[] = [
  { value: 'overview', label: 'Überblick' },
  { value: 'hits', label: 'Treffer' },
  { value: 'records', label: 'Rekorde' }
];

const EMPTY_PROFILE: Profile = { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 };

interface KpiProps {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  tone?: 'success';
}

const Kpi: React.FC<KpiProps> = ({ label, value, unit, sub, tone }) => (
  <div className="stats-kpi">
    <span className="label-caps">{label}</span>
    <span className="stats-kpi-value">
      <span className="num">{value}</span>
      {unit && value !== '–' && <span className="stats-kpi-unit">{unit}</span>}
    </span>
    <span className={`stats-kpi-sub ${tone ? `is-${tone}` : ''}`}>{sub}</span>
  </div>
);

const ChartCard: React.FC<{ title: string; meta?: string; children: React.ReactNode }> = ({ title, meta, children }) => (
  <section className="stats-card">
    <div className="stats-card-head">
      <h2 className="label-caps">{title}</h2>
      {meta && <span className="label-caps stats-card-meta">{meta}</span>}
    </div>
    {children}
  </section>
);

const Range: React.FC<{ values: number[]; digits?: number }> = ({ values, digits = 1 }) =>
  values.length > 1 ? (
    <div className="stats-range">
      <span>Tief {formatNumber(Math.min(...values), digits)}</span>
      <span>Hoch {formatNumber(Math.max(...values), digits)}</span>
    </div>
  ) : null;

/** L5 grün, wenn die letzten fünf besser sind als der Schnitt. */
const improving = (recent: number | null, overall: number | null) =>
  recent !== null && overall !== null && recent > overall ? 'success' as const : undefined;

/** Statistik (Entwurf G1–G6). Alles, was Statistikseite und Profil bis v1.17 zeigten. */
export const StatsPage: React.FC<StatsPageProps> = ({ profiles, matches, hasMoreMatches = false, onLoadMoreMatches }) => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuthStore();

  // Kennzahlen sind Lebenszeit-Werte und brauchen die ganze Historie, nicht das Fenster aus App.
  const [allMatches, setAllMatches] = useState<MatchHistory[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getMatches(user?.id)
      .then(result => { if (!cancelled) setAllMatches(result); })
      .catch(err => reportPersistenceError(err, 'Statistiken konnten nicht geladen werden'));
    return () => { cancelled = true; };
  }, [user?.id]);

  const [online, setOnline] = useState(false);
  const [mode, setMode] = useState<StatsMode>('x01');
  const [section, setSection] = useState<Section>('overview');
  const [rival, setRival] = useState('');

  const names = Object.keys(profiles);
  const ownName = user?.user_metadata?.username;
  const requested = params.get('player');
  const player = requested && profiles[requested]
    ? requested
    : ownName && profiles[ownName] ? ownName : names[0] ?? '';
  const profile = profiles[player];

  const linkedUserId = profile?.linkedUserId;
  const history = useMemo(() => {
    const base = allMatches && allMatches.length >= matches.length ? allMatches : matches;
    if (!linkedUserId) return base;
    const known = new Set(base.map(m => m._id || m.date));
    return [...base, ...getCachedGuestMatches(linkedUserId).filter(m => !known.has(m._id || m.date))];
  }, [allMatches, matches, linkedUserId]);

  const lifetime = useMemo(
    () => (player ? reconstructProfileFromMatches(player, profile, history) : EMPTY_PROFILE),
    [player, profile, history]
  );

  const filter = { online, mode };
  const filtered = useMemo(() => matchesFor(history, player, { online, mode }), [history, player, online, mode]);
  const modeOptions = useMemo(() => statsModeOptions(history), [history]);
  const training = isTrainingMode(mode);

  const setPlayer = (name: string) => {
    const next = new URLSearchParams(params);
    next.set('player', name);
    setParams(next, { replace: true });
  };

  if (params.get('view') === 'matches') {
    return (
      <MatchHistoryList
        matches={matches.length >= history.length ? matches : history}
        profiles={profiles}
        player={player}
        hasMoreMatches={hasMoreMatches && matches.length >= history.length}
        onLoadMoreMatches={onLoadMoreMatches}
        onBack={() => {
          const next = new URLSearchParams(params);
          next.delete('view');
          setParams(next);
        }}
      />
    );
  }

  const openHistory = () => {
    const next = new URLSearchParams(params);
    next.set('view', 'matches');
    setParams(next);
  };

  const rivals = names.filter(n => n !== player);
  const opponent = rival && profiles[rival] && rival !== player ? rival : rivals[0];
  const playerColor = profile?.color || playerColorByName(player);

  const renderEmpty = () => (
    <section className="stats-card stats-empty">
      <DartboardArt tone="quiet" className="stats-empty-board" />
      <h2 className="stats-empty-title">
        {online ? 'Noch keine Online-Matches' : training ? `Noch kein ${TRAINING_LABELS[mode]}` : 'Noch keine Matches'}
      </h2>
      <Button variant="primary" size="large" onClick={() => navigate(online ? '/online' : training ? `/training?mode=${mode === 'powerScoring' ? 'powerscoring' : mode === 'splitScore' ? 'splitscore' : 'checkout'}` : '/play')}>
        {online ? 'Online spielen' : training ? 'Training starten' : 'Spiel starten'}
      </Button>
    </section>
  );

  const renderTraining = () => {
    const t = trainingSummary(filtered, player);
    return (
      <>
        <div className="stats-kpis">
          <Kpi label="Bestpunktzahl" value={formatNumber(t.best, 0)} sub={TRAINING_LABELS[mode as keyof typeof TRAINING_LABELS]} />
          <Kpi label="Ø Punktzahl" value={formatNumber(t.average, 0)} sub="Ø pro Spiel" />
          <Kpi label="Spiele" value={String(t.matches)} sub={online ? 'online' : 'offline'} />
          <Kpi label="Siege" value={String(t.wins)} sub="mit anderen" />
        </div>
        {t.series.length > 1 && (
          <ChartCard title="Punkte-Verlauf" meta={`Letzte ${t.series.length} Spiele`}>
            <LineChart series={[{ values: t.series, color: 'var(--accent-primary)' }]} label="Punkte je Spiel" />
            <Range values={t.series} digits={0} />
          </ChartCard>
        )}
      </>
    );
  };

  const renderOverview = () => {
    const s = x01Summary(filtered, player, mode);
    return (
      <>
        <div className="stats-kpis">
          <Kpi label="Siegquote" value={formatNumber(s.winRate, 0)} unit="%" sub={`${s.wins} von ${s.matches} Spielen`} />
          <Kpi label="Average" value={formatNumber(s.average, 2)} sub={`L5 · ${formatNumber(s.last5.average, 2)}`} tone={improving(s.last5.average, s.average)} />
          <Kpi label="Erste 9" value={formatNumber(s.first9, 2)} sub={`L5 · ${formatNumber(s.last5.first9, 2)}`} tone={improving(s.last5.first9, s.first9)} />
          <Kpi label="Checkout" value={formatNumber(s.checkoutRate, 1)} unit="%" sub={`L5 · ${formatPercent(s.last5.checkoutRate, 1)}`} tone={improving(s.last5.checkoutRate, s.checkoutRate)} />
          <Kpi label="Darts pro Leg" value={formatNumber(s.dartsPerLeg, 1)} sub={`Ø für ${s.targetScore}`} />
          <Kpi label="Triple-Quote" value={formatNumber(s.tripleRate, 1)} unit="%" sub="Trefferrate" />
        </div>
        {s.averageSeries.length > 1 && (
          <ChartCard title="Average-Verlauf" meta={`Letzte ${s.averageSeries.length} Spiele`}>
            <LineChart series={[{ values: s.averageSeries, color: 'var(--accent-primary)' }]} label="Average je Spiel" />
            <Range values={s.averageSeries} />
          </ChartCard>
        )}
        {s.checkoutSeries.length > 1 && (
          <ChartCard title="Checkout-Verlauf" meta="in %">
            <LineChart series={[{ values: s.checkoutSeries, color: playerColorBySeat(0) }]} min={0} max={Math.max(60, ...s.checkoutSeries)} height={80} label="Checkout-Quote je Spiel" />
          </ChartCard>
        )}
      </>
    );
  };

  const renderHits = () => {
    const hits = segmentHitsFor(history, player, filter, lifetime);
    const shares = segmentShares(hits);
    return (
      <>
        {shares.length > 0 && (
          <div className="stats-pair">
            <ChartCard title="Segmente">
              <Donut parts={shares} />
            </ChartCard>
            <ChartCard title="Radar">
              <Radar axes={radarAxes(hits)} color={playerColor} />
            </ChartCard>
          </div>
        )}
        <section className="stats-card">
          <DartboardHeatmap customHits={hits} title="Treffer-Heatmap" />
        </section>
      </>
    );
  };

  const renderRecords = () => {
    const r = online ? recordsOfMatches(filtered, player) : recordsOfProfile(lifetime);
    const scope = online ? 'online' : 'gesamt';
    return (
      <>
        <div className="stats-records">
          {([
            ['Bestes Leg', formatNumber(r.bestLeg, 0), 'Darts'],
            ['Bestes Finish', formatNumber(r.highestCheckout, 0), 'Checkout'],
            ['Bester Wurf', formatNumber(r.highestThrow, 0), '3 Darts'],
            ['180er', String(r.oneEighty), scope],
            ['140+', String(r.oneFortyPlus), scope],
            ['100+', String(r.hundredPlus), scope]
          ] as const).map(([label, value, sub]) => (
            <div key={label} className="stats-record">
              <span className="label-caps">{label}</span>
              <span className="num">{value}</span>
              <span className="stats-kpi-sub">{sub}</span>
            </div>
          ))}
        </div>

        {opponent && (
          <section className="stats-card">
            <div className="stats-card-head">
              <h2 className="label-caps">Head-to-Head</h2>
              <label className="stats-inline-select">
                <span className="sr-only">Vergleichen mit</span>
                gegen
                <select value={opponent} onChange={e => setRival(e.target.value)}>
                  {rivals.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <Icons.IconChevronDown size={14} />
              </label>
            </div>
            <CompareTable
              players={[
                { name: player, color: playerColor },
                { name: opponent, color: profiles[opponent]?.color || playerColorByName(opponent) }
              ]}
              rows={headToHeadRows(lifetime, reconstructProfileFromMatches(opponent, profiles[opponent], history))}
            />
          </section>
        )}

        <section className="stats-card">
          <h2 className="label-caps">Mini-Games</h2>
          <ul className="stats-minigames">
            {miniGameRows(lifetime).map(row => (
              <li key={row.title}>
                <span className="stats-minigame-text">
                  <span className="stats-minigame-title">{row.title}</span>
                  <span className="stats-kpi-sub">{row.detail}</span>
                </span>
                <span className="num">{row.best}</span>
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  };

  const recent = history.slice(0, 3);

  return (
    <div className="screen active-screen stats-screen">
      <div className="stats-head">
        <h1 className="setup-title">Statistik</h1>
        <div className="stats-place">
          <Slider
            name="statsPlace"
            value={online ? 'online' : 'offline'}
            options={[{ value: 'offline', label: 'Offline' }, { value: 'online', label: 'Online' }]}
            onChange={value => setOnline(value === 'online')}
            ariaLabel="Offline oder online"
          />
        </div>
      </div>

      {!user && (
        <div className="stats-guest">
          <span>Gast-Modus · Matches liegen nur auf diesem Gerät</span>
          <button type="button" className="setup-link" onClick={() => navigate('/auth')}>Anmelden</button>
        </div>
      )}

      {names.length === 0 ? renderEmpty() : (
        <>
          <div className="stats-filters">
            <label className="stats-filter">
              <span className="label-caps">Spieler</span>
              <span className="stats-filter-value">
                <span className="player-dot" style={{ '--player-color': playerColor } as React.CSSProperties} aria-hidden="true" />
                <select value={player} onChange={e => setPlayer(e.target.value)} aria-label="Spieler">
                  {names.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
              <Icons.IconChevronDown size={16} />
            </label>
            <label className="stats-filter">
              <span className="label-caps">Modus</span>
              <span className="stats-filter-value">
                <select value={mode} onChange={e => setMode(e.target.value as StatsMode)} aria-label="Modus">
                  {modeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </span>
              <Icons.IconChevronDown size={16} />
            </label>
          </div>

          {!training && (
            <Slider name="statsSection" value={section} options={SECTIONS} onChange={setSection} ariaLabel="Bereich" />
          )}

          {filtered.length === 0 && (training || section === 'overview')
            ? renderEmpty()
            : training
              ? renderTraining()
              : section === 'overview' ? renderOverview() : section === 'hits' ? renderHits() : renderRecords()}
        </>
      )}

      {recent.length > 0 && (
        <section className="stats-card">
          <div className="stats-card-head">
            <h2 className="label-caps">Matches · {history.length}</h2>
            <button type="button" className="setup-link" onClick={openHistory}>Alle</button>
          </div>
          <ul className="match-list">
            {recent.map((m, i) => (
              <li key={m._id ?? `${m.date}-${i}`}>
                <MatchRow match={m} player={player} onOpen={openHistory} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
