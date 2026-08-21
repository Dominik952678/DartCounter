import { createClient } from '@supabase/supabase-js';
import type { MatchHistory, Profile } from '../types';

const SUPABASE_URL = 'https://pdbycflxxokbwfsfrmwu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vkBLAop52YK5pN6JrIAjfQ__Q9dvli0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function startSync(_lokaleIp: string) {
  console.log("Connected to Supabase Cloud.");
}

export function getGuestDefaultProfiles(): Record<string, Profile> {
  return {
    "Gast 1": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' },
    "Gast 2": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--orange)' },
    "Bot": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot: true, targetAverage: 45, color: 'var(--purple)' }
  };
}

export async function getProfiles(userId?: string | null, username?: string): Promise<Record<string, Profile>> {
  // If not logged in, return temporary in-memory guest profiles
  if (!userId) {
    return getGuestDefaultProfiles();
  }

  const docId = `profiles_${userId}`;

  // Try reading from localStorage cache first for fast offline startup
  let cached: Record<string, Profile> | null = null;
  try {
    const raw = localStorage.getItem(docId);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.error("Error reading cached profiles", e);
  }

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .eq('id', docId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Document does not exist yet -> create initial profile with username
        const initialName = username || 'Spieler';
        const initialProfiles: Record<string, Profile> = {
          [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
        };
        await saveProfiles(initialProfiles, userId);
        return initialProfiles;
      }
      if (cached) return cached;
      throw error;
    }

    const fetchedProfiles = (data?.data as any)?.profiles || {};
    if (Object.keys(fetchedProfiles).length === 0) {
      const initialName = username || 'Spieler';
      const initialProfiles: Record<string, Profile> = {
        [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
      };
      await saveProfiles(initialProfiles, userId);
      return initialProfiles;
    }

    // Update local cache
    try {
      localStorage.setItem(docId, JSON.stringify(fetchedProfiles));
    } catch (e) {
      console.error(e);
    }

    return fetchedProfiles;
  } catch (err) {
    console.error("Error getting profiles from Supabase", err);
    if (cached) return cached;
    const initialName = username || 'Spieler';
    return {
      [initialName]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, color: 'var(--blue)' }
    };
  }
}

export async function saveProfiles(profiles: Record<string, Profile>, userId?: string | null): Promise<void> {
  if (!userId) return; // Guests do not write to persistent cloud database

  const docId = `profiles_${userId}`;

  // Always update local cache
  try {
    localStorage.setItem(docId, JSON.stringify(profiles));
  } catch (e) {
    console.error(e);
  }

  try {
    const docData = { profiles, userId, type: 'profiles' };
    const { error } = await supabase
      .from('documents')
      .upsert({ id: docId, data: docData });

    if (error) throw error;
  } catch (err) {
    console.error("Error saving profiles to Supabase", err);
  }
}

export async function saveMatch(match: MatchHistory, userId?: string | null): Promise<void> {
  if (!userId) return; // Guests do not save matches persistently

  const matchId = `match_${userId}_${Date.now()}`;
  match.type = 'match';
  match._id = matchId;
  (match as any).userId = userId;

  // Update local cache of matches
  try {
    const localKey = `matches_${userId}`;
    const existing = localStorage.getItem(localKey);
    const list: MatchHistory[] = existing ? JSON.parse(existing) : [];
    list.unshift(match);
    localStorage.setItem(localKey, JSON.stringify(list.slice(0, 100)));
  } catch (e) {
    console.error(e);
  }

  try {
    const { error } = await supabase
      .from('documents')
      .insert({ id: matchId, data: match });

    if (error) throw error;
  } catch (err) {
    console.error("Error saving match to Supabase", err);
  }
}

export async function getMatches(userId?: string | null): Promise<MatchHistory[]> {
  if (!userId) return []; // Guests have no persistent match history

  const localKey = `matches_${userId}`;
  let cached: MatchHistory[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .ilike('id', `match_${userId}_%`)
      .order('id', { ascending: false });

    if (error) {
      if (cached.length > 0) return cached;
      throw error;
    }

    if (!data) return cached;

    const matches = data.map(row => row.data as unknown as MatchHistory);
    try {
      localStorage.setItem(localKey, JSON.stringify(matches.slice(0, 100)));
    } catch (e) {
      console.error(e);
    }
    return matches;
  } catch (err) {
    console.error("Error getting matches from Supabase", err);
    return cached;
  }
}
