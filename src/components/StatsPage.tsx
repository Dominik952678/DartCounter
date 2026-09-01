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
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      {!user && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.82em', color: 'var(--text)' }}>
            💡 <strong>Gast-Modus:</strong> Deine Matches werden lokal im Browser gespeichert.
          </span>
          <button 
            className="btn-primary"
            onClick={() => navigate('/auth')}
            style={{ padding: '4px 12px', fontSize: '0.78em', minHeight: '30px' }}
          >
            🔑 Cloud-Login
          </button>
        </div>
      )}
      
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
                  style={{ background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--card-border)', padding: '8px 12px', borderRadius: '10px' }}
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
                  style={{ background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--card-border)', padding: '8px 12px', borderRadius: '10px' }}
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
