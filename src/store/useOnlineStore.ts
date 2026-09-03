import { create } from 'zustand';
import { supabase } from '../db/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { GameConfig } from '../types';

export interface OnlinePlayer {
  id: string;
  username: string;
  isHost: boolean;
}

export interface PublicLobby {
  isLobby: boolean;
  isPublic: boolean;
  code: string;
  hostName: string;
  settings: GameConfig;
}

interface PresenceData {
  type?: string;
  id?: string;
  username?: string;
  isHost?: boolean;
  isLobby?: boolean;
  isPublic?: boolean;
  code?: string;
  hostName?: string;
  settings?: GameConfig;
}

export type RoomEvent =
  | 'settings_update'
  | 'game_start'
  | 'state_update'
  | 'game_ended'
  | 'client_throw'
  | 'client_undo'
  | 'client_submit_checkout'
  | 'client_request_state';

const ROOM_EVENTS: RoomEvent[] = [
  'settings_update',
  'game_start',
  'state_update',
  'game_ended',
  'client_throw',
  'client_undo',
  'client_submit_checkout',
  'client_request_state'
];

export type RoomEventPayload = Record<string, unknown>;
type RoomEventHandler = (payload: RoomEventPayload) => void;

/**
 * Whether a room command really came from the seat that is on throw.
 *
 * The host applied every `client_throw` it received; the "is it my turn" check
 * lived only in the sending client's own button handler, so anything that put a
 * message on the channel could score, undo or check out for somebody else. The
 * roster is built from presence in the same order the engine seats its players,
 * which is what makes the index comparison meaningful.
 */
export const isFromActiveSeat = (
  payload: RoomEventPayload,
  players: OnlinePlayer[],
  activePlayer: number
): boolean => {
  const seatId = payload.seatId;
  if (typeof seatId !== 'string') return false;
  const seatIndex = players.findIndex(p => p.id === seatId);
  return seatIndex >= 0 && seatIndex === activePlayer;
};

/**
 * Central handler registry for the currently joined room channel.
 *
 * Supabase's `RealtimeChannel.on()` returns the channel itself, so calling
 * `.unsubscribe()` on its return value tears down the whole channel. Components
 * therefore must never register/remove Supabase listeners directly — they
 * subscribe through this registry instead. All Supabase bindings are installed
 * exactly once, before `subscribe()`, and live as long as the channel does.
 */
const handlerRegistry = new Map<RoomEvent, Set<RoomEventHandler>>();

const resetRegistry = () => handlerRegistry.clear();

const unwrapPayload = (message: unknown): RoomEventPayload => {
  if (message && typeof message === 'object' && 'payload' in message) {
    const inner = (message as { payload?: unknown }).payload;
    if (inner && typeof inner === 'object') return inner as RoomEventPayload;
  }
  if (message && typeof message === 'object') return message as RoomEventPayload;
  return {};
};

/** Installs one Supabase binding per known room event, dispatching to the registry. */
const bindRoomEvents = (channel: RealtimeChannel) => {
  ROOM_EVENTS.forEach(event => {
    channel.on('broadcast', { event }, (message: unknown) => {
      const handlers = handlerRegistry.get(event);
      if (!handlers || handlers.size === 0) return;
      const payload = unwrapPayload(message);
      // Copy before iterating: a handler may unsubscribe itself.
      Array.from(handlers).forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`Room event handler failed for "${event}"`, err);
        }
      });
    });
  });
};

