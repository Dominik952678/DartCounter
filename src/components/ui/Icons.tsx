import React from 'react';

/**
 * Das Icon-Set der App — eine Datei, eine Bildsprache.
 *
 * Vorher trug jedes Icon in dieser App ein Emoji. Emoji sind bequem, aber sie
 * gehören dem Betriebssystem: dasselbe 🎯 ist auf iOS ein anderes Bild als auf
 * Android, es bringt seine eigenen Farben mit (die sich um kein Theme kümmern),
 * es lässt sich nicht auf Strichstärke oder optische Größe abstimmen, und in
 * einer Reihe mit fünf Stück sitzt jedes auf einer anderen Grundlinie.
 *
 * Die Regeln, die alle Icons hier teilen — Abweichungen gibt es nicht:
 * · 24×24-Koordinatensystem, egal wie groß gerendert wird.
 * · `fill="none"`, gezeichnet wird ausschließlich mit der Linie.
 * · `stroke="currentColor"` — die Farbe kommt vom Text, nie aus dem Icon.
 *   Damit folgt jedes Icon automatisch dem Theme und dem Zustand des Elements,
 *   in dem es steht (aktiv, deaktiviert, auf gefüllter Akzentfläche).
 * · Strichstärke 2.75, runde Enden und Ecken. Das ist der Wert, der die Icons
 *   als eine Familie zusammenhält.
 * · `aria-hidden` und `focusable="false"`: ein Icon ist Dekoration neben einem
 *   Label. Steht es allein in einem Button, gehört der Name auf den Button
 *   (`aria-label`), nicht ins Bild.
 *
 * Ein neues Icon gehört hierher und nirgendwo sonst. Ein `<svg>` inline in
 * einer Komponente ist der Anfang von genau dem Wildwuchs, den das Set beendet.
 */

export interface IconProps {
  /** Kantenlänge in px. Der Pfad skaliert mit, die Strichstärke passt sich an. */
  size?: number;
  className?: string;
  /** Nur für Positionierung (Zentrieren, Abstand) — nie für Farbe oder Größe. */
  style?: React.CSSProperties;
  /**
   * Nur setzen, wenn die automatische Anpassung nicht passt. Sonst gilt: 2.75,
   * und unter 18px etwas kräftiger — siehe `strokeFor`.
   */
  strokeWidth?: number;
}

/**
 * Die Strichstärke wächst bei kleinen Größen.
 *
 * 2.75 auf 24px ist der Grundwert. Auf 15px gerendert entspricht dieselbe Linie
 * nur noch 1.7 Gerätepixeln, und ein Chevron in einem 38px-Knopf verschwindet
 * gegen den Text daneben. Deshalb geht es unter 18px auf 3 — nicht als
 * Ausnahme, sondern weil optisch gleich schwer hier verschieden dick heißt.
 */
const strokeFor = (size: number): number => (size < 18 ? 3 : 2.75);

const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 22,
  className,
  style,
  strokeWidth,
  children
}) => (
  <svg
    /* `.icon` trägt nur Ausrichtung: `inline-block`, damit das Icon in einer
       Textzeile mitläuft (eine Zeile mit `text-overflow: ellipsis` darf kein
       Flex-Container werden), `vertical-align: middle` gegen die Grundlinie,
       und `flex: none`, damit es in einer engen Flex-Zeile nicht als erstes
       zusammengedrückt wird. */
    className={['icon', className].filter(Boolean).join(' ')}
    style={style}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth ?? strokeFor(size)}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Marke & Navigation
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Das Dartboard: drei konzentrische Kreise, der innerste gefüllt.
 *
 * Trägt die Wortmarke und steht für die App selbst — und, weil Checkout das
 * Treffen eines bestimmten Feldes ist, auch für den Checkout-Modus. Der Punkt
 * in der Mitte nutzt `fill="currentColor"`, weil ein Bull mit 2.75er Linie bei
 * dieser Größe zu einem grauen Fleck zuläuft.
 */
export const IconTarget: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

