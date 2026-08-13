import { createClient } from '@supabase/supabase-js';
import type { MatchHistory, Profile } from '../types';

const SUPABASE_URL = 'https://pdbycflxxokbwfsfrmwu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vkBLAop52YK5pN6JrIAjfQ__Q9dvli0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PROFILES_DOC_ID = 'profiles';

export function startSync(_lokaleIp: string) {
  // Sync is now handled natively by Supabase Realtime if we wanted to,
  // but for now we just rely on standard fetches or realtime channels if needed.
  console.log("Connected to Supabase Cloud.");
}

export async function getProfiles(): Promise<Record<string, Profile>> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .eq('id', PROFILES_DOC_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found, return defaults
        return {
          "Gast 1": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
          "Gast 2": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
        };
      }
      throw error;
    }

    return (data?.data as any)?.profiles || {};
  } catch (err) {
    console.error("Error getting profiles", err);
    return {
      "Gast 1": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
      "Gast 2": { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
    };
  }
}

export async function saveProfiles(profiles: Record<string, Profile>): Promise<void> {
  try {
    const docData = { profiles, type: 'profiles' };
    
    // Upsert the profiles document
    const { error } = await supabase
      .from('documents')
      .upsert({ id: PROFILES_DOC_ID, data: docData });

    if (error) throw error;
  } catch (err) {
    console.error("Error saving profiles", err);
  }
}

export async function saveMatch(match: MatchHistory): Promise<void> {
  try {
    match.type = 'match';
    if (!match._id) {
      match._id = 'match_' + new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('documents')
      .insert({ id: match._id, data: match });

    if (error) throw error;
  } catch (err) {
    console.error("Error saving match", err);
  }
}

export async function getMatches(): Promise<MatchHistory[]> {
  try {
    // Note: To match PouchDB descending order, we can sort by id if it's ISO string
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .ilike('id', 'match_%')
      .order('id', { ascending: false });

    if (error) throw error;

    if (!data) return [];

    return data.map(row => row.data as unknown as MatchHistory);
  } catch (err) {
    console.error("Error getting matches", err);
    return [];
  }
}
