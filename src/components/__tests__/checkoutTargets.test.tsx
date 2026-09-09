import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CheckoutTraining } from '../CheckoutTraining';
import type { Profile } from '../../types';

const profiles: Record<string, Profile> = {
  Tester: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
};

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('Checkout Training: Ziele', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  };

  const renderOneRound = (onFinish = vi.fn()) => {
    // Ein Ziel, eine Runde: nach drei Darts ist die Sitzung vorbei.
    const view = render(
      <CheckoutTraining
        players={['Tester']}
        profiles={profiles}
        checkoutTargets={1}
        checkoutRounds={1}
        onFinish={onFinish}
        onAbort={vi.fn()}
      />
    );
    return { ...view, onFinish };
  };

  /**
   * Der Fall, der still durchrutschte: nicht überworfen, sondern schlicht nicht
   * angekommen. Er lief durch `processEndTurn` statt durch `processBust` — und
   * dieser Zweig protokollierte das Ziel nicht und rief nichts aus. Im Raster
   * und im Story-Bild fehlten damit genau die Ziele, die man nicht geschafft
   * hat, und `attempts` lief dem Log davon.
   */
  it('logs and calls out a target that simply runs out of rounds', async () => {
    const { onFinish } = renderOneRound();

    // Dreimal daneben: kein Überwurf, das Ziel läuft aus.
    press('Miss'); press('Miss'); press('Miss');
    await advance(1500);

    const flash = document.querySelector('.callout-flash');
    expect(flash).not.toBeNull();
    expect(flash).toHaveClass('tone-bad');
    expect(flash?.textContent).toContain('VERPASST');

    await advance(1000);
    const result = onFinish.mock.calls[0][0][0];
    expect(result.checkoutLog).toHaveLength(1);
    expect(result.checkoutLog[0].darts).toBeNull();
    // Log und Versuchszähler dürfen nicht auseinanderlaufen.
    expect(result.checkoutLog).toHaveLength(result.attempts);
  });

  // „Was man checken muss" gehört an den Anfang, nicht erst wenn man nah dran
  // ist — die Ziele liegen zwischen 2 und 120, für alle gibt es einen Weg.
  it('shows the finishing route from the first dart on', () => {
    const { container } = renderOneRound();
    const route = container.querySelector('.co-route-way');
    expect(route).not.toBeNull();
    expect(route?.textContent?.trim()).not.toBe('');
    expect(route?.textContent).not.toContain('Kein Finish');
  });

  it('shows every target of the session from the start', () => {
    render(
      <CheckoutTraining
        players={['Tester']}
        profiles={profiles}
        checkoutTargets={8}
        checkoutRounds={1}
        onFinish={vi.fn()}
        onAbort={vi.fn()}
      />
    );
    expect(document.querySelectorAll('.co-target')).toHaveLength(8);
  });
});
