import React, { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchHistory } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION, BUILD_TIME } from '../version';
import { AppReloadPrompt } from './AppReloadPrompt';
import { Button, Icons } from './ui';
import type { IconProps } from './ui';
import { readStoredMatchConfig } from './matchSetup/useMatchSetupConfig';
import { configPills } from './matchSetup/configSummary';
import { todayStats } from '../utils/todayStats';

/** Die drei Trainings-Schnellstarts. §4 verlangt für sie mindestens 64pt. */
const TRAINING_QUICKSTARTS: {
  mode: string;
  icon: React.FC<IconProps>;
  title: string;
  desc: string;
  tone: 'primary' | 'info' | 'pro';
}[] = [
  { mode: 'checkout', icon: Icons.IconTarget, title: 'Checkout', desc: 'Finishes unter Druck', tone: 'primary' },
  { mode: 'powerscoring', icon: Icons.IconBars, title: 'Power Scoring', desc: 'Maximale Punkte pro Runde', tone: 'info' },
  { mode: 'splitscore', icon: Icons.IconSplit, title: 'Split Score', desc: 'Ziel treffen oder halbieren', tone: 'pro' }
];

interface MainMenuProps {
  /** Für die Heute-Kachel. Fehlt sie, zeigt die Kachel Striche statt Nullen. */
  matches?: MatchHistory[];
}

/**
 * Der Start-Screen — und die eine Stelle, an der ein Match ohne Umweg beginnt.
 *
 * Vorher war das ein Menü: ein „Neues Spiel starten"-Button, der auf den
 * Setup-Screen führte, wo man dann eine Konfiguration bestätigte, die schon
 * gespeichert war. Für den häufigsten Fall — dasselbe wie gestern, nochmal —
 * waren das zwei Screens und drei Taps für null Entscheidungen.
 *
 * Jetzt trägt die große Karte die gespeicherte Konfiguration als Pillen-Reihe
 * und startet sie direkt. Wer etwas anderes will, geht über „Anderes Spiel"
 * genau dorthin, wo vorher jeder hin musste. Das ist die Zusammenführung von
 * Start und Setup: nicht zwei Screens in einen gequetscht, sondern der Weg über
 * das Setup zur Ausnahme gemacht.
 *
 * Der direkte Start läuft trotzdem durch den Setup-Screen (`/offline?start=1`)
 * und damit durch dessen Vorprüfungen: gekoppelte Cloud-Profile, ein noch
 * laufendes Match, Gastprofile, die angelegt werden müssen. Sie hier zu
 * wiederholen hieße, sie zweimal zu pflegen — und sie zu überspringen hieße, den
 * schnellen Weg zum unsicheren zu machen.
 */
