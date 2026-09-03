import { create } from 'zustand';
import { supabase, clearCachedUserData } from '../db';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  
  initialize: () => void;
  signIn: (email: string, pass: string) => Promise<{ error: string | null }>;
  signUp: (email: string, pass: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
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
      set({ error: error.message, loading: false });
      return { error: error.message };
    }
    set({ loading: false });
    return { error: null };
  },

  signUp: async (email, password, username) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    });
    if (error) {
      set({ error: error.message, loading: false });
      return { error: error.message };
    }
    set({ loading: false });
    return { error: null };
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

  clearError: () => set({ error: null })
}));
