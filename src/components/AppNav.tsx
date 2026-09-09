import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavItem, Icons } from './ui';
import type { IconProps } from './ui';

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
 * Unter 900px ist das der schwebende Dock am unteren Rand, ab 900px die linke
 * Sidebar aus DESIGN.md §6 — dasselbe Markup, umgestellt allein per CSS. Die
 * Einträge stehen als Daten hier, damit Reihenfolge und Aktiv-Regeln nicht
 * zweimal gepflegt werden müssen.
 */
export const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="app-nav" aria-label="Hauptnavigation">
      {NAV_ENTRIES.map(entry => (
        <NavItem
          key={entry.path}
          icon={<entry.icon size={22} />}
          label={entry.label}
          ariaLabel={entry.ariaLabel}
          active={entry.matches(pathname)}
          onClick={() => navigate(entry.path)}
        />
      ))}
    </nav>
  );
};
