import { create } from 'zustand';
import { readBoolean, readOneOf, write } from '../utils/storage';

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
