import React from 'react';
import type { AppTheme } from '../../store/useThemeStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Card, CardHeader, ChoiceGroup } from '../ui';

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
    <Card style={{ marginTop: 'var(--space-5)' }}>
      <CardHeader heading="🎨 Design & Theme" />

      <div>
        <label className="section-label">App-Design wählen:</label>
        <ChoiceGroup
          name="themeSelect"
          value={theme}
          options={THEME_CHOICES.map(([value, label]) => ({ value, label }))}
          onChange={setTheme}
          ariaLabel="App-Design"
        />
        <p className="form-hint">
          Vaporwave und Cyberpunk sind während des Redesigns pausiert und kommen später zurück.
        </p>
      </div>
    </Card>
  );
};
