import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GameConfig, Profile } from '../types';
import { MatchSetup } from './MatchSetup';
import { TrainingHub, type MiniGameMode } from './TrainingHub';
import { readOneOf, write } from '../utils/storage';
import { ChoiceGroup } from './ui';

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

  // `?tab=` only seeds the initial tab. Keeping it authoritative would freeze
  // the switcher whenever the screen was opened from a quickstart link.
  const [effectiveSubTab, setActiveSubTab] = useState<'match' | 'training'>(() => {
    if (tabParam === 'training' || tabParam === 'match') return tabParam;
    return readOneOf('offlineSubtab', OFFLINE_SUBTABS, defaultTab);
  });

  useEffect(() => {
    write('offlineSubtab', effectiveSubTab);
  }, [effectiveSubTab]);

  return (
    <div className="home-container" style={{ paddingBottom: '20px' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto 16px auto', padding: '0 12px' }}>
        <ChoiceGroup
          name="offlineSubTab"
          value={effectiveSubTab}
          options={[
            { value: 'match', label: '🎯 X01 Match' },
            { value: 'training', label: '🏋️ Training' }
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

