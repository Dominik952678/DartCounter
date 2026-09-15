import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

/**
 * Hält den Bildschirm wach, solange `enabled` gilt (Einstellung
 * „Bildschirm wach halten").
 *
 * Der Browser gibt die Sperre selbst frei, sobald der Tab in den Hintergrund
 * geht — deshalb wird sie beim Zurückkehren neu angefordert. Ohne
 * `navigator.wakeLock` (ältere Safari) oder bei Ablehnung (Energiesparmodus)
 * passiert still nichts: ein dunkler Bildschirm ist lästig, aber kein Fehler,
 * den man melden müsste.
 */
export const useWakeLock = (enabled: boolean) => {
  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    if (!enabled || !wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = await wakeLock.request('screen');
        if (cancelled) {
          void next.release().catch(() => {});
          return;
        }
        sentinel = next;
      } catch {
        // Abgelehnt — der Bildschirm darf dann eben dunkel werden.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [enabled]);
};
