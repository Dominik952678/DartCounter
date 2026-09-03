import React, { useState } from 'react';
import type { Profile } from '../../types';
import { saveMatch } from '../../db';
import { useAuthStore } from '../../store/useAuthStore';
import { reportPersistenceError } from '../../store/useNotificationStore';
import { SAMPLE_MATCHES, SAMPLE_PROFILES, SAMPLE_PROFILE_KEYS } from '../../utils/sampleData';

interface SampleDataCardProps {
  profiles: Record<string, Profile>;
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (name: string) => void;
}

/** Loads and removes the demo profiles and matches used to try the app out. */
export const SampleDataCard: React.FC<SampleDataCardProps> = ({ profiles, onUpdateProfile, onDeleteProfile }) => {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<string | null>(null);
  const hasSampleProfiles = SAMPLE_PROFILE_KEYS.some(key => !!profiles[key]);

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(null), 4000);
  };

  const handleLoad = async () => {
    setStatus(null);
    Object.entries(SAMPLE_PROFILES).forEach(([name, prof]) => onUpdateProfile(name, prof));
    try {
      for (const m of SAMPLE_MATCHES) {
        await saveMatch(m, user?.id);
      }
    } catch (err) {
      reportPersistenceError(err, 'Testdaten konnten nicht gespeichert werden');
      return;
    }
    flash('✅ 4 Testprofile & 4 Demospiele erfolgreich geladen! (Deine eigenen Profile bleiben unverändert)');
  };

  const handleRemove = () => {
    setStatus(null);
    SAMPLE_PROFILE_KEYS.forEach(key => {
      if (profiles[key]) onDeleteProfile(key);
    });
    flash('🗑️ Testdaten sauber entfernt. Deine eigenen Stats bleiben unberührt.');
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.3em' }} aria-hidden="true">🧪</span>
          <h2>Testdaten & Demospiele</h2>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Sicheres Ausprobieren</span>
      </div>

      <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
        Lade vorgefertigte Testprofile (z. B. <em>Lukas (Profi)</em>, <em>Stefan (Kneipe)</em>, <em>Leon (Cloud-Gast)</em>) und realistische Demospiele, um alle Statistiken, Heatmaps und den Gast-Sync gefahrlos zu testen.
      </p>

      {status && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: 'var(--blue)',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          marginBottom: '14px'
        }}>
          {status}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleLoad}
          style={{ padding: '9px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          🧪 Testprofile & Demospiele laden
        </button>

        {hasSampleProfiles && (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRemove}
            style={{ padding: '9px 16px', fontSize: '0.88rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--red)' }}
          >
            🗑️ Testdaten wieder entfernen
          </button>
        )}
      </div>
    </div>
  );
};
