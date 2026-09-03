import React from 'react';
import type { AppTheme } from '../../store/useThemeStore';
import { useThemeStore } from '../../store/useThemeStore';

const THEME_CHOICES: readonly (readonly [AppTheme, string])[] = [
  ['classic', '🎯 Classic Dark'],
  ['vaporwave', '🌆 Vaporwave'],
  ['cyberpunk', '⚡ Cyberpunk']
];

interface EffectToggleProps {
  title: string;
  description: string;
  titleColor: string;
  enabled: boolean;
  onToggle: () => void;
}

/** The two decorative overlays each themed skin offers, in its own palette. */
const EffectToggle: React.FC<EffectToggleProps> = ({ title, description, titleColor, enabled, onToggle }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <strong style={{ display: 'block', fontSize: '0.9rem', color: titleColor }}>{title}</strong>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{description}</span>
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={enabled ? 'btn-primary' : 'btn-secondary'}
      style={{ padding: '6px 14px', fontSize: '0.8rem', minHeight: '34px' }}
    >
      {enabled ? 'Aktiviert' : 'Deaktiviert'}
    </button>
  </div>
);

/** Theme picker plus the per-theme effect switches. */
export const ThemeSettingsCard: React.FC = () => {
  const { theme, scanlines, gridAnimation, setTheme, toggleScanlines, toggleGridAnimation } = useThemeStore();

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <h2>🎨 Design & Theme</h2>
      </div>

      <div style={{ marginBottom: '16px' }}>
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
      </div>

      {theme === 'vaporwave' && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 0, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <EffectToggle
            title="📺 CRT Scanlines Overlay"
            description="Klassischer 80s Röhrenmonitor-Filter"
            titleColor="var(--cyan, #00FFFF)"
            enabled={scanlines}
            onToggle={toggleScanlines}
          />
          <EffectToggle
            title="🏎️ 3D Outrun Perspektiv-Grid"
            description="Animierter Neon-Gitter-Horizont"
            titleColor="var(--magenta, #FF00FF)"
            enabled={gridAnimation}
            onToggle={toggleGridAnimation}
          />
        </div>
      )}

      {theme === 'cyberpunk' && (
        <div style={{
          background: 'rgba(10, 10, 15, 0.6)',
          padding: '14px',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <EffectToggle
            title="📺 Terminal CRT Scanlines"
            description="Subtiler Retro-Terminal-Overlay"
            titleColor="#00ff88"
            enabled={scanlines}
            onToggle={toggleScanlines}
          />
          <EffectToggle
            title="⚡ Circuit Matrix Grid"
            description="Tech-Hintergrund-Raster"
            titleColor="#00d4ff"
            enabled={gridAnimation}
            onToggle={toggleGridAnimation}
          />
        </div>
      )}
    </div>
  );
};
