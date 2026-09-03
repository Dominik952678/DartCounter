import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMatchPage, matchTimestamp, clearCachedUserData, MATCH_PAGE_SIZE, supabase } from '../database';
import type { MatchHistory } from '../../types';

const match = (overrides: Partial<MatchHistory> = {}): MatchHistory => ({
  date: '01.09.26, 20:15',
  winner: 'Dominik',
  players: [{ name: 'Dominik', sets: 1, legs: 3, avg: '60.0', first9: '65.0' }],
  ...overrides
});

describe('matchTimestamp', () => {
  it('prefers the ISO stamp', () => {
    expect(matchTimestamp(match({ createdAt: '2026-09-01T18:15:00.000Z' })))
      .toBe(Date.parse('2026-09-01T18:15:00.000Z'));
  });

  it('falls back to the millisecond suffix of the document id', () => {
    expect(matchTimestamp(match({ _id: 'match_user_1_1756750500000' }))).toBe(1756750500000);
  });

  /** Matches written before `createdAt` existed only carry the display string. */
  it('parses the German display format as a last resort', () => {
    expect(matchTimestamp(match({ date: '01.09.26, 20:15' })))
      .toBe(new Date(2026, 8, 1, 20, 15).getTime());
  });

  it('reports no date rather than inventing one', () => {
    expect(matchTimestamp(match({ date: 'Gestern, 20:15' }))).toBeNull();
  });
});

describe('getMatchPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns a guest cache newest first and stamps the missing createdAt', async () => {
    localStorage.setItem('matches_guest', JSON.stringify([
      match({ _id: 'match_guest_1756000001000', winner: 'Alt' }),
      match({ _id: 'match_guest_1756000003000', winner: 'Neu' }),
      match({ _id: 'match_guest_1756000002000', winner: 'Mittel' })
    ]));

    const { matches, total } = await getMatchPage(null);

    expect(matches.map(m => m.winner)).toEqual(['Neu', 'Mittel', 'Alt']);
    expect(matches[0].createdAt).toBe(new Date(1756000003000).toISOString());
    expect(total).toBe(3);
  });

  it('hands out only the requested window but still reports the total', async () => {
    localStorage.setItem('matches_guest', JSON.stringify([
      match({ _id: 'match_guest_1756000003000' }),
      match({ _id: 'match_guest_1756000002000' }),
      match({ _id: 'match_guest_1756000001000' })
    ]));

    const { matches, total } = await getMatchPage(null, 2);

    expect(matches).toHaveLength(2);
    expect(total).toBe(3);
  });

  /**
   * The regression: the query had no bound, so every launch downloaded the
   * account's complete match history before the first screen could render.
   */
  it('bounds the cloud query and takes the total from the row count', async () => {
    const range = vi.fn().mockResolvedValue({
      data: [{ data: match({ _id: 'match_user_1_5000' }) }],
      error: null,
      count: 412
    });
    const order = vi.fn().mockReturnValue({ range });
    const ilike = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ ilike });
    vi.spyOn(supabase, 'from').mockReturnValue({ select } as unknown as ReturnType<typeof supabase.from>);

    const { matches, total } = await getMatchPage('user_1');

    expect(select).toHaveBeenCalledWith('data', { count: 'exact' });
    expect(range).toHaveBeenCalledWith(0, MATCH_PAGE_SIZE - 1);
    expect(matches).toHaveLength(1);
    expect(total).toBe(412);
  });
});

describe('clearCachedUserData', () => {
  beforeEach(() => localStorage.clear());

  it('drops the account cache and keeps the device preferences', () => {
    localStorage.setItem('profiles_user_1', '{}');
    localStorage.setItem('matches_user_1', '[]');
    localStorage.setItem('dartcounter_active_sync_code', '{}');
    localStorage.setItem('guest_matches_user_9', '[]');
    localStorage.setItem('dartcounter_theme', 'cyberpunk');
    localStorage.setItem('dart_x01_startScore', '501');

    clearCachedUserData('user_1');

    expect(localStorage.getItem('profiles_user_1')).toBeNull();
    expect(localStorage.getItem('matches_user_1')).toBeNull();
    expect(localStorage.getItem('dartcounter_active_sync_code')).toBeNull();
    expect(localStorage.getItem('guest_matches_user_9')).toBeNull();
    expect(localStorage.getItem('dartcounter_theme')).toBe('cyberpunk');
    expect(localStorage.getItem('dart_x01_startScore')).toBe('501');
  });
});
