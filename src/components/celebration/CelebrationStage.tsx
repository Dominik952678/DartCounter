import React, { useLayoutEffect, useRef } from 'react';
import type { Celebration } from '../../types';
import { celebrationHeadline, dartLabel } from '../../utils/celebration';

interface CelebrationStageProps {
  celebration: Celebration;
  playerName: string;
  playerColor: string;
  /** Who is named as the winner of the match — the player, or their team in 2v2. */
  winnerLabel?: string;
  /**
   * Where the big number ends its run, as a selector inside the same column.
   * Defaults to the thrower's score on the match scoreboard.
   */
  flyTarget?: string;
}

const SLASHES = [
  { top: '36%', delay: 0.5 },
  { top: '46%', delay: 0.58 },
  { top: '56%', delay: 0.66 }
];

const SHOCK_RINGS = [0.9, 1.04];

const FINISH_RINGS = [
  { size: 120, delay: 0.72, alpha: 60 },
  { size: 200, delay: 0.8, alpha: 45 },
  { size: 280, delay: 0.88, alpha: 30 },
  { size: 360, delay: 0.96, alpha: 18 }
];

/** Two turns of 0–9, so every digit rolls a full lap before it settles. */
const ODOMETER_STRIP = Array.from({ length: 20 }, (_, i) => i % 10);

const delay = (seconds: number): React.CSSProperties => ({ animationDelay: `${seconds}s` });

const Odometer = ({ value, ref }: { value: number; ref: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className="cel-odometer" aria-label={String(value)}>
    {String(value).split('').map((digit, i) => (
      <span key={i} className="cel-odo-col">
        <span
          className="cel-odo-strip"
          style={{ '--cel-odo-end': `-${10 + Number(digit)}em`, animationDelay: `${0.78 + i * 0.09}s` } as React.CSSProperties}
        >
          {ODOMETER_STRIP.map((n, j) => <span key={j}>{n}</span>)}
        </span>
      </span>
    ))}
  </div>
);

/**
 * The top half of a celebration, laid over the scoreboard column: the big
 * number for a high score or high finish, or the quiet panel — green for
 * "Check" / "Match", red for "Verpasst". The board half lives in
 * CelebrationBoard, inside the keypad.
 */
export const CelebrationStage: React.FC<CelebrationStageProps> = ({
  celebration,
  playerName,
  playerColor,
  winnerLabel,
  flyTarget
}) => {
  const numberRef = useRef<HTMLDivElement>(null);
  const { id, type, playerIndex, total, darts, matchWin, matchScore } = celebration;
  const target = flyTarget ?? `[data-player-card="${playerIndex}"] .score-display`;

  // Where the number lands depends on player count, mode and orientation, so
  // the distance is measured, not assumed.
  useLayoutEffect(() => {
    const number = numberRef.current;
    const column = number?.closest('.cel-stage')?.parentElement;
    const landing = column?.querySelector(target);
    if (!number || !landing) return;
    const from = number.getBoundingClientRect();
    const to = landing.getBoundingClientRect();
    number.style.setProperty('--cel-fly-x', `${Math.round(to.left + to.width / 2 - (from.left + from.width / 2))}px`);
    number.style.setProperty('--cel-fly-y', `${Math.round(to.top + to.height / 2 - (from.top + from.height / 2))}px`);
  }, [id, target]);

  if (type === 'bust') return null;

  const headline = celebrationHeadline(celebration);
  const name = <span style={{ color: playerColor }}>{playerName}</span>;

  if (type === 'check' || type === 'missed' || type === 'split') {
    return (
      <div className="cel-stage is-quiet" aria-hidden="true">
        <div className={`cel-panel${type === 'check' ? '' : ' is-danger'}`}>
          <div className="cel-panel-word">{headline}</div>
          <div className="cel-sub">
            {type === 'split' ? (
              <>
                <span>Halbiert auf</span>
                <span className="cel-sub-score">{total}</span>
              </>
            ) : type === 'missed' ? (
              <>
                <span className="cel-sub-score">{total}</span>
                <span>nicht gefinisht</span>
              </>
            ) : matchWin && matchScore ? (
              <>
                <span style={{ color: playerColor }}>{winnerLabel ?? playerName}</span>
                <span>gewinnt</span>
                <span className="cel-sub-score">{matchScore[0]} : {matchScore[1]}</span>
              </>
            ) : (
              <>
                {name}
                <span>·</span>
                <span>{dartLabel(darts[darts.length - 1])}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isFinish = type === 'highFinish';

  return (
    <div className="cel-stage is-big" aria-hidden="true">
      <div className="cel-dim" />
      {!isFinish && SLASHES.map(slash => (
        <div key={slash.top} className="cel-slash" style={{ top: slash.top, ...delay(slash.delay) }} />
      ))}
      <div className="cel-center">
        {isFinish
          ? FINISH_RINGS.map(ring => (
            <div
              key={ring.size}
              className="cel-finish-ring"
              style={{
                width: ring.size,
                height: ring.size,
                margin: `-${ring.size / 2}px 0 0 -${ring.size / 2}px`,
                borderColor: `color-mix(in srgb, var(--text-success) ${ring.alpha}%, transparent)`,
                ...delay(ring.delay)
              }}
            />
          ))
          : SHOCK_RINGS.map(seconds => <div key={seconds} className="cel-ring" style={delay(seconds)} />)}
        <div className={`cel-word cel-rise ${isFinish ? 'is-success' : ''}`}>{headline}</div>
        {isFinish
          ? <Odometer ref={numberRef} value={total} />
          : <div ref={numberRef} className="cel-number">{total}</div>}
        <div className="cel-sub cel-rise">
          {name}
          <span>·</span>
          <span>{darts.map(dartLabel).join(' ')}</span>
        </div>
      </div>
    </div>
  );
};
