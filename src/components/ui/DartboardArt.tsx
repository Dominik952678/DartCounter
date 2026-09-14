import React from 'react';
import { BOARD_LAYERS, BOARD_RADII } from '../../utils/dartboardGeometry';

export interface DartboardArtProps {
  /** `hero` für den Start-Screen, `quiet` für Leerzustände. */
  tone?: 'hero' | 'quiet';
  className?: string;
}

/**
 * Ein Dartboard als reine Grafik — ohne Zahlen und ohne Treffer, für
 * Hintergründe und Leerzustände. Die Pfade kommen aus derselben Geometrie wie
 * die Feier-Animationen, die Farben aus den Board-Tokens (styles/components.css).
 */
export const DartboardArt: React.FC<DartboardArtProps> = ({ tone = 'hero', className }) => (
  <svg
    className={['dartboard-art', `dartboard-art-${tone}`, className].filter(Boolean).join(' ')}
    viewBox="-172 -172 344 344"
    aria-hidden="true"
    focusable="false"
  >
    <path className="dba-dark" d={BOARD_LAYERS.singlesA} />
    <path className="dba-light" d={BOARD_LAYERS.singlesB} />
    <path className="dba-red" d={BOARD_LAYERS.ringsA} />
    <path className="dba-green" d={BOARD_LAYERS.ringsB} />
    <circle className="dba-green" r={BOARD_RADII.bullOut} />
    <circle className="dba-red" r={BOARD_RADII.bullIn} />
  </svg>
);
