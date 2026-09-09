import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MatchSetup } from '../MatchSetup';
import { TrainingHub } from '../TrainingHub';
import { DartboardHeatmap } from '../DartboardHeatmap';
import type { Profile } from '../../types';

/**
 * Wo der Slider steht — und wo bewusst nicht.
 *
 * Das ist eine Design-Entscheidung, die kein Typ und kein Lint erzwingt: der
 * Slider sieht überall gut aus, und genau deshalb wandert er mit der Zeit
 * überall hin. Er gehört an geordnete, vollständige, kurze Reihen. Sets/Legs
 * sind ein offener Zahlenbereich und bleiben ein Stepper; Statistik-Filter sind
 * Chips, deren Menge sich mit den Daten ändert, und ein gleitender Thumb würde
 * dort eine Ordnung behaupten, die es nicht gibt.
 *
 * Geprüft wird über die Klasse, weil sie die Bauform benennt: `.slider` ist der
 * Thumb-Slider, `.segment-control` die Chip-Reihe aus `ChoiceGroup`.
 */

const profiles: Record<string, Profile> = {
  Dominik: { wins: 5, matches: 10, dartsThrown: 300, pointsScored: 7500, highestThrow: 180 }
};

beforeEach(() => { localStorage.clear(); });

describe('Match-Setup', () => {
  it('puts a slider on the mode, start score, out mode and player count', () => {
    const { container } = render(<MatchSetup profiles={profiles} onStartGame={vi.fn()} />);

    const names = Array.from(container.querySelectorAll('.slider input[type="radio"]'))
      .map(input => input.getAttribute('name'));

    // `matchMode2v2` ist der Einzel/2v2-Umschalter: genau zwei Optionen, also
    // der Fall, den der Prototyp als Slider zeigt.
    expect(new Set(names)).toEqual(
      new Set(['matchMode2v2', 'startScore', 'outMode', 'playerCount'])
    );
  });

  /** Offener Zahlenbereich bis 10 bzw. 15 — dafür gibt es keine kurze Reihe. */
  it('leaves sets and legs on the stepper', () => {
    const { container } = render(<MatchSetup profiles={profiles} onStartGame={vi.fn()} />);

    expect(container.querySelectorAll('.stepper-box')).toHaveLength(2);
    expect(container.querySelectorAll('.slider input[name="setsToWin"]')).toHaveLength(0);
    expect(container.querySelectorAll('.slider input[name="legsToWin"]')).toHaveLength(0);
  });
});

describe('Training-Setup', () => {
  it('puts a slider on the mode, the player count and every parameter set', () => {
    const { container } = render(
      <TrainingHub profiles={profiles} onStartMiniGame={vi.fn()} initialMode="checkout" />
    );

    const names = Array.from(container.querySelectorAll('.slider input[type="radio"]'))
      .map(input => input.getAttribute('name'));

    // Checkout bringt zwei Parameter mit: Anzahl Ziele und Versuche je Finish.
    expect(new Set(names)).toEqual(
      new Set(['trainingMode', 'playerCount', 'checkoutTargets', 'checkoutRounds'])
    );
  });

  /**
   * Der Modus-Slider ersetzt drei gestapelte Karten. Die Beschreibung, die
   * vorher auf jeder Karte stand, erscheint jetzt nur für den gewählten Modus —
   * sie darf dabei nicht verloren gehen.
   */
  it('describes the mode the slider is on', () => {
    const { container } = render(
      <TrainingHub profiles={profiles} onStartMiniGame={vi.fn()} initialMode="splitscore" />
    );

    expect(container.querySelectorAll('.training-mode-hint')).toHaveLength(1);
    expect(container.querySelector('.training-mode-hint')?.textContent)
      .toContain('halbieren');
  });
});

describe('Statistik-Filter', () => {
  it('leaves the heatmap filter a chip list', () => {
    const { container } = render(<DartboardHeatmap customHits={{ T20: 4 }} />);

    expect(container.querySelectorAll('.slider')).toHaveLength(0);
    expect(container.querySelectorAll('.segment-control')).toHaveLength(1);
  });
});
