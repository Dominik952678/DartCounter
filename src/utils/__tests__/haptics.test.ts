import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerHaptic, isHapticsEnabled, setHapticsEnabled } from '../haptics';

describe('Haptic feedback engine', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: vi.fn(),
    });
  });

  it('triggers single vibration for single hit', () => {
    triggerHaptic('single');
    expect(navigator.vibrate).toHaveBeenCalledWith(18);
  });

  it('triggers double vibration pattern for double hit', () => {
    triggerHaptic('double');
    expect(navigator.vibrate).toHaveBeenCalledWith([25, 40, 35]);
  });

  it('triggers triple vibration pattern for triple hit', () => {
    triggerHaptic('triple');
    expect(navigator.vibrate).toHaveBeenCalledWith([30, 30, 30, 30, 50]);
  });

  it('triggers victory vibration pattern on match win', () => {
    triggerHaptic('victory');
    expect(navigator.vibrate).toHaveBeenCalledWith([60, 40, 60, 40, 100, 60, 180]);
  });

  it('respects enabled and disabled settings toggle', () => {
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);

    triggerHaptic('single');
    // When disabled, vibrate should not be called
    expect(navigator.vibrate).not.toHaveBeenCalled();

    setHapticsEnabled(true);
    expect(isHapticsEnabled()).toBe(true);
    triggerHaptic('single');
    expect(navigator.vibrate).toHaveBeenCalledWith(18);
  });
});
