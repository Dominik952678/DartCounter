import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchHistory } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION, BUILD_TIME } from '../version';
import { AppReloadPrompt } from './AppReloadPrompt';
import { Button, DartboardArt, Icons } from './ui';
import { readStoredMatchConfig } from './matchSetup/useMatchSetupConfig';
import { configPills } from './matchSetup/configSummary';
import type { SavedMatchSummary } from './matchSetup/SavedGameCard';
import { todayStats } from '../utils/todayStats';
import { has, readJson } from '../utils/storage';
import { matchProgressLabel, matchSides } from '../utils/matchProgress';
import { applyDefaultGame, defaultGameDistance, defaultGameTitle, readDefaultGame } from '../utils/deviceSettings';

interface MainMenuProps {
  /** Für die Statistik-Kachel und das letzte Match. */
  matches?: MatchHistory[];
  /** Ob die Engine ein unterbrochenes Match kennt. */
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  onDiscardSavedGame?: () => void;
}

const greeting = (hour: number): string =>
  hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

/** „Montag · 14. September". */
const dayLabel = (date: Date): string =>
  date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(', ', ' · ');

const TRAINING_NAMES: Record<string, string> = {
  powerScoring: 'Power Scoring',
  splitScore: 'Split Score',
  checkoutTraining: 'Checkout-Training'
};

const isTraining = (match: MatchHistory): boolean => Boolean(match.gameType && match.gameType !== 'standard');

const lastMatchTitle = (match: MatchHistory): string =>
  isTraining(match) ? `${TRAINING_NAMES[match.gameType!] ?? 'Training'} · ${match.winner}` : `${match.winner} gewinnt`;

const lastMatchMeta = (match: MatchHistory): string =>
  [
    !isTraining(match) && match.config ? `${match.config.startScore} ${match.config.outMode}` : null,
    match.isOnline ? 'online' : 'offline',
    match.date
  ].filter(Boolean).join(' · ');

interface StartTileProps {
  mark: React.ReactNode;
  title: string;
  sub: string;
  muted?: boolean;
  onClick: () => void;
}

const StartTile: React.FC<StartTileProps> = ({ mark, title, sub, muted = false, onClick }) => (
  <button type="button" className={`start-tile ${muted ? 'is-muted' : ''}`} onClick={onClick}>
    {mark}
    <span>
      <span className="start-tile-title">{title}</span>
      <span className="start-tile-sub">{sub}</span>
    </span>
  </button>
);

/**
 * Der Start-Screen (Entwurf A1–A3).
 *
 * Genau eine orange Karte, und welche es ist, sagt der Zustand:
 * · ein unterbrochenes Match → Fortsetzen,
 * · eine gespeicherte Konfiguration → „Weiter wie zuletzt" mit einem Tap,
 * · nichts von beidem → der allererste Start.
 *
 * Der direkte Start läuft durch den Setup-Screen (`/play?start=1`) und damit
 * durch dessen Vorprüfungen: gekoppelte Cloud-Profile, gültige Gast-Tokens,
 * Gastprofile, die angelegt werden müssen. Sie hier zu wiederholen hieße, sie
 * zweimal zu pflegen.
 */
