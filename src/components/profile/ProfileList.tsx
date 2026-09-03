import React, { useState } from 'react';
import type { Profile } from '../../types';
import { ConfirmModal } from '../ConfirmModal';

interface ProfileListProps {
  profiles: Record<string, Profile>;
  onOpenProfile: (name: string) => void;
  onDeleteProfile: (name: string) => void;
  onImportGuest: () => void;
  onShowHistory: () => void;
}

/** Every profile on this device, and the way into one of them. */
export const ProfileList: React.FC<ProfileListProps> = ({
  profiles,
  onOpenProfile,
  onDeleteProfile,
  onImportGuest,
  onShowHistory
}) => {
  const profileNames = Object.keys(profiles);
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Vorhandene Profile</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={onImportGuest}
            style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '32px' }}
            title="Gastspieler via Sync-Code importieren"
          >
            ☁️ Gast importieren
          </button>
          <span className="card-badge">{profileNames.length}</span>
        </div>
      </div>

      {profileNames.length > 0 ? (
        <div className="profile-chips">
          {profileNames.map(name => {
            const isCloudGuest = profiles[name]?.isLinkedCloudGuest;
            return (
              <div
                key={name}
                className="profile-chip"
                onClick={() => onOpenProfile(name)}
                style={{
                  borderLeftColor: profiles[name]?.color || 'var(--card-border)',
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <span>{isCloudGuest ? '🔗 ' : (profiles[name]?.isBot ? '🤖 ' : '👤 ')} {name}</span>
                {isCloudGuest && (
                  <span style={{
                    fontSize: '0.7em',
                    marginLeft: '4px',
                    background: 'rgba(59, 130, 246, 0.25)',
                    color: 'var(--blue)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    Cloud
                  </span>
                )}
                {/* A cloud guest's profile is not ours to delete; the link is cut instead. */}
                {!isCloudGuest && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setPendingDeletion(name);
                    }}
                    title={`Profil „${name}“ löschen`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      marginLeft: '4px',
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      lineHeight: 1
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red, #ef4444)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', textAlign: 'center', padding: '20px 0' }}>
          Noch keine Profile vorhanden. Erstelle jetzt dein erstes Profil!
        </p>
      )}

      <button className="btn-secondary" onClick={onShowHistory} style={{ marginTop: '16px', width: '100%' }}>
        📜 Match Historie ansehen
      </button>

      {pendingDeletion && (
        <ConfirmModal
          title="Profil löschen?"
          message={`„${pendingDeletion}“ wird mit allen Statistiken entfernt.\nDie gespielten Matches bleiben in der Historie.`}
          confirmLabel="Löschen"
          destructive
          icon="🗑️"
          onConfirm={() => {
            onDeleteProfile(pendingDeletion);
            setPendingDeletion(null);
          }}
          onCancel={() => setPendingDeletion(null)}
        />
      )}
    </div>
  );
};