/** Start. Ein Haus, aufs Nötigste reduziert: Dach und Grundriss. */
export const IconHome: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M9.5 20v-5.5h5V20" />
  </Icon>
);

/** Spielen. Dasselbe Dreieck wie in der Resume-Karte, aber ohne Füllung. */
export const IconPlay: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M7 4.8 19 12 7 19.2z" />
  </Icon>
);

/** Gefülltes Dreieck — für die primäre Aktion, wo die Linie zu leise wäre. */
export const IconPlayFilled: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M6 4.5 19 12 6 19.5z" fill="currentColor" />
  </Icon>
);

/** Online. Ein Globus: Kreis, Äquator, ein Längenkreis. */
export const IconGlobe: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <ellipse cx="12" cy="12" rx="4.2" ry="9" />
  </Icon>
);

/** Statistik. Drei steigende Balken — dasselbe Bild wie für Power Scoring. */
export const IconBars: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M6 20v-6" />
    <path d="M12 20V9" />
    <path d="M18 20V4" />
  </Icon>
);

/** Profil. Kopf und Schultern. */
export const IconUser: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="12" cy="8.2" r="3.8" />
    <path d="M4.8 20c.6-3.7 3.6-5.6 7.2-5.6s6.6 1.9 7.2 5.6" />
  </Icon>
);

/** Mehrere Spieler — zwei Köpfe, der hintere angeschnitten. */
export const IconUsers: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="9.6" cy="8.4" r="3.5" />
    <path d="M3.2 19.6c.5-3.4 3.1-5.2 6.4-5.2s5.9 1.8 6.4 5.2" />
    <path d="M16.4 5.4a3.5 3.5 0 0 1 0 6" />
    <path d="M18 14.8c1.7.7 2.6 2.2 2.9 4.3" />
  </Icon>
);

/** Trainingsmodus Split Score: eine Linie, die zwei Hälften trennt. */
export const IconSplit: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M5 12h14" />
    <circle cx="12" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);

/** Training allgemein — eine Hantel. */
export const IconTraining: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M4 9v6" />
    <path d="M7 6.5v11" />
    <path d="M17 6.5v11" />
    <path d="M20 9v6" />
    <path d="M7 12h10" />
  </Icon>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Richtung
   ═══════════════════════════════════════════════════════════════════════════ */

export const IconChevronUp: React.FC<IconProps> = props => (
  <Icon {...props}><path d="M6 14l6-6 6 6" /></Icon>
);

export const IconChevronDown: React.FC<IconProps> = props => (
  <Icon {...props}><path d="M6 10l6 6 6-6" /></Icon>
);

export const IconChevronLeft: React.FC<IconProps> = props => (
  <Icon {...props}><path d="M14 6l-6 6 6 6" /></Icon>
);

export const IconChevronRight: React.FC<IconProps> = props => (
  <Icon {...props}><path d="M10 6l6 6-6 6" /></Icon>
);

/** Weiter. Der Pfeil auf dem Start-Button. */
export const IconArrowRight: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M5 12h13" />
    <path d="M12 5.5 18.5 12 12 18.5" />
  </Icon>
);

/** Zurück — derselbe Pfeil, gespiegelt. */
export const IconArrowLeft: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M19 12H6" />
    <path d="M12 5.5 5.5 12 12 18.5" />
  </Icon>
);

export const IconArrowUp: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M12 19V6" />
    <path d="M5.5 12 12 5.5 18.5 12" />
  </Icon>
);

export const IconArrowDown: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M12 5v13" />
    <path d="M5.5 12 12 18.5 18.5 12" />
  </Icon>
);

/** Verlassen der App — Pfeil aus einem Rahmen heraus. */
export const IconExternal: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    <path d="M14 4h6v6" />
    <path d="M20 4l-8 8" />
  </Icon>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Aktionen
   ═══════════════════════════════════════════════════════════════════════════ */

export const IconPlus: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

export const IconMinus: React.FC<IconProps> = props => (
  <Icon {...props}><path d="M5 12h14" /></Icon>
);

export const IconClose: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Icon>
);

