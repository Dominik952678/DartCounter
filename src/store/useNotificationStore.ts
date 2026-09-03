import { create } from 'zustand';
import { PersistenceError } from '../db';

export type NotificationType = 'error' | 'success' | 'info';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  notify: (type: NotificationType, title: string, message: string) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

/** Newest first, so the most recent message is the one on screen. */
const MAX_VISIBLE = 3;

let nextId = 1;

export const useNotificationStore = create<NotificationState>(set => ({
  notifications: [],

  notify: (type, title, message) => {
    const id = nextId++;
    set(state => {
      // A write that fails once usually fails on every retry. Collapsing
      // identical messages keeps a broken connection from burying the screen.
      const duplicate = state.notifications.find(n => n.title === title && n.message === message);
      if (duplicate) return state;
      return { notifications: [{ id, type, title, message }, ...state.notifications].slice(0, MAX_VISIBLE) };
    });
    return id;
  },

  dismiss: id => set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),

  clear: () => set({ notifications: [] })
}));

/**
 * Reports a failed write to the user.
 *
 * Every write path funnels through here so that a rejected save is visible
 * rather than a line in the console. Non-persistence errors are re-reported
 * generically instead of being dropped — silence is what this exists to fix.
 */
export function reportPersistenceError(err: unknown, fallbackTitle = 'Speichern fehlgeschlagen'): void {
  const { notify } = useNotificationStore.getState();

  if (err instanceof PersistenceError) {
    notify(
      'error',
      err.scope === 'local' ? 'Speicher voll' : 'Cloud-Synchronisierung fehlgeschlagen',
      err.scope === 'cloud'
        ? `${err.message} Die Daten liegen weiterhin auf diesem Gerät.`
        : err.message
    );
    console.error(err);
    return;
  }

  notify('error', fallbackTitle, err instanceof Error ? err.message : String(err));
  console.error(err);
}
