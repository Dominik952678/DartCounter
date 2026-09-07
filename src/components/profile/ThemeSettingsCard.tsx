import React from 'react';
import type { AppTheme } from '../../store/useThemeStore';
import { useThemeStore } from '../../store/useThemeStore';

/* Vaporwave und Cyberpunk stehen vorübergehend nicht zur Wahl: sie wirken über
   Klassennamen, die das Redesign ersetzt, und werden in einem Folge-Task auf
   das Rollen-System aus DESIGN.md nachgezogen. Details in useThemeStore.ts. */
const THEME_CHOICES: readonly (readonly [AppTheme, string])[] = [
  ['classic', '🎯 Classic Dark']
];

/** Theme picker. */
export const ThemeSettingsCard: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <h2>🎨 Design & Theme</h2>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>
          App-Design wählen:
        </label>
        <div className="segment-control">
          {THEME_CHOICES.map(([value, label]) => (
            <label key={value} className={theme === value ? 'active' : ''}>
              <input
                type="radio"
                name="themeSelect"
                checked={theme === value}
                onChange={() => setTheme(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
          Vaporwave und Cyberpunk sind während des Redesigns pausiert und kommen später zurück.
        </p>
      </div>
    </div>
  );
};