export const IconCheck: React.FC<IconProps> = props => (
  <Icon {...props}><path d="M5 12.5 10 17.5 19.5 7" /></Icon>
);

/** Rückgängig. Ein Pfeil, der eine Kehre macht. */
export const IconUndo: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M4 8.5v5h5" />
    <path d="M4.6 13.5A8 8 0 1 0 6.8 7.2" />
  </Icon>
);

/** Neu laden, neu würfeln — der Kreis mit zwei Pfeilspitzen. */
export const IconRefresh: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M20 5.5v5h-5" />
    <path d="M4 18.5v-5h5" />
    <path d="M19.4 10.5a8 8 0 0 0-14-3.3L4 8.5" />
    <path d="M4.6 13.5a8 8 0 0 0 14 3.3l1.4-1.3" />
  </Icon>
);

/** Reihenfolge auslosen — zwei Wege, die sich kreuzen. */
export const IconShuffle: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M16 4h4v4" />
    <path d="M20 4 4 20" />
    <path d="M16 20h4v-4" />
    <path d="M4 4l5.5 5.5" />
    <path d="M20 20l-5.5-5.5" />
  </Icon>
);

export const IconTrash: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V4.8h5V7" />
    <path d="M6.5 7l1 12.2h9L17.5 7" />
  </Icon>
);

/** Rücktaste im Zahlenfeld. */
export const IconBackspace: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M20 5.5H9.4L3.2 12l6.2 6.5H20z" />
    <path d="M16.4 9.6l-4.8 4.8" />
    <path d="M11.6 9.6l4.8 4.8" />
  </Icon>
);

/** In die Zwischenablage. */
export const IconCopy: React.FC<IconProps> = props => (
  <Icon {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </Icon>
);

/** Bild teilen / exportieren — eine Kamera. */
export const IconCamera: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M3.5 8.8A2 2 0 0 1 5.5 7h1.7l1.3-2h6l1.3 2h2.7a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="3.4" />
  </Icon>
);

export const IconDownload: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M12 4v10" />
    <path d="M7.5 10 12 14.5 16.5 10" />
    <path d="M4.5 18.5h15" />
  </Icon>
);

export const IconUpload: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M12 14.5V4.5" />
    <path d="M7.5 9 12 4.5 16.5 9" />
    <path d="M4.5 18.5h15" />
  </Icon>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Zustand
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Warnung, Fehler, „das geht nicht".
 *
 * Der Punkt ist gefüllt, weil ein Kreis mit r=1.1 und 2.75er Linie zuläuft.
 */
export const IconAlert: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5" />
    <circle cx="12" cy="16.4" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);

/** Hinweis, Tipp. Dasselbe Zeichen, gedreht — Punkt oben. */
export const IconInfo: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11.4v5.2" />
    <circle cx="12" cy="7.9" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconLock: React.FC<IconProps> = props => (
  <Icon {...props}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Icon>
);

export const IconUnlock: React.FC<IconProps> = props => (
  <Icon {...props}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 7.6-1.7" />
  </Icon>
);

/**
 * Geblockt (2v2-Freeze). Ein Schlüsselloch mit Balken davor — nicht dasselbe
 * Bild wie IconLock, weil „geblockt" ein Spielzustand ist und keine Sicherheit.
 */
export const IconFrozen: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M12 3.5v17" />
    <path d="M4.6 7.8l14.8 8.4" />
    <path d="M4.6 16.2l14.8-8.4" />
  </Icon>
);

export const IconTrophy: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
    <path d="M8 5.8H5.2v1.4A3.2 3.2 0 0 0 8.4 10.4" />
    <path d="M16 5.8h2.8v1.4a3.2 3.2 0 0 1-3.2 3.2" />
    <path d="M12 12.9v3.6" />
    <path d="M8.4 19.5h7.2" />
    <path d="M9.8 19.5c0-1.7 1-3 2.2-3s2.2 1.3 2.2 3" />
  </Icon>
);

