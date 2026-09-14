import React from 'react';
import type { Celebration } from '../../types';

type Spark = { tone: 'success' | 'accent'; style: React.CSSProperties };

const sparks = (count: number, reach: number, startDelay: number, tones: Spark['tone'][]): Spark[] =>
  Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + 0.3;
    const radius = reach + (i % 3) * 14;
    return {
      tone: tones[i % tones.length],
      style: {
        '--cel-dx': `${Math.round(Math.cos(angle) * radius)}px`,
        '--cel-dy': `${Math.round(Math.sin(angle) * radius * 0.8)}px`,
        animationDelay: `${startDelay + (i % 2) * 0.05}s`
      } as React.CSSProperties
    };
  });

const CHECK_SPARKS = sparks(6, 56, 0.12, ['success']);
const MATCH_SPARKS = sparks(12, 76, 0.3, ['success', 'accent']);

/**
 * What happens inside the thrower's card. A check and the match win light the
 * card edge; the match win leaves a stamp with the final score. After a high
 * finish that wins the match only the stamp appears, once the big animation
 * has cleared.
 */
export const CardCelebration: React.FC<{ celebration: Celebration }> = ({ celebration }) => {
  const { type, matchWin, matchScore } = celebration;
  const quiet = type === 'check';
  if (!quiet && !(type === 'highFinish' && matchWin && matchScore)) return null;

  return (
    <div className="cel-card-fx" aria-hidden="true">
      {quiet && (
        <>
          <div className="cel-card-wash" />
          <div className="cel-card-sweep" />
          {(matchWin ? MATCH_SPARKS : CHECK_SPARKS).map((spark, i) => (
            <span key={i} className={`cel-spark is-${spark.tone}`} style={spark.style} />
          ))}
        </>
      )}
      {matchWin && matchScore && (
        <div className={`cel-card-stamp${quiet ? '' : ' is-late'}`}>
          <div className="cel-stamp-word">Match</div>
          <div className="cel-stamp-score">{matchScore[0]} : {matchScore[1]}</div>
        </div>
      )}
    </div>
  );
};
