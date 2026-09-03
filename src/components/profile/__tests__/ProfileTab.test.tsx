import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MatchHistory, Profile } from '../../../types';
import { ProfileTab } from '../../ProfileTab';

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const match = (winner: string): MatchHistory => ({
  createdAt: '2026-09-01T18:15:00.000Z',
  date: '01.09.26, 20:15',
  winner,
  players: [{ name: winner, sets: 1, legs: 3, avg: '61.0', first9: '70.0' }]
});

const renderTab = (props: Partial<React.ComponentProps<typeof ProfileTab>> = {}) =>
  render(
    <MemoryRouter>
      <ProfileTab
        profiles={{ Dominik: profile() }}
        matches={[match('Dominik')]}
        onCreateProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
        onDeleteProfile={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );

/** The screen is three views in one route; this checks each is reachable. */
describe('ProfileTab', () => {
  beforeEach(() => localStorage.clear());

  it('shows the player list with the settings cards below it', () => {
    renderTab();

    expect(screen.getByText('Neues Profil erstellen')).toBeInTheDocument();
    expect(screen.getByText('Vorhandene Profile')).toBeInTheDocument();
    expect(screen.getByText('🎨 Design & Theme')).toBeInTheDocument();
    expect(screen.getByText('Testdaten & Demospiele')).toBeInTheDocument();
  });

  it('offers the cloud login while signed out', () => {
    renderTab();
    expect(screen.getByText('🔑 Cloud-Login')).toBeInTheDocument();
    // The sync panel belongs to an account.
    expect(screen.queryByText('Gast-Sync & Geräte-Freigaben')).not.toBeInTheDocument();
  });

  it('switches to the history and back', () => {
    renderTab();

    fireEvent.click(screen.getByText(/Match Historie ansehen/));
    expect(screen.getByText('📜 Match Historie')).toBeInTheDocument();
    expect(screen.getByText('🏆 Dominik')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Zurück/));
    expect(screen.getByText('Vorhandene Profile')).toBeInTheDocument();
  });

  it('opens a player dashboard from the list', () => {
    renderTab();

    fireEvent.click(screen.getByText(/👤 Dominik/));

    // The dashboard replaces the list; its own header carries the name.
    expect(screen.queryByText('Neues Profil erstellen')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Dominik/).length).toBeGreaterThan(0);
  });

  it('offers "Mehr laden" in the history only when more matches exist', () => {
    const { unmount } = renderTab();
    fireEvent.click(screen.getByText(/Match Historie ansehen/));
    expect(screen.queryByText('Mehr laden')).not.toBeInTheDocument();
    unmount();

    renderTab({ hasMoreMatches: true, onLoadMoreMatches: vi.fn() });
    fireEvent.click(screen.getByText(/Match Historie ansehen/));
    expect(screen.getByText('Mehr laden')).toBeInTheDocument();
  });
});
