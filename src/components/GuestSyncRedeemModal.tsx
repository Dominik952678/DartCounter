import React, { useEffect, useId, useRef, useState } from 'react';
import type { Profile } from '../types';
import { redeemSyncCode } from '../db';
import { useAuthStore } from '../store/useAuthStore';
import { resolveHostDeviceId } from '../utils/storage';
import { useModalA11y } from '../hooks/useModalA11y';
import { Button, Icons } from './ui';

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
  title = 'Gast via Sync-Code hinzufügen',
  confirmLabel = 'Als Mitspieler hinzufügen'
}) => {
  const { user } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [found, setFound] = useState<{ profile: Profile; username: string } | null>(null);
  const titleId = useId();
  const codeInputId = useId();
  const dialogRef = useModalA11y<HTMLDivElement>({ onClose });
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const cleanCode = code.replace(/\s+/g, '');

  const handleCheckCode = async () => {
    setError(null);
    setSuccess(null);
    setFound(null);

    if (cleanCode.length < 6) {
      setError('Bitte gib den 6-stelligen Sync-Code ein.');
      return;
    }

    setLoading(true);
    const hostName = user?.user_metadata?.username || user?.email || 'Host-Gerät';
    const res = await redeemSyncCode(cleanCode, resolveHostDeviceId(), hostName);
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
    closeTimeoutRef.current = setTimeout(onClose, 1200);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="modal-content card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '100%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--card-border)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 id={titleId} style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Schließen">
            <Icons.IconClose size={18} />
          </Button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: 1.4 }}>
          Gib den 6-stelligen Code ein, den dein Freund auf seinem Smartphone im Profil-Tab anzeigt:
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <label htmlFor={codeInputId} className="sr-only">6-stelliger Sync-Code</label>
          <input
            id={codeInputId}
            type="text"
            maxLength={7}
            placeholder="z.B. 482 195"
            value={code}
            onChange={e => setCode(e.target.value)}
            style={{
              fontSize: '1.3rem',
              textAlign: 'center',
              letterSpacing: '0.1em',
              fontWeight: 'var(--weight-medium)',
              fontFamily: 'var(--font-mono)'
            }}
            onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
          />
          <Button
            variant="primary"
            onClick={handleCheckCode}
            disabled={loading || cleanCode.length < 6}
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? 'Prüfe…' : 'Suchen'}
          </Button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <Icons.IconAlert size={18} /> <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="status">
            <Icons.IconCheck size={18} /> <span>{success}</span>
          </div>
        )}

        {found && (
          <div style={{
            background: 'var(--surface-card)',
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
                background: found.profile.color || 'var(--player-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'var(--weight-medium)',
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
              <Button variant="primary" onClick={handleConfirmImport} style={{ flex: 1 }}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
