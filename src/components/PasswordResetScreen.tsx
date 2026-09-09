import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Card, Icons } from './ui';

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
      <Card style={{ maxWidth: '420px', width: '100%', padding: '36px 24px', textAlign: 'center' }}>
        <Icons.IconLock size={34} style={{ margin: '0 auto 10px' }} />
        <h2 className="auth-title">Neues Passwort</h2>

        {done ? (
          <>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', marginBottom: '24px' }}>
              Passwort geändert. Du bist angemeldet.
            </p>
            <Button variant="primary" size="large" onClick={() => navigate('/')}>
              Weiter zum Hauptmenü
            </Button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', marginBottom: '24px' }}>
              {user
                ? 'Wähle ein neues Passwort für dein Konto.'
                : 'Öffne diesen Bildschirm über den Link aus der E-Mail, damit wir wissen, um wessen Konto es geht.'}
            </p>

            {displayError && (
              <div className="alert alert-error" role="alert">
                <Icons.IconAlert size={18} /> <span>{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                placeholder="Neues Passwort"
                aria-label="Neues Passwort"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Neues Passwort wiederholen"
                aria-label="Neues Passwort wiederholen"
                value={repeat}
                onChange={e => setRepeat(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Button type="submit" variant="primary" size="large" disabled={loading || !user}>
                {loading ? 'Speichere…' : 'Passwort speichern'}
              </Button>
            </form>

            <Button type="button" variant="ghost" onClick={() => navigate('/auth')} style={{ marginTop: '16px' }}>
              Zurück zum Login
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};
