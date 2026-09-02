import { useState, useEffect, useCallback } from 'react';
import type { Profile } from '../types';
import { getProfiles, saveProfiles } from '../db/database';

export function useProfiles(user?: { id: string; user_metadata?: { username?: string } } | null) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  /**
   * Which account the profiles in state actually belong to.
   *
   * `undefined` while a load is in flight, `null` once guest profiles are
   * loaded, otherwise the user id. Anything that writes profiles back to the
   * cloud must wait for this to match the signed-in user — otherwise it can
   * persist another account's (or the guest) profile set over the real one.
   */
  const [loadedForUserId, setLoadedForUserId] = useState<string | null | undefined>(undefined);

  const loadProfiles = useCallback(async () => {
    const username = user?.user_metadata?.username;
    const loaded = await getProfiles(user?.id, username);
    setProfiles(loaded);
  }, [user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const username = user?.user_metadata?.username;
      const loaded = await getProfiles(user?.id, username);
      if (isMounted) {
        setProfiles(loaded);
        setLoadedForUserId(user?.id ?? null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.user_metadata?.username]);

  const handleCreateProfile = async (name: string, isBot?: boolean, targetAverage?: number) => {
    let newProfiles: Record<string, Profile>;
    setProfiles(prev => {
        newProfiles = { ...prev, [name]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot, targetAverage } };
        return newProfiles;
    });
    await saveProfiles(newProfiles!, user?.id);
  };

  const handleUpdateProfile = async (name: string, updates: Partial<Profile>) => {
    let newProfiles: Record<string, Profile>;
    setProfiles(prev => {
        newProfiles = { ...prev, [name]: { ...prev[name], ...updates } };
        return newProfiles;
    });
    await saveProfiles(newProfiles!, user?.id);
  };

  const handleDeleteProfile = async (name: string) => {
    let newProfiles: Record<string, Profile>;
    setProfiles(prev => {
        newProfiles = { ...prev };
        delete newProfiles[name];
        return newProfiles;
    });
    await saveProfiles(newProfiles!, user?.id);
  };

  return {
    profiles,
    setProfiles,
    loadedForUserId,
    reloadProfiles: loadProfiles,
    handleCreateProfile,
    handleUpdateProfile,
    handleDeleteProfile
  };
}
