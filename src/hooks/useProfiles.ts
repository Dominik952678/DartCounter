import { useState, useEffect, useCallback } from 'react';
import type { Profile } from '../types';
import { getProfiles, saveProfiles } from '../db/database';

export function useProfiles(user?: { id: string; user_metadata?: { username?: string } } | null) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const loadProfiles = useCallback(async () => {
    const username = user?.user_metadata?.username;
    const loaded = await getProfiles(user?.id, username);
    setProfiles(loaded);
  }, [user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleCreateProfile = async (name: string, isBot?: boolean, targetAverage?: number) => {
    const newProfiles = { 
      ...profiles, 
      [name]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot, targetAverage } 
    };
    setProfiles(newProfiles);
    await saveProfiles(newProfiles, user?.id);
  };

  const handleUpdateProfile = async (name: string, updates: Partial<Profile>) => {
    const newProfiles = { ...profiles, [name]: { ...profiles[name], ...updates } };
    setProfiles(newProfiles);
    await saveProfiles(newProfiles, user?.id);
  };

  const handleDeleteProfile = async (name: string) => {
    const newProfiles = { ...profiles };
    delete newProfiles[name];
    setProfiles(newProfiles);
    await saveProfiles(newProfiles, user?.id);
  };

  return {
    profiles,
    setProfiles,
    reloadProfiles: loadProfiles,
    handleCreateProfile,
    handleUpdateProfile,
    handleDeleteProfile
  };
}
