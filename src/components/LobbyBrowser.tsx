import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useOnlineStore } from '../store/useOnlineStore';

export const LobbyBrowser: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { initGlobalLobby, publicLobbies, joinRoom, createRoom } = useOnlineStore();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localError, setLocalError] = useState('');

  // Form State
  const [isPublic, setIsPublic] = useState(true);
  const [mode, setMode] = useState<'standard'|'powerscoring'|'splitscore'|'checkout'>('standard');
  const [startScore, setStartScore] = useState(501);
  const [outMode, setOutMode] = useState<'SO' | 'DO' | 'MO'>('DO');
  const [setsToWin, setSetsToWin] = useState(1);
  const [legsToWin, setLegsToWin] = useState(3);
  const [rounds, setRounds] = useState(10);
  const [checkoutTargets, setCheckoutTargets] = useState(10);
  const [checkoutRounds, setCheckoutRounds] = useState(1);

  const [guestName, setGuestName] = useState<string>(() => {
    return localStorage.getItem('dart_guest_online_name') || `Gast_${Math.floor(100 + Math.random() * 900)}`;
  });

  useEffect(() => {
    initGlobalLobby();
  }, [initGlobalLobby]);

  const username = (user ? (user.user_metadata?.username || user.email) : guestName).trim() || 'Gast';

  const handleGuestNameChange = (val: string) => {
    setGuestName(val);
    localStorage.setItem('dart_guest_online_name', val);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleJoin = async (code: string) => {
    setLocalError('');
    if (!code) return;
    const res = await joinRoom(code, username);
    if (res.error) {
      setLocalError(res.error);
    } else {
      navigate('/lobby/' + code);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    const config: import("../types").GameConfig = { 
      mode,
      startScore, 
      outMode, 
      setsToWin, 
      legsToWin,
      rounds,
      checkoutTargets,
      checkoutRounds
    };
    const code = await createRoom(username, isPublic, config);
    navigate('/lobby/' + code);
  };

  return (
    <div className="screen active-screen app-container" style={{ position: 'relative', overflowX: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '-80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(10, 132, 255, 0.12) 0%, rgba(0, 210, 106, 0.06) 50%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-ghost" onClick={() => navigate('/')} style={{ padding: '6px 10px', fontSize: '0.9em' }}>
            &larr; Menü
          </button>
          <h2 style={{ margin: 0 }}>🌍 Online Lobbys</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           {user ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
               <span style={{ fontSize: '0.9em', color: 'var(--blue)', fontWeight: 600 }}>👤 {username}</span>
               <button className="btn-ghost" onClick={handleLogout} style={{ padding: '2px 6px', fontSize: '0.78em', color: 'var(--red)' }}>Logout</button>
             </div>
           ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', padding: '4px 10px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
               <span style={{ fontSize: '0.85em', color: 'var(--text-dim)' }}>Name:</span>
               <input 
                 type="text" 
                 value={guestName} 
                 onChange={(e) => handleGuestNameChange(e.target.value)}
                 style={{ width: '110px', padding: '4px 8px', fontSize: '0.85em', background: '#2a2a2c', border: '1px solid var(--card-border)', borderRadius: '6px', color: '#fff' }}
                 maxLength={15}
               />
               <button className="btn-ghost" onClick={() => navigate('/auth')} style={{ padding: '2px 6px', fontSize: '0.78em', color: 'var(--blue)' }}>Login</button>
             </div>
           )}
        </div>
      </div>
      
      {localError && (
        <div style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--red)', padding: '12px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', fontSize: '0.9em', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
          {localError}
        </div>
      )}

      {!showCreateForm ? (
        <>
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Raum beitreten</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                placeholder="Code (z.B. AB12)" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ textTransform: 'uppercase', flex: 1 }}
              />
              <button className="btn-primary" onClick={() => handleJoin(joinCode)}>
                Beitreten
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Öffentliche Räume</h3>
                <button className="btn-primary" onClick={() => setShowCreateForm(true)} style={{ padding: '10px 16px' }}>
                  + Erstellen
                </button>
            </div>
            
            {publicLobbies.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)' }}>
                 <span style={{ fontSize: '2em', display: 'block', marginBottom: '8px' }}>👻</span>
                 Aktuell gibt es keine öffentlichen Räume.
               </div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {publicLobbies.map((lobby, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                      <div>
                        <strong style={{ fontSize: '1.1em' }}>{lobby.hostName}'s Raum</strong>
                        <div style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '6px' }}>
                          {lobby.settings?.mode === 'powerscoring' ? '🔥 Power Scoring' : lobby.settings?.mode === 'splitscore' ? '➗ Split Score' : lobby.settings?.mode === 'checkout' ? '🎯 Checkout Training' : `${lobby.settings?.startScore} - ${lobby.settings?.outMode} • Best of ${lobby.settings?.legsToWin}`}
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={() => handleJoin(lobby.code)}>
                        Beitreten
                      </button>
                    </div>
                 ))}
               </div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>Raum erstellen</h2>
            <button className="btn-close" onClick={() => setShowCreateForm(false)}>✕</button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="section-label">Sichtbarkeit</label>
            <div className="segment-control">
              <label className={isPublic ? 'active' : ''}>
                <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} />
                <span>🌍 Öffentlich</span>
              </label>
              <label className={!isPublic ? 'active' : ''}>
                <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} />
                <span>🔒 Privat</span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="section-label">Spielmodus</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className={`btn ${mode === 'standard' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('standard')} style={{ textAlign: 'left', padding: '12px' }}>🎯 Standard X01</button>
              <button className={`btn ${mode === 'powerscoring' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('powerscoring')} style={{ textAlign: 'left', padding: '12px' }}>🔥 Power Scoring</button>
              <button className={`btn ${mode === 'splitscore' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('splitscore')} style={{ textAlign: 'left', padding: '12px' }}>➗ Split Score</button>
              <button className={`btn ${mode === 'checkout' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('checkout')} style={{ textAlign: 'left', padding: '12px' }}>🎯 Checkout Training</button>
            </div>
          </div>

          {mode === 'standard' && (
            <div className="config-grid">
              <div className="config-item">
                <label className="section-label">Punkte</label>
                <select value={startScore} onChange={e => setStartScore(parseInt(e.target.value))}>
                  <option value={301}>301</option>
                  <option value={501}>501</option>
                  <option value={701}>701</option>
                </select>
              </div>
              <div className="config-item">
                <label className="section-label">Out-Modus</label>
                <select value={outMode} onChange={e => setOutMode(e.target.value as any)}>
                  <option value="SO">Single Out</option>
                  <option value="DO">Double Out</option>
                  <option value="MO">Master Out</option>
                </select>
              </div>
              <div className="config-item">
                <label className="section-label">Sets</label>
                <input type="number" min="1" max="10" value={setsToWin} onChange={e => setSetsToWin(parseInt(e.target.value) || 1)} />
              </div>
              <div className="config-item">
                <label className="section-label">Legs</label>
                <input type="number" min="1" max="15" value={legsToWin} onChange={e => setLegsToWin(parseInt(e.target.value) || 1)} />
              </div>
            </div>
          )}

          {mode === 'powerscoring' && (
            <div style={{ marginBottom: '20px' }}>
              <label className="section-label">Rundenlimit</label>
              <div className="segment-control">
                {[5, 10, 15, 20].map(r => (
                  <label key={r} className={rounds === r ? 'active' : ''}>
                    <input type="radio" checked={rounds === r} onChange={() => setRounds(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {mode === 'checkout' && (
            <div style={{ marginBottom: '20px' }}>
              <label className="section-label">Anzahl Targets</label>
              <div className="segment-control">
                {[5, 10, 15, 20].map(r => (
                  <label key={r} className={checkoutTargets === r ? 'active' : ''}>
                    <input type="radio" checked={checkoutTargets === r} onChange={() => setCheckoutTargets(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              <label className="section-label" style={{ marginTop: '15px' }}>Versuche pro Finish (Runden)</label>
              <div className="segment-control">
                {[1, 2, 3, 5].map(r => (
                  <label key={r} className={checkoutRounds === r ? 'active' : ''}>
                    <input type="radio" checked={checkoutRounds === r} onChange={() => setCheckoutRounds(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn-success btn-large" onClick={handleCreate} disabled={isCreating} style={{ marginTop: '20px', width: '100%' }}>
            {isCreating ? 'Erstelle...' : 'Raum eröffnen'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <button className="btn-ghost" onClick={() => navigate('/')}>Zurück zum Hauptmenü</button>
      </div>
    </div>
  );
};
