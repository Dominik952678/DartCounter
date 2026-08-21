import { create } from 'zustand';
import type { GameState, Profile, MatchHistory, } from '../types';

interface AppState {
  profiles: Record<string, Profile>;
  setProfiles: (profiles: Record<string, Profile>) => void;
  
  savedMatches: MatchHistory[];
  setSavedMatches: (matches: MatchHistory[]) => void;
  
  soundOn: boolean;
  setSoundOn: (soundOn: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profiles: {},
  setProfiles: (profiles) => set({ profiles }),
  
  savedMatches: [],
  setSavedMatches: (savedMatches) => set({ savedMatches }),
  
  soundOn: true,
  setSoundOn: (soundOn) => set({ soundOn })
}));

interface GameEngineState {
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;
  hasSavedGame: boolean;
  setHasSavedGame: (hasSaved: boolean) => void;
}

export const useGameStore = create<GameEngineState>((set) => ({
  gameState: null,
  setGameState: (gameState) => set({ gameState }),
  hasSavedGame: false,
  setHasSavedGame: (hasSavedGame) => set({ hasSavedGame })
}));
