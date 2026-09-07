import React from 'react';

export interface NavItemProps {
  /** Emoji oder Icon — dekorativ, der Screenreader liest `label`. */
  icon: React.ReactNode;
  label: string;
  /** Vollständiger Name für Screenreader, wenn `label` abgekürzt ist ("Stats"). */
  ariaLabel?: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Ein Navigationseintrag — Icon plus Label, das Muster aus DESIGN.md §7, das
 * ausdrücklich beibehalten wird.
 *
 * Bottom-Tabs und Sidebar rendern dieselbe Komponente; ob Icon und Label
 * übereinander oder nebeneinander stehen, entscheidet allein CSS am 900px-
 * Breakpoint aus §6. Deshalb gibt es hier keine `variant`-Prop und keine
 * Abfrage der Fensterbreite: der Umsetzungshinweis in §6 sagt, dass reine
 * CSS-Breakpoints reichen, und zwei DOM-Bäume für dieselbe Navigation wären
 * zwei Stellen, an denen ein Eintrag vergessen werden kann.
 */
export const NavItem: React.FC<NavItemProps> = ({ icon, label, ariaLabel, active, onClick }) => (
  <button
    type="button"
    className={`nav-item ${active ? 'active' : ''}`}
    onClick={onClick}
    aria-label={ariaLabel ?? label}
    aria-current={active ? 'page' : undefined}
  >
    <span className="nav-icon" aria-hidden="true">{icon}</span>
    <span className="nav-label">{label}</span>
  </button>
);
