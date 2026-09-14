import type { GameConfig } from '../types';
import { outModeLabel } from '../components/matchSetup/configSummary';

interface SideSource {
  name: string;
  score: number;
  legs: number;
  sets: number;
  team?: number;
}

export interface MatchSide {
  name: string;
  score: number;
  legs: number;
  sets: number;
}

/**
 * Who plays whom. In doubles the partners of a team share score, legs and sets,
 * so a team is one side; otherwise every player is. A player without a team
 * sits by seat, alternating — the engine's own fallback.
 */
export const matchSides = (
  players: readonly SideSource[],
  config: Pick<GameConfig, 'is2v2'>
): MatchSide[] => {
  if (!config.is2v2) return players.map(({ name, score, legs, sets }) => ({ name, score, legs, sets }));

  return ([1, 2] as const).map(team => {
    const members = players.filter((p, i) => (p.team ?? (i % 2 === 0 ? 1 : 2)) === team);
    return {
      name: members.map(p => p.name).join(' & '),
      score: members[0]?.score ?? 0,
      legs: Math.max(0, ...members.map(p => p.legs)),
      sets: Math.max(0, ...members.map(p => p.sets))
    };
  });
};

/**
 * Which leg is on — „Leg 3", and in a match over sets „Satz 2 · Leg 4". The
 * engine resets legs at the end of a set, so the legs on the board are the
 * legs of the running set.
 */
export const matchProgressLabel = (
  players: readonly SideSource[],
  config: Pick<GameConfig, 'is2v2' | 'setsToWin'>
): string => {
  const sides = matchSides(players, config);
  const leg = `Leg ${sides.reduce((sum, side) => sum + side.legs, 0) + 1}`;
  return config.setsToWin > 1
    ? `Satz ${sides.reduce((sum, side) => sum + side.sets, 0) + 1} · ${leg}`
    : leg;
};

/** „501 · Double Out", im Doppel mit „· 2v2". */
export const matchTitle = (config: Pick<GameConfig, 'startScore' | 'outMode' | 'is2v2'>): string =>
  `${config.startScore} · ${outModeLabel(config.outMode)}${config.is2v2 ? ' · 2v2' : ''}`;
