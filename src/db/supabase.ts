import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pdbycflxxokbwfsfrmwu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vkBLAop52YK5pN6JrIAjfQ__Q9dvli0';

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
