import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const { signIn, signUp, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    setSuccessMsg('');
    
    if (isLogin) {
      const res = await signIn(email, password);
      if (!res.error) navigate('/online');
    } else {
      if (!username.trim()) {
         setLocalError("Bitte gib einen Benutzernamen ein.");
         return;
      }
      const res = await signUp(email, password, username);
      if (!res.error) {
         setSuccessMsg("Erfolgreich registriert! Du kannst dich nun einloggen.");
         setIsLogin(true);
      }
    }
  };

  const displayError = localError || error;

  return (
    <div className="screen active-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', position: 'relative', overflowX: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '-80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '450px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(10, 132, 255, 0.12) 0%, rgba(94, 92, 230, 0.08) 50%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(94, 92, 230, 0.2))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
          marginBottom: '12px',
          fontSize: '1.8rem'
        }}>
          {isLogin ? '🔑' : '✨'}
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.7em', fontWeight: 800 }}>
          {isLogin ? 'Willkommen zurück' : 'Account erstellen'}
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', marginBottom: '24px' }}>
          {isLogin ? 'Melde dich an, um deine Statistiken & Profile zu laden' : 'Sichere deine Averages und Match-Historie dauerhaft in der Cloud'}
        </p>
        
        {displayError && (
          <div style={{ background: 'rgba(255, 69, 58, 0.12)', color: 'var(--red)', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', fontSize: '0.9em', border: '1px solid rgba(255, 69, 58, 0.25)' }}>
            ⚠️ {displayError}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(0, 210, 106, 0.12)', color: 'var(--green)', padding: '12px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center', fontSize: '0.9em', border: '1px solid rgba(0, 210, 106, 0.25)' }}>
            ✅ {successMsg}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Benutzername (z.B. Dominik)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="E-Mail Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {!isLogin && (
              <small style={{ color: 'var(--text-dim)', fontSize: '0.8em', textAlign: 'left', marginLeft: '4px' }}>
                Mindestens 6 Zeichen erforderlich.
              </small>
            )}
          </div>

          <button type="submit" className="btn-primary btn-large" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Lade...' : (isLogin ? 'Einloggen' : 'Kostenlos Registrieren')}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative', margin: '8px 0' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--card-border)' }}></div>
            <span style={{ position: 'relative', background: '#16161a', padding: '0 15px', color: 'var(--text-dim)', fontSize: '0.85em' }}>Oder</span>
          </div>

          <button 
            type="button"
            className="btn-secondary" 
            onClick={() => {
                clearError();
                setLocalError('');
                setSuccessMsg('');
                setIsLogin(!isLogin);
            }}
          >
            {isLogin ? 'Jetzt neuen Account erstellen' : 'Bereits einen Account? Login'}
          </button>
          
          <button 
            type="button" 
            className="btn-success btn-large" 
            onClick={() => navigate('/offline')}
            style={{ fontSize: '1.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>🎯</span> Als Gast fortfahren
          </button>

          <button type="button" className="btn-ghost" onClick={() => navigate('/')} style={{ marginTop: '4px' }}>
             Zurück zum Hauptmenü
          </button>
        </div>
      </div>
    </div>
  );
};
