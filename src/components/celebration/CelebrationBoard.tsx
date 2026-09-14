import React from 'react';
import type { Celebration } from '../../types';
import { BOARD_LAYERS, BOARD_RADII, dartPath, segmentAngle } from '../../utils/dartboardGeometry';

/** When each dart lights up, in seconds. */
const HIT_DELAYS = {
  big: [0.18, 0.4, 0.62],
  quiet: [0.15, 0.35, 0.55]
};

const VIEW_BOX = '-190 -190 380 380';

/**
 * The lower half of a celebration, laid over the keypad: the darts of the visit
 * replayed on a board. Loud for a high score or high finish, quiet for a check
 * or the match win — no rotation, no ring, no sweep.
 */
export const CelebrationBoard: React.FC<{ celebration: Celebration }> = ({ celebration }) => {
  const { type, darts } = celebration;
  if (type === 'bust') return null;

  const big = type === 'highScore' || type === 'highFinish';
  const finishes = type === 'highFinish' || type === 'check';
  const delays = big ? HIT_DELAYS.big : HIT_DELAYS.quiet;
  const lastIndex = darts.length - 1;
  const finishingDart = darts[lastIndex];

  const hits = darts.flatMap((dart, i) => {
    const path = dartPath(dart);
    if (!path) return [];
    // A wedge hit again later only flashes, so the repeat reads as a new hit.
    const repeated = darts.slice(i + 1).some(later => dartPath(later) === path);
    return [{
      index: i,
      path,
      tone: finishes && i === lastIndex ? 'success' : 'accent',
      flash: big && repeated
    }];
  });

  const sweepStart = finishingDart && finishingDart.mult === 2 && finishingDart.base !== 25
    ? segmentAngle(finishingDart.base) - 9
    : -90;

  return (
    <div
      className={`cel-board-layer ${big ? 'is-big' : 'is-quiet'}`}
      data-finish={finishes ? lastIndex : undefined}
      aria-hidden="true"
    >
      <div className="cel-board">
        <svg viewBox={VIEW_BOX}>
          <circle r={186} className="cel-board-rim" />
          <path d={BOARD_LAYERS.singlesA} className="cel-seg is-single-a" />
          <path d={BOARD_LAYERS.singlesB} className="cel-seg is-single-b" />
          <path d={BOARD_LAYERS.ringsA} className="cel-seg is-ring-a" />
          <path d={BOARD_LAYERS.ringsB} className="cel-seg is-ring-b" />
          <circle r={BOARD_RADII.bullOut} className="cel-seg is-bull-out" />
          <circle r={BOARD_RADII.bullIn} className="cel-seg is-bull-in" />
        </svg>
        {hits.map(hit => (
          <svg
            key={hit.index}
            viewBox={VIEW_BOX}
            className={`cel-hit is-${hit.tone}${hit.flash ? ' is-flash' : ''}`}
            style={{ animationDelay: `${delays[hit.index] ?? delays[delays.length - 1]}s` }}
          >
            <path d={hit.path} fillRule="evenodd" />
          </svg>
        ))}
        {type === 'highScore' && (
          <svg viewBox={VIEW_BOX}><circle r={176} className="cel-halo" /></svg>
        )}
        {type === 'highFinish' && (
          <svg viewBox={VIEW_BOX}><circle r={166} className="cel-double-sweep" transform={`rotate(${sweepStart})`} /></svg>
        )}
      </div>
    </div>
  );
};
