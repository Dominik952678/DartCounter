import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PowerScoring } from '../PowerScoring';
import { SplitScore } from '../SplitScore';
import type { Profile } from '../../types';

/**
 * The three training modes had no tests at all, and two of them computed their
 * score inside a `setState` updater that mutated the previous state.
 * Everything here renders under `StrictMode`, which is what the app itself runs
 * under (`src/main.tsx`): React invokes updaters twice there, so an impure one
 * shows up as a doubled score or a doubled save.
 */

const profiles: Record<string, Profile> = {
  Tester: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
};

const press = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

const shownScore = (container: HTMLElement) =>
  container.querySelector('.score')?.textContent?.trim();

describe('PowerScoring scoring', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  };

  it('reports the sum of the darts thrown, counted once', async () => {
    const onFinish = vi.fn();
    render(
      <StrictMode>
        <PowerScoring
          players={['Tester']}
          profiles={profiles}
          rounds={1}
          onFinish={onFinish}
          onAbort={vi.fn()}
        />
      </StrictMode>
    );

    press('20');
    press('20');
    press('20');

    // 1000 ms round-end delay plus the 500 ms result delay.
    await advance(1600);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([{ name: 'Tester', score: 60 }]);
  });

  it('adds each round exactly once across several rounds', async () => {
    const onFinish = vi.fn();
    const { container } = render(
      <StrictMode>
        <PowerScoring
          players={['Tester']}
          profiles={profiles}
          rounds={2}
          onFinish={onFinish}
          onAbort={vi.fn()}
        />
      </StrictMode>
    );

    press('20'); press('20'); press('20');
    await advance(1100);
    expect(shownScore(container)).toBe('60');

    press('10'); press('10'); press('10');
    await advance(1600);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([{ name: 'Tester', score: 90 }]);
  });
});

describe('SplitScore scoring', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  };

  it('halves the score once when the target is missed', async () => {
    const { container } = render(
      <StrictMode>
        <SplitScore
          players={['Tester']}
          profiles={profiles}
          onFinish={vi.fn()}
          onAbort={vi.fn()}
        />
      </StrictMode>
    );

    // Starts on 40, first target is 15. Three misses halve it to 20 — not to
    // 10, which is what a twice-applied updater produced.
    press('Miss (0)');
    press('Miss (0)');
    press('Miss (0)');
    await advance(1100);

    expect(shownScore(container)).toBe('20');
  });

  it('adds a hit once', async () => {
    const { container } = render(
      <StrictMode>
        <SplitScore
          players={['Tester']}
          profiles={profiles}
          onFinish={vi.fn()}
          onAbort={vi.fn()}
        />
      </StrictMode>
    );

    // 40 + 15 + 15 + 15 = 85.
    press('Single (15)');
    press('Single (15)');
    press('Single (15)');
    await advance(1100);

    expect(shownScore(container)).toBe('85');
  });
});
