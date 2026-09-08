import React from 'react';
import type { AppTheme } from '../../store/useThemeStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Card, CardHeader, ChoiceGroup } from '../ui';

const THEME_CHOICES: readonly (readonly [AppTheme, string])[] = [
  ['classic', '🎯 Classic Dark'],
  ['vaporwave', '🌆 Vaporwave'],
  ['cyberpunk', '⚡ Cyberpunk']
];

/**
 * Die zwei Hintergrund-Overlays, die beide Alt-Themes anbieten.
 *
 * `classic` hat keine, deshalb erscheint der Block nur bei den anderen beiden.
 * Die Beschriftung wechselt mit dem Theme, der Schalter dahinter ist derselbe.
 */
const EFFECT_LABELS: Record<Exclude<AppTheme, 'classic'>, { scanlines: string; grid: string }> = {
  vaporwave: {
    scanlines: '📺 CRT-Scanlines',
    grid: '🏎️ Outrun-Gitter'
  },
  cyberpunk: {
    scanlines: '📺 Terminal-Scanlines',
    grid: '⚡ Circuit-Raster'
  }
};

interface EffectToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

/** Derselbe Options-Schalter wie im Match-Setup — §5s Selected-State. */
const EffectToggle: React.FC<EffectToggleProps> = ({ label, description, checked, onToggle }) => (
  <label className="option-toggle">
    <input type="checkbox" checked={checked} onChange={onToggle} />
    <span className="option-toggle-body">
      <span className="option-toggle-title">{label}</span>
      <span className="option-toggle-desc">{description}</span>
    </span>
  </label>
);

/** Theme-Wahl und, für die beiden Alt-Themes, ihre Effekt-Schalter. */
export const ThemeSettingsCard: React.FC = () => {
  const { theme, scanlines, gridAnimation, setTheme, toggleScanlines, toggleGridAnimation } = useThemeStore();
  const effects = theme === 'classic' ? null : EFFECT_LABELS[theme];

  return (
    <Card style={{ marginTop: 'var(--space-5)' }}>
      <CardHeader icon="🎨" heading="Design & Theme" />

      <label className="section-label">App-Design wählen:</label>
      <ChoiceGroup
        name="themeSelect"
        value={theme}
        options={THEME_CHOICES.map(([value, label]) => ({ value, label }))}
        onChange={setTheme}
        ariaLabel="App-Design"
      />

      {effects && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-4)'
          }}
        >
          <EffectToggle
            label={effects.scanlines}
            description="Legt feine Zeilen über den Bildschirm"
            checked={scanlines}
            onToggle={toggleScanlines}
          />
          <EffectToggle
            label={effects.grid}
            description="Animiertes Raster im Hintergrund"
            checked={gridAnimation}
            onToggle={toggleGridAnimation}
          />
        </div>
      )}
    </Card>
  );
};
