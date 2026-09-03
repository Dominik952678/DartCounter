import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Profile } from '../../../types';
import { ProfileList } from '../ProfileList';

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const profiles: Record<string, Profile> = {
  Dominik: profile(),
  Bot: profile({ isBot: true }),
  Leon: profile({ isLinkedCloudGuest: true })
};

const renderList = (overrides: Partial<React.ComponentProps<typeof ProfileList>> = {}) => {
  const props = {
    profiles,
    onOpenProfile: vi.fn(),
    onDeleteProfile: vi.fn(),
    onImportGuest: vi.fn(),
    onShowHistory: vi.fn(),
    ...overrides
  };
  render(<ProfileList {...props} />);
  return props;
};

describe('ProfileList', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists every profile and counts them', () => {
    renderList();

    expect(screen.getByText(/Dominik/)).toBeInTheDocument();
    expect(screen.getByText(/Leon/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens the profile that was clicked', () => {
    const { onOpenProfile } = renderList();

    fireEvent.click(screen.getByText(/Dominik/));

    expect(onOpenProfile).toHaveBeenCalledWith('Dominik');
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
  it('offers no delete button for a linked cloud guest', () => {
    renderList();

    expect(screen.queryByTitle('Profil „Leon“ löschen')).not.toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });

  it('says so when there is nothing to list', () => {
    renderList({ profiles: {} });

    expect(screen.getByText(/Noch keine Profile vorhanden/)).toBeInTheDocument();
  });
});
