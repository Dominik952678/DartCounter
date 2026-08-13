import React from 'react';

interface BottomNavProps {
  activeTab: 'match' | 'training' | 'profile';
  onTabChange: (tab: 'match' | 'training' | 'profile') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'match' ? 'active' : ''}`}
        onClick={() => onTabChange('match')}
      >
        <span className="nav-icon">🎯</span>
        <span className="nav-label">Spielen</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'training' ? 'active' : ''}`}
        onClick={() => onTabChange('training')}
      >
        <span className="nav-icon">🏋️</span>
        <span className="nav-label">Modi</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTabChange('profile')}
      >
        <span className="nav-icon">👤</span>
        <span className="nav-label">Profil</span>
      </button>
    </div>
  );
};
