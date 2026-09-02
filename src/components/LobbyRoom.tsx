import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnlineStore } from '../store/useOnlineStore';

export const LobbyRoom: React.FC = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const { roomCode, isHost, players, roomSettings, leaveRoom, startGame, roomChannel, updateSettings } = useOnlineStore();

  useEffect(() => {
    if (!roomCode || roomCode !== code) {
       navigate('/online');
    }
  }, [roomCode, code, navigate]);

  useEffect(() => {
    if (!roomChannel) return;
    
    // Listen for game_start event
    const sub = roomChannel.on('broadcast', { event: 'game_start' }, () => {
       navigate('/online-game'); // We will build this route next
    });

    return () => { sub.unsubscribe(); };
  }, [roomChannel, navigate]);

  const handleStartGame = () => {
    startGame();
    navigate('/online-game');
  };

  if (!roomCode) return <div>Lade...</div>;

  return (
    <div className="screen active-screen app-container" style={{ position: 'relative', overflowX: 'hidden', paddingBottom: '40px' }}>
      <div style={{
        position: 'absolute',
        top: '-80px',
        left: '50%',
        transform: 'translateX(-50%);',
        width: '500px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="card" style={{ textAlign: 'center', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '0.85em', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Online Raum</span>
        <h2 style={{ fontSize: '2.4em', letterSpacing: '4px', color: 'var(--blue)', margin: '6px 0' }}>{roomCode}</h2>
        <p style={{ marginTop: '6px', color: 'var(--text-dim)', fontSize: '0.9em' }}>
           Gib diesen Code an deine Freunde, damit sie beitreten können.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div className="card-header">
          <h3>Spieler</h3>
          <span className="card-badge">{players.length}</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
          {players.map((p, i) => (
             <li key={i} style={{ padding: '12px 16px', background: 'var(--surface)', marginBottom: '8px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--card-border)' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05em' }}>👤 {p.username}</span>
                {p.isHost && <span style={{ color: 'var(--green)', fontSize: '0.85em', fontWeight: 700, padding: '4px 10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>Host</span>}
             </li>
          ))}
        </ul>
      </div>

      {isHost && roomSettings ? (
        <div className="card" style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
           <h3 style={{ marginBottom: '10px' }}>Einstellungen ({roomSettings.mode === 'powerscoring' ? 'Power Scoring' : roomSettings.mode === 'splitscore' ? 'Split Score' : roomSettings.mode === 'checkout' ? 'Checkout' : 'Standard'})</h3>
           
           {(!roomSettings.mode || roomSettings.mode === 'standard') && (
             <div className="config-grid" style={{ marginTop: '15px' }}>
               <div className="config-item">
                 <label className="section-label">Punkte</label>
                 <select 
                   value={roomSettings.startScore} 
                   onChange={(e) => updateSettings({ ...roomSettings, startScore: parseInt(e.target.value) })}
                 >
                   <option value={301}>301</option>
                   <option value={501}>501</option>
                   <option value={701}>701</option>
                 </select>
               </div>
               <div className="config-item">
                 <label className="section-label">Out-Modus</label>
                 <select 
                   value={roomSettings.outMode} 
                   onChange={(e) => updateSettings({ ...roomSettings, outMode: e.target.value as 'SO' | 'DO' | 'MO' })}
                 >
                   <option value="SO">Single Out</option>
                   <option value="DO">Double Out</option>
                   <option value="MO">Master Out</option>
                 </select>
               </div>
               <div className="config-item">
                 <label className="section-label">Sets</label>
                 <input 
                   type="number" 
                   value={roomSettings.setsToWin} 
                   min="1" max="10"
                   onChange={(e) => updateSettings({ ...roomSettings, setsToWin: parseInt(e.target.value) || 1 })}
                 />
               </div>
               <div className="config-item">
                 <label className="section-label">Legs</label>
                 <input 
                   type="number" 
                   value={roomSettings.legsToWin} 
                   min="1" max="15"
                   onChange={(e) => updateSettings({ ...roomSettings, legsToWin: parseInt(e.target.value) || 1 })}
                 />
               </div>
             </div>
           )}

           {roomSettings.mode === 'powerscoring' && (
             <div style={{ marginTop: '15px' }}>
               <label className="section-label">Rundenlimit</label>
               <select 
                 value={roomSettings.rounds || 10} 
                 onChange={(e) => updateSettings({ ...roomSettings, rounds: parseInt(e.target.value) })}
               >
                 <option value={5}>5 Runden</option>
                 <option value={10}>10 Runden</option>
                 <option value={15}>15 Runden</option>
                 <option value={20}>20 Runden</option>
               </select>
             </div>
           )}

           {roomSettings.mode === 'checkout' && (
             <div className="config-grid" style={{ marginTop: '15px' }}>
               <div className="config-item">
                 <label className="section-label">Targets</label>
                 <select 
                   value={roomSettings.checkoutTargets || 10} 
                   onChange={(e) => updateSettings({ ...roomSettings, checkoutTargets: parseInt(e.target.value) })}
                 >
                   <option value={5}>5</option>
                   <option value={10}>10</option>
                   <option value={15}>15</option>
                   <option value={20}>20</option>
                 </select>
               </div>
               <div className="config-item">
                 <label className="section-label">Versuche</label>
                 <select 
                   value={roomSettings.checkoutRounds || 1} 
                   onChange={(e) => updateSettings({ ...roomSettings, checkoutRounds: parseInt(e.target.value) })}
                 >
                   <option value={1}>1 Runde</option>
                   <option value={2}>2 Runden</option>
                   <option value={3}>3 Runden</option>
                   <option value={5}>5 Runden</option>
                 </select>
               </div>
             </div>
           )}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
           <h3 style={{ marginBottom: '10px' }}>Einstellungen ({roomSettings?.mode === 'powerscoring' ? 'Power Scoring' : roomSettings?.mode === 'splitscore' ? 'Split Score' : roomSettings?.mode === 'checkout' ? 'Checkout' : 'Standard'})</h3>
           <p style={{ marginTop: '10px' }}>
             {(!roomSettings?.mode || roomSettings?.mode === 'standard') && `${roomSettings?.startScore} - ${roomSettings?.outMode} | First to ${roomSettings?.legsToWin} Legs`}
             {roomSettings?.mode === 'powerscoring' && `${roomSettings?.rounds} Runden`}
             {roomSettings?.mode === 'splitscore' && `Standard Runden`}
             {roomSettings?.mode === 'checkout' && `${roomSettings?.checkoutTargets} Targets, ${roomSettings?.checkoutRounds} Versuche`}
           </p>
           <p style={{ fontSize: '0.8em', color: 'var(--text-dim)', marginTop: '8px' }}>Nur der Host kann Einstellungen ändern.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', position: 'relative', zIndex: 1 }}>
        {isHost && (
           <button className="btn-success btn-large" onClick={handleStartGame} disabled={players.length < 1}>
             🎯 Spiel starten
           </button>
        )}
        <button className="btn-secondary" onClick={() => { leaveRoom(); navigate('/online'); }}>
          Raum verlassen
        </button>
      </div>
    </div>
  );
};
