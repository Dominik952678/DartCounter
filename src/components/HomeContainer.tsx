import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GameConfig, Profile, MatchHistory } from '../types';
import { MatchSetup } from './MatchSetup';
import { TrainingHub, type MiniGameMode } from './TrainingHub';

interface HomeContainerProps {
  profiles: Record<string, Profile>;
  matches: MatchHistory[];
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (name: string) => void;
  onStartGame: (players: string[], config: GameConfig) => void;
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  onStartMiniGame: (mode: string, players: string[], settings: any) => void;
  setProfiles: (profiles: Record<string, Profile>) => void;
  defaultTab?: 'match' | 'training';
}

export const HomeContainer: React.FC<HomeContainerProps> = ({
  profiles,
  setProfiles,
  onStartGame,
  hasSavedGame,
  onResumeGame,
  onStartMiniGame,
  defaultTab = 'match'
}) => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const modeParam = searchParams.get('mode') as MiniGameMode | null;

  const [activeSubTab, setActiveSubTab] = useState<'match' | 'training'>(() => {
    if (tabParam === 'training' || tabParam === 'match') return tabParam;
    const saved = localStorage.getItem('dart_offline_subtab');
    if (saved === 'training' || saved === 'match') return saved;
    return defaultTab;
  });

  useEffect(() => {
    if (tabParam === 'training' || tabParam === 'match') {
      setActiveSubTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    localStorage.setItem('dart_offline_subtab', activeSubTab);
  }, [activeSubTab]);

  return (
    <div className="home-container" style={{ paddingBottom: '20px' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto 16px auto', padding: '0 12px' }}>
        <div className="segment-control">
          <label className={activeSubTab === 'match' ? 'active' : ''}>
            <input 
              type="radio" 
              name="offlineSubTab" 
              checked={activeSubTab === 'match'} 
              onChange={() => setActiveSubTab('match')} 
            />
            <span>🎯 X01 Match</span>
          </label>
          <label className={activeSubTab === 'training' ? 'active' : ''}>
            <input 
              type="radio" 
              name="offlineSubTab" 
              checked={activeSubTab === 'training'} 
              onChange={() => setActiveSubTab('training')} 
            />
            <span>🏋️ Training</span>
          </label>
        </div>
      </div>

      <div className="home-content">
        {activeSubTab === 'match' ? (
          <MatchSetup 
            profiles={profiles}
            setProfiles={setProfiles}
            onStartGame={onStartGame}
            hasSavedGame={hasSavedGame}
            onResumeGame={onResumeGame}
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

