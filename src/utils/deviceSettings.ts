/**
 * Die Einstellungen aus „Mein Profil" (Entwurf H1). Sie gelten für dieses
 * Gerät, nicht für ein Konto, und ziehen mit einer Sicherung um.
 */
import { MAX_LEGS, MAX_SETS, OUT_MODES, isValidStartScore } from '../components/matchSetup/useMatchSetupConfig';
import type { OutMode } from '../components/matchSetup/useMatchSetupConfig';
import { readBoolean, readJson, remove, write, writeJson } from './storage';

export interface DefaultGame {
  startScore: number;
  outMode: OutMode;
  setsToWin: number;
  legsToWin: number;
}

const OUT_LABELS: Record<OutMode, string> = { DO: 'Double Out', SO: 'Single Out', MO: 'Master Out' };

const inRange = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max;

/** Das gespeicherte Standardspiel, oder `null`, wenn keins festgelegt oder der Wert kaputt ist. */
export const readDefaultGame = (): DefaultGame | null => {
  const stored = readJson<Partial<DefaultGame> | null>('defaultGame', null);
  if (!stored || typeof stored !== 'object') return null;
  const { startScore, outMode, setsToWin, legsToWin } = stored;
  if (typeof startScore !== 'number' || !isValidStartScore(startScore)) return null;
  if (!OUT_MODES.includes(outMode as OutMode)) return null;
  if (!inRange(setsToWin, MAX_SETS) || !inRange(legsToWin, MAX_LEGS)) return null;
  return { startScore, outMode: outMode as OutMode, setsToWin, legsToWin };
};

export const saveDefaultGame = (game: DefaultGame) => writeJson('defaultGame', game);

export const clearDefaultGame = () => remove('defaultGame');

/**
 * Legt das Standardspiel in die Werte, die „Neues Spiel" beim Öffnen liest.
 * Der Ein-Tap-Start läuft dann durch denselben Setup-Screen mit all seinen
 * Prüfungen wie „Weiter wie zuletzt".
 */
export const applyDefaultGame = (game: DefaultGame) => {
  write('x01StartScore', game.startScore);
  write('x01OutMode', game.outMode);
  write('x01Sets', game.setsToWin);
  write('x01Legs', game.legsToWin);
};

/** „501 · Double Out". */
export const defaultGameTitle = (game: DefaultGame) => `${game.startScore} · ${OUT_LABELS[game.outMode]}`;

/** „Bis 3 Legs" oder „Bis 2 Sätze · 3 Legs". */
export const defaultGameDistance = (game: DefaultGame) =>
  game.setsToWin > 1 ? `Bis ${game.setsToWin} Sätze · ${game.legsToWin} Legs` : `Bis ${game.legsToWin} Legs`;

/** Checkout-Weg und Bogey-Hinweis in der Leiste unter den Score-Karten. Standard: an. */
export const readCheckoutHints = () => readBoolean('checkoutHints', true);
export const writeCheckoutHints = (on: boolean) => write('checkoutHints', on);

/** Bildschirm während Matches und Training nicht abdunkeln. Standard: an. */
export const readKeepAwake = () => readBoolean('keepAwake', true);
export const writeKeepAwake = (on: boolean) => write('keepAwake', on);
