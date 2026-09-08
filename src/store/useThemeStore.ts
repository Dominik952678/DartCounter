import { create } from 'zustand';
import { readBoolean, readOneOf, write } from '../utils/storage';

/* Alle drei Themes stehen wieder zur Wahl.

   Sie waren nach dem Redesign vorübergehend draußen, weil sie ihre Farben als
   Literale in Klassenregeln mit `!important` trugen statt über Tokens. Beide
   Dateien sind inzwischen token-first umgebaut: sie überschreiben die Rollen
   aus tokens.css und regeln als Klassenregel nur noch, was ein Token nicht
   ausdrückt — Schrift, Kanten, Glühen, Overlays.

   DESIGN.md beschreibt `classic`. Für die anderen beiden ist davon die
   Struktur verbindlich (Rollen-Tokens, Komponenten, die Breakpoints aus §6),
   nicht das Erscheinungsbild. */
export type AppTheme = 'classic' | 'vaporwave' | 'cyberpunk';

const THEMES: readonly AppTheme[] = ['classic', 'vaporwave', 'cyberpunk'];

interface ThemeState {
  theme: AppTheme;
  scanlines: boolean;
  gridAnimation: boolean;
  glitchEffects: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleScanlines: () => void;
  toggleGridAnimation: () => void;
  toggleGlitchEffects: () => void;
}

const getInitialTheme = (): AppTheme => readOneOf('theme', THEMES, 'classic');

// Initial sync with DOM
if (typeof document !== 'undefined') {
  const initTheme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', initTheme);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  scanlines: readBoolean('scanlines', true),
  gridAnimation: readBoolean('gridAnimation', true),
  glitchEffects: readBoolean('glitchEffects', true),

  setTheme: (theme: AppTheme) => {
    write('theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },

  toggleScanlines: () => {
    set((state) => {
      const next = !state.scanlines;
      write('scanlines', next);
      return { scanlines: next };
    });
  },

  toggleGridAnimation: () => {
    set((state) => {
      const next = !state.gridAnimation;
      write('gridAnimation', next);
      return { gridAnimation: next };
    });
  },

  toggleGlitchEffects: () => {
    set((state) => {
      const next = !state.glitchEffects;
      write('glitchEffects', next);
      return { glitchEffects: next };
    });
  }
}));
