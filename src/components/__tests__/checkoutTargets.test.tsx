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

/**
 * Die Ziele einer Sitzung werden einmal gezogen und gelten für alle.
 *
 * Vorher würfelte jeder Spieler bei jedem Zielwechsel seinen eigenen Rest.
 * Damit war das Ergebnis am Ende nicht vergleichbar: wer 32, 40 und 36 bekam,
 * spielte eine andere Sitzung als wer 117, 98 und 113 bekam.
 */
describe('Checkout Training: gemeinsame Ziele', () => {
  const twoPlayers: Record<string, Profile> = {
    Anna: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
    Ben: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
  };

  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const targetsOf = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll('.co-target-label')).map(el => el.textContent ?? '');

  it('shows every target of the session up front, not just the current one', () => {
    const { container } = render(
      <CheckoutTraining
        players={['Anna']}
        profiles={twoPlayers}
        checkoutTargets={6}
        checkoutRounds={1}
        onFinish={vi.fn()}
        onAbort={vi.fn()}
      />
    );

    const labels = targetsOf(container);
    expect(labels).toHaveLength(6);
    // Jede Beschriftung ist ein Rest zwischen 2 und 120 — und nicht die
    // laufende Nummer des Kastens, die vorher in den kommenden Zielen stand.
    labels.forEach(label => {
      const value = Number(label);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(120);
    });
  });

  it('gives the same row of targets to every player', () => {
    const { container } = render(
      <CheckoutTraining
        players={['Anna', 'Ben']}
        profiles={twoPlayers}
        checkoutTargets={5}
        checkoutRounds={1}
        onFinish={vi.fn()}
        onAbort={vi.fn()}
      />
    );

    // Annas Reihe, dann Ben an die Reihe bringen und dessen Reihe vergleichen.
    const annasTargets = targetsOf(container);
    // Der laufende Kasten ist der erste und trägt dasselbe Ziel wie die Reihe.
    expect(container.querySelector('.co-target.is-current .co-target-label')?.textContent)
      .toBe(annasTargets[0]);

    press('Miss'); press('Miss'); press('Miss');

    // Ben wirft jetzt; das Raster zeigt seine Sicht auf dieselben Ziele.
    expect(targetsOf(container)).toEqual(annasTargets);
  });

  /** Und das Ziel, das der zweite Spieler bekommt, ist das erste der Reihe. */
  it('starts the second player on the same first target', async () => {
    const onFinish = vi.fn();
    const { container } = render(
      <CheckoutTraining
        players={['Anna', 'Ben']}
        profiles={twoPlayers}
        checkoutTargets={1}
        checkoutRounds={1}
        onFinish={onFinish}
        onAbort={vi.fn()}
      />
    );

    const firstTarget = Number(targetsOf(container)[0]);

    press('Miss'); press('Miss'); press('Miss');
    await act(async () => { await vi.advanceTimersByTimeAsync(2600); });
    press('Miss'); press('Miss'); press('Miss');
    await act(async () => { await vi.advanceTimersByTimeAsync(2600); });

    const results = onFinish.mock.calls[0][0];
    expect(results).toHaveLength(2);
    results.forEach((r: { checkoutLog: { target: number }[] }) => {
      expect(r.checkoutLog[0].target).toBe(firstTarget);
    });
  });
});
