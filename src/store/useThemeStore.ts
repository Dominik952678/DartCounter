import { create } from 'zustand';

export type AppTheme = 'classic' | 'vaporwave' | 'cyberpunk';

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

const getInitialTheme = (): AppTheme => {
  const saved = localStorage.getItem('dartcounter_theme');
  if (saved === 'vaporwave' || saved === 'cyberpunk' || saved === 'classic') return saved as AppTheme;
  return 'classic';
};

const getInitialScanlines = (): boolean => {
  const saved = localStorage.getItem('dartcounter_scanlines');
  return saved !== null ? saved === 'true' : true;
};

const getInitialGrid = (): boolean => {
  const saved = localStorage.getItem('dartcounter_grid');
  return saved !== null ? saved === 'true' : true;
};

const getInitialGlitch = (): boolean => {
  const saved = localStorage.getItem('dartcounter_glitch');
  return saved !== null ? saved === 'true' : true;
};

// Initial sync with DOM
if (typeof document !== 'undefined') {
  const initTheme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', initTheme);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  scanlines: getInitialScanlines(),
  gridAnimation: getInitialGrid(),
  glitchEffects: getInitialGlitch(),

  setTheme: (theme: AppTheme) => {
    localStorage.setItem('dartcounter_theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },

  toggleScanlines: () => {
    set((state) => {
      const next = !state.scanlines;
      localStorage.setItem('dartcounter_scanlines', String(next));
      return { scanlines: next };
    });
  },

  toggleGridAnimation: () => {
    set((state) => {
      const next = !state.gridAnimation;
      localStorage.setItem('dartcounter_grid', String(next));
      return { gridAnimation: next };
    });
  },

  toggleGlitchEffects: () => {
    set((state) => {
      const next = !state.glitchEffects;
      localStorage.setItem('dartcounter_glitch', String(next));
      return { glitchEffects: next };
    });
  }
}));
