import React, { useState } from 'react';
import type { Profile } from '../types';
import { redeemSyncCode } from '../db';
import { useAuthStore } from '../store/useAuthStore';
import { resolveHostDeviceId } from '../utils/storage';

interface GuestSyncRedeemModalProps {
  /** What the caller does with the redeemed guest: seat them, list them, both. */
  onImported: (username: string, profile: Profile) => void;
  onClose: () => void;
  title?: string;
  confirmLabel?: string;
}

/**
 * Redeems a cloud guest's six-digit sync code so they can play on this device
 * with their own account's statistics.
 *
 * The match setup and the profile screen each had their own copy of this modal,
 * identical down to the placeholder, differing only in what they did with the
 * guest afterwards — which is what `onImported` is for.
 */
export const GuestSyncRedeemModal: React.FC<GuestSyncRedeemModalProps> = ({
  onImported,
  onClose,
  title = '☁️ Gast via Sync-Code hinzufügen',
  confirmLabel = '➕ Als Mitspieler hinzufügen'
}) => {
  const { user } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [found, setFound] = useState<{ profile: Profile; username: string } | null>(null);

  const handleCheckCode = async () => {
    setError(null);
    setSuccess(null);
    setFound(null);

    const clean = code.replace(/\s+/g, '').trim();
    if (clean.length < 6) {
      setError('Bitte gib den 6-stelligen Sync-Code ein.');
      return;
    }

    setLoading(true);
    const hostName = user?.user_metadata?.username || user?.email || 'Host-Gerät';
    const res = await redeemSyncCode(clean, resolveHostDeviceId(), hostName);
    setLoading(false);

    if (!res.success || !res.profile || !res.username) {
      setError(res.error || 'Code konnte nicht eingelöst werden.');
    } else {
      setFound({ profile: res.profile, username: res.username });
    }
  };

  const handleConfirmImport = () => {
    if (!found) return;
    onImported(found.username, found.profile);
    setSuccess(`Gastkonto @${found.username} erfolgreich hinzugefügt!`);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="modal-content card" style={{
        maxWidth: '440px',
        width: '100%',
        background: 'var(--card)',
        border: '1px solid var(--primary, #00ff88)',
        padding: '24px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1.2rem', padding: '2px 8px' }}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: 1.4 }}>
          Gib den 6-stelligen Code ein, den dein Freund auf seinem Smartphone im Profil-Tab anzeigt:
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            maxLength={7}
            placeholder="z.B. 482 195"
            value={code}
            onChange={e => setCode(e.target.value)}
            style={{
              fontSize: '1.3rem',
              textAlign: 'center',
              letterSpacing: '0.1em',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)'
            }}
            onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
          />
          <button
            className="btn-primary"
            onClick={handleCheckCode}
            disabled={loading || code.trim().length < 6}
            style={{ padding: '0 16px', whiteSpace: 'nowrap' }}
          >
            {loading ? 'Prüfe...' : 'Suchen'}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--red)',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--green, #10B981)',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '14px'
          }}>
            ✅ {success}
          </div>
        )}

        {found && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: found.profile.color || 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#fff'
              }}>
                {found.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                  @{found.username}
                </strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {found.profile.matches || 0} Matches · Ø {found.profile.dartsThrown > 0
                    ? (((found.profile.pointsScored || 0) / found.profile.dartsThrown) * 3).toFixed(1)
                    : '0.0'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button className="btn-primary" onClick={handleConfirmImport} style={{ flex: 1, padding: '10px' }}>
                {confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
