import { createClient } from '@supabase/supabase-js';

/**
 * The project this build talks to.
 *
 * Hardcoded before, which meant there was no way to point a development build
 * at anything but the live database. `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`
 * override it (see `.env.example`); the fallbacks are the production project,
 * so existing deployments keep working without new configuration. The key is
 * the publishable one — it is meant to ship to the browser, and row-level
 * security is what actually guards the data.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pdbycflxxokbwfsfrmwu.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_vkBLAop52YK5pN6JrIAjfQ__Q9dvli0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Raised when a write did not reach its destination.
 *
 * The write paths used to swallow these and only `console.error` them: a
 * player could finish a 40-minute match, have the cloud reject the insert, and
 * still be shown the full statistics for data that no longer existed anywhere.
 * Callers are now forced to decide what to tell the user.
 */
export class PersistenceError extends Error {
  /** `local` is the browser cache (usually the storage quota); `cloud` is Supabase. */
  readonly scope: 'local' | 'cloud';

  constructor(message: string, scope: 'local' | 'cloud', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PersistenceError';
    this.scope = scope;
  }
}
