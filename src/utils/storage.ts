/**
 * The browser storage this app owns, in one registry.
 *
 * Twenty-odd keys were written by hand across stores, hooks and components, in
 * three naming conventions (`dart_*`, `dartcounter_*`, `profiles_*`), each site
 * repeating its own parsing and its own idea of what happens when the value is
 * missing, corrupt or the quota is full. Every key that belongs to the device
 * lives here now, and every read and write goes through these helpers.
 *
 * Account data — a user's profiles, their matches, the sync code, the caches
 * borrowed from linked guests — is keyed by user id and stays with the
 * persistence layer that owns it, in `src/db/localCache.ts`.
 */

export const StorageKey = {
  /** Appearance and feedback; device-wide, never tied to an account. */
  theme: 'dartcounter_theme',
  scanlines: 'dartcounter_scanlines',
  gridAnimation: 'dartcounter_grid',
  glitchEffects: 'dartcounter_glitch',
  soundEnabled: 'dart_sound_enabled',
  hapticsEnabled: 'dart_haptics_enabled',

  /** The match in progress, so a reload or an accidental close can resume it. */
  savedGame: 'dartcounter_saved_game',

  /** Last X01 setup, restored the next time a match is configured. */
  x01StartScore: 'dart_x01_startScore',
  x01OutMode: 'dart_x01_outMode',
  x01Sets: 'dart_x01_sets',
  x01Legs: 'dart_x01_legs',
  x01PlayerCount: 'dart_x01_playerCount',
  x01Is2v2: 'dart_x01_is2v2',

  /** Last training setup, same idea. */
  trainingMode: 'dart_training_mode',
  trainingPlayerCount: 'dart_training_playerCount',
  powerScoringRounds: 'dart_powerscoring_rounds',
  checkoutRounds: 'dart_checkout_rounds',
  checkoutTargets: 'dart_checkout_targets',

  /** Which tab the offline screen was left on. */
  offlineSubtab: 'dart_offline_subtab',

  /** Identity of this device when it hosts for cloud guests, and the name it plays online under. */
  hostDeviceId: 'dartcounter_host_device_id',
  guestOnlineName: 'dart_guest_online_name',

  /** Stamped on first write; the anchor a future migration would key off. */
  schemaVersion: 'dartcounter_storage_version'
} as const;

export type StorageKeyName = keyof typeof StorageKey;

/** Bump together with a migration in `migrateStorage`. */
export const STORAGE_SCHEMA_VERSION = 1;

const keyOf = (name: StorageKeyName): string => StorageKey[name];

/**
 * Reading can throw outright — Safari's private mode and "block all cookies"
 * both make `localStorage` a landmine — so every read answers with the fallback
 * rather than taking the screen down with it.
 */
const readRaw = (name: StorageKeyName): string | null => {
  try {
    return localStorage.getItem(keyOf(name));
  } catch (err) {
    console.warn(`Could not read ${keyOf(name)} from storage`, err);
    return null;
  }
};

export const readString = (name: StorageKeyName, fallback: string): string =>
  readRaw(name) ?? fallback;

/**
 * `readString` with the value constrained to a known set — for the settings
 * that are one of a handful of strings, where a stale or hand-edited value
 * would otherwise reach code that assumes it is valid.
 */
export const readOneOf = <T extends string>(
  name: StorageKeyName,
  allowed: readonly T[],
  fallback: T
): T => {
  const raw = readRaw(name);
  return allowed.includes(raw as T) ? (raw as T) : fallback;
};

export const readNumber = (name: StorageKeyName, fallback: number): number => {
  const raw = readRaw(name);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * A whole number within the range the caller can actually use.
 *
 * Most stored numbers are counts a picker offers — one to four players, at
 * least one round — and each site used to re-implement "parse it, check it is
 * a number, check it is in range, otherwise take the default".
 */
export const readInt = (
  name: StorageKeyName,
  fallback: number,
  bounds: { min?: number; max?: number } = {}
): number => {
  const raw = readRaw(name);
  if (raw === null) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  if (bounds.min !== undefined && parsed < bounds.min) return fallback;
  if (bounds.max !== undefined && parsed > bounds.max) return fallback;
  return parsed;
};

export const readBoolean = (name: StorageKeyName, fallback: boolean): boolean => {
  const raw = readRaw(name);
  if (raw === null) return fallback;
  return raw === 'true';
};

export const readJson = <T>(name: StorageKeyName, fallback: T): T => {
  const raw = readRaw(name);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    // A half-written or hand-edited value is not worth keeping around.
    console.warn(`Discarding unreadable ${keyOf(name)}`, err);
    remove(name);
    return fallback;
  }
};

