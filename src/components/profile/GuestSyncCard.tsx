import React, { useState } from 'react';
import type { GuestSync } from './useGuestSync';
import { ConfirmModal } from '../ConfirmModal';

interface GuestSyncCardProps {
  sync: GuestSync;
}

/**
 * The panel that shares this account's profile with a host device: its code,
 * the coupled host, and the live match running there.
 */
export const GuestSyncCard: React.FC<GuestSyncCardProps> = ({ sync }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const { info, isEnabled, loading } = sync;

  const handleCopyCode = () => {
    if (!info?.code) return;
    navigator.clipboard.writeText(info.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const host = info?.activeHost || info?.activeHosts?.[0];
  const hasLiveCode = !!info?.code && new Date(info.expiresAt) > new Date();

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.3em' }} aria-hidden="true">📱</span>
          <h2>Gast-Sync & Geräte-Freigaben</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: isEnabled ? 'var(--green, #10B981)' : 'var(--text-dim)', fontWeight: 700 }}>
            {isEnabled ? '🟢 Sync Aktiv' : '⚪ Sync Aus'}
          </span>
          <button
            type="button"
            className={isEnabled ? 'btn-secondary' : 'btn-primary'}
            onClick={() => sync.setEnabled(!isEnabled)}
            disabled={loading}
            style={{ padding: '4px 12px', fontSize: '0.78rem', minHeight: '30px' }}
          >
            {isEnabled ? 'Deaktivieren' : 'Aktivieren'}
          </button>
        </div>
      </div>

      {info?.liveMatch && !info.liveMatch.isAborted && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🎯</span>
              <strong style={{ color: 'var(--red, #ef4444)', fontSize: '0.98rem' }}>
                Live-Match aktiv auf {info.liveMatch.hostName}!
              </strong>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Dein Profil wird gerade in einem {info.liveMatch.gameType || 'Standard'}-Spiel verwendet.
            </div>
          </div>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setConfirmAbort(true)}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 800 }}
          >
            🛑 Match remote abbrechen & Trennen
          </button>
        </div>
      )}

      {confirmAbort && (
        <ConfirmModal
          title="Match remote abbrechen?"
          message={`Das laufende Match auf ${info?.liveMatch?.hostName ?? 'dem Host-Gerät'} wird beendet und die Verbindung getrennt.`}
          confirmLabel="Abbrechen & trennen"
          cancelLabel="Weiterlaufen lassen"
          destructive
          icon="🛑"
          onConfirm={async () => {
            setConfirmAbort(false);
            await sync.abortRemoteMatch();
          }}
          onCancel={() => setConfirmAbort(false)}
        />
      )}

      <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
        Teile deinen 6-stelligen Code mit einem Freund (Host), um auf seinem Gerät als Gast zu spielen. Dein Profil kann immer auf maximal einem Host-Gerät gekoppelt sein.
      </p>

      {sync.error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '14px' }}>
          <span aria-hidden="true">⚠️</span>
          <span>{sync.error}</span>
        </div>
      )}

      {sync.notice && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--green, #10B981)',
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          marginBottom: '14px'
        }}>
          {sync.notice}
        </div>
      )}

      <div style={{
        background: 'rgba(0, 0, 0, 0.35)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {!isEnabled ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
              Gast-Sync ist aktuell deaktiviert. Dein Profil kann von keinem fremden Gerät verwendet werden.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => sync.setEnabled(true)}
              disabled={loading}
              style={{ padding: '10px 22px', fontWeight: 800 }}
            >
              ⚡ Gast-Sync aktivieren
            </button>
          </div>
        ) : info && hasLiveCode ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Dein aktiver Sync-Code:
                </span>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  letterSpacing: '0.15em',
                  color: 'var(--primary, #00ff88)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {info.code.slice(0, 3)} {info.code.slice(3)}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Gültig bis: {new Date(info.expiresAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCopyCode}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  {copiedCode ? '✅ Kopiert!' : '📋 Code kopieren'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={sync.generateCode}
                  disabled={loading}
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  title="Generiert einen neuen Code und invalidiert alte Codes (Anti-Stat-Washing)"
                >
                  🔄 Code erneuern
                </button>
              </div>
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                  Gekoppeltes Host-Gerät:
                </span>
                {host && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => sync.revokeHost()}
                    disabled={loading}
                    style={{ padding: '3px 8px', fontSize: '0.74rem', minHeight: '26px' }}
                  >
                    ⛔ Entkoppeln
                  </button>
                )}
              </div>

              {host ? (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <strong style={{ color: 'var(--blue)' }}>📱 {host.hostName}</strong>
                    <span style={{ color: 'var(--text-dim)', marginLeft: '8px', fontSize: '0.75rem' }}>
                      (Gekoppelt {new Date(host.linkedAt).toLocaleDateString('de-DE')})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => sync.revokeHost(host.hostId)}
                    disabled={loading}
                    style={{ padding: '3px 10px', fontSize: '0.75rem', minHeight: '28px' }}
                  >
                    Trennen
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Noch kein Host-Gerät mit diesem Code gekoppelt.
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
              Du hast aktuell keinen aktiven Sync-Code. Erstelle einen Code, um dein Profil auf dem Smartphone/iPad eines Freundes freizugeben.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={sync.generateCode}
              disabled={loading}
              style={{ padding: '10px 20px', fontWeight: 800 }}
            >
              {loading ? 'Erzeuge Code...' : '⚡ 6-stelligen Sync-Code generieren'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
