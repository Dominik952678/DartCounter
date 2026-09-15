import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Profile } from '../../../types';
import { ProfileList } from '../ProfileList';

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const profiles: Record<string, Profile> = {
  Dominik: profile({ matches: 12, dartsThrown: 300, pointsScored: 6000 }),
  Bot: profile({ isBot: true }),
  Leon: profile({ isLinkedCloudGuest: true })
};

const renderList = (overrides: Partial<React.ComponentProps<typeof ProfileList>> = {}) => {
  const props = {
    profiles,
    onOpenProfile: vi.fn(),
    onUpdateProfile: vi.fn(),
    onDeleteProfile: vi.fn(),
    onImportGuest: vi.fn(),
    ...overrides
  };
  render(<ProfileList {...props} />);
  return props;
};

describe('ProfileList', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists every profile with a line of context and counts them', () => {
    renderList();

    expect(screen.getByText('Profile · 3')).toBeInTheDocument();
    expect(screen.getByText('Lokal · 12 Matches · Ø 60.0')).toBeInTheDocument();
    expect(screen.getByText('Cloud-Gast · synchronisiert')).toBeInTheDocument();
  });

  it('opens the profile that was clicked', () => {
    const { onOpenProfile } = renderList();

    fireEvent.click(screen.getByText('Dominik'));

    expect(onOpenProfile).toHaveBeenCalledWith('Dominik');
  });

  it('changes a bot’s strength and a player’s colour on the row', () => {
    const { onUpdateProfile } = renderList();

    fireEvent.change(screen.getByLabelText('Spielstärke von Bot'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Farbe von Dominik'), { target: { value: '#aabbcc' } });

    expect(onUpdateProfile).toHaveBeenCalledWith('Bot', { targetAverage: 80 });
    expect(onUpdateProfile).toHaveBeenCalledWith('Dominik', { color: '#aabbcc' });
  });

  it('asks before deleting, and does not open the profile behind the button', () => {
    const { onDeleteProfile, onOpenProfile } = renderList();

    fireEvent.click(screen.getByTitle('Profil „Dominik“ löschen'));
    expect(onDeleteProfile).not.toHaveBeenCalled();
    expect(onOpenProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Löschen'));
    expect(onDeleteProfile).toHaveBeenCalledWith('Dominik');
  });

  it('keeps the profile when the question is declined', () => {
    const { onDeleteProfile } = renderList();

    fireEvent.click(screen.getByTitle('Profil „Dominik“ löschen'));
    fireEvent.click(screen.getByText('Abbrechen'));

    expect(onDeleteProfile).not.toHaveBeenCalled();
    expect(screen.queryByText('Profil löschen?')).not.toBeInTheDocument();
  });

  /** A cloud guest's profile belongs to their account; the link is cut instead. */
  it('offers to unlink a cloud guest instead of deleting it', () => {
    const { onDeleteProfile } = renderList();

    expect(screen.queryByTitle('Profil „Leon“ löschen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Verknüpfung zu „Leon“ trennen'));
    fireEvent.click(screen.getByText('Trennen'));

    expect(onDeleteProfile).toHaveBeenCalledWith('Leon');
  });

  it('marks the own profile and offers no delete for it', () => {
    renderList({ ownName: 'Dominik' });

    expect(screen.getByText('Du')).toBeInTheDocument();
    expect(screen.queryByTitle('Profil „Dominik“ löschen')).not.toBeInTheDocument();
  });

  it('says so when there is nothing to list', () => {
    renderList({ profiles: {} });

    expect(screen.getByText(/Noch keine Profile vorhanden/)).toBeInTheDocument();
  });
});
