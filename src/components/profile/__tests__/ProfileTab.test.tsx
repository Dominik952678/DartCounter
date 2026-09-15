import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MatchHistory, Profile } from '../../../types';
import { ProfileTab } from '../../ProfileTab';
import { useAuthStore } from '../../../store/useAuthStore';

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const match = (winner: string): MatchHistory => ({
  createdAt: '2026-09-01T18:15:00.000Z',
  date: '01.09.26, 20:15',
  winner,
  players: [{ name: winner, sets: 1, legs: 3, avg: '61.0', first9: '70.0' }]
});

const radioFor = (text: string) =>
  screen.getByText(text).closest('label')!.querySelector('input') as HTMLInputElement;

const renderTab = (props: Partial<React.ComponentProps<typeof ProfileTab>> = {}, entry = '/profile') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ProfileTab
        profiles={{ Dominik: profile() }}
        matches={[match('Dominik')]}
        onCreateProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
        onDeleteProfile={vi.fn()}
        onImportProfiles={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null });
});

/** Profil (Entwurf H1–H3): Einstellungen oben, Spieler und Daten eine Ebene tiefer. */
describe('Mein Profil', () => {
  it('lists the settings with their switches on by default', () => {
    renderTab();

    expect(screen.getByRole('heading', { name: 'Gast' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Standardspiel/ })).toHaveTextContent('Nicht festgelegt');
    expect(screen.getByRole('switch', { name: /Checkout-Hinweise/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Bildschirm wach halten/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Caller/ })).toBeInTheDocument();
  });

  it('remembers a switch that was turned off', () => {
    renderTab();
    fireEvent.click(screen.getByRole('switch', { name: /Checkout-Hinweise/ }));

    expect(localStorage.getItem('dart_checkout_hints')).toBe('false');
  });

  it('saves a default game from its sheet', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Standardspiel/ }));

    fireEvent.click(radioFor('701'));
    fireEvent.click(radioFor('Single Out'));
    fireEvent.click(screen.getByRole('button', { name: /Als Standard speichern/ }));

    expect(JSON.parse(localStorage.getItem('dart_default_game')!)).toMatchObject({ startScore: 701, outMode: 'SO' });
    expect(screen.getByRole('button', { name: /Standardspiel/ })).toHaveTextContent('701 · Single Out');
  });
});

describe('Spieler & Bots', () => {
  it('creates players and lists every profile', () => {
    renderTab({ profiles: { Dominik: profile(), Bot: profile({ isBot: true }) } });
    fireEvent.click(screen.getByRole('button', { name: /Spieler & Bots/ }));

    expect(screen.getByText('Neuer Spieler')).toBeInTheDocument();
    expect(screen.getByText('Profile · 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Spielstärke von Bot')).toBeInTheDocument();
  });
});

describe('Daten & Konto', () => {
  it('offers sign-in, backup and demo data while signed out', () => {
    renderTab({}, '/profile?view=data');

    expect(screen.getByText('Gast-Modus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anmelden' })).toBeInTheDocument();
    expect(screen.getByText('Daten sichern & wiederherstellen')).toBeInTheDocument();
    expect(screen.getByText('Testdaten & Demospiele')).toBeInTheDocument();
    // Die Sync-Karte gehört zu einem Konto.
    expect(screen.queryByText('Gast-Sync & Geräte-Freigaben')).not.toBeInTheDocument();
  });

  it('asks before wiping the device', () => {
    renderTab({}, '/profile?view=data');
    fireEvent.click(screen.getByRole('button', { name: 'Alle Daten auf diesem Gerät löschen' }));

    expect(screen.getByRole('dialog', { name: 'Alle Daten löschen?' })).toHaveTextContent('1 Matches, 1 Profile');
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
