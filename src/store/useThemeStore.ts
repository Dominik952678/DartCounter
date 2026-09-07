import { create } from 'zustand';
import { readBoolean, readOneOf, write } from '../utils/storage';

/* Das Redesign stellt nur `classic` auf das Rollen-System aus DESIGN.md um.
   `vaporwave` und `cyberpunk` wirken fast ausschließlich über Klassennamen mit
   `!important` (101 bzw. 137 Stück) auf genau die Klassen, die das Redesign
   ersetzt — sie ließen sich also nicht über Token-Fallbacks am Leben halten und
   würden halb angewendet aussehen. Sie sind deshalb vorübergehend nicht
   wählbar; `styles/vaporwave.css` und `styles/cyberpunk.css` liegen unverändert
   im Repo, bis sie in einem Folge-Task nachgezogen werden.

   Wer eines der beiden persistiert hat, fällt über `readOneOf` automatisch auf
   `classic` zurück — der gespeicherte Wert ist schlicht kein gültiges Mitglied
   von THEMES mehr. */
export type AppTheme = 'classic';

const THEMES: readonly AppTheme[] = ['classic'];

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
