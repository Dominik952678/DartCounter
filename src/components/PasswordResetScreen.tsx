import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Where the reset mail lands.
 *
 * Supabase signs the visitor in with a recovery session when the link is
 * opened, so this screen only has to set a new password. Without it, losing a
 * password meant losing the account and every statistic in it.
 */
export const PasswordResetScreen: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, loading, error, clearError, user } = useAuthStore();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [localError, setLocalError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password.length < 6) {
      setLocalError('Das Passwort braucht mindestens 6 Zeichen.');
      return;
    }
    if (password !== repeat) {
      setLocalError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }

    const res = await updatePassword(password);
    if (!res.error) setDone(true);
  };

  const displayError = localError || error;

  return (
    <div className="screen active-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }} aria-hidden="true">🔒</div>
        <h2 style={{ marginBottom: '8px', fontSize: '1.6em', fontWeight: 800 }}>Neues Passwort</h2>

        {done ? (
          <>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', marginBottom: '24px' }}>
              Passwort geändert. Du bist angemeldet.
            </p>
            <button className="btn-primary btn-large" onClick={() => navigate('/')}>
              Weiter zum Hauptmenü
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', marginBottom: '24px' }}>
              {user
                ? 'Wähle ein neues Passwort für dein Konto.'
                : 'Öffne diesen Bildschirm über den Link aus der E-Mail, damit wir wissen, um wessen Konto es geht.'}
            </p>

            {displayError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--red)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9em', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                ⚠️ {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                placeholder="Neues Passwort"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Neues Passwort wiederholen"
                value={repeat}
                onChange={e => setRepeat(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="submit" className="btn-primary btn-large" disabled={loading || !user}>
                {loading ? 'Speichere…' : 'Passwort speichern'}
              </button>
            </form>

            <button type="button" className="btn-ghost" onClick={() => navigate('/auth')} style={{ marginTop: '16px' }}>
              Zurück zum Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};
