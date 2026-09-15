/**
 * Die Statistik eines Spielers, an einer Stelle gerechnet.
 *
 * Bis v1.17 standen dieselben Formeln zweimal da: in `StatsWidget` (Statistik)
 * und in `ProfileDashboard` (Profil), mit kleinen Abweichungen — das eine zählte
 * Siege per Namensvergleich und verfehlte damit jedes 2v2-Match. Hier rechnen
 * reine Funktionen, die Screens formatieren nur noch.
 */
import type { MatchHistory, PlayerStats, Profile } from '../types';
import type { CompareRow } from '../components/charts/CompareTable';
import { isMatchWinner } from '../db/matches';
import { countedSegmentHits, totalSegmentHits } from './segmentStats';

// ── Modus-Filter ─────────────────────────────────────────────────────────────

export type TrainingGameType = 'powerScoring' | 'splitScore' | 'checkoutTraining';

/** `x01` für alle X01-Matches, `x01:501:DO` für eine Variante, sonst ein Training. */
export type StatsMode = 'x01' | `x01:${number}:${string}` | TrainingGameType;

export const TRAINING_LABELS: Record<TrainingGameType, string> = {
  powerScoring: 'Power Scoring',
  splitScore: 'Split Score',
  checkoutTraining: 'Checkout-Training'
};

export const isTrainingMode = (mode: StatsMode): mode is TrainingGameType => mode in TRAINING_LABELS;

const isX01 = (m: MatchHistory) => !m.gameType || m.gameType === 'standard';

const variantOf = (m: MatchHistory): StatsMode | null =>
  isX01(m) && m.config ? `x01:${m.config.startScore}:${m.config.outMode}` : null;

/** Alle X01, jede gespielte Variante, dann die drei Trainings. */
export const statsModeOptions = (matches: MatchHistory[]): { value: StatsMode; label: string }[] => {
  const variants = new Map<StatsMode, string>();
  matches.forEach(m => {
    const variant = variantOf(m);
    if (variant && m.config) variants.set(variant, `${m.config.startScore} · ${m.config.outMode}`);
  });
  return [
    { value: 'x01', label: 'Alle X01' },
    ...[...variants].map(([value, label]) => ({ value, label })),
    ...(Object.keys(TRAINING_LABELS) as TrainingGameType[]).map(value => ({ value, label: TRAINING_LABELS[value] }))
  ];
};

const matchesMode = (m: MatchHistory, mode: StatsMode) => {
  if (mode === 'x01') return isX01(m);
  if (isTrainingMode(mode)) return m.gameType === mode;
  return variantOf(m) === mode;
};

/** Die Matches eines Spielers, getrennt nach offline (inklusive alter ohne Kennung) und online. */
export const matchesFor = (
  matches: MatchHistory[],
  name: string,
  { online, mode }: { online: boolean; mode: StatsMode }
): MatchHistory[] =>
  matches.filter(m =>
    m && Array.isArray(m.players) &&
    !!m.isOnline === online &&
    m.players.some(p => p?.name === name) &&
    matchesMode(m, mode)
  );

const statOf = (m: MatchHistory, name: string): PlayerStats | undefined => m.players.find(p => p?.name === name);

const targetScoreOf = (mode: StatsMode) => {
  const [, score] = mode.split(':');
  return score ? Number(score) : 501;
};

// ── X01 ──────────────────────────────────────────────────────────────────────

export interface FormValues {
  average: number | null;
  first9: number | null;
  checkoutRate: number | null;
}

export interface X01Summary extends FormValues {
  matches: number;
  wins: number;
  winRate: number | null;
  /** Dieselben Werte über die letzten fünf Matches. */
  last5: FormValues;
  targetScore: number;
  dartsPerLeg: number | null;
  tripleRate: number | null;
  /** Ältestes zuerst, höchstens 20. */
  averageSeries: number[];
  checkoutSeries: number[];
}

const ratio = (part: number, whole: number, factor: number) => (whole > 0 ? (part / whole) * factor : null);

const formOf = (matches: MatchHistory[], name: string): FormValues => {
  let darts = 0, pts = 0, f9Darts = 0, f9Pts = 0, attempts = 0, hits = 0;
  matches.forEach(m => {
    const s = statOf(m, name);
    if (!s) return;
    darts += s.matchDarts || 0;
    pts += s.matchPts || 0;
    f9Darts += s.first9Darts || 0;
    f9Pts += s.first9Pts || 0;
    attempts += s.checkoutAttempts || 0;
    hits += s.checkoutSuccesses || 0;
  });
  return {
    average: ratio(pts, darts, 3),
    first9: ratio(f9Pts, f9Darts, 3),
    checkoutRate: ratio(hits, attempts, 100)
  };
};

const matchAverage = (s: PlayerStats) =>
  s.matchDarts ? ((s.matchPts || 0) / s.matchDarts) * 3 : parseFloat(s.avg || '0') || 0;