export const IconKey: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="8" cy="8" r="3.8" />
    <path d="M10.8 10.8 20 20" />
    <path d="M17 17l-2.2 2.2" />
  </Icon>
);

export const IconMail: React.FC<IconProps> = props => (
  <Icon {...props}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="M4.5 8l7.5 5 7.5-5" />
  </Icon>
);

export const IconCloud: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M7.2 18.5a4 4 0 0 1-.3-8 5.4 5.4 0 0 1 10.3 1.3 3.4 3.4 0 0 1-.7 6.7z" />
  </Icon>
);

export const IconDevice: React.FC<IconProps> = props => (
  <Icon {...props}>
    <rect x="6.5" y="3" width="11" height="18" rx="2.6" />
    <path d="M10.6 18h2.8" />
  </Icon>
);

export const IconLink: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M10 14a3.5 3.5 0 0 1 0-5l2.5-2.5a3.5 3.5 0 0 1 5 5L16 13" />
    <path d="M14 10a3.5 3.5 0 0 1 0 5L11.5 17.5a3.5 3.5 0 0 1-5-5L8 11" />
  </Icon>
);

/** Verlauf, gespeicherte Matches. */
export const IconHistory: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M3.6 8.5v5h5" />
    <path d="M4.2 13.5A8 8 0 1 0 6.4 7.2" />
    <path d="M12 8.4V12l2.8 1.8" />
  </Icon>
);

export const IconChart: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M4 19h16" />
    <path d="M5.5 15.2 10 9.8l3.6 3 5-6" />
  </Icon>
);

/** Erscheinungsbild / Theme. */
export const IconPalette: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M12 20.5a8.5 8.5 0 1 1 8.5-8.5c0 2.4-2 3.4-3.8 3.4h-1.4a2 2 0 0 0-1.4 3.4 1.9 1.9 0 0 1-1.9 1.7z" />
    <circle cx="8.6" cy="10.4" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.6" cy="10" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Ton
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Ton an — Lautsprecher mit zwei Bögen.
 *
 * Die Bögen liegen in einer eigenen Gruppe, damit `IconSoundOff` denselben
 * Lautsprecherkörper benutzt und die beiden Zustände nicht auseinanderdriften.
 */
export const IconSoundOn: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M4 9.5h3.5L12 6v12L7.5 14.5H4z" />
    <path d="M15.4 9.4a3.6 3.6 0 0 1 0 5.2" />
    <path d="M18 7a7 7 0 0 1 0 10" />
  </Icon>
);

/** Ton aus — derselbe Körper, durchgestrichen. */
export const IconSoundOff: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M4 9.5h3.5L12 6v12L7.5 14.5H4z" />
    <path d="M16 10l4 4" />
    <path d="M20 10l-4 4" />
  </Icon>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Spieler
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Bot. Ein Kopf mit Antenne und zwei Augen.
 *
 * Steht neben jedem Bot-Profil, dort wo vorher 🤖 stand — dasselbe Bild, aber
 * in der Farbe des Textes und in derselben Strichstärke wie alles daneben.
 */
export const IconBot: React.FC<IconProps> = props => (
  <Icon {...props}>
    <rect x="4.5" y="8" width="15" height="11.5" rx="3.2" />
    <path d="M12 4.5V8" />
    <circle cx="9.2" cy="13.4" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="13.4" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
);

/** Gast — ein Profil mit gestricheltem Rand gibt es nicht; hier: Kopf im Kreis. */
export const IconGuest: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="9.6" r="2.6" />
    <path d="M7 18c.6-2.3 2.6-3.6 5-3.6s4.4 1.3 5 3.6" />
  </Icon>
);

/** Der Bull beim Ausbullen. */
export const IconBull: React.FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </Icon>
);

/** Testdaten, Spielwiese. */
export const IconFlask: React.FC<IconProps> = props => (
  <Icon {...props}>
    <path d="M9.5 4h5v4.6l4 8.4a2 2 0 0 1-1.8 3H8.3a2 2 0 0 1-1.8-3l4-8.4z" />
    <path d="M8.2 14.5h7.6" />
  </Icon>
);
