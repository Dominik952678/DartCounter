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

  // Alle drei sind wieder wählbar. Das `data-theme` am Wurzelelement ist der
  // einzige Hebel, an dem die beiden Theme-Stylesheets hängen — bleibt es
  // stehen, greift keine ihrer Regeln.
  it.each(['classic', 'vaporwave', 'cyberpunk'] as const)(
    'persists %s and mirrors it onto data-theme',
    (theme) => {
      useThemeStore.getState().setTheme(theme);
      expect(useThemeStore.getState().theme).toBe(theme);
      expect(localStorage.getItem('dartcounter_theme')).toBe(theme);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
    }
  );

  // Ein Wert, den niemand kennt — etwa aus einer eingespielten Sicherung oder
  // einem alten Build —, darf die App nicht auf einem Theme ohne Stylesheet
  // festhalten.
  it('falls back to classic for an unknown stored theme', () => {
    localStorage.setItem('dartcounter_theme', 'synthwave');
    expect(readOneOf('theme', ['classic', 'vaporwave', 'cyberpunk'] as const, 'classic')).toBe('classic');
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
