import type { Dart } from '../types';
import { BOARD_ORDER } from './bot';

/**
 * SVG paths for a dartboard centred on 0,0, in millimetres of a regulation
 * board (outer edge of the double ring = 170). Angles are SVG degrees: 0 points
 * right and they run clockwise, so the 20 sits at -90.
 */
export const BOARD_RADII = {
  bullIn: 6.35,
  bullOut: 15.9,
  trebleIn: 99,
  trebleOut: 107,
  doubleIn: 162,
  doubleOut: 170
} as const;

type Ring = 'innerSingle' | 'treble' | 'outerSingle' | 'double';

const RING_RADII: Record<Ring, [number, number]> = {
  innerSingle: [BOARD_RADII.bullOut, BOARD_RADII.trebleIn],
  treble: [BOARD_RADII.trebleIn, BOARD_RADII.trebleOut],
  outerSingle: [BOARD_RADII.trebleOut, BOARD_RADII.doubleIn],
  double: [BOARD_RADII.doubleIn, BOARD_RADII.doubleOut]
};

const round = (n: number) => Math.round(n * 100) / 100;

const point = (radius: number, degrees: number) => {
  const a = (degrees * Math.PI) / 180;
  return `${round(radius * Math.cos(a))} ${round(radius * Math.sin(a))}`;
};

const annularSector = (inner: number, outer: number, from: number, to: number) =>
  `M ${point(outer, from)} A ${outer} ${outer} 0 0 1 ${point(outer, to)} L ${point(inner, to)} A ${inner} ${inner} 0 0 0 ${point(inner, from)} Z`;

const circle = (radius: number) =>
  `M ${radius} 0 A ${radius} ${radius} 0 1 1 ${-radius} 0 A ${radius} ${radius} 0 1 1 ${radius} 0 Z`;

/** Centre angle of a number's wedge. */
export const segmentAngle = (number: number): number => -90 + BOARD_ORDER.indexOf(number) * 18;

export const segmentPath = (number: number, ring: Ring): string => {
  const centre = segmentAngle(number);
  const [inner, outer] = RING_RADII[ring];
  return annularSector(inner, outer, centre - 9, centre + 9);
};

/**
 * The area a dart landed in, or null for a miss. A single lights the outer
 * single, the larger of the two; the single bull is a ring and needs
 * `fill-rule: evenodd`.
 */
export const dartPath = (dart: Dart): string | null => {
  if (dart.base === 0) return null;
  if (dart.base === 25) {
    return dart.mult === 2 ? circle(BOARD_RADII.bullIn) : `${circle(BOARD_RADII.bullOut)} ${circle(BOARD_RADII.bullIn)}`;
  }
  const ring: Ring = dart.mult === 3 ? 'treble' : dart.mult === 2 ? 'double' : 'outerSingle';
  return segmentPath(dart.base, ring);
};

/** Alternating wedge tones, built once: every celebration draws the same board. */
export const BOARD_LAYERS = (() => {
  const layers = { singlesA: '', singlesB: '', ringsA: '', ringsB: '' };
  BOARD_ORDER.forEach((number, i) => {
    const even = i % 2 === 0;
    const singles = `${segmentPath(number, 'innerSingle')} ${segmentPath(number, 'outerSingle')} `;
    const rings = `${segmentPath(number, 'treble')} ${segmentPath(number, 'double')} `;
    if (even) {
      layers.singlesA += singles;
      layers.ringsA += rings;
    } else {
      layers.singlesB += singles;
      layers.ringsB += rings;
    }
  });
  return layers;
})();