export const has = (name: StorageKeyName): boolean => readRaw(name) !== null;

/**
 * Writes a value, and reports whether it actually landed.
 *
 * The quota is the realistic failure: a long match with its undo history is
 * measured in hundreds of kilobytes, and a browser that refuses the write says
 * so by throwing. Callers whose feature silently stops working without the
 * write — the match auto-save — check the result and tell the player.
 */
const writeRaw = (name: StorageKeyName, value: string): boolean => {
  try {
    localStorage.setItem(keyOf(name), value);
    return true;
  } catch (err) {
    console.warn(`Could not write ${keyOf(name)} to storage`, err);
    return false;
  }
};

export const write = (name: StorageKeyName, value: string | number | boolean): boolean =>
  writeRaw(name, String(value));

export const writeJson = (name: StorageKeyName, value: unknown): boolean => {
  try {
    return writeRaw(name, JSON.stringify(value));
  } catch (err) {
    console.warn(`Could not serialise ${keyOf(name)}`, err);
    return false;
  }
};

export const remove = (name: StorageKeyName): void => {
  try {
    localStorage.removeItem(keyOf(name));
  } catch (err) {
    console.warn(`Could not remove ${keyOf(name)} from storage`, err);
  }
};

/**
 * Every stored setting that is worth carrying to another device.
 *
 * The match in progress, the schema version and this device's host id are
 * deliberately left out: the first belongs to the device it is being played on,
 * the others describe the installation rather than the player's preferences.
 */
const PORTABLE_KEYS: readonly StorageKeyName[] = [
  'theme', 'scanlines', 'gridAnimation', 'glitchEffects', 'soundEnabled', 'hapticsEnabled',
  'x01StartScore', 'x01OutMode', 'x01Sets', 'x01Legs', 'x01PlayerCount', 'x01Is2v2',
  'trainingMode', 'trainingPlayerCount', 'powerScoringRounds', 'checkoutRounds', 'checkoutTargets',
  'offlineSubtab', 'guestOnlineName'
];

/** The portable settings, by registry name, for a backup file. */
export const exportSettings = (): Partial<Record<StorageKeyName, string>> => {
  const out: Partial<Record<StorageKeyName, string>> = {};
  PORTABLE_KEYS.forEach(name => {
    const value = readRaw(name);
    if (value !== null) out[name] = value;
  });
  return out;
};

/** Restores what `exportSettings` wrote, ignoring anything it does not know. */
export const importSettings = (settings: unknown): void => {
  if (!settings || typeof settings !== 'object') return;
  Object.entries(settings as Record<string, unknown>).forEach(([name, value]) => {
    if (typeof value !== 'string') return;
    if (!PORTABLE_KEYS.includes(name as StorageKeyName)) return;
    writeRaw(name as StorageKeyName, value);
  });
};

/**
 * This device's id as a host for cloud guests, created the first time it hosts.
 *
 * Both places that redeem a sync code used to inline the same "read it, invent
 * one if missing, store it" block, and a guest's link is bound to whichever id
 * the host sent — so two spellings of it would have meant two devices.
 */
export const resolveHostDeviceId = (): string => {
  const existing = readRaw('hostDeviceId');
  if (existing) return existing;
  const id = `host_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  write('hostDeviceId', id);
  return id;
};

/**
 * Brings stored data up to `STORAGE_SCHEMA_VERSION`, then records the version.
 *
 * There is nothing to migrate yet — the point is that the next change to a
 * stored shape has one place to do its rewriting, and one way to tell whether
 * it has already run. Called once at startup.
 */
export const migrateStorage = (): void => {
  const stored = readNumber('schemaVersion', 0);
  if (stored === STORAGE_SCHEMA_VERSION) return;

  // Future migrations run here, in ascending order, guarded by `stored`.

  write('schemaVersion', STORAGE_SCHEMA_VERSION);
};
