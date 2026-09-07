/**
 * Die vier Stufen aus DESIGN.md §6 — die eine Quelle der Wahrheit.
 *
 * Media-Queries können keine CSS-Custom-Properties lesen, deshalb stehen die
 * Zahlen zwangsläufig zweimal da: hier und als Literal in den `@media`-Regeln
 * in index.css. Diese Datei ist die maßgebliche; ändert sich eine Stufe, muss
 * index.css nachgezogen werden. Der Kommentarblock oben in index.css verweist
 * hierher, damit man beim Ändern nicht nur die Hälfte findet.
 *
 * Gemessene Zielbreiten laut §6:
 *
 *   iPhone 17 Pro      402 × 874   ·  874 × 402
 *   iPad Air 11" (M3)  820 × 1180  ·  1180 × 820
 *   iPad Air 13" (M3)  1024 × 1366 ·  1366 × 1024
 */
export const BREAKPOINTS = {
  /** Phone Querformat. Inhalt wird zentriert statt gestreckt. */
  phoneLandscape: 600,
  /** iPad Air Querformat und iPad 13" Hochformat. Ab hier Sidebar statt Dock. */
  tablet: 900,
  /** iPad Air 13" Querformat und größer. Inhalt bekommt ~960px Maximalbreite. */
  wide: 1200
} as const;

/**
 * Die Basis-Stufe hat keine Zahl — sie ist alles unterhalb von
 * `phoneLandscape` und damit iPhone im Hochformat.
 */
export type Breakpoint = 'base' | keyof typeof BREAKPOINTS;

/** Aufsteigend. Die Reihenfolge trägt Bedeutung, siehe `isAtLeast`. */
export const BREAKPOINT_ORDER: readonly Breakpoint[] = [
  'base',
  'phoneLandscape',
  'tablet',
  'wide'
];

/** Die Media-Query zu einer Stufe, in derselben Form wie in index.css. */
export const minWidthQuery = (breakpoint: keyof typeof BREAKPOINTS): string =>
  `(min-width: ${BREAKPOINTS[breakpoint]}px)`;

/**
 * Ob `current` mindestens `target` erreicht — `tablet` schließt
 * `phoneLandscape` ein, so wie eine `min-width`-Query es auch tut.
 */
export const isAtLeast = (current: Breakpoint, target: Breakpoint): boolean =>
  BREAKPOINT_ORDER.indexOf(current) >= BREAKPOINT_ORDER.indexOf(target);
