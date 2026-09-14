import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MainMenu } from '../MainMenu';
import { StorageKey } from '../../utils/storage';
import type { MatchHistory, PlayerStats } from '../../types';

/**
 * Der Start-Screen trägt genau eine orange Karte, und welche es ist, hängt am
 * Zustand: ein unterbrochenes Match, eine gespeicherte Konfiguration oder der
 * allererste Start. Geprüft wird, dass jede Karte sagt, was sie tut, und dass
 * ihr Tap dort landet, wo die Vorprüfungen laufen.
 */

const player = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  name: 'Anna', sets: 0, legs: 0, avg: '0.0', first9: '0.0', ...over
});

/** Zeigt, wohin navigiert wurde — der Tap ist die halbe Aussage. */
const Landing: React.FC = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="landed">{pathname + search}</div>;
};

const renderHome = (props: React.ComponentProps<typeof MainMenu> = {}) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<MainMenu {...props} />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => { localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

describe('Orange Karte: Weiter wie zuletzt', () => {
  /** Ohne diese Angaben wäre die Karte ein Versprechen, das man erst nach dem Tap prüfen kann. */
  it('names the stored configuration', () => {
    localStorage.setItem(StorageKey.x01StartScore, '701');
    localStorage.setItem(StorageKey.x01OutMode, 'MO');
    localStorage.setItem(StorageKey.x01Legs, '3');
    localStorage.setItem(StorageKey.x01PlayerCount, '3');

    renderHome();

    expect(screen.getByText('Weiter wie zuletzt · ein Tap')).toBeInTheDocument();
    expect(screen.getByText('701 · Master Out')).toBeInTheDocument();
    expect(screen.getByText('Bis 3 Legs · 3 Spieler')).toBeInTheDocument();
  });

  it('says 2v2 Doppel instead of a seat count in doubles', () => {
    localStorage.setItem(StorageKey.x01StartScore, '501');
    localStorage.setItem(StorageKey.x01Is2v2, 'true');
    renderHome();

    expect(screen.getByText(/2v2 Doppel/)).toBeInTheDocument();
  });

  /**
   * Der schnelle Weg führt durch den Setup-Screen und nicht um ihn herum: dort
   * liegen die Vorprüfungen. Sie zu überspringen hieße, den schnellen Weg zum
   * unsicheren zu machen.
   */
  it('starts through the setup screen, not around it', () => {
    localStorage.setItem(StorageKey.x01StartScore, '501');
    renderHome();

    fireEvent.click(screen.getByText('Weiter wie zuletzt · ein Tap'));
    expect(screen.getByTestId('landed')).toHaveTextContent('/play?start=1');
  });

  it('sends "Anderes Spiel" to the same screen without starting', () => {
    localStorage.setItem(StorageKey.x01StartScore, '501');
    renderHome();

    fireEvent.click(screen.getByText('Anderes Spiel'));
    expect(screen.getByTestId('landed')).toHaveTextContent('/play');
    expect(screen.getByTestId('landed')).not.toHaveTextContent('start=1');
  });
});

describe('Orange Karte: erster Start', () => {
  it('invites to play 501 when nothing was configured or played yet', () => {
    renderHome({ matches: [] });

    expect(screen.getByText('Hier anfangen')).toBeInTheDocument();
    fireEvent.click(screen.getByText('501 spielen'));
    expect(screen.getByTestId('landed')).toHaveTextContent('/play?start=1');
  });

  it('offers a profile instead of another game', () => {
    renderHome();

    fireEvent.click(screen.getByText('Profil anlegen'));
    expect(screen.getByTestId('landed')).toHaveTextContent('/profile');
  });
});

describe('Orange Karte: laufendes Match', () => {
  const saved = (over: Record<string, unknown> = {}) => JSON.stringify({
    players: [
      { name: 'Marcus', score: 170, legs: 1, sets: 0 },
      { name: 'Jonas', score: 228, legs: 1, sets: 0 }
    ],
    config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3, is2v2: false },
    ...over
  });

  it('shows who plays, which leg is on and the scores', () => {
    localStorage.setItem(StorageKey.savedGame, saved());
    const { container } = renderHome({ hasSavedGame: true });

    expect(screen.getByText('Fortsetzen · Leg 3')).toBeInTheDocument();
    expect(screen.getByText('Marcus vs Jonas')).toBeInTheDocument();
    expect(container.querySelector('.start-hero-scores')).toHaveTextContent('170·228');
  });

  it('names the set when the match is played in sets', () => {
    localStorage.setItem(StorageKey.savedGame, saved({
      players: [
        { name: 'Marcus', score: 301, legs: 2, sets: 1 },
        { name: 'Jonas', score: 140, legs: 1, sets: 0 }
      ],
      config: { startScore: 501, outMode: 'DO', setsToWin: 3, legsToWin: 3, is2v2: false }
    }));
    renderHome({ hasSavedGame: true });

    expect(screen.getByText('Fortsetzen · Satz 2 · Leg 4')).toBeInTheDocument();
  });

  it('shows the teams in doubles', () => {
    localStorage.setItem(StorageKey.savedGame, saved({
      players: [
        { name: 'Marcus', score: 200, legs: 1, sets: 0, team: 1 },
        { name: 'Lena', score: 180, legs: 0, sets: 0, team: 2 },
        { name: 'Tom', score: 200, legs: 1, sets: 0, team: 1 },
        { name: 'Kai', score: 180, legs: 0, sets: 0, team: 2 }
      ],
      config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3, is2v2: true }
    }));
    renderHome({ hasSavedGame: true });

    expect(screen.getByText('Marcus & Tom vs Lena & Kai')).toBeInTheDocument();
    // Partner zählen dasselbe Leg: gespielt ist eins, also läuft das zweite.
    expect(screen.getByText('Fortsetzen · Leg 2')).toBeInTheDocument();
  });

  it('resumes and discards through the engine', () => {
    const onResumeGame = vi.fn();
    const onDiscardSavedGame = vi.fn();
    localStorage.setItem(StorageKey.savedGame, saved());
    renderHome({ hasSavedGame: true, onResumeGame, onDiscardSavedGame });

    fireEvent.click(screen.getByText('Marcus vs Jonas'));
    expect(onResumeGame).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }));
    expect(onDiscardSavedGame).toHaveBeenCalledTimes(1);
  });

  /** Ein Flag ohne lesbaren Spielstand darf keine leere Karte zeigen. */
  it('falls back to the quick start when the saved game cannot be read', () => {
    localStorage.setItem(StorageKey.x01StartScore, '501');
    renderHome({ hasSavedGame: true });

    expect(screen.getByText('Weiter wie zuletzt · ein Tap')).toBeInTheDocument();
  });
});

