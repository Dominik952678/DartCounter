import React, { useState } from 'react';
import { isSoundEnabled, setSoundEnabled } from '../../utils/audio';
import { readKeepAwake } from '../../utils/deviceSettings';
import { useWakeLock } from '../../hooks/useWakeLock';
import { Icons } from '../ui';

interface MatchShellProps {
  /** Links in der Kopfzeile, z. B. „501 · Double Out". */
  title: string;
  /** In der Mitte, z. B. „Satz 1 · Leg 3". */
  meta: string;
  onMenu: () => void;
  /** Öffnet die Live-Statistik. Fehlt, wenn sie ohnehin daneben steht. */
  onStats?: () => void;
  left: React.ReactNode;
  right: React.ReactNode;
  /** Live-Statistik als dritte Spalte (iPad quer). */
  aside?: React.ReactNode;
  /** Dialoge und Blätter über dem Screen. */
  children?: React.ReactNode;
}

/**
 * Die Hülle des Match-Screens (Entwurf C1–C8, D1–D2): Kopfzeile mit Modus,
 * Stand, Statistik, Caller und Menü; darunter Board und Eingabe, im Querformat
 * nebeneinander.
 *
 * Die Klassen `.game-screen-left` und `.game-screen-right` sind der
 * Bezugsrahmen der Feier-Animationen (styles/celebration.css) und bleiben.
 */
export const MatchShell: React.FC<MatchShellProps> = ({ title, meta, onMenu, onStats, left, right, aside, children }) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [keepAwake] = useState(readKeepAwake);
  useWakeLock(keepAwake);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
  };

  return (
    <div className={`screen active-screen game-screen-layout ${aside ? 'has-stats-aside' : ''}`}>
      <header className="match-top-header">
        <span className="match-title">{title}</span>
        <span className="match-meta">{meta}</span>
        <div className="match-header-actions">
          {onStats && (
            <button type="button" className="match-icon-btn" onClick={onStats} aria-label="Live-Statistik">
              <Icons.IconChart size={18} />
            </button>
          )}
          <button
            type="button"
            className={`match-icon-btn btn-sound-toggle ${soundOn ? 'btn-sound-on' : 'btn-sound-off'}`}
            onClick={toggleSound}
            aria-label={soundOn ? 'Caller stummschalten' : 'Caller aktivieren'}
          >
            {soundOn ? <Icons.IconSoundOn size={18} /> : <Icons.IconSoundOff size={18} />}
          </button>
          <button type="button" className="match-menu-btn" onClick={onMenu}>Menü</button>
        </div>
      </header>

      <div className="game-screen-body">
        <div className="game-screen-left">{left}</div>
        <div className="game-screen-right">{right}</div>
        {aside && <aside className="game-screen-stats" aria-label="Live-Statistik">{aside}</aside>}
      </div>

      {children}
    </div>
  );
};
