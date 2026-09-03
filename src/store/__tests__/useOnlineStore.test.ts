import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../db';
import { useOnlineStore, isFromActiveSeat } from '../useOnlineStore';

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

  // Supabase answers every join with a presence sync. Only the join tests, which
  // drive presence by hand to time the roster, turn that off.
  if (occupyNextChannels > 0) {
    occupyNextChannels--;
    presence = { a: [{ type: 'player', id: 'seat_host', username: 'Fremd', isHost: true }] };
  }

  const channel = {
    name,
    tornDown: false,
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
      if (autoPresenceSync) presenceHandlers.forEach(h => h());
      return channel;
    },
    teardown() {
      channel.tornDown = true;
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

/** Presence syncs on subscribe, as the real client does. */
let autoPresenceSync = true;
/** How many of the next channels report an occupied room to a code probe. */
let occupyNextChannels = 0;

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
    autoPresenceSync = true;
    occupyNextChannels = 0;

    // The real client hands back the existing channel for a topic until it is
    // removed, which is why the room-code probe has to remove itself before the
    // room joins the same topic.
    const byTopic = new Map<string, FakeChannel>();
    vi.spyOn(supabase, 'channel').mockImplementation((name: string) => {
      const existing = byTopic.get(name);
      if (existing) return existing as unknown as ReturnType<typeof supabase.channel>;
      const ch = createFakeChannel(name);
      byTopic.set(name, ch);
      channels.push(ch);
      return ch as unknown as ReturnType<typeof supabase.channel>;
    });
    vi.spyOn(supabase, 'removeChannel').mockImplementation(async (ch: unknown) => {
      const fake = ch as FakeChannel;
      await fake.unsubscribe();
      fake.teardown();
      byTopic.delete(fake.name);
      return 'ok';
    });
  });

  /** The channel the store is actually holding, past any code probe. */
  const roomChannel = () => useOnlineStore.getState().roomChannel as unknown as FakeChannel;

  it('creates a room with a 4-character code and marks the creator as host', async () => {
    const res = await useOnlineStore.getState().createRoom('Dominik', false, {
      startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3
    });

    expect(res.error).toBeUndefined();
    expect(res.code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(useOnlineStore.getState().isHost).toBe(true);
    expect(useOnlineStore.getState().connectionState).toBe('connected');
    expect(roomChannel().tracked[0]).toMatchObject({ type: 'player', username: 'Dominik', isHost: true });
  });

  /**
   * Four characters out of a 32-symbol alphabet were handed out unchecked. Two
   * hosts on one code shared a channel: each saw the other's players in its
   * roster and applied the other's throws to its own game.
   */
  it('skips a code another host is already sitting on', async () => {
    occupyNextChannels = 1;

    const res = await useOnlineStore.getState().createRoom('Dominik', false, {
      startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3
    });

    expect(res.error).toBeUndefined();
    expect(useOnlineStore.getState().connectionState).toBe('connected');
    // The occupied code was probed and abandoned, and its probe left no channel
    // behind that could have swallowed the room's own join.
    expect(channels[0].name).not.toBe(roomChannel().name);
    expect(channels[0].tornDown).toBe(true);
    expect(roomChannel().tracked[0]).toMatchObject({ isHost: true });
  });

  it('unsubscribing one room event leaves the channel and other handlers alive', async () => {
    await useOnlineStore.getState().createRoom('Dominik', false, {
      startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3
    });
    const channel = roomChannel();

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

    roomChannel().__emit('client_throw', { base: 20, mult: 3 });

    expect(handler).toHaveBeenCalledWith({ base: 20, mult: 3 });
  });

  it('rejects a join code that is not four characters', async () => {
    const res = await useOnlineStore.getState().joinRoom('AB', 'Gast');
    expect(res.error).toMatch(/4-stelligen/);
  });

  it('reports a missing room when presence syncs without a host', async () => {
    autoPresenceSync = false;
    const joining = useOnlineStore.getState().joinRoom('ABCD', 'Gast');
    // Give the store a tick to attach its presence listener before syncing.
    await Promise.resolve();
    channels[0].__setPresence({});

    const res = await joining;
    expect(res.error).toMatch(/existiert nicht/);
    expect(channels[0].unsubscribeCalls).toBe(1);
  });

  it('joins a room that has a host and lists the roster host-first', async () => {
    autoPresenceSync = false;
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
    const channel = roomChannel();
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

describe('isFromActiveSeat', () => {
  const roster = [
    { id: 'seat_host', username: 'Dominik', isHost: true },
    { id: 'seat_guest', username: 'Gast', isHost: false }
  ];

  it('accepts the command of the seat that is on throw', () => {
    expect(isFromActiveSeat({ seatId: 'seat_guest', base: 20 }, roster, 1)).toBe(true);
  });

  /**
   * The hole this closes: the turn check lived in the sending client's own
   * button handler, so a crafted broadcast could score for the other player.
   */
  it('rejects a command from a seat that is not on throw', () => {
    expect(isFromActiveSeat({ seatId: 'seat_host', base: 20 }, roster, 1)).toBe(false);
  });

  it('rejects a seat that is not in the room and a command with no seat at all', () => {
    expect(isFromActiveSeat({ seatId: 'seat_nobody' }, roster, 1)).toBe(false);
    expect(isFromActiveSeat({ base: 20 }, roster, 1)).toBe(false);
    expect(isFromActiveSeat({ seatId: 42 }, roster, 1)).toBe(false);
  });
});