const collectPlayers = (channel: RealtimeChannel): OnlinePlayer[] => {
  const state = channel.presenceState();
  const list: OnlinePlayer[] = [];
  Object.values(state).forEach((presences: unknown[]) => {
    (presences as PresenceData[]).forEach(p => {
      if (p.type === 'player' && p.id && p.username) {
        list.push({ id: p.id, username: p.username, isHost: !!p.isHost });
      }
    });
  });
  // Host first, then stable alphabetical order so every device shows the same
  // throwing order.
  return list.sort((a, b) => {
    if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
};

/** Ambiguity-free alphabet: no O/0, I/1, etc. — codes get read out loud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateRoomCode = (length = 4): string => {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map(b => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join('');
};

/** How long a collision probe waits for presence to sync before giving up. */
const CODE_PROBE_TIMEOUT_MS = 1500;

/** Codes probed before the last one is used regardless. */
const CODE_ATTEMPTS = 5;

/**
 * Whether `room_<code>` is unoccupied.
 *
 * A code is four characters out of a 32-symbol alphabet and was handed out
 * without any check, so two hosts could land on the same channel — where each
 * saw the other's players in its roster and applied the other's throws to its
 * own game. Presence answers the question without needing a room registry:
 * subscribe read-only, wait for the sync, look for a host.
 *
 * A probe that errors or times out counts as free. An unreachable channel is
 * the caller's problem to report a moment later, and refusing to open a room
 * because the probe was slow would be the worse failure of the two.
 */
const isRoomCodeFree = (code: string): Promise<boolean> =>
  new Promise(resolve => {
    const probe = supabase.channel(`room_${code}`, { config: { broadcast: { self: false } } });
    let settled = false;

    const finish = async (free: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      // Removed, not just unsubscribed: the real channel joins this very topic
      // next, and the socket refuses a second join while the first is open.
      await supabase.removeChannel(probe);
      resolve(free);
    };

    const timeout = setTimeout(() => finish(true), CODE_PROBE_TIMEOUT_MS);

    probe.on('presence', { event: 'sync' }, () => {
      finish(!collectPlayers(probe).some(p => p.isHost));
    });

    probe.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') finish(true);
    });
  });

/** A room code no other host is currently sitting on. */
const reserveRoomCode = async (): Promise<string> => {
  let code = generateRoomCode();
  for (let attempt = 1; attempt < CODE_ATTEMPTS; attempt++) {
    if (await isRoomCodeFree(code)) return code;
    code = generateRoomCode();
  }
  return code;
};

/**
 * Identity of this browser tab inside a room. Deliberately *not* the Supabase
 * user id: the same account may sit at two boards, and two players may pick the
 * same display name — the seat, not the person, decides whose turn it is.
 */
