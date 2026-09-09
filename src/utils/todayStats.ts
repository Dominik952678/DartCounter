import type { MatchHistory, PlayerStats } from '../types';

/**
 * Was heute auf diesem Gerät geworfen wurde.
 *
 * Drei Zahlen für die kleine Kachel auf dem Start-Screen. Die Auswahl ist eine
 * bewusste Entscheidung und nicht die naheliegende: ein Average wäre die
 * Kennzahl, die man erwartet, aber diese App wird auf einem Gerät von mehreren
 * Leuten benutzt. Ein Average über die Darts von jemandem mit Ø 90 und jemandem
 * mit Ø 35 ist keine Kennzahl, sondern ein Mittelwert ohne Gegenstand.
 *
 * Zählbares dagegen addiert sich über Spieler hinweg sauber: wie viele Matches
 * gelaufen sind, wie viele 180er gefallen sind, und das kürzeste Leg des Tages.
 * Alle drei bedeuten auf einem Gerät im Wohnzimmer genau das, was sie sagen.
 *
 * Wer seinen eigenen Average sehen will, findet ihn im Profil — dort ist klar,
 * wessen er ist.
 */
export interface TodayStats {
  matches: number;
  oneEighty: number;
  /** Darts im kürzesten heute gewonnenen Leg; 0, wenn keins aufgezeichnet ist. */
  bestLeg: number;
}

/**
 * Ob dieser Zeitstempel auf denselben Kalendertag fällt wie `now`.
 *
 * Verglichen wird über die lokalen Datumsteile und nicht über einen
 * Tagesbeginn in Millisekunden: an einer Zeitumstellung ist ein Tag nicht 24
 * Stunden lang, und ein Vergleich per `getTime() - 86400000` schiebt die Grenze
 * dann um eine Stunde.
 *
 * Gelesen wird `createdAt`, der ISO-Zeitstempel. `date` daneben ist ein für
 * Menschen formatierter String, den man laut Typ-Kommentar ausdrücklich nicht
 * vergleichen soll. Ein Match ohne `createdAt` — aus der Zeit vor diesem Feld —
 * gilt als nicht von heute: eine falsche Zuordnung wäre schlimmer als eine
 * fehlende, weil die Kachel sonst Würfe von letzter Woche behauptet.
 */
const isToday = (match: MatchHistory, now: Date): boolean => {
  const raw = match.createdAt;
  if (!raw) return false;
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) return false;
  return (
    when.getFullYear() === now.getFullYear() &&
    when.getMonth() === now.getMonth() &&
    when.getDate() === now.getDate()
  );
};

export const todayStats = (
  matches: readonly MatchHistory[] | undefined,
  now: Date = new Date()
): TodayStats => {
  const safe = Array.isArray(matches) ? matches : [];
  const today = safe.filter(match => match && isToday(match, now));

  let oneEighty = 0;
  let bestLeg = 0;

  today.forEach(match => {
    const players: PlayerStats[] = Array.isArray(match.players) ? match.players : [];
    players.forEach(player => {
      if (!player) return;
      oneEighty += player.oneEighty ?? 0;
      const leg = player.bestMatchLeg ?? 0;
      // Beim kürzesten Leg gewinnt die kleinere Zahl — deshalb kein Math.max,
      // und deshalb muss die 0 als „nicht aufgezeichnet" ausgeschlossen bleiben.
      if (leg > 0 && (bestLeg === 0 || leg < bestLeg)) bestLeg = leg;
    });
  });

  return { matches: today.length, oneEighty, bestLeg };
};