export const MainMenu: React.FC<MainMenuProps> = ({
  matches,
  hasSavedGame = false,
  onResumeGame,
  onDiscardSavedGame
}) => {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [now] = useState(() => new Date());
  const navigate = useNavigate();
  const { user, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Beim Rendern gelesen: der Speicher ändert sich nur, während der Setup-Screen
  // offen ist, und danach wird dieser Screen neu aufgebaut.
  const config = useMemo(() => readStoredMatchConfig(), []);
  const pills = useMemo(() => configPills(config), [config]);
  const defaultGame = useMemo(() => readDefaultGame(), []);
  const today = useMemo(() => todayStats(matches), [matches]);
  const savedMatch = useMemo(() => {
    if (!hasSavedGame) return null;
    const parsed = readJson<SavedMatchSummary | null>('savedGame', null);
    return parsed?.players?.length && parsed.config ? parsed : null;
  }, [hasSavedGame]);
  const hasPlayed = Boolean(matches && matches.length > 0);
  const isFirstStart = useMemo(
    () => !savedMatch && !defaultGame && !hasPlayed && !has('x01StartScore'),
    [savedMatch, defaultGame, hasPlayed]
  );

  const username: string | undefined = user?.user_metadata?.username || undefined;
  const last = matches?.[0];

  /** `–` statt `0`: eine Null behauptet ein Ergebnis, ein Strich sagt „noch nichts". */
  const figure = (value: number): string => (value > 0 ? String(value) : '–');

  const firstTile = savedMatch
    ? { title: 'Neues Spiel', sub: `${pills[0]} · ${pills[1]} · wie zuletzt`, to: '/play' }
    : isFirstStart
      ? { title: 'Profil anlegen', sub: 'Damit Statistiken dir folgen', to: '/profile' }
      : { title: 'Anderes Spiel', sub: 'Modus, Spieler, Distanz', to: '/play' };

  const renderHero = () => {
    if (savedMatch) {
      const sides = matchSides(savedMatch.players, savedMatch.config);
      return (
        <>
          <button type="button" className="start-hero" onClick={() => onResumeGame?.()}>
            <span className="start-hero-main">
              <span className="label-caps">{`Fortsetzen · ${matchProgressLabel(savedMatch.players, savedMatch.config)}`}</span>
              <span className="start-hero-title">{sides.map(s => s.name).join(sides.length === 2 ? ' vs ' : ' · ')}</span>
            </span>
            <span className="start-hero-scores num">
              {sides.map((side, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="start-hero-sep" aria-hidden="true">·</span>}
                  {side.score}
                </React.Fragment>
              ))}
            </span>
          </button>
          <div className="start-hero-actions">
            <Button variant="ghost" size="compact" onClick={() => onDiscardSavedGame?.()}>
              Verwerfen
            </Button>
          </div>
        </>
      );
    }

    if (defaultGame) {
      return (
        <button
          type="button"
          className="start-hero is-center"
          onClick={() => { applyDefaultGame(defaultGame); navigate('/play?start=1'); }}
        >
          <span className="start-hero-main">
            <span className="label-caps">Standardspiel · ein Tap</span>
            <span className="start-hero-title is-large">{defaultGameTitle(defaultGame)}</span>
            <span className="start-hero-sub">{defaultGameDistance(defaultGame)}</span>
          </span>
          <span className="start-hero-play" aria-hidden="true">
            <Icons.IconPlayFilled size={22} />
          </span>
        </button>
      );
    }

    if (isFirstStart) {
      return (
        <button type="button" className="start-hero" onClick={() => navigate('/play?start=1')}>
          <span className="start-hero-main">
            <span className="label-caps">Hier anfangen</span>
            <span className="start-hero-title is-large">{`${config.startScore} spielen`}</span>
          </span>
          <span className="start-hero-aside">{pills[3]}<br />{pills[2]}</span>
        </button>
      );
    }

    return (
      <button type="button" className="start-hero is-center" onClick={() => navigate('/play?start=1')}>
        <span className="start-hero-main">
          <span className="label-caps">Weiter wie zuletzt · ein Tap</span>
          <span className="start-hero-title is-large">{`${pills[0]} · ${pills[1]}`}</span>
          <span className="start-hero-sub">{`${pills[2]} · ${pills[3]}`}</span>
        </span>
        <span className="start-hero-play" aria-hidden="true">
          <Icons.IconPlayFilled size={22} />
        </span>
      </button>
    );
  };

  return (
    <div className="screen active-screen start-screen">
      <DartboardArt className="start-board" />

      <div className="start-body">
        <header className="start-head">
          <div>
            <span className="label-caps">{isFirstStart ? 'Willkommen' : dayLabel(now)}</span>
            <h1 className="start-title">
              {greeting(now.getHours())}
              {username ? <>,<br />{username}.</> : '.'}
            </h1>
          </div>
          <button
            type="button"
            className={`start-avatar ${username ? '' : 'is-guest'}`}
            onClick={() => navigate('/profile')}
            aria-label="Profil"
          >
            {username ? username.charAt(0).toUpperCase() : '?'}
          </button>
        </header>

        <div className="start-main">{renderHero()}</div>

        <div className="start-tiles">
          <StartTile
            mark={<span className="start-mark start-mark-ring" aria-hidden="true" />}
            title={firstTile.title}
            sub={firstTile.sub}
            onClick={() => navigate(firstTile.to)}
          />
          <StartTile
            mark={<span className="start-mark start-mark-solid" aria-hidden="true" />}
            title="Training"
            sub={isFirstStart ? '3 Modi zum Üben' : 'Checkout · Power · Split'}
            onClick={() => navigate('/training')}
          />
          <StartTile
            mark={<span className="start-mark start-mark-ring is-success" aria-hidden="true" />}
            title="Online"
            sub="Mit Code beitreten"
            onClick={() => navigate('/online')}
          />
          {/* Kennzahlen des Tages, nicht eines Spielers: dieses Gerät wird von
              mehreren Leuten benutzt — siehe utils/todayStats.ts. */}
          <StartTile
            mark={
              <span className="start-tile-figure">
                <span className="num">{figure(today.matches)}</span>
                <span className="label-caps">heute</span>
              </span>
            }
            title="Statistik"
            sub={`180er ${figure(today.oneEighty)} · Bestes Leg ${figure(today.bestLeg)}`}
            muted={!hasPlayed}
            onClick={() => navigate('/stats')}
          />
        </div>

        {last && (
          <div className="start-last">
            <div>
              <span className="label-caps">Letztes Match</span>
              <span className="start-last-title">{lastMatchTitle(last)}</span>
            </div>
            <span className="start-last-meta">{lastMatchMeta(last)}</span>
          </div>
        )}

        <footer className="start-footer">
          <span className={`start-status-dot ${user ? 'is-online' : ''}`} aria-hidden="true" />
          <span className="start-status-text">
            {user ? 'Angemeldet' : 'Gast-Modus · Daten nur auf diesem Gerät'}
          </span>
          {user ? (
            <Button variant="dangerText" size="compact" onClick={() => { signOut(); navigate('/'); }}>
              Abmelden
            </Button>
          ) : (
            <Button variant="ghost" size="compact" onClick={() => navigate('/auth')}>
              Anmelden
            </Button>
          )}
          <Button
            variant="ghost"
            size="compact"
            className="start-version"
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