export const MainMenu: React.FC<MainMenuProps> = ({ matches }) => {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const navigate = useNavigate();
  const trainingLabelId = useId();
  const { user, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Beim Rendern gelesen und nicht in State gehalten: der Speicher ändert sich
  // nur, während der Setup-Screen offen ist, und danach wird dieser hier neu
  // aufgebaut. Ein Effekt, der denselben Wert nachträglich in State schreibt,
  // wäre ein Render mehr für dieselbe Zahl.
  const pills = useMemo(() => configPills(readStoredMatchConfig()), []);
  const today = useMemo(() => todayStats(matches), [matches]);

  /** `–` statt `0`: eine Null behauptet ein Ergebnis, ein Strich sagt „noch nichts". */
  const figure = (value: number): string => (value > 0 ? String(value) : '–');

  return (
    <div className="screen active-screen home-screen">
      {/* Zwei Radial-Gradienten, Amber oben rechts und Grün unten links, als
          ein Element mit zwei Ebenen statt zwei Kreis-Divs. `pointer-events:
          none` steckt im CSS — ohne das fängt der Hintergrund jeden Tap ab, der
          neben eine Karte geht. */}
      <div className="home-ambient" aria-hidden="true" />

      <div className="home-body">
        <header className="home-head">
          <p className="home-greeting">
            {user
              ? `Willkommen zurück, ${user.user_metadata?.username || user.email}`
              : 'Willkommen zurück'}
          </p>
          <h1>Bereit für das nächste Leg?</h1>
        </header>

        <div className="home-top">
          {/* Die eine gefüllte Akzentfläche dieses Screens (§1). */}
          <button type="button" className="home-resume" onClick={() => navigate('/offline?start=1')}>
            <span className="home-resume-head">
              <span>
                <span className="home-resume-kicker">Ein Tap</span>
                <span className="home-resume-title">Weiter wie zuletzt</span>
              </span>
              <span className="home-resume-play" aria-hidden="true">
                <Icons.IconPlayFilled size={26} />
              </span>
            </span>

            {/* Was ein Tap startet, in Worten. Ohne diese Reihe wäre „Weiter wie
                zuletzt" ein Versprechen, das man erst nach dem Tap überprüfen
                kann. */}
            <span className="home-resume-pills">
              {pills.map(pill => (
                <span key={pill} className="home-resume-pill">{pill}</span>
              ))}
            </span>

            <span className="home-resume-sub">
              Startet direkt mit dieser Konfiguration — keine Zwischenschritte.
            </span>
          </button>

          <div className="home-side">
            <button type="button" className="home-tile home-tile-action" onClick={() => navigate('/offline')}>
              <span className="home-tile-icon" aria-hidden="true"><Icons.IconPlus size={21} /></span>
              <span>
                <span className="home-tile-title">Anderes Spiel</span>
                <span className="home-tile-desc">Modus, Spieler und Distanz ändern</span>
              </span>
            </button>

            {/* Kennzahlen des Tages, nicht des Spielers: dieses Gerät wird von
                mehreren Leuten benutzt, deshalb Zählbares statt eines Averages
                über fremde Darts — siehe utils/todayStats.ts. */}
            <div className="home-tile home-today">
              <span className="home-tile-label">Heute</span>
              <div className="home-today-figures">
                <span className="home-figure">
                  <span className="home-figure-label">Matches</span>
                  <span className="num-lg home-figure-value">{figure(today.matches)}</span>
                </span>
                <span className="home-figure">
                  <span className="home-figure-label">180er</span>
                  <span className="num-lg home-figure-value is-accent">{figure(today.oneEighty)}</span>
                </span>
                <span className="home-figure">
                  <span className="home-figure-label">Bestes Leg</span>
                  <span className="num-lg home-figure-value is-success">{figure(today.bestLeg)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="home-section">
          <span className="home-tile-label" id={trainingLabelId}>Training</span>
          <div className="home-training" role="group" aria-labelledby={trainingLabelId}>
            {TRAINING_QUICKSTARTS.map(({ mode, icon: Icon, title, desc, tone }) => (
              <button
                key={mode}
                type="button"
                className={`home-tile home-training-tile tone-${tone}`}
                onClick={() => navigate(`/offline?tab=training&mode=${mode}`)}
              >
                <span className="home-tile-icon" aria-hidden="true"><Icon size={20} /></span>
                <span>
                  <span className="home-tile-title">{title}</span>
                  <span className="home-tile-desc">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="home-links">
            <button type="button" className="home-tile home-link" onClick={() => navigate('/online')}>
              <span className="home-tile-icon" aria-hidden="true"><Icons.IconGlobe size={20} /></span>
              <span>
                <span className="home-tile-title">Multiplayer</span>
                <span className="home-tile-desc">Räume &amp; offene Lobbys</span>
              </span>
              <Icons.IconArrowRight size={17} className="home-link-arrow" />
            </button>

            <button
              type="button"
              className="home-tile home-link"
              onClick={() => navigate(user ? '/stats' : '/auth')}
            >
              <span className="home-tile-icon" aria-hidden="true">
                {user ? <Icons.IconBars size={20} /> : <Icons.IconKey size={20} />}
              </span>
              <span>
                <span className="home-tile-title">{user ? 'Statistiken' : 'Account'}</span>
                <span className="home-tile-desc">{user ? 'Averages & Radar' : 'Login & Cloud'}</span>
              </span>
              <Icons.IconArrowRight size={17} className="home-link-arrow" />
            </button>
          </div>
        </section>

        <footer className="home-footer">
          <div className="home-status">
            <span className={`home-status-dot ${user ? 'is-online' : ''}`} aria-hidden="true" />
            <span className="home-status-text">
              {user ? 'Angemeldet' : 'Gast-Modus'}
            </span>
          </div>

          {user ? (
            // §5: „Abmelden" ist der Musterfall für Ghost/Destructive-Text.
            <Button variant="dangerText" size="compact" onClick={() => { signOut(); navigate('/'); }}>
              Abmelden
            </Button>
          ) : (
            <Button variant="secondary" size="compact" onClick={() => navigate('/auth')}>
              Login
            </Button>
          )}

          <Button
            variant="ghost"
            size="compact"
            className="home-version"
            onClick={() => setShowReloadPrompt(true)}
            title="Klicken zum Neuladen / Cache leeren"
          >
            <span className="num">{APP_VERSION}</span>
            <span aria-hidden="true">·</span>
            <span>Build {BUILD_TIME}</span>
          </Button>
        </footer>
      </div>

      {showReloadPrompt && <AppReloadPrompt onCancel={() => setShowReloadPrompt(false)} />}
    </div>
  );
};
