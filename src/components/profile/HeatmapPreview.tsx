import React, { useState } from 'react';
import type { Profile } from '../../types';
import { DartboardHeatmap } from '../DartboardHeatmap';

interface HeatmapPreviewProps {
  profiles: Record<string, Profile>;
  /** Which profile to show first — the signed-in player's own, when there is one. */
  initialProfile?: string;
}

/** Where one player's darts land, picked straight from the profile list. */
export const HeatmapPreview: React.FC<HeatmapPreviewProps> = ({ profiles, initialProfile }) => {
  const profileNames = Object.keys(profiles);
  const [selected, setSelected] = useState(initialProfile || profileNames[0] || '');

  if (profileNames.length === 0) return null;

  // The pick falls back whenever the selected profile is deleted underneath it.
  const shown = profiles[selected] ? selected : profileNames[0];

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.15em' }}>🎯 Treffer-Board Vorschau</h3>
        <select
          value={shown}
          onChange={e => setSelected(e.target.value)}
          style={{
            background: '#24242c',
            color: '#fff',
            border: '1px solid var(--card-border)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.85em'
          }}
        >
          {profileNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      <DartboardHeatmap profile={profiles[shown]} title={`2D Heatmap: ${shown}`} />
    </div>
  );
};