/** `matches` kommt aus `matchesFor`, das Neueste zuerst. */
export const x01Summary = (matches: MatchHistory[], name: string, mode: StatsMode = 'x01'): X01Summary => {
  const form = formOf(matches, name);
  const wins = matches.filter(m => isMatchWinner(m, name)).length;
  let tripleDarts = 0, triples = 0;
  matches.forEach(m => {
    const s = statOf(m, name);
    if (s?.triplesHit !== undefined && s.matchDarts) {
      tripleDarts += s.matchDarts;
      triples += s.triplesHit;
    }
  });
  const recent = matches.slice(0, 20).reverse();
  const targetScore = targetScoreOf(mode);

  return {
    ...form,
    matches: matches.length,
    wins,
    winRate: ratio(wins, matches.length, 100),
    last5: formOf(matches.slice(0, 5), name),
    targetScore,
    dartsPerLeg: form.average ? (targetScore * 3) / form.average : null,
    tripleRate: ratio(triples, tripleDarts, 100),
    averageSeries: recent.flatMap(m => {
      const s = statOf(m, name);
      return s ? [Number(matchAverage(s).toFixed(2))] : [];
    }),
    checkoutSeries: recent.flatMap(m => {
      const s = statOf(m, name);
      return s?.checkoutAttempts ? [Number((((s.checkoutSuccesses || 0) / s.checkoutAttempts) * 100).toFixed(1))] : [];
    })
  };
};

// ── Training ─────────────────────────────────────────────────────────────────

export interface TrainingSummary {
  matches: number;
  wins: number;
  best: number | null;
  average: number | null;
  /** Punkte je Spiel, ältestes zuerst, höchstens 20. */
  series: number[];
}

export const trainingSummary = (matches: MatchHistory[], name: string): TrainingSummary => {
  const scores = matches.map(m => statOf(m, name)?.score || 0);
  const played = scores.filter(score => score > 0);
  return {
    matches: matches.length,
    wins: matches.filter(m => matches.length && m.players.length > 1 && isMatchWinner(m, name)).length,
    best: played.length ? Math.max(...played) : null,
    average: matches.length ? Math.round(scores.reduce((a, b) => a + b, 0) / matches.length) : null,
    series: scores.slice(0, 20).reverse()
  };
};

// ── Treffer ──────────────────────────────────────────────────────────────────

const addHits = (into: Record<string, number>, hits?: Record<string, number>) => {
  Object.entries(hits || {}).forEach(([key, value]) => {
    into[key] = (into[key] || 0) + (value || 0);
  });
  return into;
};

/**
 * Die Treffer, die zum Filter passen.
 *
 * Offline über alle X01-Matches zählt das Profil, weil es auch Treffer aus der
 * Zeit vor der Match-Historie trägt — abzüglich dessen, was online geworfen
 * wurde. Jeder engere Filter summiert die Matches selbst.
 */
export const segmentHitsFor = (
  matches: MatchHistory[],
  name: string,
  filter: { online: boolean; mode: StatsMode },
  profile?: Profile
): Record<string, number> => {
  if (!filter.online && filter.mode === 'x01' && profile?.segmentHits && Object.keys(profile.segmentHits).length) {
    const online: Record<string, number> = {};
    matches.filter(m => m?.isOnline).forEach(m => addHits(online, statOf(m, name)?.segmentHits));
    return Object.fromEntries(
      Object.entries(profile.segmentHits).map(([key, value]) => [key, Math.max(0, (value || 0) - (online[key] || 0))])
    );
  }
  const hits: Record<string, number> = {};
  matchesFor(matches, name, filter).forEach(m => addHits(hits, statOf(m, name)?.segmentHits));
  return hits;
};

export interface Share {
  name: string;
  value: number;
}

/** Segmente mit mindestens 5 % einzeln, der Rest zusammen; größte zuerst. */
export const segmentShares = (hits: Record<string, number>): Share[] => {
  const total = totalSegmentHits(hits);
  if (total === 0) return [];
  const shares: Share[] = [];
  let rest = 0;
  Object.entries(countedSegmentHits(hits)).forEach(([key, value]) => {
    if (!value) return;
    if (value / total >= 0.05) shares.push({ name: key === '0' ? 'Miss' : key === '25' ? 'Bull' : key, value });
    else rest += value;
  });
  shares.sort((a, b) => b.value - a.value);
  if (rest > 0) shares.push({ name: 'Rest', value: rest });
  return shares;
};

/** Die Scoring-Felder für das Radar. */
export const radarAxes = (hits: Record<string, number>): { label: string; value: number }[] =>
  (['20', '19', '18', '17', '16', '15', '25'] as const).map(key => ({
    label: key === '25' ? 'Bull' : key,
    value: hits[key] || 0
  }));

// ── Rekorde ──────────────────────────────────────────────────────────────────

export interface Records {
  bestLeg: number | null;
  highestCheckout: number | null;
  highestThrow: number | null;
  oneEighty: number;
  oneFortyPlus: number;
  hundredPlus: number;
  sixtyPlus: number;
}

