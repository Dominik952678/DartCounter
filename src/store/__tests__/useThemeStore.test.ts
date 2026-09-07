import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../useThemeStore';
import { readOneOf } from '../../utils/storage';

describe('useThemeStore Theme System', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().setTheme('classic');
  });

  it('defaults to classic theme', () => {
    expect(useThemeStore.getState().theme).toBe('classic');
    expect(document.documentElement.getAttribute('data-theme')).toBe('classic');
  });

  it('persists the theme and mirrors it onto data-theme', () => {
    useThemeStore.getState().setTheme('classic');
    expect(useThemeStore.getState().theme).toBe('classic');
    expect(localStorage.getItem('dartcounter_theme')).toBe('classic');
    expect(document.documentElement.getAttribute('data-theme')).toBe('classic');
  });

  // Vaporwave und Cyberpunk sind während des Redesigns aus THEMES genommen.
  // Wer eines von beiden gespeichert hat, darf nicht auf einem Theme
  // festhängen, dessen Stylesheet gar nicht mehr geladen wird.
  it.each(['vaporwave', 'cyberpunk'])('falls back to classic for the retired %s theme', (retired) => {
    localStorage.setItem('dartcounter_theme', retired);
    expect(readOneOf('theme', ['classic'] as const, 'classic')).toBe('classic');
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
