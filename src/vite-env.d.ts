/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL; falls back to the production project. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key for that project. */
  readonly VITE_SUPABASE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
