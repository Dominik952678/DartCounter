import React, { useState } from 'react';
import type { GameConfig, Profile, MatchHistory } from '../types';
import { MatchSetup } from './MatchSetup';
import { TrainingHub } from './TrainingHub';
import { ProfileTab } from './ProfileTab';
import { BottomNav } from './BottomNav';

interface HomeContainerProps {
  profiles: Record<string, Profile>;
  matches: MatchHistory[];
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (name: string) => void;
  onStartGame: (players: string[], config: GameConfig) => void;
  onStartMiniGame: (mode: string, players: string[], settings: any) => void;
}

export const HomeContainer: React.FC<HomeContainerProps> = ({
  profiles,
  matches,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onStartGame,
  onStartMiniGame
}) => {
  const [activeTab, setActiveTab] = useState<'match' | 'training' | 'profile'>('match');

  return (
    <div className="home-container">
      <div className="home-content">
        {activeTab === 'match' && (
          <MatchSetup 
            profiles={profiles}
            onStartGame={onStartGame}
          />
        )}
        
        {activeTab === 'training' && (
          <TrainingHub 
            profiles={profiles}
            onStartMiniGame={onStartMiniGame}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab 
            profiles={profiles}
            matches={matches}
            onCreateProfile={onCreateProfile}
            onUpdateProfile={onUpdateProfile}
            onDeleteProfile={onDeleteProfile}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
