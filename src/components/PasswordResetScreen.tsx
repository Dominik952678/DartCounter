import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Icons } from './ui';

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
  const passwordId = useId();
  const repeatId = useId();

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
    <div className="screen active-screen auth-screen">
      <button type="button" className="stats-back" onClick={() => navigate('/auth')}>
        <Icons.IconArrowLeft size={16} />
        <span className="label-caps">Anmelden</span>
      </button>

      <header className="auth-head">
        <h1 className="auth-title">Neues Passwort</h1>
        <p className="auth-lead">
          {done
            ? 'Passwort geändert. Du bist angemeldet.'
            : user
              ? 'Wähle ein neues Passwort für dein Konto.'
              : 'Öffne diesen Bildschirm über den Link aus der E-Mail, damit wir wissen, um wessen Konto es geht.'}
        </p>
      </header>

      {done ? (
        <div className="auth-actions">
          <Button variant="primary" size="large" fullWidth onClick={() => navigate('/')}>
            Weiter zu Start
          </Button>
        </div>
      ) : (
        <>
          {displayError && <p className="auth-message is-error" role="alert">{displayError}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="label-caps" htmlFor={passwordId}>Neues Passwort</label>
              <input
                id={passwordId}
                className="auth-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <span className="auth-hint">Mindestens 6 Zeichen</span>
            </div>
            <div className="auth-field">
              <label className="label-caps" htmlFor={repeatId}>Wiederholen</label>
              <input
                id={repeatId}
                className="auth-input"
                type="password"
                value={repeat}
                onChange={e => setRepeat(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="auth-actions">
              <Button type="submit" variant="primary" size="large" fullWidth disabled={loading || !user}>
                {loading ? 'Speichere …' : 'Passwort speichern'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
