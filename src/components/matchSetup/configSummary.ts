import type { GameConfig, Profile } from '../../types';
import type { MatchSetupConfig, OutMode } from './useMatchSetupConfig';
import { buildDefaultLineup } from './useLineup';

/**
 * Wie eine Match-Konfiguration in Worten heißt.
 *
 * Steht in einem eigenen Modul, weil sie jetzt an drei Stellen gebraucht wird,
 * die nichts voneinander wissen: die Pillen-Reihe der Weiter-Karte auf dem
 * Start-Screen, die Zusammenfassungszeile über dem Start-Button im Setup und
 * die Karte des unterbrochenen Matches. Vorher schrieb jede Stelle ihre eigene
 * Fassung — „501 DO" gegen „501 Double Out" gegen „Bis 3 Legs" —, und dieselbe
 * Einstellung las sich je nach Screen anders.
 */

const OUT_MODE_NAMES: Record<OutMode, string> = {
  SO: 'Single Out',
  DO: 'Double Out',
  MO: 'Master Out'
};

export const outModeLabel = (mode: OutMode | string): string =>
  OUT_MODE_NAMES[mode as OutMode] ?? String(mode);

/**
 * Die Engine spielt „first to N", nicht „best of N": bei legsToWin = 3 ist nach
 * zwei gewonnenen Legs Schluss, ein Leg vor dem, was „Best of 3" verspricht.
 * Deshalb „Bis 3 Legs" und nie „Best of".
 */
export const distanceLabel = (config: Pick<GameConfig, 'setsToWin' | 'legsToWin'>): string =>
  config.setsToWin > 1 ? `Bis ${config.setsToWin} Sätze` : `Bis ${config.legsToWin} Legs`;

/** „2 Spieler" bzw. „2v2 Doppel" — im Doppel sind es immer vier. */
export const lineupLabel = (config: Pick<MatchSetupConfig, 'is2v2' | 'playerCount'>): string =>
  config.is2v2
    ? '2v2 Doppel'
    : `${config.playerCount} ${config.playerCount === 1 ? 'Spieler allein' : 'Spieler'}`;

/**
 * Die vier Pillen der Weiter-Karte: Punktzahl, Out-Modus, Distanz, Aufstellung.
 *
 * Vier und nicht mehr — die Karte soll auf einen Blick sagen, was ein Tap
 * startet, und ab der fünften Pille liest man sie nicht mehr, sondern
 * überfliegt sie.
 */
export const configPills = (config: MatchSetupConfig): string[] => [
  String(config.startScore),
  outModeLabel(config.outMode),
  distanceLabel({
    // Ein halb getipptes Zahlenfeld ist hier `''`; die Karte zeigt dann die 1,
    // mit der `toGameConfig` das Match ohnehin starten würde.
    setsToWin: typeof config.setsToWin === 'number' ? config.setsToWin : 1,
    legsToWin: typeof config.legsToWin === 'number' ? config.legsToWin : 1
  }),
  lineupLabel(config)
];

/**
 * Wer bei genau dieser Konfiguration antritt.
 *
 * Liest dieselbe Funktion wie der Setup-Screen (`buildDefaultLineup`), damit die
 * Weiter-Karte nicht andere Namen nennt als die, mit denen das Match dann
 * beginnt. Wer im Setup einen Sitzplatz umgestellt hat, ist hier trotzdem nicht
 * zu sehen: diese Auswahl lebt nur, solange der Screen offen ist. Genau deshalb
 * nennt die Karte die Aufstellung als Zahl („2 Spieler") und nicht als Namen —
 * ein Name, der beim Start ein anderer wäre, wäre schlimmer als keiner.
 */
export const defaultLineupFor = (
  profiles: Record<string, Profile>,
  playerCount: number
): string[] => buildDefaultLineup(profiles).slice(0, playerCount);