const positive = (value?: number) => (value && value > 0 ? value : null);

export const recordsOfProfile = (profile: Profile): Records => ({
  bestLeg: positive(profile.bestLegDarts),
  highestCheckout: positive(profile.highestCheckout),
  highestThrow: positive(profile.highestThrow),
  oneEighty: profile.oneEighty || 0,
  oneFortyPlus: profile.oneFortyPlus || 0,
  hundredPlus: profile.hundredPlus || 0,
  sixtyPlus: profile.sixtyPlus || 0
});

/** Für Online: das Profil trennt nicht nach Ort, die Matches schon. Den besten Wurf kennen sie nicht. */
export const recordsOfMatches = (matches: MatchHistory[], name: string): Records =>
  matches.reduce<Records>((acc, m) => {
    const s = statOf(m, name);
    if (!s) return acc;
    const leg = positive(s.bestMatchLeg);
    return {
      bestLeg: leg && (acc.bestLeg === null || leg < acc.bestLeg) ? leg : acc.bestLeg,
      highestCheckout: Math.max(acc.highestCheckout || 0, s.highestCheckout || 0) || null,
      highestThrow: null,
      oneEighty: acc.oneEighty + (s.oneEighty || 0),
      oneFortyPlus: acc.oneFortyPlus + (s.oneFortyPlus || 0),
      hundredPlus: acc.hundredPlus + (s.hundredPlus || 0),
      sixtyPlus: acc.sixtyPlus + (s.sixtyPlus || 0)
    };
  }, { bestLeg: null, highestCheckout: null, highestThrow: null, oneEighty: 0, oneFortyPlus: 0, hundredPlus: 0, sixtyPlus: 0 });

// ── Formatieren ──────────────────────────────────────────────────────────────

export const formatNumber = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || !Number.isFinite(value) ? '–' : value.toFixed(digits);

export const formatPercent = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined ? '–' : `${value.toFixed(digits)} %`;

/** Die elf Werte aus dem Direktvergleich bis v1.17, der bessere eindeutig hervorgehoben. */
export const headToHeadRows = (a: Profile, b: Profile): CompareRow[] => {
  const both = (fn: (p: Profile) => string) => [fn(a), fn(b)];
  return [
    { label: 'Siegquote', values: both(p => formatPercent(ratio(p.wins, p.matches, 100))), better: 'high' },
    { label: 'Average', values: both(p => formatNumber(ratio(p.pointsScored, p.dartsThrown, 3), 2)), better: 'high' },
    { label: 'Erste 9', values: both(p => formatNumber(ratio(p.first9Pts || 0, p.first9Darts || 0, 3), 2)), better: 'high' },
    { label: 'Checkout-Quote', values: both(p => formatPercent(ratio(p.checkoutSuccesses || 0, p.checkoutAttempts || 0, 100), 1)), better: 'high' },
    { label: 'Bestes Leg', values: both(p => formatNumber(positive(p.bestLegDarts), 0)), better: 'low' },
    { label: 'Höchstes Finish', values: both(p => formatNumber(positive(p.highestCheckout), 0)), better: 'high' },
    { label: 'Bester Wurf', values: both(p => formatNumber(positive(p.highestThrow), 0)), better: 'high' },
    { label: '180', values: both(p => String(p.oneEighty || 0)), better: 'high' },
    { label: '140+', values: both(p => String(p.oneFortyPlus || 0)), better: 'high' },
    { label: '100+', values: both(p => String(p.hundredPlus || 0)), better: 'high' },
    { label: '60+', values: both(p => String(p.sixtyPlus || 0)), better: 'high' }
  ];
};

export interface MiniGameRow {
  title: string;
  best: string;
  detail: string;
}

/** Die drei Trainings aus Sicht des Profils: Bestwert und eine Zeile Kontext. */
export const miniGameRows = (profile: Profile): MiniGameRow[] => {
  const scoring = (stats?: { bestScore: number; matchesPlayed: number; wins: number; totalScore?: number }) => ({
    best: formatNumber(positive(stats?.bestScore), 0),
    detail: [
      stats?.totalScore && stats.matchesPlayed ? `Ø ${Math.round(stats.totalScore / stats.matchesPlayed)}` : null,
      `${stats?.wins || 0} Siege`
    ].filter(Boolean).join(' · ')
  });
  const checkout = profile.checkoutTraining;
  return [
    { title: TRAINING_LABELS.powerScoring, ...scoring(profile.powerScoring) },
    { title: TRAINING_LABELS.splitScore, ...scoring(profile.splitScore) },
    {
      title: TRAINING_LABELS.checkoutTraining,
      best: formatNumber(positive(checkout?.bestCheckout), 0),
      detail: checkout?.totalAttempts
        ? `${Math.round(((checkout.roundsCompleted || 0) / checkout.totalAttempts) * 100)} % Quote · bestes Finish`
        : 'bestes Finish'
    }
  ];
};
