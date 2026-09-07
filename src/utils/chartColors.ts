/**
 * Die Diagrammpalette aus styles/tokens.css.
 *
 * Wie bei den Spielerfarben deckt DESIGN.md §1 diesen Fall nicht ab: eine
 * Tortengrafik mit neun Segmenten braucht neun unterscheidbare Töne, und §1
 * kennt zwei kategorische Rollen. Die Palette gilt nur innerhalb von
 * Diagrammen und deren Legenden.
 *
 * Zurückgegeben werden `var(--chart-n)`-Verweise. Recharts kann damit umgehen,
 * weil es die Werte unverändert in `fill`/`stroke` schreibt.
 */

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)'
] as const;

/** Sammelposten für alles, was einzeln zu klein zum Anzeigen ist. */
export const CHART_REST_COLOR = 'var(--chart-rest)';

/**
 * Farbe der n-ten Datenreihe. Die Reihe „Rest" bekommt immer den gedämpften
 * Sammelton, damit sie sich nicht als eigene Kategorie liest.
 */
export const chartColor = (index: number, name?: string): string =>
  name === 'Rest'
    ? CHART_REST_COLOR
    : CHART_COLORS[((index % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length];
