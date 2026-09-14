/**
 * Who throws next in checkout training.
 *
 * Every player works on the same target at the same time. Whoever has finished
 * it (checked or run out of rounds) sits out until the rest are done too, and
 * only then does everyone move on to the next target together.
 *
 * Before, the turn simply went to the next player with targets left. With more
 * than one round per target, a player who checked in round one was already
 * throwing at the next target while the others were still on the first — so
 * the players were no longer playing the same session side by side.
 *
 * `attempts[i]` is how many targets player i has finished; the lowest value is
 * the target the group is still on. Returns the active player again when they
 * are the only one left on it.
 */
export const nextCheckoutPlayer = (attempts: number[], activePlayer: number): number => {
  if (attempts.length === 0) return activePlayer;
  const groupTarget = Math.min(...attempts);
  for (let step = 1; step <= attempts.length; step++) {
    const index = (activePlayer + step) % attempts.length;
    if (attempts[index] === groupTarget) return index;
  }
  return activePlayer;
};
