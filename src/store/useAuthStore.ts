import { create } from 'zustand';
import { supabase, clearCachedUserData } from '../db';
import { translateAuthError } from './authErrors';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  
  initialize: () => void;
  signIn: (email: string, pass: string) => Promise<{ error: string | null }>;
  /** `needsConfirmation` when the project has e-mail confirmation switched on. */
  signUp: (email: string, pass: string, username: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  /** Sends the reset link; the mail lands on `/auth/reset`. */
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Sets the new password for the session the reset link opened. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,
  error: null,

  initialize: () => {
    if (get().initialized) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user || null, initialized: true });
    });

    // Listen for changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user || null });
    });
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = translateAuthError(error.message);
      set({ error: message, loading: false });
      return { error: message };
    }
    set({ loading: false });
    return { error: null };
  },

  signUp: async (email, password, username) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    });
    if (error) {
      const message = translateAuthError(error.message);
      set({ error: message, loading: false });
      return { error: message };
    }
    set({ loading: false });
    // With e-mail confirmation on, Supabase returns no session and logging in
    // fails until the link is clicked — the UI used to promise the opposite.
    return { error: null, needsConfirmation: !data.session };
  },

  signOut: async () => {
    set({ loading: true });
    const previousUserId = get().user?.id;
    await supabase.auth.signOut();
    // The cache is per account: leaving it behind showed the next person on
    // this device the previous user's profiles, matches and sync code.
    clearCachedUserData(previousUserId);
    set({ user: null, session: null, loading: false });
  },

  requestPasswordReset: async email => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`
    });
    set({ loading: false });
    if (error) {
      const message = translateAuthError(error.message);
      set({ error: message });
      return { error: message };
    }
    return { error: null };
  },

  updatePassword: async password => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.updateUser({ password });
    set({ loading: false });
    if (error) {
      const message = translateAuthError(error.message);
      set({ error: message });
      return { error: message };
    }
    return { error: null };
  },

  clearError: () => set({ error: null })
}));
