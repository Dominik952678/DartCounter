import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavItem, Icons } from './ui';
import type { IconProps } from './ui';
import { useMinWidth } from '../hooks/useBreakpoint';

/**
 * Waagerecht ist der Dock am unteren Rand, senkrecht die Schiene links.
 *
 * Es ist ein Prop und keine reine CSS-Umschaltung, weil die gleitende
 * Markierung wissen muss, auf welcher Achse sie sich bewegt — `translateX` oder
 * `translateY`. Das ließe sich zwar auch mit zwei Media-Query-Regeln schreiben,
 * aber dann steht die 900px-Grenze an einer weiteren Stelle, und die
 * Komponente wäre ohne Fensterbreite nicht prüfbar.
 */
export type NavOrientation = 'horizontal' | 'vertical';

export interface AppNavProps {
  /**
   * Ohne Angabe entscheidet die 900px-Stufe aus DESIGN.md §6. Setzen nur, wenn
   * eine Ausrichtung erzwungen werden soll — im Test, oder wenn ein Screen die
   * Schiene bewusst anders stellt.
   */
  orientation?: NavOrientation;
}

interface NavEntry {
  path: string;
  /** Die Komponente selbst, nicht ein fertiges Element — der Eintrag legt das
      Bild fest, die Navigation entscheidet über die Größe. */
  icon: React.FC<IconProps>;
  label: string;
  ariaLabel: string;
  /** Welche Pfade diesen Eintrag aktiv machen — nicht nur `path` selbst. */
  matches: (pathname: string) => boolean;
}

const NAV_ENTRIES: readonly NavEntry[] = [
  {
    path: '/',
    icon: Icons.IconHome,
    label: 'Home',
    ariaLabel: 'Home',
    matches: p => p === '/'
  },
  {
    path: '/offline',
    icon: Icons.IconTarget,
    label: 'Offline',
    ariaLabel: 'Offline Match',
    matches: p => p.startsWith('/offline') || p.startsWith('/training')
  },
  {
    path: '/online',
    icon: Icons.IconGlobe,
    label: 'Online',
    ariaLabel: 'Online Multiplayer',
    matches: p => p.startsWith('/online') || p.startsWith('/lobby')
  },
  {
    path: '/stats',
    icon: Icons.IconBars,
    label: 'Stats',
    ariaLabel: 'Statistiken',
    matches: p => p.startsWith('/stats')
  },
  {
    path: '/profile',
    icon: Icons.IconUser,
    label: 'Profil',
    ariaLabel: 'Profil',
    matches: p => p.startsWith('/profile') || p.startsWith('/auth')
  }
];

/**
 * Die Hauptnavigation der App.
 *
 * Unter 900px der schwebende Dock am unteren Rand, ab 900px die linke Schiene
 * aus DESIGN.md §6 — ein Markup, zwei Ausrichtungen. Die Einträge stehen als
 * Daten hier, damit Reihenfolge und Aktiv-Regeln nicht zweimal gepflegt werden
 * müssen.
 *
 * Der aktive Zustand ist eine gleitende Markierung, kein Umfärben des
 * Eintrags: ein Element, das von der alten zur neuen Position fährt. Das ist
 * nicht nur Zierde — die Bewegung zeigt, WOHER die Auswahl kam, und genau das
 * fehlt, wenn an einer Stelle ein Rahmen erscheint und an einer anderen
 * verschwindet.
 *
 * Sie kommt ohne Messung aus, und darauf ist das CSS gebaut: `--nav-count` und
 * `--nav-active` gehen als Custom Properties an die Schiene, das Stylesheet
 * rechnet Breite bzw. Höhe daraus. Die Bedingung dafür ist, dass alle Einträge
 * gleich groß sind — deshalb hat der Dock eine Obergrenze und der Eintrag
 * keine. Die Alternative wäre `offsetLeft` je Eintrag samt ResizeObserver, also
 * ein Layout-Lesen pro Render für etwas, das eine Division erledigt.
 *
 * `prefers-reduced-motion` ist nirgends abgefragt: die Dauer steckt in
 * `--motion-slide`, und das Token steht unter dieser Präferenz auf 0s. Die
 * Markierung springt dann sofort an die richtige Stelle.
 */
export const AppNav: React.FC<AppNavProps> = ({ orientation }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isRail = useMinWidth('tablet');
  const layout: NavOrientation = orientation ?? (isRail ? 'vertical' : 'horizontal');

  const activeIndex = NAV_ENTRIES.findIndex(entry => entry.matches(pathname));

  return (
    <nav
      className={`app-nav app-nav-${layout}`}
      aria-label="Hauptnavigation"
      style={{
        '--nav-count': NAV_ENTRIES.length,
        // Ohne Treffer bleibt die Markierung auf Position 0 stehen und wird
        // ausgeblendet — sonst fährt sie beim nächsten Wechsel aus dem Nichts
        // heran, und ein `display: none` würde jede Bewegung verschlucken.
        '--nav-active': activeIndex < 0 ? 0 : activeIndex
      } as React.CSSProperties}
    >
      <span
        className={`nav-indicator ${activeIndex < 0 ? 'is-hidden' : ''}`}
        aria-hidden="true"
      />
      {NAV_ENTRIES.map((entry, i) => (
        <NavItem
          key={entry.path}
          icon={<entry.icon size={22} />}
          label={entry.label}
          ariaLabel={entry.ariaLabel}
          active={i === activeIndex}
          onClick={() => navigate(entry.path)}
        />
      ))}
    </nav>
  );
};
