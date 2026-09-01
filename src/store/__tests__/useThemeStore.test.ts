import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../useThemeStore';

describe('useThemeStore Theme System', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().setTheme('classic');
  });

  it('defaults to classic theme', () => {
    expect(useThemeStore.getState().theme).toBe('classic');
    expect(document.documentElement.getAttribute('data-theme')).toBe('classic');
  });

  it('switches to vaporwave theme and updates data-theme attribute', () => {
    useThemeStore.getState().setTheme('vaporwave');
    expect(useThemeStore.getState().theme).toBe('vaporwave');
    expect(localStorage.getItem('dartcounter_theme')).toBe('vaporwave');
    expect(document.documentElement.getAttribute('data-theme')).toBe('vaporwave');
  });

  it('switches to cyberpunk theme and updates data-theme attribute', () => {
    useThemeStore.getState().setTheme('cyberpunk');
    expect(useThemeStore.getState().theme).toBe('cyberpunk');
    expect(localStorage.getItem('dartcounter_theme')).toBe('cyberpunk');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk');
  });

  it('toggles scanlines and gridAnimation', () => {
    const initialScanlines = useThemeStore.getState().scanlines;
    useThemeStore.getState().toggleScanlines();
    expect(useThemeStore.getState().scanlines).toBe(!initialScanlines);

    const initialGrid = useThemeStore.getState().gridAnimation;
    useThemeStore.getState().toggleGridAnimation();
    expect(useThemeStore.getState().gridAnimation).toBe(!initialGrid);
  });
});
