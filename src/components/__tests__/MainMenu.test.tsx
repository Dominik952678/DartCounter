import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MainMenu } from '../MainMenu';
import { StorageKey } from '../../utils/storage';
import type { MatchHistory, PlayerStats } from '../../types';

/**
 * Der Start-Screen ist seit der Zusammenführung mit dem Setup nicht mehr nur
 * ein Menü: seine große Karte trägt die gespeicherte Konfiguration und startet
 * sie. Was hier geprüft wird, ist genau das — dass die Karte sagt, was sie tut,
 * und dass ihr Tap dort landet, wo die Vorprüfungen laufen.
 */

const player = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  name: 'Anna', sets: 0, legs: 0, avg: '0.0', first9: '0.0', ...over
});

/** Zeigt, wohin navigiert wurde — der Tap ist die halbe Aussage. */
const Landing: React.FC = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="landed">{pathname + search}</div>;
};

const renderHome = (matches?: MatchHistory[]) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<MainMenu matches={matches} />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => { localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

describe('Weiter-Karte', () => {
  /**
   * Ohne diese Reihe wäre „Weiter wie zuletzt" ein Versprechen, das man erst
   * nach dem Tap überprüfen kann.
   */
  it('names the stored configuration on its pills', () => {
    localStorage.setItem(StorageKey.x01StartScore, '701');
    localStorage.setItem(StorageKey.x01OutMode, 'MO');
    localStorage.setItem(StorageKey.x01Legs, '3');
    localStorage.setItem(StorageKey.x01PlayerCount, '3');

    renderHome();

    expect(screen.getByText('701')).toBeInTheDocument();
    expect(screen.getByText('Master Out')).toBeInTheDocument();
    expect(screen.getByText('Bis 3 Legs')).toBeInTheDocument();
    expect(screen.getByText('3 Spieler')).toBeInTheDocument();
  });

  it('says 2v2 Doppel instead of a seat count in doubles', () => {
    localStorage.setItem(StorageKey.x01Is2v2, 'true');
    renderHome();

    expect(screen.getByText('2v2 Doppel')).toBeInTheDocument();
  });

  /**
   * Der schnelle Weg führt durch den Setup-Screen und nicht um ihn herum: dort
   * liegen die Vorprüfungen (gekoppelte Cloud-Profile, gültige Gast-Tokens, ein
   * noch laufendes Match). Sie zu überspringen hieße, den schnellen Weg zum
   * unsicheren zu machen.
   */
  it('starts through the setup screen, not around it', () => {
    renderHome();

    fireEvent.click(screen.getByText('Weiter wie zuletzt'));
    expect(screen.getByTestId('landed')).toHaveTextContent('/offline?start=1');
  });

  it('sends "Anderes Spiel" to the same screen without starting', () => {
    renderHome();

    fireEvent.click(screen.getByText('Anderes Spiel'));
    expect(screen.getByTestId('landed')).toHaveTextContent('/offline');
    expect(screen.getByTestId('landed')).not.toHaveTextContent('start=1');
  });
});

describe('Heute-Kachel', () => {
  const todayIso = () => new Date().toISOString();

  it('shows a dash rather than a zero when nothing was thrown', () => {
    const { container } = renderHome([]);

    const values = Array.from(container.querySelectorAll('.home-figure-value'))
      .map(el => el.textContent);
    // Eine Null behauptet ein Ergebnis, ein Strich sagt „noch nichts".
    expect(values).toEqual(['–', '–', '–']);
  });

  it('counts today matches, 180s and the shortest leg', () => {
    const { container } = renderHome([
      {
        date: 'heute', winner: 'Anna', createdAt: todayIso(),
        players: [player({ oneEighty: 2, bestMatchLeg: 18 }), player({ name: 'Ben', oneEighty: 1, bestMatchLeg: 21 })]
      },
      {
        date: 'heute', winner: 'Anna', createdAt: todayIso(),
        players: [player({ oneEighty: 1, bestMatchLeg: 15 })]
      }
    ]);

    const values = Array.from(container.querySelectorAll('.home-figure-value'))
      .map(el => el.textContent);
    expect(values).toEqual(['2', '4', '15']);
  });

  /** Mono mit tabular-nums, damit 9 → 10 die Spalte daneben nicht verschiebt. */
  it('sets every figure in the tabular mono face', () => {
    const { container } = renderHome([]);
    container.querySelectorAll('.home-figure-value').forEach(el => {
      expect(el).toHaveClass('num-lg');
    });
  });
});

describe('Ambient-Hintergrund', () => {
  /**
   * Ohne `pointer-events: none` fängt die Fläche jeden Tap ab, der neben eine
   * Karte geht, und der halbe Screen wirkt tot. Die Regel selbst steht im
   * Stylesheet; prüfbar ist hier, dass das Element hinter dem Inhalt liegt und
   * für Screenreader nicht existiert.
   */
  it('lies behind the content and is not announced', () => {
    const { container } = renderHome();

    const ambient = container.querySelector('.home-ambient');
    expect(ambient).not.toBeNull();
    expect(ambient).toHaveAttribute('aria-hidden', 'true');
    // Der Inhalt kommt danach im DOM und trägt seine eigene Ebene.
    const body = container.querySelector('.home-body')!;
    expect(ambient!.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
