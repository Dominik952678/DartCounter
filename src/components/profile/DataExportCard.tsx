import React, { useRef, useState } from 'react';
import type { MatchHistory, Profile } from '../../types';
import { getMatches, saveMatch } from '../../db';
import { useAuthStore } from '../../store/useAuthStore';
import { reportPersistenceError } from '../../store/useNotificationStore';
import { importSettings } from '../../utils/storage';
import { ConfirmModal } from '../ConfirmModal';
import {
  backupFileName,
  buildBackup,
  newMatchesFrom,
  parseBackup,
  type BackupFile
} from './dataBackup';

interface DataExportCardProps {
  profiles: Record<string, Profile>;
  /** The loaded window; the card reads the full history itself when it needs it. */
  matches: MatchHistory[];
  /** The one path that writes profiles; a loop of single updates is not it. */
  onImportProfiles: (next: Record<string, Profile>) => Promise<void> | void;
  /** Reload the match list once imported matches have been written. */
  onMatchesChanged?: () => void;
}

type PendingImport = { backup: BackupFile; mode: 'merge' | 'replace' };

/**
 * Takes the account's data out of the app and back in again.
 *
 * The cloud is one copy and this device is the other; a file the player keeps
 * is the third, and the only one that survives losing access to both.
 */
export const DataExportCard: React.FC<DataExportCardProps> = ({
  profiles,
  matches,
  onImportProfiles,
  onMatchesChanged
}) => {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupFile | null>(null);
  /**
   * Every match the account has, not just the page the screen is showing.
   *
   * The card was handed the loaded window of 100, which would have written a
   * "complete" backup that quietly ended at the hundredth match, and counted a
   * re-import against those 100 alone.
   */
  const [allMatches, setAllMatches] = useState<MatchHistory[] | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setError(null);
    setBusy(true);
    try {
      const history = await getMatches(user?.id);
      setAllMatches(history);

      const blob = new Blob([JSON.stringify(buildBackup(profiles, history), null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName();
      link.click();
      // Released on the next tick: revoking it in the same one cancels the
      // download in browsers that fetch the blob asynchronously.
      setTimeout(() => URL.revokeObjectURL(url), 0);

      setStatus(`Sicherung erstellt: ${Object.keys(profiles).length} Profile, ${history.length} Matches.`);
    } catch (err) {
      reportPersistenceError(err, 'Sicherung konnte nicht erstellt werden');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setStatus(null);
    setPreview(null);

    const result = parseBackup(await file.text());
    if ('error' in result) {
      setError(result.error);
      return;
    }
    // Loaded before the preview so its "already here" count is the true one.
    setAllMatches(await getMatches(user?.id));
    setPreview(result.backup);
  };

  const runImport = async ({ backup, mode }: PendingImport) => {
    setBusy(true);
    try {
      const nextProfiles = mode === 'replace'
        ? { ...backup.profiles }
        : { ...profiles, ...backup.profiles };
      await onImportProfiles(nextProfiles);

      const fresh = newMatchesFrom(backup, allMatches ?? matches);
      for (const m of fresh) {
        await saveMatch(m, user?.id);
      }

      importSettings(backup.settings);
      onMatchesChanged?.();
      setStatus(`Wiederhergestellt: ${Object.keys(backup.profiles).length} Profile, ${fresh.length} neue Matches.`);
      setPreview(null);
    } catch (err) {
      reportPersistenceError(err, 'Sicherung konnte nicht eingespielt werden');
    } finally {
      setBusy(false);
    }
  };

  const known = allMatches ?? matches;
  const previewMatches = preview ? newMatchesFrom(preview, known).length : 0;

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.3em' }} aria-hidden="true">💾</span>
          <h2>Daten sichern & wiederherstellen</h2>
        </div>
      </div>

      <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
        Lade alle Profile, Matches und Einstellungen als JSON-Datei herunter — als Backup oder um sie auf ein anderes Gerät zu bringen. Beim Einspielen werden bereits vorhandene Matches übersprungen.
      </p>

      {status && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--green, #10B981)',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          marginBottom: '14px'
        }}>
          ✅ {status}
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--red)',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          marginBottom: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {preview && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '14px'
        }}>
          <strong style={{ fontSize: '0.95rem' }}>
            {Object.keys(preview.profiles).length} Profile · {preview.matches.length} Matches
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {preview.exportedAt
              ? `Gesichert am ${new Date(preview.exportedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Ohne Datum gesichert'}
            {' · '}
            {previewMatches} davon sind hier noch nicht vorhanden
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => setPending({ backup: preview, mode: 'merge' })}
              style={{ flex: '1 1 150px', padding: '10px' }}
            >
              ➕ Zusammenführen
            </button>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => setPending({ backup: preview, mode: 'replace' })}
              style={{ flex: '1 1 150px', padding: '10px', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--red)' }}
            >
              ♻️ Profile ersetzen
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => setPreview(null)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleExport}
          disabled={busy}
          style={{ padding: '9px 16px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          ⬇️ Daten exportieren
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: '9px 16px', fontSize: '0.88rem' }}
        >
          ⬆️ Sicherung einspielen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          aria-label="Sicherungsdatei auswählen"
          onChange={e => {
            const file = e.target.files?.[0];
            // Cleared so picking the same file twice fires the change again.
            e.target.value = '';
            if (file) handleFile(file);
          }}
        />
      </div>

      {pending && (
        <ConfirmModal
          title={pending.mode === 'replace' ? 'Profile ersetzen?' : 'Sicherung zusammenführen?'}
          message={pending.mode === 'replace'
            ? `Die ${Object.keys(profiles).length} Profile auf diesem Gerät werden durch die ${Object.keys(pending.backup.profiles).length} aus der Datei ersetzt.\nMatches werden nicht gelöscht — ${previewMatches} neue kommen hinzu.`
            : `${Object.keys(pending.backup.profiles).length} Profile werden übernommen; gleichnamige Profile auf diesem Gerät werden dabei überschrieben.\n${previewMatches} neue Matches kommen hinzu.`}
          confirmLabel={pending.mode === 'replace' ? 'Ersetzen' : 'Zusammenführen'}
          destructive={pending.mode === 'replace'}
          icon="💾"
          onConfirm={async () => {
            const job = pending;
            setPending(null);
            await runImport(job);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
};
