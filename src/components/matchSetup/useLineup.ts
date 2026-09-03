import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Profile } from '../../types';

/** Humans first, bots to fill up — the line-up most people want by default. */
export function buildDefaultLineup(profiles: Record<string, Profile>): string[] {
  const names = Object.keys(profiles);
  if (names.length === 0) return [];
  const humans = names.filter(n => !profiles[n]?.isBot);
  const bots = names.filter(n => profiles[n]?.isBot);
  const ordered = [...humans, ...bots];
  const lineup: string[] = [];
  for (let i = 0; i < 4; i++) {
    lineup.push(ordered[i] ?? ordered[ordered.length - 1] ?? names[0]);
  }
  return lineup;
}

const GUEST_LINEUP = ['Gast 1', 'Gast 2', 'Gast 3', 'Gast 4'];

/** Who plays, in what order — everything the seat list needs to be driven. */
export interface Lineup {
  /** Four entries, whatever the player count; only the first `playerCount` play. */
  selectedPlayers: string[];
  setSelectedPlayers: (update: string[] | ((prev: string[]) => string[])) => void;
  /** Which of a guest's typed names are bots; only used when signed out. */
  guestBots: Record<string, boolean>;
  clearSlots: (names: string[]) => void;
  choosePlayer: (index: number, name: string) => void;
  toggleGuestBot: (index: number, isBot: boolean) => void;
  movePlayer: (index: number, direction: 'up' | 'down') => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  randomizeOrder: () => void;
  isShuffling: boolean;
  randomOrderOnStart: boolean;
  setRandomOrderOnStart: (value: boolean) => void;
}

/**
 * The seats of the upcoming match.
 *
 * Only the slots the user actually touched are stored; everything else is
 * derived from the current profiles. Profiles load asynchronously (local cache
 * first, cloud second), so a plain state snapshot taken on mount left the
 * selects empty and started matches with blank player names.
 */
export const useLineup = (
  profiles: Record<string, Profile>,
  isGuest: boolean,
  playerCount: number
): Lineup => {
  const [playerOverrides, setPlayerOverrides] = useState<(string | null)[]>([null, null, null, null]);
  const [guestBots, setGuestBots] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [randomOrderOnStart, setRandomOrderOnStart] = useState(false);
  const shuffleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
  }, []);

  const defaultLineup = useMemo(
    () => (isGuest ? GUEST_LINEUP : buildDefaultLineup(profiles)),
    [isGuest, profiles]
  );

  const selectedPlayers = useMemo(
    () => Array.from({ length: 4 }, (_, i) => {
      const chosen = playerOverrides[i];
      // A slot keeps its pick only while that profile still exists; guests may
      // legitimately clear a name field, so empty strings are preserved.
      if (chosen !== null && (isGuest || profiles[chosen])) return chosen;
      return defaultLineup[i] ?? '';
    }),
    [playerOverrides, defaultLineup, profiles, isGuest]
  );

  const selectedPlayersRef = useRef(selectedPlayers);
  useEffect(() => {
    selectedPlayersRef.current = selectedPlayers;
  });

  const setSelectedPlayers = useCallback((update: string[] | ((prev: string[]) => string[])) => {
    const next = typeof update === 'function' ? update(selectedPlayersRef.current) : update;
    selectedPlayersRef.current = next;
    setPlayerOverrides([next[0] ?? null, next[1] ?? null, next[2] ?? null, next[3] ?? null]);
  }, []);

  /** Frees every seat holding one of these names — a profile that just went away. */
  const clearSlots = useCallback((names: string[]) => {
    setPlayerOverrides(prev => prev.map(slot => (slot && names.includes(slot) ? null : slot)));
  }, []);

  const choosePlayer = (index: number, name: string) => {
    const next = [...selectedPlayers];
    // Picking someone who already sits in another active seat swaps the two.
    const existingIndex = next.slice(0, playerCount).indexOf(name);
    if (existingIndex !== -1 && existingIndex !== index) {
      next[existingIndex] = next[index];
    }
    next[index] = name;
    setSelectedPlayers(next);
  };

  const toggleGuestBot = (index: number, isBot: boolean) => {
    const name = selectedPlayers[index] || `Gast ${index + 1}`;
    setGuestBots(prev => ({ ...prev, [name]: isBot }));
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playerCount) return;
    const next = [...selectedPlayers];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setSelectedPlayers(next);
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Let the drag image be generated before the original is dimmed.
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.5';
    }, 0);
  };

  const onDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      const next = [...selectedPlayers];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(index, 0, dragged);
      setSelectedPlayers(next);
    }
    setDraggedIndex(null);
  };

  /** Shuffles visibly: ten quick reorders so the draw is seen, not just applied. */
  const randomizeOrder = () => {
    if (isShuffling) return;
    setIsShuffling(true);

    let iterations = 0;
    const maxIterations = 10;
    const playing = selectedPlayers.slice(0, playerCount);

    if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
    shuffleIntervalRef.current = setInterval(() => {
      const shuffled = [...playing].sort(() => Math.random() - 0.5);
      const next = [...selectedPlayersRef.current];
      for (let i = 0; i < playerCount; i++) next[i] = shuffled[i];
      setSelectedPlayers(next);

      iterations++;
      if (iterations >= maxIterations) {
        if (shuffleIntervalRef.current) {
          clearInterval(shuffleIntervalRef.current);
          shuffleIntervalRef.current = null;
        }
        setIsShuffling(false);
      }
    }, 50);
  };

  return {
    selectedPlayers,
    setSelectedPlayers,
    guestBots,
    clearSlots,
    choosePlayer,
    toggleGuestBot,
    movePlayer,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    randomizeOrder,
    isShuffling,
    randomOrderOnStart,
    setRandomOrderOnStart
  };
};
