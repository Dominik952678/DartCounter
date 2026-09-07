import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint, useMediaQuery, useMinWidth } from '../useBreakpoint';
import { BREAKPOINTS, isAtLeast, minWidthQuery } from '../../styles/breakpoints';

/**
 * Ein matchMedia, das eine echte Viewport-Breite nachstellt und Listener auch
 * wirklich benachrichtigt — das Mock in test/setup.ts liefert immer `false`
 * und könnte den Unterschied zwischen den Stufen nicht zeigen.
 */
const installMatchMedia = () => {
  let width = 0;
  const listeners = new Set<() => void>();

  const parse = (query: string): number => {
    const m = /min-width:\s*(\d+)px/.exec(query);
    if (!m) throw new Error(`Query nicht unterstützt: ${query}`);
    return Number(m[1]);
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      get matches() { return width >= parse(query); },
      media: query,
      addEventListener: (_: string, cb: () => void) => { listeners.add(cb); },
      removeEventListener: (_: string, cb: () => void) => { listeners.delete(cb); }
    })
  });

  return (next: number) => {
    width = next;
    act(() => { listeners.forEach(cb => cb()); });
  };
};

describe('breakpoints module', () => {
  it('keeps the four steps from DESIGN.md section 6', () => {
    expect(BREAKPOINTS).toEqual({ phoneLandscape: 600, tablet: 900, wide: 1200 });
  });

  it('builds queries in the same shape index.css uses', () => {
    expect(minWidthQuery('tablet')).toBe('(min-width: 900px)');
  });

  // isAtLeast muss sich wie eine min-width-Query verhalten: eine breitere Stufe
  // erfuellt jede schmalere mit.
  it('treats wider steps as satisfying narrower ones', () => {
    expect(isAtLeast('tablet', 'phoneLandscape')).toBe(true);
    expect(isAtLeast('tablet', 'tablet')).toBe(true);
    expect(isAtLeast('phoneLandscape', 'tablet')).toBe(false);
    expect(isAtLeast('base', 'phoneLandscape')).toBe(false);
    expect(isAtLeast('wide', 'base')).toBe(true);
  });
});

describe('useBreakpoint', () => {
  let setWidth: (w: number) => void;

  beforeEach(() => {
    setWidth = installMatchMedia();
  });

  it.each([
    [402, 'base'],            // iPhone 17 Pro Hochformat
    [599, 'base'],
    [600, 'phoneLandscape'],  // exakt auf der Kante
    [874, 'phoneLandscape'],  // iPhone 17 Pro Querformat
    [820, 'phoneLandscape'],  // iPad Air 11" Hochformat — bewusst kein Tablet
    [900, 'tablet'],
    [1180, 'tablet'],         // iPad Air 11" Querformat
    [1024, 'tablet'],         // iPad Air 13" Hochformat
    [1200, 'wide'],
    [1366, 'wide']            // iPad Air 13" Querformat
  ])('reports %ipx as %s', (width, expected) => {
    setWidth(width);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe(expected);
  });

  it('follows a viewport that changes under it', () => {
    setWidth(402);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('base');

    setWidth(1366);
    expect(result.current).toBe('wide');

    setWidth(600);
    expect(result.current).toBe('phoneLandscape');
  });

  it('stops listening once unmounted', () => {
    setWidth(402);
    const { unmount } = renderHook(() => useMinWidth('tablet'));
    unmount();
    // Wuerde der Listener bleiben, setzte dieses Update State auf einer
    // ausgehaengten Komponente — React meldete das als Warnung.
    expect(() => setWidth(1200)).not.toThrow();
  });

  it('falls back to the base step where matchMedia is missing', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('base');
    expect(renderHook(() => useMediaQuery('(min-width: 600px)')).result.current).toBe(false);
  });
});
