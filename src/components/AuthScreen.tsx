import React, { useId, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Button, Icons } from './ui';

type AuthMode = 'login' | 'signup' | 'reset';

const TITLES: Record<AuthMode, string> = {
  login: 'Anmelden',
  signup: 'Konto erstellen',
  reset: 'Passwort zurücksetzen'
};

const LEADS: Record<AuthMode, string> = {
  login: 'Mit Konto werden deine Matches gesichert und sind auf allen Geräten da.',
  signup: 'Averages, Profile und Match-Historie bleiben dauerhaft in der Cloud.',
  reset: 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.'
};

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

/** Label in Großbuchstaben über dem Feld (Entwurf H5). */
const Field: React.FC<FieldProps> = ({ label, hint, ...input }) => {
  const id = useId();
  return (
    <div className="auth-field">
      <label className="label-caps" htmlFor={id}>{label}</label>
      <input id={id} className="auth-input" {...input} />
      {hint && <span className="auth-hint">{hint}</span>}
    </div>
  );
};

/** Anmelden, Konto erstellen und Passwort vergessen (Entwurf H5). */
export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const { signIn, signUp, requestPasswordReset, loading, error, clearError } = useAuthStore();

  const switchTo = (next: AuthMode) => {
    clearError();
    setLocalError('');
    setSuccessMsg('');
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    setSuccessMsg('');

    if (mode === 'reset') {
      const res = await requestPasswordReset(email);
      if (!res.error) {
        setSuccessMsg('Wenn es ein Konto zu dieser Adresse gibt, ist die E-Mail mit dem Link unterwegs.');
      }
      return;
    }

    if (mode === 'login') {
      const res = await signIn(email, password);
      if (!res.error) navigate('/online');
      return;
    }

    if (!username.trim()) {
      setLocalError('Bitte gib einen Benutzernamen ein.');
      return;
    }
    const res = await signUp(email, password, username);
    if (!res.error) {
      // Which of the two it is depends on the project's e-mail settings, and
      // promising a login that then fails is worse than saying nothing.
      setSuccessMsg(res.needsConfirmation
        ? 'Fast geschafft: Bestätige den Link in deiner E-Mail, dann kannst du dich anmelden.'
        : 'Erfolgreich registriert! Du kannst dich nun anmelden.');
      setMode('login');
    }
  };

  const displayError = localError || error;

  return (
    <div className="screen active-screen auth-screen">
      <button
        type="button"
        className="stats-back"
        onClick={() => (mode === 'login' ? navigate('/profile') : switchTo('login'))}
      >
        <Icons.IconArrowLeft size={16} />
        <span className="label-caps">{mode === 'login' ? 'Zurück' : 'Anmelden'}</span>
      </button>

      <header className="auth-head">
        <h1 className="auth-title">{TITLES[mode]}</h1>
        <p className="auth-lead">{LEADS[mode]}</p>
      </header>

      {displayError && <p className="auth-message is-error" role="alert">{displayError}</p>}
      {successMsg && <p className="auth-message is-success" role="status">{successMsg}</p>}

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <Field
            label="Benutzername"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="nickname"
            required
          />
        )}

        <Field
          label="E-Mail"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        {mode !== 'reset' && (
          <Field
            label="Passwort"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint={mode === 'signup' ? 'Mindestens 6 Zeichen' : undefined}
            required
          />
        )}

        {mode === 'login' && (
          <button type="button" className="setup-link auth-forgot" onClick={() => switchTo('reset')}>
            Passwort vergessen?
          </button>
        )}

        <div className="auth-actions">
          <Button type="submit" variant="primary" size="large" fullWidth disabled={loading}>
            {loading ? 'Lade …' : mode === 'reset' ? 'Link anfordern' : TITLES[mode]}
          </Button>
          {mode !== 'reset' && (
            <Button type="button" variant="secondary" size="large" fullWidth onClick={() => switchTo(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Konto erstellen' : 'Ich habe schon ein Konto'}
            </Button>
          )}
        </div>
      </form>

      <footer className="auth-note">
        <Icons.IconLock size={18} />
        <span>
          Ohne Konto bleibt alles auf diesem Gerät. Du kannst dich jederzeit später anmelden.
          {' '}
          <button type="button" className="auth-guest" onClick={() => navigate('/play')}>Als Gast fortfahren</button>
        </span>
      </footer>
    </div>
  );
};
