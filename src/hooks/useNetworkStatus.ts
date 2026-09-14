import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

/** `false`, sobald der Browser meldet, dass kein Netz da ist. */
export const useNetworkStatus = () =>
  useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
