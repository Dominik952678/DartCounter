import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../db/database';
import { useOnlineStore } from '../useOnlineStore';

/**
 * A stand-in for Supabase's RealtimeChannel that records what the store does to
 * it. The bug these tests guard against: `RealtimeChannel.on()` returns the
 * channel itself, so components that did `const sub = channel.on(...)` and then
 * `sub.unsubscribe()` in a cleanup were tearing down the entire room — which
 * killed every online match the moment the lobby unmounted.
 */
function createFakeChannel(name: string) {
  const broadcastHandlers = new Map<string, (msg: unknown) => void>();
  const presenceHandlers: (() => void)[] = [];
  let presence: Record<string, unknown[]> = {};

  const channel = {
    name,
    unsubscribeCalls: 0,
    sent: [] as { event: string; payload: unknown }[],
    tracked: [] as unknown[],
    on(type: string, filter: { event: string }, handler: (msg: unknown) => void) {
      if (type === 'broadcast') broadcastHandlers.set(filter.event, handler);
      else presenceHandlers.push(handler as () => void);
      return channel;
    },
    subscribe(cb?: (status: string) => void) {
      cb?.('SUBSCRIBED');
      return channel;
    },
    unsubscribe() {
      channel.unsubscribeCalls++;
      return Promise.resolve('ok');
    },
    track(payload: unknown) {
      channel.tracked.push(payload);
      return Promise.resolve('ok');
    },
    untrack() {
      return Promise.resolve('ok');
    },
    send(msg: { event: string; payload: unknown }) {
      channel.sent.push({ event: msg.event, payload: msg.payload });
      return Promise.resolve('ok');
    },
    presenceState: () => presence,
    // Test helpers
    __emit(event: string, payload: unknown) {
      broadcastHandlers.get(event)?.({ event, payload });
    },
    __setPresence(next: Record<string, unknown[]>) {
      presence = next;
      presenceHandlers.forEach(h => h());
    }
  };
  return channel;
}

type FakeChannel = ReturnType<typeof createFakeChannel>;

const resetStore = () => {
  useOnlineStore.setState({
    globalChannel: null,
    roomChannel: null,
    roomCode: null,
    isHost: false,
    myPlayerId: null,
    players: [],
    roomSettings: null,
    connectionState: 'idle',
    publicLobbies: []
  });
};

describe('useOnlineStore room channel', () => {
  let channels: FakeChannel[];

  beforeEach(() => {
    resetStore();
    localStorage.clear();
    sessionStorage.clear();
    channels = [];
    vi.spyOn(supabase, 'channel').mockImplementation((name: string) => {
      const ch = createFakeChannel(name);
      channels.push(ch);
      return ch as unknown as ReturnType<typeof supabase.channel>;
    });
  });

  it('creates a room with a 4-character code and marks the creator as host', async () => {
    const res = await useOnlineStore.getState().createRoom('Dominik', false, {
      startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3
    });

    expect(res.error).toBeUndefined();
    expect(res.code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(useOnlineStore.getState().isHost).toBe(true);
    expect(useOnlineStore.getState().connectionState).toBe('connected');
    expect(channels[0].tracked[0]).toMatchObject({ type: 'player', username: 'Dominik', isHost: true });
  });

  it('unsubscribing one room event leaves the channel and other handlers alive', async () => {
    await useOnlineStore.getState().createRoom('Dominik', false, {
      startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3
    });
    const channel = channels[0];

    const lobbyHandler = vi.fn();
    const gameHandler = vi.fn();
    const offLobby = useOnlineStore.getState().onRoomEvent('game_start', lobbyHandler);
    useOnlineStore.getState().onRoomEvent('state_update', gameHandler);

    channel.__emit('game_start', { settings: null });
    expect(lobbyHandler).toHaveBeenCalledTimes(1);

    // The lobby screen unmounts and detaches its own listener.
    offLobby();
    channel.__emit('game_start', { settings: null });
    channel.__emit('state_update', { state: { players: [] } });

    expect(lobbyHandler).toHaveBeenCalledTimes(1);
    expect(gameHandler).toHaveBeenCalledTimes(1);
    // The critical invariant: the shared channel survived the cleanup.
    expect(channel.unsubscribeCalls).toBe(0);
    expect(useOnlineStore.getState().roomChannel).toBe(channel);
  });

  it('delivers the broadcast payload, not the envelope', async () => {
    await useOnlineStore.getState().createRoom('Dominik', false, {
      startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3
    });
    const handler = vi.fn();
    useOnlineStore.getState().onRoomEvent('client_throw', handler);

    channels[0].__emit('client_throw', { base: 20, mult: 3 });

    expect(handler).toHaveBeenCalledWith({ base: 20, mult: 3 });
  });

  it('rejects a join code that is not four characters', async () => {
    const res = await useOnlineStore.getState().joinRoom('AB', 'Gast');
    expect(res.error).toMatch(/4-stelligen/);
  });

  it('reports a missing room when presence syncs without a host', async () => {
    const joining = useOnlineStore.getState().joinRoom('ABCD', 'Gast');
    // Give the store a tick to attach its presence listener before syncing.
    await Promise.resolve();
    channels[0].__setPresence({});

    const res = await joining;
    expect(res.error).toMatch(/existiert nicht/);
    expect(channels[0].unsubscribeCalls).toBe(1);
  });

  it('joins a room that has a host and lists the roster host-first', async () => {
    const joining = useOnlineStore.getState().joinRoom('abcd', 'Gast');
    await Promise.resolve();
    channels[0].__setPresence({
      b: [{ type: 'player', id: 'seat_b', username: 'Gast', isHost: false }],
      a: [{ type: 'player', id: 'seat_a', username: 'Dominik', isHost: true }]
    });

    const res = await joining;
    expect(res.error).toBeUndefined();
    expect(useOnlineStore.getState().roomCode).toBe('ABCD');
    expect(useOnlineStore.getState().isHost).toBe(false);
    expect(useOnlineStore.getState().players.map(p => p.username)).toEqual(['Dominik', 'Gast']);
  });

  it('leaving the room tears the channel down exactly once and clears the roster', async () => {
    await useOnlineStore.getState().createRoom('Dominik', false, {
      startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3
    });
    const channel = channels[0];
    const handler = vi.fn();
    useOnlineStore.getState().onRoomEvent('state_update', handler);

    useOnlineStore.getState().leaveRoom();

    expect(channel.unsubscribeCalls).toBe(1);
    expect(useOnlineStore.getState().roomChannel).toBeNull();
    expect(useOnlineStore.getState().players).toEqual([]);

    // Handlers from the previous room must not survive into the next one.
    channel.__emit('state_update', { state: {} });
    expect(handler).not.toHaveBeenCalled();
  });
});
