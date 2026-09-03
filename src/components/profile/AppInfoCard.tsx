import React from 'react';
import { APP_VERSION, BUILD_TIME } from '../../version';

/** Version badge; tapping it offers a reload that clears the service worker cache. */
export const AppInfoCard: React.FC = () => (
  <div style={{
    marginTop: '30px',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: 'var(--text-dim)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  }}>
    <div
      style={{
        padding: '6px 14px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer'
      }}
      onClick={() => {
        if (window.confirm(`DartCounter ${APP_VERSION}\nBuild-Zeit: ${BUILD_TIME}\n\nMöchtest du die App neu laden und den Cache aktualisieren?`)) {
          window.location.reload();
        }
      }}
      title="Klicken zum Neuladen / Cache leeren"
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary-glow)' }} />
      <span><strong>DartCounter Pro</strong> {APP_VERSION}</span>
      <span style={{ opacity: 0.4 }}>•</span>
      <span style={{ opacity: 0.75 }}>Build: {BUILD_TIME}</span>
    </div>
  </div>
);
