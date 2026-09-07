import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationStore } from '../useNotificationStore';

describe('notification store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useNotificationStore.getState().clear();
  });
  afterEach(() => { vi.useRealTimers(); });

  const list = () => useNotificationStore.getState().notifications;

  it('keeps the newest first and caps the list', () => {
    const { notify } = useNotificationStore.getState();
    notify('error', 'Eins', 'a');
    notify('error', 'Zwei', 'b');
    notify('error', 'Drei', 'c');
    notify('error', 'Vier', 'd');

    expect(list()).toHaveLength(3);
    expect(list()[0].title).toBe('Vier');
    expect(list().map(n => n.title)).not.toContain('Eins');
  });

  it('collapses an identical repeat', () => {
    const { notify } = useNotificationStore.getState();
    notify('error', 'Speichern fehlgeschlagen', 'Kein Netz');
    notify('error', 'Speichern fehlgeschlagen', 'Kein Netz');

    expect(list()).toHaveLength(1);
  });

  it('lets a confirmation disappear on its own', () => {
    useNotificationStore.getState().notify('success', 'Gespeichert', 'Alles gut');
    expect(list()).toHaveLength(1);

    vi.advanceTimersByTime(6000);
    expect(list()).toHaveLength(0);
  });

  it('leaves an error standing until it is dismissed', () => {
    const id = useNotificationStore.getState().notify('error', 'Speicher voll', 'Nichts gesichert');

    vi.advanceTimersByTime(60000);
    expect(list()).toHaveLength(1);

    useNotificationStore.getState().dismiss(id);
    expect(list()).toHaveLength(0);
  });

  it('does not resurrect a message that was dismissed before its timer ran', () => {
    const id = useNotificationStore.getState().notify('info', 'Hinweis', 'Kurz');
    useNotificationStore.getState().dismiss(id);
    useNotificationStore.getState().notify('info', 'Anderer', 'Text');

    vi.advanceTimersByTime(6000);
    expect(list()).toHaveLength(0);
  });
});
