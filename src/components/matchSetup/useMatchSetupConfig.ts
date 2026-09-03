import { useEffect, useReducer } from 'react';
import type { GameConfig } from '../../types';
import { readBoolean, readInt, readOneOf, write } from '../../utils/storage';

export type OutMode = 'SO' | 'DO' | 'MO';

/** The scores the setup screen offers, and the only ones it will restore. */
export const START_SCORES = [301, 501, 701, 1001];
export const OUT_MODES: readonly OutMode[] = ['SO', 'DO', 'MO'];

export const MAX_SETS = 10;
export const MAX_LEGS = 15;

/**
 * What a match is configured with, before the players are picked.
 *
 * Sets and legs are `''` while their input is empty — a number field the user
 * is in the middle of retyping — and settle back to a number on blur.
 */
export interface MatchSetupConfig {
  setsToWin: number | '';
  legsToWin: number | '';
  startScore: number;
  outMode: OutMode;
  is2v2: boolean;
  playerCount: number;
}

export type MatchSetupAction =
  | { type: 'sets'; value: number | '' }
  | { type: 'legs'; value: number | '' }
  | { type: 'startScore'; value: number }
  | { type: 'outMode'; value: OutMode }
  | { type: 'mode'; is2v2: boolean }
  | { type: 'playerCount'; value: number };

/** The player count last chosen for singles; 2v2 always seats four. */
const readSinglesPlayerCount = (): number => readInt('x01PlayerCount', 2, { min: 1, max: 4 });

const initialConfig = (): MatchSetupConfig => {
  const is2v2 = readBoolean('x01Is2v2', false);
  const startScore = readInt('x01StartScore', 501);
  return {
    setsToWin: readInt('x01Sets', 1, { min: 1 }),
    legsToWin: readInt('x01Legs', 1, { min: 1 }),
    startScore: START_SCORES.includes(startScore) ? startScore : 501,
    outMode: readOneOf('x01OutMode', OUT_MODES, 'DO'),
    is2v2,
    playerCount: is2v2 ? 4 : readSinglesPlayerCount()
  };
};

/**
 * Pure, as reducers must be: the persistence below reacts to what comes out of
 * it. Switching the mode also moves the seats, which is the one rule that
 * cannot live in either field on its own — 2v2 is four players, and leaving it
 * restores the count singles was last played with.
 */
const reduce = (state: MatchSetupConfig, action: MatchSetupAction): MatchSetupConfig => {
  switch (action.type) {
    case 'sets':
      return { ...state, setsToWin: action.value };
    case 'legs':
      return { ...state, legsToWin: action.value };
    case 'startScore':
      return { ...state, startScore: action.value };
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

/**
 * The match configuration, restored from the last match and written back as it
 * changes. Six `useState`s with six persistence effects before, each with its
 * own parsing of the stored value.
 */
export const useMatchSetupConfig = (): [MatchSetupConfig, React.Dispatch<MatchSetupAction>] => {
  const [config, dispatch] = useReducer(reduce, undefined, initialConfig);

  useEffect(() => {
    write('x01Is2v2', config.is2v2);
    write('x01StartScore', config.startScore);
    write('x01OutMode', config.outMode);
    // A half-typed field is not worth restoring next time.
    if (typeof config.setsToWin === 'number') write('x01Sets', config.setsToWin);
    if (typeof config.legsToWin === 'number') write('x01Legs', config.legsToWin);
    // The stored count is the singles one; 2v2's four seats follow from the mode.
    if (!config.is2v2) write('x01PlayerCount', config.playerCount);
  }, [config]);

  return [config, dispatch];
};

/** The configuration as the game engine wants it, with the fields settled. */
export const toGameConfig = (config: MatchSetupConfig): GameConfig => ({
  startScore: config.startScore,
  outMode: config.outMode,
  setsToWin: typeof config.setsToWin === 'number' ? config.setsToWin : 1,
  legsToWin: typeof config.legsToWin === 'number' ? config.legsToWin : 1,
  is2v2: config.is2v2
});
