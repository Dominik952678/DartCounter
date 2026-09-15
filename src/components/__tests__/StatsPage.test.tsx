import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { MatchHistory, PlayerStats, Profile } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

vi.mock('../../db', async importOriginal => ({
  ...(await importOriginal<typeof import('../../db')>()),
  getMatches: vi.fn().mockResolvedValue([])
}));

const { StatsPage } = await import('../StatsPage');

/** Statistik (Entwurf G1–G6): alle Kennzahlen, Filter, Direktvergleich und Historie. */

const radioFor = (text: string) =>
  screen.getByText(text).closest('label')!.querySelector('input') as HTMLInputElement;

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const stat = (name: string, over: Partial<PlayerStats> = {}): PlayerStats => ({
  name, sets: 0, legs: 0, avg: '0', first9: '0', ...over
});

const x01 = (over: Partial<MatchHistory> = {}): MatchHistory => ({
  createdAt: '2026-09-13T18:00:00.000Z',
  date: '13.09.26, 20:00',
  winner: 'Dominik',
  gameType: 'standard',
  config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 },
  players: [
    stat('Dominik', { legs: 2, avg: '75.2', matchPts: 1503, matchDarts: 60, checkoutAttempts: 6, checkoutSuccesses: 3, legHistory: ['70.1', '80.3'] }),
    stat('Jonas', { legs: 1, avg: '54.0', matchPts: 1080, matchDarts: 60 })
  ],
  ...over
});

const profiles = {
  Dominik: profile({ wins: 6, matches: 10, dartsThrown: 300, pointsScored: 6000, highestThrow: 180, bestLegDarts: 12, oneEighty: 4 }),
  Jonas: profile({ wins: 4, matches: 10, dartsThrown: 300, pointsScored: 5400, highestThrow: 140, bestLegDarts: 15 })
};

const renderStats = (props: Partial<React.ComponentProps<typeof StatsPage>> = {}, entry = '/stats') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/stats" element={<StatsPage profiles={profiles} matches={[x01()]} {...props} />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null });
});

describe('Überblick', () => {
  it('shows the six figures with the last five', () => {
    renderStats();

    ['Siegquote', 'Average', 'Erste 9', 'Checkout', 'Darts pro Leg', 'Triple-Quote']
      .forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByText('75.15')).toBeInTheDocument();
    expect(screen.getByText('20.0')).toBeInTheDocument();
    expect(screen.getByText('Ø für 501')).toBeInTheDocument();
  });

  it('shows an empty state online and points to a room', () => {
    renderStats();
    fireEvent.click(radioFor('Online'));

    expect(screen.getByText('Noch keine Online-Matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Online spielen' })).toBeInTheDocument();
  });

  it('opens with the player from the link', () => {
    renderStats({}, '/stats?player=Jonas');
    expect(screen.getByLabelText('Spieler')).toHaveValue('Jonas');
  });
});

describe('Rekorde', () => {
  it('compares two players on eleven figures', () => {
    renderStats();
    fireEvent.click(radioFor('Rekorde'));

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(12);
    expect(within(table).getByText('Höchstes Finish')).toBeInTheDocument();
    expect(screen.getByText('Mini-Games')).toBeInTheDocument();
    // Einmal als Rekord-Kachel, einmal als Zeile im Direktvergleich.
    expect(screen.getAllByText('Bester Wurf')).toHaveLength(2);
  });
});

describe('Training', () => {
  it('shows best and average score for a training mode', () => {
    const power = (score: number): MatchHistory => ({
      createdAt: '2026-09-12T18:00:00.000Z', date: '12.09.26', winner: 'Dominik', gameType: 'powerScoring',
      players: [stat('Dominik', { score })]
    });
    const { container } = renderStats({ matches: [power(812), power(600)] });
    fireEvent.change(screen.getByLabelText('Modus'), { target: { value: 'powerScoring' } });

    // Die Kacheln, nicht die Match-Liste darunter, die dieselben Punkte zeigt.
    const kpis = within(container.querySelector('.stats-kpis') as HTMLElement);
    expect(kpis.getByText('Bestpunktzahl')).toBeInTheDocument();
    expect(kpis.getByText('812')).toBeInTheDocument();
    expect(kpis.getByText('706')).toBeInTheDocument();
  });
});

describe('Matches', () => {
  it('lists the latest match and opens the history', () => {
    renderStats();

    expect(screen.getByText('Sieg gegen Jonas')).toBeInTheDocument();
    expect(screen.getByText(/^2–1 Legs · 501 DO/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }));

    expect(screen.getByRole('heading', { name: 'Matches' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Statistik/ }));
    expect(screen.getByRole('heading', { name: 'Statistik' })).toBeInTheDocument();
  });

  it('offers "Mehr laden" only when more matches exist', () => {
    const { unmount } = renderStats({}, '/stats?view=matches');
    expect(screen.queryByText('Mehr laden')).not.toBeInTheDocument();
    unmount();

    renderStats({ hasMoreMatches: true, onLoadMoreMatches: vi.fn() }, '/stats?view=matches');
    expect(screen.getByText('Mehr laden')).toBeInTheDocument();
  });

  /** Trainings speichern keine Leg-Averages, da gibt es nichts zu zeichnen. */
  it('shows the leg chart only for matches that recorded legs', () => {
    const { unmount } = renderStats({ matches: [x01({ players: [stat('Dominik'), stat('Jonas')] })] }, '/stats?view=matches');
    fireEvent.click(screen.getByText('Sieg gegen Jonas'));
    expect(screen.queryByText('Leg-Verlauf')).not.toBeInTheDocument();
    unmount();

    renderStats({}, '/stats?view=matches');
    fireEvent.click(screen.getByText('Sieg gegen Jonas'));
    expect(screen.getByText('Leg-Verlauf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Als Bild teilen/ })).toBeInTheDocument();
  });
});
