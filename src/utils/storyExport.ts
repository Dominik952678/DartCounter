import type { MatchHistory, PlayerStats } from '../types';

export type MiniGameType = 'powerScoring' | 'splitScore' | 'checkoutTraining';

export interface StoryEntry {
  label: string;
  value: string;
  state: 'hit' | 'miss' | 'open';
}

export interface StoryStat {
  label: string;
  value: string;
}

export interface StoryData {
  mode: string;
  headline: string;
  headlineLabel: string;
  /** Beliebig viele; das Bild setzt sie zu dritt je Reihe. */
  stats: StoryStat[];
  entriesLabel: string;
  entries: StoryEntry[];
  footnote: string;
}

/**
 * Die Kennzahlen, die auch live auf dem Board stehen.
 *
 * Board und Bild lesen dieselbe Funktion, damit die Zahl auf dem Bild nicht
 * anders gerechnet wird als die, auf die man beim Spielen geschaut hat.
 */
export const liveStats = (player: PlayerStats, gameType: MiniGameType): StoryStat[] =>
  buildStoryData(player, gameType).stats;

/** Ob aus diesem Ergebnis überhaupt ein Bild gebaut werden kann. */
export const hasStoryData = (player: PlayerStats, gameType: MatchHistory['gameType']): boolean => {
  if (gameType === 'powerScoring') return !!player.roundScores?.length;
  if (gameType === 'splitScore') return !!player.splitLog?.length;
  if (gameType === 'checkoutTraining') return !!player.checkoutLog?.length;
  return false;
};

const percent = (part: number, whole: number): string =>
  whole > 0 ? `${Math.round((part / whole) * 100)} %` : '–';

const tripleQuote = (player: PlayerStats): string =>
  percent(player.triplesHit ?? 0, player.dartsThrown ?? 0);

/**
 * Übersetzt ein gespeichertes Trainingsergebnis in das, was das Story-Bild
 * zeigt.
 *
 * Die drei Modi zählen Verschiedenes, aber das Bild kennt nur Beschriftung,
 * Wert und Zustand — die Umrechnung steht deshalb hier und nicht im Bild, und
 * lässt sich ohne Rendern prüfen.
 */
export const buildStoryData = (
  player: PlayerStats,
  gameType: MiniGameType
): StoryData => {
  const darts = player.dartsThrown ?? 0;
  const total = player.score ?? 0;

  if (gameType === 'powerScoring') {
    const rounds = player.roundScores ?? [];
    const thrown = rounds.filter((r): r is number => r !== null);
    return {
      mode: '🔥 POWER SCORING',
      headline: String(total),
      headlineLabel: 'PUNKTE',
      stats: [
        { label: 'Average', value: darts > 0 ? ((total / darts) * 3).toFixed(1) : '–' },
        { label: 'Ø Runde', value: thrown.length > 0 ? (total / thrown.length).toFixed(1) : '–' },
        { label: 'Beste Runde', value: thrown.length > 0 ? String(Math.max(...thrown)) : '–' },
        { label: 'Triple-Quote', value: tripleQuote(player) },
        { label: '100+', value: String(thrown.filter(r => r >= 100).length) },
        { label: 'Darts', value: String(darts) }
      ],
      entriesLabel: 'Runden',
      entries: rounds.map((value, i) => ({
        label: String(i + 1),
        value: value === null ? '–' : String(value),
        state: value === null ? 'open' : 'hit'
      })),
      footnote: `${darts} Darts · ${thrown.length} Runden`
    };
  }

  if (gameType === 'splitScore') {
    const log = player.splitLog ?? [];
    const hit = log.filter(r => r.gained !== null);
    const splits = log.length - hit.length;
    // Jeder Dart im Ziel zählt einfach, unabhängig von Single, Double oder
    // Triple — bei neun Zielen à drei Darts also aus 27.
    const dartsOnTarget = log.reduce((sum, r) => sum + (r.hits ?? 0), 0);
    const bestRound = hit.length > 0 ? Math.max(...hit.map(r => r.gained ?? 0)) : 0;
    return {
      mode: '➗ SPLIT SCORE',
      headline: String(total),
      headlineLabel: 'PUNKTE',
      stats: [
        { label: 'Trefferquote', value: percent(dartsOnTarget, darts) },
        { label: 'Treffer', value: `${dartsOnTarget}/${darts}` },
        { label: 'Splits', value: String(splits) },
        { label: 'Ziele', value: `${hit.length}/${log.length}` },
        { label: 'Beste Runde', value: bestRound > 0 ? `+${bestRound}` : '–' },
        { label: 'Triple-Quote', value: tripleQuote(player) }
      ],
      entriesLabel: 'Ziele',
      entries: log.map(r => ({
        label: r.target,
        value: r.gained === null ? 'SPLIT' : `+${r.gained}`,
        state: r.gained === null ? 'miss' : 'hit'
      })),
      footnote: `${darts} Darts · ${splits} ${splits === 1 ? 'Split' : 'Splits'}`
    };
  }

  const log = player.checkoutLog ?? [];
  const finished = log.filter(r => r.darts !== null);
  const dartsOnFinished = finished.reduce((sum, r) => sum + (r.darts ?? 0), 0);
  return {
    mode: '✅ CHECKOUT TRAINING',
    headline: `${finished.length}/${log.length}`,
    headlineLabel: 'FINISHES',
    stats: [
      { label: 'Checkquote', value: percent(finished.length, log.length) },
      {
        label: 'Ø Darts',
        value: finished.length > 0 ? (dartsOnFinished / finished.length).toFixed(1) : '–'
      },
      { label: 'Höchstes Finish', value: finished.length > 0 ? String(Math.max(...finished.map(r => r.target))) : '–' },
      { label: 'Bestes Finish', value: finished.length > 0 ? `${Math.min(...finished.map(r => r.darts ?? 99))} Darts` : '–' },
      { label: 'Triple-Quote', value: tripleQuote(player) },
      { label: 'Darts', value: String(darts) }
    ],
    entriesLabel: 'Ziele',
    entries: log.map(r => ({
      label: String(r.target),
      value: r.darts === null ? '✗' : `${r.darts}D`,
      state: r.darts === null ? 'miss' : 'hit'
    })),
    footnote: `${darts} Darts · ${finished.length} gefinisht`
  };
};