describe('Statistik-Kachel', () => {
  const todayIso = () => new Date().toISOString();

  it('shows dashes rather than zeros when nothing was thrown today', () => {
    renderHome({ matches: [] });

    expect(screen.getByText('180er – · Bestes Leg –')).toBeInTheDocument();
  });

  it('counts today matches, 180s and the shortest leg', () => {
    const { container } = renderHome({
      matches: [
        {
          date: 'heute', winner: 'Anna', createdAt: todayIso(),
          players: [player({ oneEighty: 2, bestMatchLeg: 18 }), player({ name: 'Ben', oneEighty: 1, bestMatchLeg: 21 })]
        },
        {
          date: 'heute', winner: 'Anna', createdAt: todayIso(),
          players: [player({ oneEighty: 1, bestMatchLeg: 15 })]
        }
      ] as MatchHistory[]
    });

    expect(container.querySelector('.start-tile-figure .num')).toHaveTextContent('2');
    expect(screen.getByText('180er 4 · Bestes Leg 15')).toBeInTheDocument();
  });
});

describe('Letztes Match', () => {
  it('names the winner of the newest match', () => {
    renderHome({
      matches: [{ date: '13.09.26', winner: 'Anna', players: [player(), player({ name: 'Ben' })] }]
    });

    expect(screen.getByText('Anna gewinnt')).toBeInTheDocument();
  });
});

describe('Dartboard-Grafik', () => {
  it('is decoration and not announced', () => {
    const { container } = renderHome();

    expect(container.querySelector('.start-board')).toHaveAttribute('aria-hidden', 'true');
  });
});
