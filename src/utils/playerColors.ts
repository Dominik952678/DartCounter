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

/**
 * Dieselben Farben als Literale.
 *
 * Nur für `<input type="color">`: das Element akzeptiert ausschließlich einen
 * Hex-Wert und kann mit `var(--player-1)` nichts anfangen. Überall sonst gilt
 * der Variablen-Verweis oben.
 *
 * MUSS mit dem Spielerpaletten-Block in styles/tokens.css übereinstimmen —
 * eine CSS-Custom-Property lässt sich von hier aus nicht auslesen.
 */
export const PLAYER_COLOR_HEX = ['#5DA9E9', '#E9A05D', '#A9E95D', '#E95DA9'] as const;

/** Voreinstellung der Farbwahl im Profil, wenn noch keine gesetzt ist. */
export const DEFAULT_PLAYER_COLOR_HEX = PLAYER_COLOR_HEX[0];

/** Farbe nach Sitzplatz — für alles, was eine feste Reihenfolge hat. */
export const playerColorBySeat = (seat: number): string =>
  PLAYER_COLORS[((seat % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];

/**
 * Farbe nach Name, damit derselbe Spieler seinen Avatar behält, egal auf
 * welchem Platz er sitzt.
 *
 * Nimmt bewusst auch `undefined`: der Typ `MatchHistory.winner` ist zwar
 * `string`, aber eingespielte Sicherungen werden nicht Feld für Feld geprüft
 * (siehe parseBackup), und `parseWinningTeam` behandelt denselben Wert schon
 * als optional. Ein fehlender Name darf die Match-Historie nicht abstürzen
 * lassen — er bekommt den ersten Ton. */
export const playerColorByName = (name: string | undefined): string => {
  let hash = 0;
  for (let i = 0; i < (name?.length ?? 0); i++) {
    hash = name!.charCodeAt(i) + ((hash << 5) - hash);
  }
  return playerColorBySeat(Math.abs(hash));
};

/** Ob ein gespeicherter Farbwert von `<input type="color">` akzeptiert wird. */
export const isHexColor = (value: string | undefined): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

/** In 2v2 tragen die beiden Teams die ersten zwei Töne der Palette. */
export const teamColor = (team: 1 | 2): string => playerColorBySeat(team - 1);
