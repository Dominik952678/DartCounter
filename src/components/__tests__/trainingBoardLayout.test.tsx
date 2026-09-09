import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PowerScoring } from '../PowerScoring';
import { SplitScore } from '../SplitScore';
import { CheckoutTraining } from '../CheckoutTraining';
import type { Profile } from '../../types';

/**
 * Die drei Trainingsmodi liegen in `.game-screen-layout`: feste Viewporthöhe,
 * `overflow: hidden`, damit das Keypad nie unter den Bildschirmrand rutscht.
 *
 * Die Verlaufs-Raster hingen anfangs ohne Flex-Kette darin — die
 * Höhenbegrenzung kam unten nie an, und statt zu scrollen wurden sie
 * abgeschnitten. Auf einem iPhone im Querformat fehlte damit die Hälfte.
 *
 * Layout selbst lässt sich hier nicht messen (happy-dom rechnet keins), aber
 * die Kette, von der es abhängt, schon: jedes Glied vom Board bis zum Raster
 * muss schrumpfen dürfen, und das Raster muss scrollen statt zu klippen.
 */

const profiles: Record<string, Profile> = {
  Anna: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
  Ben: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
};

const boards = [
  {
    name: 'Power Scoring',
    grid: '.ps-rounds',
    render: (players: string[]) => (
      <PowerScoring players={players} profiles={profiles} rounds={20} onFinish={vi.fn()} onAbort={vi.fn()} />
    )
  },
  {
    name: 'Split Score',
    grid: '.split-targets',
    render: (players: string[]) => (
      <SplitScore players={players} profiles={profiles} onFinish={vi.fn()} onAbort={vi.fn()} />
    )
  },
  {
    name: 'Checkout Training',
    grid: '.co-targets',
    render: (players: string[]) => (
      <CheckoutTraining
        players={players}
        profiles={profiles}
        checkoutTargets={20}
        checkoutRounds={2}
        onFinish={vi.fn()}
        onAbort={vi.fn()}
      />
    )
  }
];

describe.each(boards)('$name: Board auf dem Telefon', ({ grid, render: renderBoard }) => {
  it('keeps the shrinking chain from the column down to the grid', () => {
    const { container } = render(renderBoard(['Anna']));

    // Die Spalte selbst fängt ab, was trotzdem zu hoch wird.
    expect(container.querySelector('.game-screen-left')).toBeTruthy();
    // Board und Karte müssen wachsen dürfen …
    expect(container.querySelector('.ps-board')).toBeTruthy();
    expect(container.querySelector('.ps-card')).toBeTruthy();
    // … und das Raster ist das Glied, das am Ende scrollt.
    expect(container.querySelector(grid)).toBeTruthy();
  });

  it('keeps the score in a fixed head above the scrolling grid', () => {
    const { container } = render(renderBoard(['Anna']));
    const head = container.querySelector('.ps-card-head');
    const gridEl = container.querySelector(grid);

    expect(head).toBeTruthy();
    expect(gridEl).toBeTruthy();
    // Der Kopf steht vor dem Raster, damit die Punktzahl beim Scrollen bleibt.
    const order = head!.compareDocumentPosition(gridEl!);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Mit vier Spielern hatte jede Karte `minWidth: 140px` und sprengte die
  // Spalte; jetzt bekommt nur der Werfende eine Karte.
  it('gives only the active player a card, the rest a row', () => {
    const { container } = render(renderBoard(['Anna', 'Ben']));
    expect(container.querySelectorAll('.ps-card')).toHaveLength(1);
    expect(container.querySelectorAll('.ps-other')).toHaveLength(1);
  });
});

/**
 * Board und Story-Bild lesen dieselbe Funktion (`liveStats`), damit die
 * Kennzahl am Ende nicht anders gerechnet ist als die, auf die man beim Werfen
 * geschaut hat.
 */
describe('Kennzahlen laufen mit', () => {
  const strip = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.stat-strip-label')).map(el => el.textContent);

  it('shows the average in Power Scoring from the first moment', () => {
    const { container } = render(
      <PowerScoring players={['Anna']} profiles={profiles} rounds={10} onFinish={vi.fn()} onAbort={vi.fn()} />
    );
    expect(strip(container)).toContain('Average');
  });

  it('shows the hit quote in Split Score', () => {
    const { container } = render(
      <SplitScore players={['Anna']} profiles={profiles} onFinish={vi.fn()} onAbort={vi.fn()} />
    );
    expect(strip(container)).toContain('Trefferquote');
  });

  it('shows the check quote and the dart average in Checkout', () => {
    const { container } = render(
      <CheckoutTraining
        players={['Anna']}
        profiles={profiles}
        checkoutTargets={5}
        checkoutRounds={2}
        onFinish={vi.fn()}
        onAbort={vi.fn()}
      />
    );
    expect(strip(container)).toEqual(expect.arrayContaining(['Checkquote', 'Ø Darts']));
  });
});
