import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Profile } from '../../types';
import { TrainingHub } from '../TrainingHub';

vi.mock('../../db', () => ({
  // A guest has no account, so the sync lookup never runs; it is mocked away
  // because importing the real module would open a Supabase client.
  getActiveUserSyncInfo: vi.fn().mockResolvedValue(null)
}));

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 3, matches: 7, dartsThrown: 420, pointsScored: 8400, highestThrow: 140, ...over
});

describe('TrainingHub, signed out', () => {
  beforeEach(() => localStorage.clear());

  /**
   * Starting a session used to hand over a profile map holding only the players
   * of that session with zeroed records: every other guest profile disappeared
   * and the participants' statistics were reset — which the booking at the end
   * of the session then wrote to storage. The match screen had the same bug and
   * was fixed; this copy was missed.
   */
  it('keeps the other profiles and their statistics when a session starts', async () => {
    const profiles = {
      'Gast 1': profile(),
      'Gast 2': profile({ wins: 1, matches: 2 }),
      'Bot': profile({ isBot: true })
    };
    const setProfiles = vi.fn();
    const onStartMiniGame = vi.fn();

    render(
      <TrainingHub
        profiles={profiles}
        setProfiles={setProfiles}
        onStartMiniGame={onStartMiniGame}
      />
    );

    fireEvent.click(screen.getByText(/Training starten/i));

    await waitFor(() => expect(onStartMiniGame).toHaveBeenCalled());

    const next = setProfiles.mock.calls[0][0] as Record<string, Profile>;
    expect(Object.keys(next).sort()).toEqual(['Bot', 'Gast 1', 'Gast 2']);
    expect(next['Gast 1'].matches).toBe(7);
    expect(next['Gast 2'].wins).toBe(1);
  });

  it('still creates a record for a name that has none yet', async () => {
    const setProfiles = vi.fn();
    const onStartMiniGame = vi.fn();

    render(
      <TrainingHub profiles={{}} setProfiles={setProfiles} onStartMiniGame={onStartMiniGame} />
    );

    fireEvent.click(screen.getByText(/Training starten/i));
    await waitFor(() => expect(onStartMiniGame).toHaveBeenCalled());

    const next = setProfiles.mock.calls[0][0] as Record<string, Profile>;
    expect(Object.values(next)[0]).toMatchObject({ wins: 0, matches: 0, targetAverage: 40 });
  });
});
