import { describe, it, expect, beforeEach } from 'vitest';
import type { MatchHistory, Profile } from '../../../types';
import { StorageKey, write } from '../../../utils/storage';
import {
  BACKUP_VERSION,
  buildBackup,
  backupFileName,
  newMatchesFrom,
  parseBackup
} from '../dataBackup';

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 1, matches: 2, dartsThrown: 60, pointsScored: 1200, highestThrow: 140, ...over
});

const match = (id: string): MatchHistory => ({
  _id: id,
  createdAt: '2026-09-01T18:15:00.000Z',
  date: '01.09.26, 20:15',
  winner: 'Dominik',
  players: [{ name: 'Dominik', sets: 1, legs: 3, avg: '61.0', first9: '70.0' }]
});

describe('buildBackup', () => {
  beforeEach(() => localStorage.clear());

  it('carries the profiles, the matches and the portable settings', () => {
    write('theme', 'cyberpunk');
    write('savedGame', '{"players":[]}');

    const backup = buildBackup({ Dominik: profile() }, [match('m1')]);

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(Object.keys(backup.profiles)).toEqual(['Dominik']);
    expect(backup.matches).toHaveLength(1);
    // Keyed by registry name, not by the raw localStorage key.
    expect(backup.settings).toMatchObject({ theme: 'cyberpunk' });
    expect(backup.settings).not.toHaveProperty(StorageKey.theme);
    // The match in progress belongs to the device it is being played on.
    expect(backup.settings).not.toHaveProperty('savedGame');
  });

  it('names the file by the day it was made', () => {
    expect(backupFileName(new Date('2026-09-03T10:00:00Z'))).toBe('dartcounter-backup-2026-09-03.json');
  });
});

describe('parseBackup', () => {
  const valid = JSON.stringify(buildBackup({ Dominik: profile() }, [match('m1')]));

  it('accepts what buildBackup produced', () => {
    const result = parseBackup(valid);
    expect('backup' in result && Object.keys(result.backup.profiles)).toEqual(['Dominik']);
  });

  it('rejects a file that is not JSON at all', () => {
    expect(parseBackup('not json')).toEqual({ error: expect.stringContaining('JSON') });
  });

  it('rejects JSON that is not a backup', () => {
    expect('error' in parseBackup('{"hello":"world"}')).toBe(true);
    expect('error' in parseBackup(JSON.stringify({ version: 1, profiles: {} }))).toBe(true);
  });

  /** A file from a future version may mean fields this build would drop. */
  it('refuses a newer format instead of guessing', () => {
    const future = JSON.stringify({ ...JSON.parse(valid), version: BACKUP_VERSION + 1 });
    const result = parseBackup(future);
    expect('error' in result && result.error).toMatch(/neueren Version/);
  });

  it('rejects profiles that do not look like profiles', () => {
    const broken = JSON.stringify({ ...JSON.parse(valid), profiles: { Dominik: 'nope' } });
    expect('error' in parseBackup(broken)).toBe(true);
  });
});

describe('newMatchesFrom', () => {
  const backup = buildBackup({}, [match('m1'), match('m2')]);

  it('skips the matches this device already has', () => {
    expect(newMatchesFrom(backup, [match('m1')]).map(m => m._id)).toEqual(['m2']);
  });

  it('recognises a match without an id by what it records', () => {
    const idless = { ...match('x'), _id: undefined };
    const fileWithIdless = buildBackup({}, [idless]);

    expect(newMatchesFrom(fileWithIdless, [idless])).toHaveLength(0);
  });

  it('takes everything when the device has nothing', () => {
    expect(newMatchesFrom(backup, [])).toHaveLength(2);
  });
});
