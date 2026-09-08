import type { MatchHistory, PlayerStats } from '../types';

export type MiniGameType = 'powerScoring' | 'splitScore' | 'checkoutTraining';

export interface StoryEntry {
  label: string;
  value: string;
  state: 'hit' | 'miss' | 'open';
}

export interface StoryData {
  mode: string;
  headline: string;
  headlineLabel: string;
  stats: [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }];
  entriesLabel: string;
  entries: StoryEntry[];
  footnote: string;
}

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
        { label: 'Triple-Quote', value: tripleQuote(player) },
        { label: 'Beste Runde', value: thrown.length > 0 ? String(Math.max(...thrown)) : '–' }
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
    return {
      mode: '➗ SPLIT SCORE',
      headline: String(total),
      headlineLabel: 'PUNKTE',
      stats: [
        { label: 'Treffer', value: `${hit.length}/${log.length}` },
        { label: 'Splits', value: String(splits) },
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
      { label: 'Trefferquote', value: percent(finished.length, log.length) },
      {
        label: 'Ø Darts',
        value: finished.length > 0 ? (dartsOnFinished / finished.length).toFixed(1) : '–'
      },
      { label: 'Höchstes Finish', value: finished.length > 0 ? String(Math.max(...finished.map(r => r.target))) : '–' }
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
