import React, { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION, BUILD_TIME } from '../version';
import { AppReloadPrompt } from './AppReloadPrompt';
import { Button, Icons } from './ui';
import type { IconProps } from './ui';

/** Die drei Trainings-Schnellstarts. §4 verlangt für sie mindestens 64pt. */
const TRAINING_QUICKSTARTS: { mode: string; icon: React.FC<IconProps>; title: string }[] = [
  { mode: 'checkout', icon: Icons.IconTarget, title: 'Checkout' },
  { mode: 'powerscoring', icon: Icons.IconBars, title: 'Scoring' },
  { mode: 'splitscore', icon: Icons.IconSplit, title: 'Split' }
];

export const MainMenu: React.FC = () => {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const navigate = useNavigate();
  const trainingLabelId = useId();
  const { user, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleOnlineClick = () => {
    navigate('/online');
  };

  return (
    <div className="screen active-screen main-menu-screen shell-fill" style={{ width: '100%', alignItems: 'center', position: 'relative', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <div className="hero-glow-bg" />

      <div className="main-menu-card">
        {/* ── Brand Header ── */}
        <div className="menu-header-area">
          <div className="menu-header-flex">
            <div className="menu-header-icon">
              <Icons.IconTarget size={34} />
            </div>
            <div>
              <h1 className="menu-header-title">
                DARTCOUNTER
              </h1>
              <p className="menu-header-subtitle">
                Scoring, Statistiken & Multiplayer
              </p>
            </div>
          </div>
        </div>

        {/* ── Command Center Body ── */}
        <div className="menu-middle-wrapper">
          {/* 1. Die eine gefüllte Akzentfläche dieses Screens (§1). */}
          <button type="button" className="hero-cta-tile" onClick={() => navigate('/offline')}>
            <span className="hero-cta-body">
              <span className="hero-cta-icon" aria-hidden="true"><Icons.IconPlayFilled size={24} /></span>
              <span>
                <span className="hero-cta-title">
                  {user ? 'Neues Spiel starten' : 'Spielen als Gast'}
                </span>
                <span className="hero-cta-desc">
                  X01 · Sets/Legs · Training · Bots
                </span>
              </span>
            </span>
            <span className="hero-cta-arrow" aria-hidden="true"><Icons.IconArrowRight size={20} /></span>
          </button>

          {/* 2. Kategorie steckt im Icon, nicht in der Fläche (§1). */}
          <div className="menu-secondary-grid">
            <button type="button" className="secondary-tile tile-online" onClick={handleOnlineClick}>
              <span className="secondary-tile-top">
                <span className="secondary-tile-icon" aria-hidden="true"><Icons.IconGlobe size={20} /></span>
                <span className="secondary-tile-arrow" aria-hidden="true"><Icons.IconArrowRight size={17} /></span>
              </span>
              <span>
                <span className="secondary-tile-title">Multiplayer</span>
                <span className="secondary-tile-desc">Räume & Global</span>
              </span>
            </button>

            {user ? (
              <button type="button" className="secondary-tile tile-stats" onClick={() => navigate('/stats')}>
                <span className="secondary-tile-top">
                  <span className="secondary-tile-icon" aria-hidden="true"><Icons.IconBars size={20} /></span>
                  <span className="secondary-tile-arrow" aria-hidden="true"><Icons.IconArrowRight size={17} /></span>
                </span>
                <span>
                  <span className="secondary-tile-title">Statistiken</span>
                  <span className="secondary-tile-desc">Averages & Radar</span>
                </span>
              </button>
            ) : (
              <button type="button" className="secondary-tile tile-auth" onClick={() => navigate('/auth')}>
                <span className="secondary-tile-top">
                  <span className="secondary-tile-icon" aria-hidden="true"><Icons.IconKey size={20} /></span>
                  <span className="secondary-tile-arrow" aria-hidden="true"><Icons.IconArrowRight size={17} /></span>
                </span>
                <span>
                  <span className="secondary-tile-title">Account</span>
                  <span className="secondary-tile-desc">Login & Cloud</span>
                </span>
              </button>
            )}
          </div>

          {/* 3. Schnellstart Training — die Kacheln, die §4 namentlich nennt. */}
          <div className="menu-training-col">
            <div className="menu-training-container">
              <span className="training-section-label" id={trainingLabelId}>
                Schnellstart Training
              </span>
              <div className="training-chips-grid" role="group" aria-labelledby={trainingLabelId}>
                {TRAINING_QUICKSTARTS.map(({ mode, icon: Icon, title }) => (
                  <button
                    key={mode}
                    type="button"
                    className="training-chip"
                    onClick={() => navigate(`/offline?tab=training&mode=${mode}`)}
                  >
                    <span className="training-chip-icon" aria-hidden="true"><Icon size={20} /></span>
                    <span className="training-chip-title">{title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Docked User Status Bar & Version ── */}
        <div className="menu-footer-area">
          <div className="menu-status-bar">
            <div className="menu-status-body">
              <span className={`menu-status-dot ${user ? 'is-online' : ''}`} aria-hidden="true" />
              <span className="menu-status-text">
                {user ? (
                  <>Eingeloggt als <strong>{user.user_metadata?.username || user.email}</strong></>
                ) : (
                  <>Modus: <strong>Gast</strong></>
                )}
              </span>
            </div>
            {user ? (
              // §5: „Abmelden" ist der Musterfall für Ghost/Destructive-Text.
              <Button
                variant="dangerText"
                size="compact"
                onClick={() => { signOut(); navigate('/'); }}
              >
                Abmelden
              </Button>
            ) : (
              // Sekundär, nicht blau gefüllt — §1 lässt pro Screen genau eine
              // Akzentfläche zu, und das ist der Hero-CTA.
              <Button variant="secondary" size="compact" onClick={() => navigate('/auth')}>
                Login
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="compact"
            className="menu-version"
            onClick={() => setShowReloadPrompt(true)}
            title="Klicken zum Neuladen / Cache leeren"
          >
            <span>{APP_VERSION}</span>
            <span aria-hidden="true">•</span>
            <span>Build {BUILD_TIME}</span>
          </Button>
        </div>
      </div>

      {showReloadPrompt && <AppReloadPrompt onCancel={() => setShowReloadPrompt(false)} />}
    </div>
  );
};
