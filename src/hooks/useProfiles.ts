import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import type { Profile } from '../types';
import { getProfiles, saveProfiles } from '../db';
import { reportPersistenceError } from '../store/useNotificationStore';

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

  /**
   * Mirror of `profiles`, written *synchronously* by `applyProfiles`.
   *
   * The mutators below need the current profile set to derive the next one.
   * They used to compute it inside a `setProfiles` updater and then persist the
   * variable the updater had assigned — which only worked while React happened
   * to run that updater eagerly at dispatch time. React only does that when no
   * update is pending on the fiber; otherwise the updater runs later, the
   * captured variable was still `undefined`, and the write put
   * `JSON.stringify(undefined)` in localStorage and `{profiles: undefined}` in
   * Supabase, wiping the account.
   *
   * Writing the ref synchronously also makes back-to-back calls compose, which
   * matters because callers do loop over profiles (see the sample-data loader).
   */
  const profilesRef = useRef(profiles);
  const userIdRef = useRef(user?.id);

  useLayoutEffect(() => {
    profilesRef.current = profiles;
    userIdRef.current = user?.id;
  });

  /**
   * The single path that changes profiles: updates state and persists the very
   * same object. Nothing else should call `saveProfiles` for the local user.
   *
   * The function form derives the next set from the mirror above — it is *not*
   * a React updater and must not be confused for one; it runs immediately and
   * exactly once. Returning the object it was given is the way to say "nothing
   * changed", which skips the write.
   */
  const applyProfiles = useCallback(async (
    next: Record<string, Profile> | ((current: Record<string, Profile>) => Record<string, Profile>)
  ) => {
    const resolved = typeof next === 'function' ? next(profilesRef.current) : next;
    if (resolved === profilesRef.current) return;

    profilesRef.current = resolved;
    setProfiles(resolved);
    try {
      await saveProfiles(resolved, userIdRef.current);
    } catch (err) {
      reportPersistenceError(err, 'Profile konnten nicht gespeichert werden');
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    const username = user?.user_metadata?.username;
    const loaded = await getProfiles(user?.id, username);
    profilesRef.current = loaded;
    setProfiles(loaded);
  }, [user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const username = user?.user_metadata?.username;
      const loaded = await getProfiles(user?.id, username);
      if (isMounted) {
        profilesRef.current = loaded;
        setProfiles(loaded);
        setLoadedForUserId(user?.id ?? null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.user_metadata?.username]);

  const handleCreateProfile = useCallback(async (name: string, isBot?: boolean, targetAverage?: number) => {
    await applyProfiles({
      ...profilesRef.current,
      [name]: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot, targetAverage }
    });
  }, [applyProfiles]);

  const handleUpdateProfile = useCallback(async (name: string, updates: Partial<Profile>) => {
    const current = profilesRef.current;
    await applyProfiles({ ...current, [name]: { ...current[name], ...updates } });
  }, [applyProfiles]);

  const handleDeleteProfile = useCallback(async (name: string) => {
    const next = { ...profilesRef.current };
    delete next[name];
    await applyProfiles(next);
  }, [applyProfiles]);

  return {
    profiles,
    setProfiles,
    applyProfiles,
    loadedForUserId,
    reloadProfiles: loadProfiles,
    handleCreateProfile,
    handleUpdateProfile,
    handleDeleteProfile
  };
}
