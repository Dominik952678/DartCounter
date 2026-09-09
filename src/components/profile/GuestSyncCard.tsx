import React, { useState } from 'react';
import type { GuestSync } from './useGuestSync';
import { ConfirmModal } from '../ConfirmModal';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Button, Card, CardHeader, Icons } from '../ui';

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
  const notify = useNotificationStore(state => state.notify);

  const handleCopyCode = () => {
    if (!info?.code) return;
    navigator.clipboard.writeText(info.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }).catch(() => {
      notify('error', 'Kopieren fehlgeschlagen', 'Der Code konnte nicht in die Zwischenablage kopiert werden.');
    });
  };

  const host = info?.activeHost || info?.activeHosts?.[0];
  const hasLiveCode = !!info?.code && new Date(info.expiresAt) > new Date();

  return (
    <Card style={{ marginTop: '20px' }}>
      <CardHeader
        icon={<Icons.IconDevice size={20} />}
        heading="Gast-Sync & Geräte-Freigaben"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className={`sync-status ${isEnabled ? 'is-on' : ''}`}>
              {isEnabled ? 'Sync aktiv' : 'Sync aus'}
            </span>
            <Button
              type="button"
              variant={isEnabled ? 'secondary' : 'primary'}
              size="compact"
              onClick={() => sync.setEnabled(!isEnabled)}
              disabled={loading}
            >
              {isEnabled ? 'Deaktivieren' : 'Aktivieren'}
            </Button>
          </div>
        }
      />

      {info?.liveMatch && !info.liveMatch.isAborted && (
        <div className="alert alert-error callout-action" role="alert">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Icons.IconTarget size={17} />
              <strong>Live-Match aktiv auf {info.liveMatch.hostName}!</strong>
            </div>
            <div className="stat-label" style={{ marginTop: '4px' }}>
              Dein Profil wird gerade in einem {info.liveMatch.gameType || 'Standard'}-Spiel verwendet.
            </div>
          </div>
          <Button
            type="button"
            variant="dangerText"
            onClick={() => setConfirmAbort(true)}
            disabled={loading}
          >
            <Icons.IconAlert size={17} /> Match remote abbrechen &amp; Trennen
          </Button>
        </div>
      )}

      {confirmAbort && (
        <ConfirmModal
          title="Match remote abbrechen?"
          message={`Das laufende Match auf ${info?.liveMatch?.hostName ?? 'dem Host-Gerät'} wird beendet und die Verbindung getrennt.`}
          confirmLabel="Abbrechen & trennen"
          cancelLabel="Weiterlaufen lassen"
          destructive
          icon={<Icons.IconAlert size={40} />}
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
          <Icons.IconAlert size={18} />
          <span>{sync.error}</span>
        </div>
      )}

      {sync.notice && (
        <div className="alert alert-success" role="status">
          <span>{sync.notice}</span>
        </div>
      )}

      <div className="sync-panel">
        {!isEnabled ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
              Gast-Sync ist aktuell deaktiviert. Dein Profil kann von keinem fremden Gerät verwendet werden.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => sync.setEnabled(true)}
              disabled={loading}
            >
              <Icons.IconCloud size={18} /> Gast-Sync aktivieren
            </Button>
          </div>
        ) : info && hasLiveCode ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="stat-label">Dein aktiver Sync-Code:</span>
                <div className="sync-code">
                  {info.code.slice(0, 3)} {info.code.slice(3)}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Gültig bis: {new Date(info.expiresAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCopyCode}
                >
                  {copiedCode ? <><Icons.IconCheck size={17} /> Kopiert!</> : <><Icons.IconCopy size={17} /> Code kopieren</>}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={sync.generateCode}
                  disabled={loading}
                  title="Generiert einen neuen Code und macht alte Codes ungültig, damit niemand mehr über sie auf dein Profil zugreifen kann"
                >
                  <Icons.IconRefresh size={17} /> Code erneuern
                </Button>
              </div>
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                  Gekoppeltes Host-Gerät:
                </span>
                {host && (
                  <Button
                    type="button"
                    variant="dangerText"
                    onClick={() => sync.revokeHost()}
                    disabled={loading}
                  >
                    <Icons.IconClose size={16} /> Entkoppeln
                  </Button>
                )}
              </div>

              {host ? (
                <div className="sync-host">
                  <div>
                    <strong><Icons.IconDevice size={16} className="icon-inline" />{host.hostName}</strong>
                    <span style={{ color: 'var(--text-dim)', marginLeft: '8px', fontSize: '0.75rem' }}>
                      (Gekoppelt {new Date(host.linkedAt).toLocaleDateString('de-DE')})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="dangerText"
                    onClick={() => sync.revokeHost(host.hostId)}
                    disabled={loading}
                  >
                    Trennen
                  </Button>
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
            <Button
              type="button"
              variant="primary"
              onClick={sync.generateCode}
              disabled={loading}
            >
              {loading ? 'Erzeuge Code…' : <><Icons.IconCloud size={18} /> 6-stelligen Sync-Code generieren</>}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
