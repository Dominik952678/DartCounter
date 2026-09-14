import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CheckoutTraining } from '../CheckoutTraining';
import type { Profile } from '../../types';

const profile = (): Profile => ({ wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 });

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const activeName = () => document.querySelector('.ps-card-name')?.textContent;
const meta = () => document.querySelector('.match-meta')?.textContent;

/**
 * Gemeldet: mit mehreren Runden je Ziel spielte, wer in Runde 1 checkte, schon
 * das nächste Ziel, während die anderen noch am ersten saßen. Alle sollen
 * dasselbe Ziel gleichzeitig spielen.
 */
describe('Checkout Training: alle spielen dasselbe Ziel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Jedes Ziel 40: floor(0.32 · 119) + 2.
    vi.spyOn(Math, 'random').mockReturnValue(0.32);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  };

  const renderTwoPlayers = () => render(
    <CheckoutTraining
      players={['Anna', 'Ben']}
      profiles={{ Anna: profile(), Ben: profile() }}
      checkoutTargets={2}
      checkoutRounds={2}
      onFinish={vi.fn()}
      onAbort={vi.fn()}
    />
  );

  it('lets a player who checked sit out until everyone is done with the target', async () => {
    renderTwoPlayers();
    expect(activeName()).toBe('Anna');

    // Anna checks 40 in her first round.
    press('Double'); press(/^Double 20$/);
    await advance(1000);
    expect(activeName()).toBe('Ben');

    // Ben misses his first round — the target stays, and it stays his turn.
    press('Miss'); press('Miss'); press('Miss');
    await advance(1000);
    expect(activeName()).toBe('Ben');
    expect(meta()).toBe('Target 1 / 2');

    // His second round runs out as well: now both move on together.
    press('Miss'); press('Miss'); press('Miss');
    await advance(1000);
    expect(activeName()).toBe('Anna');
    expect(meta()).toBe('Target 2 / 2');
  });

  it('celebrates the check and the missed target', async () => {
    renderTwoPlayers();

    press('Double'); press(/^Double 20$/);
    expect(document.querySelector('.cel-panel')?.textContent).toContain('Check');

    await advance(1000);
    press('Miss'); press('Miss'); press('Miss');
    await advance(1000);
    press('Miss'); press('Miss'); press('Miss');
    await advance(1000);

    const panel = document.querySelector('.cel-panel');
    expect(panel).toHaveClass('is-danger');
    expect(panel?.textContent).toContain('Verpasst');
  });
});
