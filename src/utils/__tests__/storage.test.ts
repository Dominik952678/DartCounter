import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageKey,
  STORAGE_SCHEMA_VERSION,
  migrateStorage,
  readBoolean,
  readInt,
  readJson,
  readOneOf,
  readString,
  remove,
  resolveHostDeviceId,
  write,
  writeJson
} from '../storage';

/**
 * Runs `fn` against a storage that throws on every access — Safari's private
 * mode and a full quota both look like this from the inside.
 */
const withBrokenStorage = (fn: () => void): void => {
  const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => { throw new DOMException('denied', 'SecurityError'); },
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
      removeItem: () => { throw new DOMException('denied', 'SecurityError'); }
    }
  });
  try {
    fn();
  } finally {
    if (real) Object.defineProperty(window, 'localStorage', real);
  }
};

describe('storage registry', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips values under the registered key', () => {
    write('x01StartScore', 501);
    expect(localStorage.getItem(StorageKey.x01StartScore)).toBe('501');
    expect(readInt('x01StartScore', 301)).toBe(501);

    write('scanlines', false);
    expect(readBoolean('scanlines', true)).toBe(false);

    writeJson('savedGame', { players: ['A'] });
    expect(readJson<{ players: string[] } | null>('savedGame', null)).toEqual({ players: ['A'] });
  });

  it('falls back when a number is missing, unparseable or out of range', () => {
    expect(readInt('trainingPlayerCount', 1, { min: 1, max: 4 })).toBe(1);

    localStorage.setItem(StorageKey.trainingPlayerCount, 'zwei');
    expect(readInt('trainingPlayerCount', 1, { min: 1, max: 4 })).toBe(1);

    // A count of 9 reached the picker as a selected value it does not offer.
    localStorage.setItem(StorageKey.trainingPlayerCount, '9');
    expect(readInt('trainingPlayerCount', 1, { min: 1, max: 4 })).toBe(1);
  });

  it('rejects a stored string that is not one of the allowed ones', () => {
    localStorage.setItem(StorageKey.x01OutMode, 'XO');
    expect(readOneOf('x01OutMode', ['SO', 'DO', 'MO'] as const, 'DO')).toBe('DO');

    localStorage.setItem(StorageKey.x01OutMode, 'MO');
    expect(readOneOf('x01OutMode', ['SO', 'DO', 'MO'] as const, 'DO')).toBe('MO');
  });

  it('discards a corrupt JSON value instead of handing it on', () => {
    localStorage.setItem(StorageKey.savedGame, '{"players":');

    expect(readJson('savedGame', null)).toBeNull();
    // Left in place it would fail the same way on every launch.
    expect(localStorage.getItem(StorageKey.savedGame)).toBeNull();
  });

  /**
   * The quota is the realistic failure — a long match with its undo history is
   * hundreds of kilobytes. It used to surface as a console line and a resume
   * feature that had quietly stopped working.
   */
  it('reports a refused write instead of throwing', () => {
    withBrokenStorage(() => {
      expect(write('savedGame', 'x')).toBe(false);
      expect(writeJson('savedGame', { a: 1 })).toBe(false);
    });
  });

  it('answers with the fallback when storage cannot be read at all', () => {
    withBrokenStorage(() => {
      expect(readString('theme', 'classic')).toBe('classic');
      expect(readBoolean('soundEnabled', true)).toBe(true);
    });
  });

  it('keeps one host device id once it has been handed out', () => {
    const first = resolveHostDeviceId();
    expect(first).toMatch(/^host_/);
    expect(resolveHostDeviceId()).toBe(first);

    remove('hostDeviceId');
    expect(resolveHostDeviceId()).not.toBe(first);
  });

  it('stamps the schema version so a later migration can tell what it has seen', () => {
    migrateStorage();
    expect(localStorage.getItem(StorageKey.schemaVersion)).toBe(String(STORAGE_SCHEMA_VERSION));
  });
});
