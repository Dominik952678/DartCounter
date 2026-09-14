import React from 'react';
import type { Celebration } from '../../types';
import { BOARD_LAYERS, BOARD_RADII, dartPath, segmentAngle, wedgePath } from '../../utils/dartboardGeometry';

/** When each dart lights up, in seconds. */
const HIT_DELAYS = {
  big: [0.18, 0.4, 0.62],
  quiet: [0.15, 0.35, 0.55]
};

const VIEW_BOX = '-190 -190 380 380';

const BoardBase = () => (
  <svg viewBox={VIEW_BOX}>
    <circle r={186} className="cel-board-rim" />
    <path d={BOARD_LAYERS.singlesA} className="cel-seg is-single-a" />
    <path d={BOARD_LAYERS.singlesB} className="cel-seg is-single-b" />
    <path d={BOARD_LAYERS.ringsA} className="cel-seg is-ring-a" />
    <path d={BOARD_LAYERS.ringsB} className="cel-seg is-ring-b" />
    <circle r={BOARD_RADII.bullOut} className="cel-seg is-bull-out" />
    <circle r={BOARD_RADII.bullIn} className="cel-seg is-bull-in" />
  </svg>
);

/**
 * What a split round asked for, outlined in red on the quiet board: the
 * number's wedge, the double or treble ring, or the bull. Nothing is lit —
 * the point is what was missing, not where the darts went.
 */
const SplitOutline: React.FC<{ target?: string }> = ({ target }) => {
  let outline: React.ReactNode = null;
  if (target === 'Double') {
    outline = <circle r={(BOARD_RADII.doubleIn + BOARD_RADII.doubleOut) / 2} className="cel-outline-ring" transform="rotate(-90)" />;
  } else if (target === 'Triple') {
    outline = <circle r={(BOARD_RADII.trebleIn + BOARD_RADII.trebleOut) / 2} className="cel-outline-ring" transform="rotate(-90)" />;
  } else if (target === 'BULL') {
    outline = <circle r={BOARD_RADII.bullOut} className="cel-outline-area" />;
  } else if (target && Number.isFinite(Number(target))) {
    outline = <path d={wedgePath(Number(target))} className="cel-outline-area" />;
  }

  return (
    <div className="cel-board-layer is-quiet" aria-hidden="true">
      <div className="cel-board">
        <BoardBase />
        {outline && <svg viewBox={VIEW_BOX}>{outline}</svg>}
      </div>
    </div>
  );
};

/**
 * The lower half of a celebration, laid over the keypad: the darts of the visit
 * replayed on a board. Loud for a high score or high finish, quiet for a check
 * or the match win — no rotation, no ring, no sweep.
 */
export const CelebrationBoard: React.FC<{ celebration: Celebration }> = ({ celebration }) => {
  const { type, darts } = celebration;
  // A miss has nothing to replay.
  if (type === 'bust' || type === 'missed') return null;
  if (type === 'split') return <SplitOutline target={celebration.splitTarget} />;

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
        <BoardBase />
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
