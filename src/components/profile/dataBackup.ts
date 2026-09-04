import type { MatchHistory, Profile } from '../../types';
import { matchFingerprint } from '../../db';
import { exportSettings } from '../../utils/storage';

/** Bumped when the file's shape changes; older files stay readable. */
export const BACKUP_VERSION = 1;

export interface BackupFile {
  version: number;
  exportedAt: string;
  profiles: Record<string, Profile>;
  matches: MatchHistory[];
  settings: Record<string, string>;
}

export const buildBackup = (
  profiles: Record<string, Profile>,
  matches: MatchHistory[]
): BackupFile => ({
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  profiles,
  matches,
  settings: exportSettings() as Record<string, string>
});

export const backupFileName = (date = new Date()): string =>
  `dartcounter-backup-${date.toISOString().slice(0, 10)}.json`;

/**
 * Reads a backup file, or says why it cannot.
 *
 * A file picker accepts anything the user points at — the wrong JSON, a
 * truncated download, a newer export from a future version — so every field is
 * checked before a single profile is touched.
 */
export const parseBackup = (raw: string): { backup: BackupFile } | { error: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Die Datei ist kein gültiges JSON.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { error: 'Die Datei enthält keine Sicherung.' };
  }

  const candidate = parsed as Partial<BackupFile>;

  if (typeof candidate.version !== 'number') {
    return { error: 'Der Datei fehlt die Versionsangabe — stammt sie aus dieser App?' };
  }
  if (candidate.version > BACKUP_VERSION) {
    return { error: `Die Sicherung stammt aus einer neueren Version (v${candidate.version}). Bitte aktualisiere die App.` };
  }
  if (!candidate.profiles || typeof candidate.profiles !== 'object' || Array.isArray(candidate.profiles)) {
    return { error: 'In der Sicherung fehlen die Profile.' };
  }
  if (!Array.isArray(candidate.matches)) {
    return { error: 'In der Sicherung fehlt die Match-Liste.' };
  }

  const profileEntries = Object.entries(candidate.profiles);
  const looksLikeProfile = ([, value]: [string, unknown]) =>
    !!value && typeof value === 'object' && typeof (value as Profile).matches === 'number';

  if (profileEntries.length > 0 && !profileEntries.every(looksLikeProfile)) {
    return { error: 'Die Profile in der Datei haben nicht die erwartete Form.' };
  }

  return {
    backup: {
      version: candidate.version,
      exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : '',
      profiles: candidate.profiles as Record<string, Profile>,
      matches: candidate.matches as MatchHistory[],
      settings: (candidate.settings ?? {}) as Record<string, string>
    }
  };
};

/** The matches of a backup that this device does not already have. */
export const newMatchesFrom = (backup: BackupFile, existing: MatchHistory[]): MatchHistory[] => {
  const known = new Set(existing.map(matchFingerprint));
  return backup.matches.filter(m => !known.has(matchFingerprint(m)));
};
