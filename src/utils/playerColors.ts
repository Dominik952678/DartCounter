/**
 * Die Spielerfarben aus styles/tokens.css.
 *
 * §1 von DESIGN.md kennt zwei kategorische Akzente, die App muss aber bis zu
 * vier Spieler unterscheiden — auf einem Board, das man aus drei Metern
 * abliest. Die Palette ist deshalb eine bewusste Erweiterung und liegt hier
 * als eine Quelle für alle Screens, die Spieler einfärben: die Sitzplätze im
 * Match-Setup und die Karten auf dem Scoreboard.
 *
 * Zurückgegeben werden `var(--player-n)`-Verweise, keine Hex-Werte — die
 * Farbe selbst steht ausschließlich in tokens.css.
 */

const PLAYER_COLORS = [
  'var(--player-1)',
  'var(--player-2)',
  'var(--player-3)',
  'var(--player-4)'
] as const;

/** Farbe nach Sitzplatz — für alles, was eine feste Reihenfolge hat. */
export const playerColorBySeat = (seat: number): string =>
  PLAYER_COLORS[((seat % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];

/**
 * Farbe nach Name, damit derselbe Spieler seinen Avatar behält, egal auf
 * welchem Platz er sitzt. Leere Namen bekommen den ersten Ton statt einer
 * Sonderbehandlung.
 */
export const playerColorByName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return playerColorBySeat(Math.abs(hash));
};

/** In 2v2 tragen die beiden Teams die ersten zwei Töne der Palette. */
export const teamColor = (team: 1 | 2): string => playerColorBySeat(team - 1);
