import { useEffect, useReducer } from 'react';
import type { GameConfig } from '../../types';
import { readBoolean, readInt, readOneOf, write } from '../../utils/storage';

export type OutMode = 'SO' | 'DO' | 'MO';

/** The scores the setup screen offers as tiles; any other score in range is a custom one. */
export const START_SCORES = [301, 501, 701, 1001];
export const OUT_MODES: readonly OutMode[] = ['SO', 'DO', 'MO'];

/** The range a custom start score may take. Below 2 no finish exists in Double Out. */
export const MIN_START_SCORE = 2;
export const MAX_START_SCORE = 9999;

export const MAX_SETS = 10;
export const MAX_LEGS = 15;

export const isValidStartScore = (value: number | ''): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= MIN_START_SCORE && value <= MAX_START_SCORE;

/**
 * What a match is configured with, before the players are picked.
 *
 * Sets, legs and a custom start score are `''` while their field is empty — a
 * number the user is in the middle of retyping.
 */
export interface MatchSetupConfig {
  setsToWin: number | '';
  legsToWin: number | '';
  startScore: number | '';
  /** The custom field is open — also when its value happens to match a tile. */
  customScore: boolean;
  outMode: OutMode;
  is2v2: boolean;
  playerCount: number;
}

export type MatchSetupAction =
  | { type: 'sets'; value: number | '' }
  | { type: 'legs'; value: number | '' }
  | { type: 'startScore'; value: number }
  | { type: 'customScore'; value: number | '' }
  | { type: 'outMode'; value: OutMode }
  | { type: 'mode'; is2v2: boolean }
  | { type: 'playerCount'; value: number };

/** The player count last chosen for singles; 2v2 always seats four. */
const readSinglesPlayerCount = (): number => readInt('x01PlayerCount', 2, { min: 1, max: 4 });

/**
 * Die zuletzt benutzte Konfiguration, aus dem Speicher gelesen.
 *
 * Öffentlich, weil der Start-Screen dieselbe Quelle lesen muss wie der
 * Setup-Screen. Eine gespeicherte Punktzahl außerhalb der Kacheln ist eine
 * eigene; eine, mit der kein Match starten kann, fällt auf 501.
 */
export const readStoredMatchConfig = (): MatchSetupConfig => {
  const is2v2 = readBoolean('x01Is2v2', false);
  const stored = readInt('x01StartScore', 501);
  const startScore = isValidStartScore(stored) ? stored : 501;
  return {
    setsToWin: readInt('x01Sets', 1, { min: 1 }),
    legsToWin: readInt('x01Legs', 1, { min: 1 }),
    startScore,
    customScore: !START_SCORES.includes(startScore),
    outMode: readOneOf('x01OutMode', OUT_MODES, 'DO'),
    is2v2,
    playerCount: is2v2 ? 4 : readSinglesPlayerCount()
  };
};

/**
 * Pure, as reducers must be: the persistence below reacts to what comes out of
 * it. Switching the mode also moves the seats — 2v2 is four players, and leaving
 * it restores the count singles was last played with.
 */
const reduce = (state: MatchSetupConfig, action: MatchSetupAction): MatchSetupConfig => {
  switch (action.type) {
    case 'sets':
      return { ...state, setsToWin: action.value };
    case 'legs':
      return { ...state, legsToWin: action.value };
    case 'startScore':
      return { ...state, startScore: action.value, customScore: false };
    case 'customScore':
      return { ...state, startScore: action.value, customScore: true };
    case 'outMode':
      return { ...state, outMode: action.value };
    case 'mode':
      return {
        ...state,
        is2v2: action.is2v2,
        playerCount: action.is2v2 ? 4 : readSinglesPlayerCount()
      };
    case 'playerCount':
      return { ...state, playerCount: action.value };
  }
};

/** The match configuration, restored from the last match and written back as it changes. */
export const useMatchSetupConfig = (): [MatchSetupConfig, React.Dispatch<MatchSetupAction>] => {
  const [config, dispatch] = useReducer(reduce, undefined, readStoredMatchConfig);

  useEffect(() => {
    write('x01Is2v2', config.is2v2);
    // A half-typed or impossible score is not worth restoring next time.
    if (isValidStartScore(config.startScore)) write('x01StartScore', config.startScore);
    write('x01OutMode', config.outMode);
    if (typeof config.setsToWin === 'number') write('x01Sets', config.setsToWin);
    if (typeof config.legsToWin === 'number') write('x01Legs', config.legsToWin);
    // The stored count is the singles one; 2v2's four seats follow from the mode.
    if (!config.is2v2) write('x01PlayerCount', config.playerCount);
  }, [config]);

  return [config, dispatch];
};

/** The configuration as the game engine wants it, with the fields settled. */
export const toGameConfig = (config: MatchSetupConfig): GameConfig => ({
  startScore: isValidStartScore(config.startScore) ? config.startScore : 501,
  outMode: config.outMode,
  setsToWin: typeof config.setsToWin === 'number' ? config.setsToWin : 1,
  legsToWin: typeof config.legsToWin === 'number' ? config.legsToWin : 1,
  is2v2: config.is2v2
});