const resolveUserId = (): string => {
  let seatId = sessionStorage.getItem('dart_online_seat_id');
  if (!seatId) {
    seatId = `seat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('dart_online_seat_id', seatId);
  }
  return seatId;
};

interface OnlineState {
  globalChannel: RealtimeChannel | null;
  roomChannel: RealtimeChannel | null;

  roomCode: string | null;
  isHost: boolean;
  myPlayerId: string | null;
  players: OnlinePlayer[];
  roomSettings: GameConfig | null;
  connectionState: 'idle' | 'connecting' | 'connected' | 'error';

  publicLobbies: PublicLobby[];

  initGlobalLobby: () => void;
  createRoom: (username: string, isPublic: boolean, settings: GameConfig) => Promise<{ code?: string; error?: string }>;
  joinRoom: (code: string, username: string) => Promise<{ error?: string }>;
  leaveRoom: () => void;

  /** Subscribe to a room broadcast event. Returns an unsubscribe function. */
  onRoomEvent: (event: RoomEvent, handler: RoomEventHandler) => () => void;
  sendRoomEvent: (event: RoomEvent, payload?: RoomEventPayload) => void;

  updateSettings: (settings: GameConfig) => void;
  startGame: () => void;
}

const JOIN_TIMEOUT_MS = 8000;

export const useOnlineStore = create<OnlineState>((set, get) => ({
  globalChannel: null,
  roomChannel: null,
  roomCode: null,
  isHost: false,
  myPlayerId: null,
  players: [],
  roomSettings: null,
  connectionState: 'idle',
  publicLobbies: [],

  initGlobalLobby: () => {
    if (get().globalChannel) return;

    const channel = supabase.channel('global_lobby');

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const activeLobbies: PublicLobby[] = [];

      Object.values(state).forEach((presences: unknown[]) => {
        (presences as PresenceData[]).forEach(p => {
          if (p.isLobby && p.isPublic && p.code && p.hostName && p.settings) {
            activeLobbies.push(p as PublicLobby);
          }
        });
      });

      set({ publicLobbies: activeLobbies });
    });

    channel.subscribe();
    set({ globalChannel: channel });
  },

  onRoomEvent: (event, handler) => {
    let handlers = handlerRegistry.get(event);
    if (!handlers) {
      handlers = new Set();
      handlerRegistry.set(event, handlers);
    }
    handlers.add(handler);
    return () => {
      handlerRegistry.get(event)?.delete(handler);
    };
  },

  sendRoomEvent: (event, payload = {}) => {
    const { roomChannel } = get();
    if (!roomChannel) return;
    roomChannel.send({ type: 'broadcast', event, payload });
  },

  createRoom: async (username, isPublic, settings) => {
    const existing = get().roomChannel;
    if (existing) existing.unsubscribe();
    resetRegistry();

    const code = await reserveRoomCode();
    const channel = supabase.channel(`room_${code}`, { config: { broadcast: { self: false } } });
    const myId = resolveUserId();

    set({ connectionState: 'connecting' });

    return new Promise(resolve => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        channel.unsubscribe();
        set({ connectionState: 'error' });
        resolve({ error: 'Verbindung zum Server fehlgeschlagen. Bitte erneut versuchen.' });
      }, JOIN_TIMEOUT_MS);

      channel.on('presence', { event: 'sync' }, () => {
        set({ players: collectPlayers(channel) });
      });

      bindRoomEvents(channel);

      channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);

          await channel.track({ type: 'player', id: myId, username, isHost: true });

          if (isPublic) {
            const gChannel = get().globalChannel;
            if (gChannel) {
              await gChannel.track({ isLobby: true, isPublic: true, code, hostName: username, settings });
            }
          }

          set({
            roomChannel: channel,
            roomCode: code,
            isHost: true,
            myPlayerId: myId,
            roomSettings: settings,
            connectionState: 'connected'
          });
          resolve({ code });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          channel.unsubscribe();
          set({ connectionState: 'error' });
          resolve({ error: 'Der Raum konnte nicht erstellt werden. Prüfe deine Internetverbindung.' });
        }
      });
    });
  },

  joinRoom: async (rawCode, username) => {
    const code = rawCode.trim().toUpperCase();
    if (code.length !== 4) {
      return { error: 'Bitte gib einen 4-stelligen Raumcode ein.' };
    }

    const existing = get().roomChannel;
    if (existing) existing.unsubscribe();
    resetRegistry();

    const channel = supabase.channel(`room_${code}`, { config: { broadcast: { self: false } } });
    const myId = resolveUserId();

    set({ connectionState: 'connecting' });

    return new Promise(resolve => {
      let settled = false;

      const fail = (error: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        channel.unsubscribe();
        set({ connectionState: 'error' });
        resolve({ error });
      };

      const timeout = setTimeout(
        () => fail('Raum nicht gefunden oder abgelaufen.'),
        JOIN_TIMEOUT_MS
      );

      channel.on('presence', { event: 'sync' }, async () => {
        const roster = collectPlayers(channel);

        if (!settled) {
          if (!roster.some(p => p.isHost)) {
            // Presence has synced but no host is present: the room is gone.
            fail('Raum existiert nicht oder wurde geschlossen.');
            return;
          }
          settled = true;
          clearTimeout(timeout);

          await channel.track({ type: 'player', id: myId, username, isHost: false });
          set({
            roomChannel: channel,
            roomCode: code,
            isHost: false,
            myPlayerId: myId,
            connectionState: 'connected'
          });
          resolve({});
        }

        set({ players: collectPlayers(channel) });
      });

      bindRoomEvents(channel);

      // The host mirrors its settings on every settings_update; joiners also get
      // the current config with the first state_update.
      get().onRoomEvent('settings_update', payload => {
        const settings = payload.settings as GameConfig | undefined;
        if (settings) set({ roomSettings: settings });
      });

      channel.subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          fail('Verbindung zum Raum fehlgeschlagen.');
        }
      });
    });
  },

  leaveRoom: () => {
    const { roomChannel, globalChannel, isHost } = get();
    resetRegistry();
    if (roomChannel) {
      roomChannel.untrack().catch(() => {});
      roomChannel.unsubscribe();
    }
    if (isHost && globalChannel) {
      globalChannel.untrack().catch(() => {});
    }
    set({
      roomChannel: null,
      roomCode: null,
      isHost: false,
      myPlayerId: null,
      players: [],
      roomSettings: null,
      connectionState: 'idle'
    });
  },

  updateSettings: settings => {
    const { roomChannel, isHost } = get();
    if (!isHost || !roomChannel) return;
    set({ roomSettings: settings });
    roomChannel.send({ type: 'broadcast', event: 'settings_update', payload: { settings } });
  },

  startGame: () => {
    const { roomChannel, isHost, globalChannel, roomSettings } = get();
    if (!isHost || !roomChannel) return;
    // Take the lobby off the public browser: it is no longer joinable.
    if (globalChannel) globalChannel.untrack().catch(() => {});
    roomChannel.send({ type: 'broadcast', event: 'game_start', payload: { settings: roomSettings } });
  }
}));
