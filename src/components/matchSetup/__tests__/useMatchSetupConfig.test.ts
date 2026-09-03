import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { StorageKey, write } from '../../../utils/storage';
import { toGameConfig, useMatchSetupConfig } from '../useMatchSetupConfig';

describe('useMatchSetupConfig', () => {
  beforeEach(() => localStorage.clear());

  it('restores the last configuration', () => {
    write('x01Sets', 3);
    write('x01Legs', 5);
    write('x01StartScore', 701);
    write('x01OutMode', 'MO');

    const { result } = renderHook(() => useMatchSetupConfig());

    expect(result.current[0]).toMatchObject({
      setsToWin: 3,
      legsToWin: 5,
      startScore: 701,
      outMode: 'MO',
      is2v2: false
    });
  });

  /** 1001 was offered by the picker but not accepted back: it fell to 501. */
  it('restores every start score the screen offers', () => {
    write('x01StartScore', 1001);
    expect(renderHook(() => useMatchSetupConfig()).result.current[0].startScore).toBe(1001);
  });

  it('ignores a stored value the screen does not offer', () => {
    write('x01StartScore', 999);
    write('x01OutMode', 'XO');

    const [config] = renderHook(() => useMatchSetupConfig()).result.current;

    expect(config.startScore).toBe(501);
    expect(config.outMode).toBe('DO');
  });

  it('writes changes back for the next match', () => {
    const { result } = renderHook(() => useMatchSetupConfig());

    act(() => result.current[1]({ type: 'startScore', value: 301 }));
    act(() => result.current[1]({ type: 'outMode', value: 'SO' }));

    expect(localStorage.getItem(StorageKey.x01StartScore)).toBe('301');
    expect(localStorage.getItem(StorageKey.x01OutMode)).toBe('SO');
  });

  it('seats four for 2v2 and gives singles its own count back', () => {
    write('x01PlayerCount', 3);
    const { result } = renderHook(() => useMatchSetupConfig());
    expect(result.current[0].playerCount).toBe(3);

    act(() => result.current[1]({ type: 'mode', is2v2: true }));
    expect(result.current[0].playerCount).toBe(4);
    // The four seats belong to the mode; the singles count must survive them.
    expect(localStorage.getItem(StorageKey.x01PlayerCount)).toBe('3');

    act(() => result.current[1]({ type: 'mode', is2v2: false }));
    expect(result.current[0].playerCount).toBe(3);
  });

  it('starts a 2v2 match with four seats when that was the last mode', () => {
    write('x01Is2v2', true);
    write('x01PlayerCount', 2);

    expect(renderHook(() => useMatchSetupConfig()).result.current[0].playerCount).toBe(4);
  });

  it('keeps a half-typed distance out of storage and settles it for the engine', () => {
    write('x01Sets', 3);
    const { result } = renderHook(() => useMatchSetupConfig());

    // The user cleared the field and has not typed the new number yet.
    act(() => result.current[1]({ type: 'sets', value: '' }));

    expect(localStorage.getItem(StorageKey.x01Sets)).toBe('3');
    expect(toGameConfig(result.current[0]).setsToWin).toBe(1);
  });
});
