import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from '../useWakeLock';

const installWakeLock = () => {
  const release = vi.fn().mockResolvedValue(undefined);
  const request = vi.fn().mockResolvedValue({ release });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, release };
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
});

describe('useWakeLock', () => {
  it('holds the screen while enabled and lets go on unmount', async () => {
    const { request, release } = installWakeLock();
    const { unmount } = renderHook(() => useWakeLock(true));

    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
    unmount();

    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  });

  it('asks again when the tab comes back', async () => {
    const { request } = installWakeLock();
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('does nothing when switched off', () => {
    const { request } = installWakeLock();
    renderHook(() => useWakeLock(false));

    expect(request).not.toHaveBeenCalled();
  });

  it('stays quiet without support or when the browser refuses', async () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();

    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    renderHook(() => useWakeLock(true));

    await waitFor(() => expect(request).toHaveBeenCalled());
  });
});
