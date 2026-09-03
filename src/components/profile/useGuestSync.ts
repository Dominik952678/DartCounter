import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GuestSyncTokenDoc, MatchHistory, Profile } from '../../types';
import {
  abortGuestMatchRemote,
  generateUserSyncCode,
  readUserSyncDoc,
  revokeHostAccess,
  supabase,
  toggleUserSync
} from '../../db';

interface GuestSyncUser {
  id: string;
  email?: string;
  user_metadata?: { username?: string };
}

export interface GuestSync {
  info: GuestSyncTokenDoc | null;
  /** Whether this account's profile may currently be used on a host device. */
  isEnabled: boolean;
  loading: boolean;
  error: string | null;
  /** Transient status line: a host connected, a match was aborted. */
  notice: string | null;
  generateCode: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  abortRemoteMatch: () => Promise<void>;
  revokeHost: (hostId?: string) => Promise<void>;
}

/**
 * The account's guest-sync state: its code, which host device is coupled, and
 * whether a match is running there right now.
 *
 * Kept live by a realtime subscription on the sync document, with a slow poll
 * behind it for dropped websockets.
 */
export const useGuestSync = (
  user: GuestSyncUser | null | undefined,
  profiles: Record<string, Profile>,
  matches: MatchHistory[]
): GuestSync => {
  const [info, setInfo] = useState<GuestSyncTokenDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (message: string, ms = 4000) => {
    setNotice(message);
    setTimeout(() => setNotice(null), ms);
  };

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const { doc, ok } = await readUserSyncDoc(user.id);
    // A failed request is not evidence that the code is gone. Overwriting state
    // with null on a flaky read is what made a freshly generated code vanish a
    // couple of seconds after it appeared.
    if (!ok) return;
    setInfo(prev => {
      if (prev?.activeHosts && doc?.activeHosts && doc.activeHosts.length > prev.activeHosts.length) {
        const newest = doc.activeHosts[doc.activeHosts.length - 1];
        flash(`🎉 Neues Host-Gerät verbunden: ${newest.hostName}`);
      }
      return doc;
    });
  }, [user?.id]);

  /**
   * Sync is off until the user turns it on. `syncEnabled !== false` treated a
   * missing document — i.e. a user who never enabled sync — as active, so the
   * panel greeted everyone with "Sync Aktiv". Legacy documents predate the flag,
   * so an unexpired code still counts as enabled.
   */
  const isEnabled = useMemo(() => {
    if (!info) return false;
    if (info.syncEnabled === true) return true;
    if (info.syncEnabled === false) return false;
    return !!info.code && new Date(info.expiresAt) > new Date();
  }, [info]);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    (async () => {
      if (isMounted) await reload();
    })();

    const channel = supabase.channel(`live_sync_profile_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.user_sync_${user.id}`
      }, payload => {
        const row = payload?.new as { data?: GuestSyncTokenDoc } | null;
        if (row?.data) setInfo(row.data);
      })
      .subscribe();

    // The realtime subscription above is the primary signal; this is only a
    // fallback for dropped websockets.
    const poll = setInterval(reload, 15000);

    return () => {
      isMounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user?.id, reload]);

  /** The profile the code shares: the account's own, or the first one there is. */
  const ownProfile = () => {
    const username = user?.user_metadata?.username || user?.email || 'Spieler';
    return { username, profile: profiles[username] || Object.values(profiles)[0] };
  };

  const generateCode = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { username, profile } = ownProfile();
    try {
      setInfo(await generateUserSyncCode(user.id, username, profile, matches));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync-Code konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const setEnabled = async (enabled: boolean) => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { username, profile } = ownProfile();
    try {
      setInfo(await toggleUserSync(user.id, username, enabled, profile, matches));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gast-Sync konnte nicht umgeschaltet werden.');
      return;
    } finally {
      setLoading(false);
    }
    if (!enabled) flash('Gast-Sync deaktiviert. Alle Host-Verbindungen wurden getrennt.', 3000);
  };

  const abortRemoteMatch = async () => {
    if (!user?.id) return;
    if (!window.confirm('Möchtest du das laufende Match auf dem Host-Gerät wirklich abbrechen und die Verbindung trennen?')) return;
    setLoading(true);
    await abortGuestMatchRemote(user.id);
    await reload();
    setLoading(false);
    flash('🛑 Match auf Host-Gerät abgebrochen und Verbindung getrennt.');
  };

  const revokeHost = async (hostId?: string) => {
    if (!user?.id) return;
    setLoading(true);
    await revokeHostAccess(user.id, hostId);
    await reload();
    setLoading(false);
  };

  return { info, isEnabled, loading, error, notice, generateCode, setEnabled, abortRemoteMatch, revokeHost };
};
