import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Profile } from '../../../types';
import { buildDefaultLineup, useLineup } from '../useLineup';

const player = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const profiles: Record<string, Profile> = {
  Dominik: player(),
  Bot: player({ isBot: true }),
  Anna: player(),
  Tom: player()
};

describe('buildDefaultLineup', () => {
  it('seats the humans first and fills the rest with bots', () => {
    expect(buildDefaultLineup({ Bot: player({ isBot: true }), Anna: player() }))
      .toEqual(['Anna', 'Bot', 'Bot', 'Bot']);
  });

  it('repeats the only profile rather than leaving a seat nameless', () => {
    expect(buildDefaultLineup({ Anna: player() })).toEqual(['Anna', 'Anna', 'Anna', 'Anna']);
  });

  it('has nothing to seat without profiles', () => {
    expect(buildDefaultLineup({})).toEqual([]);
  });
});

describe('useLineup', () => {
  const setup = (playerCount = 4, isGuest = false) =>
    renderHook(() => useLineup(profiles, isGuest, playerCount));

  it('follows the profiles until a seat is chosen by hand', () => {
    const { result } = setup();
    expect(result.current.selectedPlayers).toEqual(['Dominik', 'Anna', 'Tom', 'Bot']);

    act(() => result.current.choosePlayer(0, 'Anna'));
    // Anna was already seated, so the two swap instead of playing twice.
    expect(result.current.selectedPlayers.slice(0, 2)).toEqual(['Anna', 'Dominik']);
  });

  it('only swaps against seats that are actually playing', () => {
    const { result } = setup(2);

    // Tom sits in the third seat, which a two-player match does not use.
    act(() => result.current.choosePlayer(0, 'Tom'));

    expect(result.current.selectedPlayers[0]).toBe('Tom');
    expect(result.current.selectedPlayers[1]).toBe('Anna');
  });

  it('moves a player within the seats that are in play', () => {
    const { result } = setup(2);

    act(() => result.current.movePlayer(0, 'down'));
    expect(result.current.selectedPlayers.slice(0, 2)).toEqual(['Anna', 'Dominik']);

    // Seat 2 is the last one in a two-player match; there is nowhere to go.
    act(() => result.current.movePlayer(1, 'down'));
    expect(result.current.selectedPlayers.slice(0, 2)).toEqual(['Anna', 'Dominik']);
  });

  it('frees the seats of profiles that went away', () => {
    const { result } = setup();
    act(() => result.current.choosePlayer(0, 'Tom'));
    expect(result.current.selectedPlayers[0]).toBe('Tom');

    act(() => result.current.clearSlots(['Tom']));

    // The seat falls back to the default line-up rather than keeping a dead name.
    expect(result.current.selectedPlayers[0]).toBe('Dominik');
  });

  it('marks a guest slot as a bot by the name in it', () => {
    const { result } = renderHook(() => useLineup({}, true, 2));
    expect(result.current.selectedPlayers.slice(0, 2)).toEqual(['Gast 1', 'Gast 2']);

    act(() => result.current.toggleGuestBot(1, true));
    expect(result.current.guestBots['Gast 2']).toBe(true);
  });

  it('lets a guest clear a name field', () => {
    const { result } = renderHook(() => useLineup({}, true, 2));

    act(() => result.current.choosePlayer(0, ''));

    expect(result.current.selectedPlayers[0]).toBe('');
  });
});
