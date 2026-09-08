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

/** Power Scoring zeigt die Gesamtpunktzahl in der Karte des aktiven Spielers. */
const shownTotal = (container: HTMLElement) =>
  container.querySelector('.ps-card-total')?.textContent?.trim();

/** Die Werte der Runden-Kästen, `–` für noch nicht geworfen. */
const shownRounds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.ps-round-value')).map(el => el.textContent?.trim());

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
    expect(onFinish).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Tester', score: 60 })
    ]);
  });

  // Das Story-Bild und das Runden-Raster lesen beide aus diesen Feldern; ohne
  // sie zeigt das Raster dauerhaft „–" und das Bild eine leere Heatmap.
  it('records every round, the darts and the segments hit', async () => {
    const onFinish = vi.fn();
    render(
      <StrictMode>
        <PowerScoring players={['Tester']} profiles={profiles} rounds={1} onFinish={onFinish} onAbort={vi.fn()} />
      </StrictMode>
    );

    press('Triple');
    press('Triple 20');
    press('20');
    press('5');

    await advance(1600);

    const result = onFinish.mock.calls[0][0][0];
    expect(result.score).toBe(85);
    expect(result.roundScores).toEqual([85]);
    expect(result.dartsThrown).toBe(3);
    expect(result.triplesHit).toBe(1);
    // Genauer Schluessel plus nackte Zahl, wie im X01-Match.
    expect(result.segmentHits).toMatchObject({ T20: 1, S20: 1, S5: 1, '20': 2, '5': 1 });
  });

  it('shows every configured round from the start, unthrown ones as a dash', () => {
    const { container } = render(
      <StrictMode>
        <PowerScoring players={['Tester']} profiles={profiles} rounds={7} onFinish={vi.fn()} onAbort={vi.fn()} />
      </StrictMode>
    );

    expect(shownRounds(container)).toEqual(['–', '–', '–', '–', '–', '–', '–']);
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
    expect(shownTotal(container)).toBe('60');
    // Erste Runde gebucht, die zweite steht noch offen.
    expect(shownRounds(container)).toEqual(['60', '–']);

    press('10'); press('10'); press('10');
    await advance(1600);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Tester', score: 90, roundScores: [60, 30] })
    ]);
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

/**
 * Der namensgebende Moment des Modus: verfehlt man das Ziel, wird der Punkte-
 * stand halbiert. Vorher rief der Caller „Halbiert" und optisch passierte
 * nichts — jetzt sagt er „Split" und der Zuruf steht groß über dem Board.
 */
describe('Split Score: der Split', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  };

  it('calls SPLIT and halves the score when the target is missed', async () => {
    const audio = await import('../../utils/audio');
    const speak = vi.spyOn(audio, 'speak').mockImplementation(() => {});

    render(
      <StrictMode>
        <SplitScore players={['Tester']} profiles={profiles} onFinish={vi.fn()} onAbort={vi.fn()} />
      </StrictMode>
    );

    // Erstes Ziel ist die 15 — dreimal daneben verfehlt es.
    press('Miss (0)'); press('Miss (0)'); press('Miss (0)');
    await advance(1200);

    expect(speak).toHaveBeenCalledWith('Split');
    // Der große Zuruf über dem Board. Der erledigte Ziel-Kasten im Raster
    // zeigt ebenfalls „SPLIT", deshalb wird hier gezielt der Zuruf geprüft.
    const flash = document.querySelector('.callout-flash');
    expect(flash).not.toBeNull();
    expect(flash).toHaveClass('tone-bad');
    expect(flash?.textContent).toContain('SPLIT');
    // Startpunktzahl 40, halbiert auf 20.
    expect(flash?.textContent).toContain('Halbiert auf 20');
  });

  it('does not call SPLIT when the target is hit', async () => {
    const audio = await import('../../utils/audio');
    const speak = vi.spyOn(audio, 'speak').mockImplementation(() => {});

    render(
      <StrictMode>
        <SplitScore players={['Tester']} profiles={profiles} onFinish={vi.fn()} onAbort={vi.fn()} />
      </StrictMode>
    );

    press('Single (15)'); press('Single (15)'); press('Single (15)');
    await advance(1200);

    expect(speak).not.toHaveBeenCalledWith('Split');
    expect(document.querySelector('.callout-flash')).toBeNull();
  });
});
