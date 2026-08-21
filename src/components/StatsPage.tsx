import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useProfiles } from '../hooks/useProfiles';
import { StatsWidget } from './StatsWidget';
import type { MatchHistory } from '../types';
import { getMatches } from '../db/database';

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
    getMatches(user?.id).then(setMatches);
  }, [user?.id]);

  useEffect(() => {
     if (!selectedProfile) {
        if (user && user.user_metadata?.username && profiles[user.user_metadata.username]) {
           setSelectedProfile(user.user_metadata.username);
        } else if (Object.keys(profiles).length > 0) {
           setSelectedProfile(Object.keys(profiles)[0]);
        }
     }
  }, [user, profiles, selectedProfile]);

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

  if (!user) {
    return (
      <div className="screen active-screen app-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
          <h2 style={{ marginBottom: '12px', fontSize: '1.6em', color: 'var(--text)' }}>
            Statistiken & Analysen
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95em', lineHeight: '1.5', marginBottom: '24px' }}>
            Statistiken, Averages und Spielverläufe werden für angemeldete Accounts dauerhaft in der Cloud gespeichert.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn-primary btn-large" 
              onClick={() => navigate('/auth')}
              style={{ fontSize: '1.1em' }}
            >
              🔑 Jetzt anmelden / registrieren
            </button>
            <button 
              className="btn-ghost" 
              onClick={() => navigate('/')}
              style={{ color: 'var(--text-dim)' }}
            >
              Zurück zum Hauptmenü
            </button>
          </div>
        </div>
      </div>
    );
  }

  const profileNames = Object.keys(profiles);

  return (
    <div className="screen active-screen app-container" style={{ position: 'relative', overflowX: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '-80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(255, 159, 10, 0.12) 0%, rgba(10, 132, 255, 0.06) 50%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      <div className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <button className="btn-ghost" onClick={() => navigate('/')} style={{ padding: '6px 14px', fontSize: '0.9em' }}>
          &larr; Menü
        </button>
        <h2 style={{ margin: 0, fontSize: '1.5em' }}>📊 Statistiken</h2>
        <div style={{ width: '60px' }} />
      </div>

      <div className="card" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
         <div style={{ display: 'flex', flex: 1, gap: '10px', minWidth: '200px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
               <label style={{ fontSize: '0.8em', color: 'var(--text-dim)', marginBottom: '4px' }}>Spieler</label>
               <select 
                  value={selectedProfile} 
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  style={{ background: '#2a2a2c', color: '#fff', border: '1px solid var(--card-border)', padding: '8px', borderRadius: '8px' }}
               >
                  {profileNames.map(name => (
                     <option key={name} value={name}>{name}</option>
                  ))}
               </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
               <label style={{ fontSize: '0.8em', color: 'var(--text-dim)', marginBottom: '4px' }}>Modus</label>
               <select 
                  value={selectedMode} 
                  onChange={(e) => setSelectedMode(e.target.value)}
                  style={{ background: '#2a2a2c', color: '#fff', border: '1px solid var(--card-border)', padding: '8px', borderRadius: '8px' }}
               >
                  {availableModes.map(m => (
                     <option key={m} value={m}>{m}</option>
                  ))}
               </select>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
         <StatsWidget 
           title="🏠 Offline Stats"
           mode={selectedMode}
           isOnline={false}
           matches={matches}
           profileName={selectedProfile}
           baseProfile={profiles[selectedProfile]}
           onPlay={() => navigate('/offline')}
           playLabel="🎯 Offline spielen"
         />

         <StatsWidget 
           title="🌍 Online Stats"
           mode={selectedMode}
           isOnline={true}
           matches={matches}
           profileName={selectedProfile}
           baseProfile={undefined}
           onPlay={() => navigate('/online')}
           playLabel="🌍 Online Multiplayer"
         />
      </div>

    </div>
  );
};
