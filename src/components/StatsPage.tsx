import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useProfiles } from '../hooks/useProfiles';
import { StatsWidget } from './StatsWidget';
import type { MatchHistory } from '../types';
import { getMatches } from '../db';
import { reportPersistenceError } from '../store/useNotificationStore';
import { Button, Card } from './ui';

export const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, initialize } = useAuthStore();
  const { profiles } = useProfiles(user);
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('Alle (Standard)');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    getMatches(user?.id)
      .then(setMatches)
      .catch(err => reportPersistenceError(err, 'Statistiken konnten nicht geladen werden'));
  }, [user?.id]);

  const defaultProfile = useMemo(() => {
    if (user?.user_metadata?.username && profiles[user.user_metadata.username]) {
      return user.user_metadata.username;
    }
    return Object.keys(profiles)[0] || '';
  }, [user, profiles]);

  const effectiveProfile = selectedProfile || defaultProfile;

  const availableModes = useMemo(() => {
     const modes = new Set<string>();
     modes.add('Alle (Standard)');
     modes.add('Power Scoring');
     modes.add('Split Score');
     modes.add('Checkout Training');
     matches.forEach(m => {
        if ((!m.gameType || m.gameType === 'standard') && m.config) {
           modes.add(`Standard: ${m.config.startScore} ${m.config.outMode}`);
        }
     });
     return Array.from(modes);
  }, [matches]);

  const profileNames = Object.keys(profiles);

  return (
    <div className="screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* Vierte Kopie desselben Scheins — nutzt jetzt die gemeinsame Klasse. */}
      <div className="hero-glow-bg-setup" aria-hidden="true" />

      {!user && (
        <div className="callout callout-action">
          <span>
            <span aria-hidden="true">💡</span> <strong>Gast-Modus:</strong> Deine Matches werden lokal im Browser gespeichert.
          </span>
          {/* Die eine Akzentfläche dieses Screens (§1). Die beiden Spiel-Buttons
              in den Spalten sind gleichrangige Alternativen und deshalb
              sekundär — sonst stünden hier drei gefüllte Flächen. */}
          <Button variant="primary" onClick={() => navigate('/auth')}>
            🔑 Cloud-Login
          </Button>
        </div>
      )}
      
      <header className="page-header">
        <Button variant="ghost" className="btn-back" onClick={() => navigate('/')}>
          &larr; Menü
        </Button>
        <h2 className="page-title">📊 Statistiken</h2>
        <div className="page-header-spacer" />
      </header>

      <Card className="stats-filter-bar">
         <div className="config-grid">
            <div className="config-item">
               <label className="section-label" htmlFor="stats-profile">Spieler</label>
               <select
                  id="stats-profile"
                  value={effectiveProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
               >
                  {profileNames.map(name => (
                     <option key={name} value={name}>{name}</option>
                  ))}
               </select>
            </div>
            <div className="config-item">
               <label className="section-label" htmlFor="stats-mode">Modus</label>
               <select
                  id="stats-mode"
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
               >
                  {availableModes.map(m => (
                     <option key={m} value={m}>{m}</option>
                  ))}
               </select>
            </div>
         </div>
      </Card>

      <div className="stats-columns">
         <StatsWidget 
           title="🏠 Offline Stats"
           mode={selectedMode}
           isOnline={false}
           matches={matches}
           profileName={effectiveProfile}
           baseProfile={profiles[effectiveProfile]}
           onPlay={() => navigate('/offline')}
           playLabel="🎯 Offline spielen"
         />

         <StatsWidget 
           title="🌍 Online Stats"
           mode={selectedMode}
           isOnline={true}
           matches={matches}
           profileName={effectiveProfile}
           baseProfile={undefined}
           onPlay={() => navigate('/online')}
           playLabel="🌍 Online Multiplayer"
         />
      </div>

    </div>
  );
};
