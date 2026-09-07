import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './ui';

type AuthMode = 'login' | 'signup' | 'reset';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const { signIn, signUp, requestPasswordReset, loading, error, clearError } = useAuthStore();

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

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

    if (isReset) {
      const res = await requestPasswordReset(email);
      if (!res.error) {
        setSuccessMsg('Wenn es ein Konto zu dieser Adresse gibt, ist die E-Mail mit dem Link unterwegs.');
      }
      return;
    }

    if (isLogin) {
      const res = await signIn(email, password);
      if (!res.error) navigate('/online');
      return;
    }

    if (!username.trim()) {
      setLocalError("Bitte gib einen Benutzernamen ein.");
      return;
    }
    const res = await signUp(email, password, username);
    if (!res.error) {
      // Which of the two it is depends on the project's e-mail settings, and
      // promising a login that then fails is worse than saying nothing.
      setSuccessMsg(res.needsConfirmation
        ? 'Fast geschafft: Bestätige den Link in deiner E-Mail, dann kannst du dich anmelden.'
        : 'Erfolgreich registriert! Du kannst dich nun einloggen.');
      setMode('login');
    }
  };

  const displayError = localError || error;

  return (
    <div className="screen active-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '20px', position: 'relative', overflowX: 'hidden' }}>
      <div className="hero-glow-bg-setup" aria-hidden="true" />

      <Card className="auth-card">
        <div className="auth-icon" aria-hidden="true">
          {isReset ? '📧' : isLogin ? '🔑' : '✨'}
        </div>

        <h2 className="auth-title">
          {isReset ? 'Passwort zurücksetzen' : isLogin ? 'Willkommen zurück' : 'Account erstellen'}
        </h2>
        <p className="auth-subtitle">
          {isReset
            ? 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzen kannst'
            : isLogin
              ? 'Melde dich an, um deine Statistiken & Profile zu laden'
              : 'Sichere deine Averages und Match-Historie dauerhaft in der Cloud'}
        </p>
        
        {displayError && (
          <div className="alert alert-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success" role="status">
            <span aria-hidden="true">✅</span>
            <span>{successMsg}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isSignup && (
            <input
              type="text"
              placeholder="Benutzername (z.B. Dominik)"
              aria-label="Benutzername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="nickname"
              required
            />
          )}

          <input
            type="email"
            placeholder="E-Mail Adresse"
            aria-label="E-Mail Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {!isReset && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                type="password"
                placeholder="Passwort"
                aria-label="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
              />
              {isSignup && (
                <small className="form-hint" style={{ textAlign: 'left' }}>
                  Mindestens 6 Zeichen erforderlich.
                </small>
              )}
            </div>
          )}

          <Button type="submit" variant="primary" size="large" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Lade…' : isReset ? 'Link anfordern' : isLogin ? 'Einloggen' : 'Kostenlos registrieren'}
          </Button>

          {isLogin && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => switchTo('reset')}
            >
              Passwort vergessen?
            </Button>
          )}
        </form>

        <div className="auth-alt">
          <div className="auth-divider"><span>Oder</span></div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => switchTo(isLogin ? 'signup' : 'login')}
          >
            {isLogin ? 'Jetzt neuen Account erstellen' : 'Bereits einen Account? Login'}
          </Button>
          
          {/* Sekundär: das Absenden des Formulars ist die primäre Aktion
              dieses Screens, und §1 lässt nur eine gefüllte Fläche zu. */}
          <Button
            type="button"
            variant="secondary"
            size="large"
            fullWidth
            onClick={() => navigate('/offline')}
          >
            <span aria-hidden="true">🎯</span> Als Gast fortfahren
          </Button>

          <Button type="button" variant="ghost" onClick={() => navigate('/')} style={{ marginTop: '4px' }}>
             Zurück zum Hauptmenü
          </Button>
        </div>
      </Card>
    </div>
  );
};
