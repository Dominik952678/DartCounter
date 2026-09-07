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

/**
 * How long a message that only confirms something stays up. Errors have no
 * timer: they report that data did not get written, which the player has to
 * see and acknowledge rather than have swept away while they are throwing.
 */
const AUTO_DISMISS_MS = 6000;

let nextId = 1;

const timers = new Map<number, ReturnType<typeof setTimeout>>();

const cancelTimer = (id: number) => {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
};

export const useNotificationStore = create<NotificationState>(set => ({
  notifications: [],

  notify: (type, title, message) => {
    const id = nextId++;
    let added = false;
    set(state => {
      // A write that fails once usually fails on every retry. Collapsing
      // identical messages keeps a broken connection from burying the screen.
      const duplicate = state.notifications.find(n => n.title === title && n.message === message);
      if (duplicate) return state;
      added = true;
      const kept = [{ id, type, title, message }, ...state.notifications];
      kept.slice(MAX_VISIBLE).forEach(n => cancelTimer(n.id));
      return { notifications: kept.slice(0, MAX_VISIBLE) };
    });

    if (added && type !== 'error') {
      timers.set(id, setTimeout(() => {
        useNotificationStore.getState().dismiss(id);
      }, AUTO_DISMISS_MS));
    }
    return id;
  },

  dismiss: id => {
    cancelTimer(id);
    set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
  },

  clear: () => {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    set({ notifications: [] });
  }
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
