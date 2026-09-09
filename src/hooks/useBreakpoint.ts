import { useCallback, useSyncExternalStore } from 'react';
import {
  BREAKPOINTS,
  BREAKPOINT_ORDER,
  isAtLeast,
  minWidthQuery,
  type Breakpoint
} from '../styles/breakpoints';

/**
 * Layout gehört ins CSS — diese Hooks sind für den anderen Fall.
 *
 * Ob etwas nebeneinander oder untereinander steht, entscheiden die Breakpoints
 * in index.css; §6 sagt ausdrücklich, dass reine CSS-Queries dafür reichen, und
 * eine Komponente, die ihre eigene Breite ausrechnet, ist eine Fehlerquelle
 * mehr. Gebraucht wird JavaScript nur dort, wo auf einer breiten Stufe etwas
 * *zusätzlich gerendert* wird statt nur anders angeordnet — etwa das zweite
 * Diagramm, das §6 dem Statistik-Screen ab 1200px zugesteht. Es per CSS zu
 * verstecken hieße, den Chart-Chunk auf jedem Telefon zu laden.
 *
 * Der zweite Fall ist die Hauptnavigation: ihre gleitende Markierung muss
 * wissen, auf welcher Achse sie fährt — `translateX` im Dock, `translateY` in
 * der Schiene. Das ist keine Anordnung, die CSS allein umstellen könnte, ohne
 * die 900px-Grenze ein weiteres Mal zu wiederholen; siehe AppNav.tsx.
 *
 * Umgesetzt mit `useSyncExternalStore` statt mit `useEffect` + `setState`:
 * matchMedia ist ein externer Store, und React soll ihn beim Rendern lesen,
 * nicht hinterher korrigieren.
 */

/** In Umgebungen ohne matchMedia (ältere Test-Setups) gilt die Basis-Stufe. */
const canMatch = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Ob eine Media-Query gerade zutrifft.
 *
 * Der Rückgabewert ist ein Boolean, also ein stabiler Snapshot — deshalb darf
 * `getSnapshot` bei jedem Aufruf ein frisches MediaQueryList anlegen, ohne dass
 * React in eine Endlosschleife läuft.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(
    () => (canMatch() ? window.matchMedia(query).matches : false),
    [query]
  );
  // Kein Server-Rendering in dieser App; der Wert deckt nur den Fall ab, dass
  // React ohne DOM hydratisiert, und entspricht dann der Basis-Stufe.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

/** Ob die Ansicht mindestens `breakpoint` breit ist. */
export const useMinWidth = (breakpoint: keyof typeof BREAKPOINTS): boolean =>
  useMediaQuery(minWidthQuery(breakpoint));

/**
 * Die aktuell gültige Stufe aus §6.
 *
 * Alle drei Queries werden immer abonniert — Hooks dürfen nicht bedingt
 * aufgerufen werden, und drei MediaQueryList-Objekte kosten nichts.
 */
export const useBreakpoint = (): Breakpoint => {
  const phoneLandscape = useMinWidth('phoneLandscape');
  const tablet = useMinWidth('tablet');
  const wide = useMinWidth('wide');

  if (wide) return 'wide';
  if (tablet) return 'tablet';
  if (phoneLandscape) return 'phoneLandscape';
  return 'base';
};

export { BREAKPOINTS, BREAKPOINT_ORDER, isAtLeast };
export type { Breakpoint };
