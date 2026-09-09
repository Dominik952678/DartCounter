import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GameConfig, Profile } from '../types';
import { MatchSetup } from './MatchSetup';
import { TrainingHub, type MiniGameMode } from './TrainingHub';
import { readOneOf, write } from '../utils/storage';
import { Slider } from './ui';

interface HomeContainerProps {
  profiles: Record<string, Profile>;
  onStartGame: (players: string[], config: GameConfig) => void;
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  onDiscardSavedGame?: () => void;
  onStartMiniGame: (mode: string, players: string[], settings: Record<string, unknown>) => void;
  setProfiles: (profiles: Record<string, Profile>) => void;
  defaultTab?: 'match' | 'training';
}

const OFFLINE_SUBTABS: readonly ('match' | 'training')[] = ['match', 'training'];

export const HomeContainer: React.FC<HomeContainerProps> = ({
  profiles,
  setProfiles,
  onStartGame,
  hasSavedGame,
  onResumeGame,
  onDiscardSavedGame,
  onStartMiniGame,
  defaultTab = 'match'
}) => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const modeParam = searchParams.get('mode') as MiniGameMode | null;
  /* `?start=1` kommt von der Weiter-Karte des Start-Screens. Beim Mounten
     gelesen und festgehalten: der Parameter darf den Start genau einmal
     auslösen, nicht wieder, wenn der Nutzer nach dem Match hierher zurückkommt
     und die URL noch dieselbe ist. */
  const [autoStartMatch] = useState(() => searchParams.get('start') === '1');

  // `?tab=` only seeds the initial tab. Keeping it authoritative would freeze
  // the switcher whenever the screen was opened from a quickstart link.
  const [effectiveSubTab, setActiveSubTab] = useState<'match' | 'training'>(() => {
    // Ein Direktstart gilt immer dem X01-Match, egal welcher Bereich zuletzt
    // offen war — sonst startete die Weiter-Karte ein Training.
    if (searchParams.get('start') === '1') return 'match';
    if (tabParam === 'training' || tabParam === 'match') return tabParam;
    return readOneOf('offlineSubtab', OFFLINE_SUBTABS, defaultTab);
  });

  useEffect(() => {
    write('offlineSubtab', effectiveSubTab);
  }, [effectiveSubTab]);

  return (
    <div className="home-container" style={{ paddingBottom: '20px' }}>
      {/* Zwei Bereiche, also der Fall für den Slider: die Fläche fährt zwischen
          „X01 Match" und „Training", und die Bewegung sagt, von wo man kommt. */}
      <div className="offline-tabs">
        <Slider
          name="offlineSubTab"
          value={effectiveSubTab}
          options={[
            { value: 'match', label: 'X01 Match' },
            { value: 'training', label: 'Training' }
          ]}
          onChange={setActiveSubTab}
          ariaLabel="Bereich"
        />
      </div>

      <div className="home-content">
        {effectiveSubTab === 'match' ? (
          <MatchSetup 
            profiles={profiles}
            setProfiles={setProfiles}
            onStartGame={onStartGame}
            hasSavedGame={hasSavedGame}
            onResumeGame={onResumeGame}
            onDiscardSavedGame={onDiscardSavedGame}
            autoStart={autoStartMatch}
          />
        ) : (
          <TrainingHub 
            profiles={profiles}
            setProfiles={setProfiles}
            onStartMiniGame={onStartMiniGame}
            initialMode={modeParam || undefined}
          />
        )}
      </div>
    </div>
  );
};

