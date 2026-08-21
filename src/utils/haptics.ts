// src/utils/haptics.ts

const HAPTICS_KEY = 'dart_haptics_enabled';

export function isHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(HAPTICS_KEY);
  return stored === null ? true : stored === 'true';
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HAPTICS_KEY, enabled.toString());
}

export type HapticType = 'click' | 'single' | 'double' | 'triple' | '180' | 'bust' | 'victory';

export function triggerHaptic(type: HapticType = 'single'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!navigator.vibrate || !isHapticsEnabled()) return;

  try {
    switch (type) {
      case 'click':
        navigator.vibrate(10);
        break;
      case 'single':
        navigator.vibrate(18);
        break;
      case 'double':
        navigator.vibrate([25, 40, 35]);
        break;
      case 'triple':
        navigator.vibrate([30, 30, 30, 30, 50]);
        break;
      case '180':
        navigator.vibrate([60, 40, 60, 40, 80, 50, 120]);
        break;
      case 'bust':
        navigator.vibrate([80, 50, 80]);
        break;
      case 'victory':
        navigator.vibrate([60, 40, 60, 40, 100, 60, 180]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Ignore environments where vibration fails or is disallowed
  }
}
