import { create } from 'zustand';
import { supabase } from '../db/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { GameConfig } from '../types';

export interface OnlinePlayer {
  id: string;
  username: string;
  isHost: boolean;
}

interface OnlineState {
  globalChannel: RealtimeChannel | null;
  roomChannel: RealtimeChannel | null;
  
  roomCode: string | null;
  isHost: boolean;
  players: OnlinePlayer[];
  roomSettings: GameConfig | null;
  
  publicLobbies: any[];
  
  initGlobalLobby: () => void;
  createRoom: (username: string, isPublic: boolean, settings: GameConfig) => Promise<string>;
  joinRoom: (code: string, username: string) => Promise<{error?: string}>;
  leaveRoom: () => void;
  
  updateSettings: (settings: GameConfig) => void;
  startGame: () => void;
}

export const useOnlineStore = create<OnlineState>((set, get) => ({
  globalChannel: null,
  roomChannel: null,
  roomCode: null,
  isHost: false,
  players: [],
  roomSettings: null,
  publicLobbies: [],

  initGlobalLobby: () => {
    const existing = get().globalChannel;
    if (existing) return;

    const channel = supabase.channel('global_lobby');
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const activeLobbies: any[] = [];
      
      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p.isLobby && p.isPublic) {
            activeLobbies.push(p);
          }
        });
      });
      
      set({ publicLobbies: activeLobbies });
    });

    channel.subscribe();
    set({ globalChannel: channel });
  },

  createRoom: async (username, isPublic, settings) => {
    // Generate a random 4-letter code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const channel = supabase.channel(`room_${code}`);
    
    const userId = supabase.auth.getUser().then(r => r.data.user?.id || Math.random().toString());

    return new Promise((resolve) => {
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const pList: OnlinePlayer[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.type === 'player') pList.push({ id: p.id, username: p.username, isHost: p.isHost });
            });
          });
          
          set({ players: pList });
        })
        .on('broadcast', { event: 'settings_update' }, (payload) => {
           set({ roomSettings: payload.settings });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const myId = await userId;
            await channel.track({ type: 'player', id: myId, username, isHost: true });
            
            // If public, broadcast to global lobby
            if (isPublic) {
               const gChannel = get().globalChannel;
               if (gChannel) {
                   await gChannel.track({
                       isLobby: true,
                       isPublic: true,
                       code,
                       hostName: username,
                       settings
                   });
               }
            }
            
            set({ roomChannel: channel, roomCode: code, isHost: true, roomSettings: settings });
            resolve(code);
          }
        });
    });
  },

  joinRoom: async (code, username) => {
    code = code.toUpperCase();
    const channel = supabase.channel(`room_${code}`);
    const userId = await supabase.auth.getUser().then(r => r.data.user?.id || Math.random().toString());

    return new Promise((resolve) => {
      const to = setTimeout(() => {
          channel.unsubscribe();
          resolve({ error: 'Raum nicht gefunden oder abgelaufen.' });
      }, 5000);

      let syncReceived = false;

      channel
        .on('presence', { event: 'sync' }, async () => {
          const state = channel.presenceState();
          
          if (!syncReceived) {
             syncReceived = true;
             const hasHost = Object.values(state).some((presences: any) => 
                presences.some((p: any) => p.isHost)
             );
             
             if (hasHost) {
                 clearTimeout(to);
                 const pList: OnlinePlayer[] = [];
                 Object.values(state).forEach((presences: any) => {
                     presences.forEach((p: any) => {
                         if (p.type === 'player') {
                             pList.push({ id: p.id, username: p.username, isHost: p.isHost });
                         }
                     });
                 });
                 set({ players: pList });
                 
                 await channel.track({ type: 'player', id: userId, username, isHost: false });
                 set({ roomChannel: channel, roomCode: code, isHost: false });
                 resolve({});
             } else {
                 clearTimeout(to);
                 channel.unsubscribe();
                 resolve({ error: 'Raum existiert nicht.' });
             }
          } else {
             const pList: OnlinePlayer[] = [];
             Object.values(state).forEach((presences: any) => {
                 presences.forEach((p: any) => {
                     if (p.type === 'player') {
                         pList.push({ id: p.id, username: p.username, isHost: p.isHost });
                     }
                 });
             });
             set({ players: pList });
          }
        })
        .on('broadcast', { event: 'settings_update' }, (payload) => {
           set({ roomSettings: payload.settings });
        })
        .subscribe();
    });
  },

  leaveRoom: () => {
    const { roomChannel, globalChannel, isHost } = get();
    if (roomChannel) {
        roomChannel.unsubscribe();
    }
    if (isHost && globalChannel) {
        // Untrack from global lobby
        globalChannel.untrack();
    }
    set({ roomChannel: null, roomCode: null, isHost: false, players: [], roomSettings: null });
  },

  updateSettings: (settings) => {
    const { roomChannel, isHost } = get();
    if (isHost && roomChannel) {
        set({ roomSettings: settings });
        roomChannel.send({
            type: 'broadcast',
            event: 'settings_update',
            payload: { settings }
        });
    }
  },

  startGame: () => {
     const { roomChannel, isHost } = get();
     if (isHost && roomChannel) {
        roomChannel.send({
            type: 'broadcast',
            event: 'game_start',
            payload: {}
        });
     }
  }
}));
