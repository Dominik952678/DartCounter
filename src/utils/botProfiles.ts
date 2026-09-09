import type { Profile } from '../types';

/**
 * Der Zielschnitt eines Bots — die eine Stelle, die davon weiß.
 *
 * Ein Bot ist in dieser App ein gespeichertes Profil wie jedes andere, nur mit
 * `isBot: true` und einem eigenen `targetAverage`. Das ist wichtig, weil eine
 * Aufstellung mehrere Bots enthalten darf: „Bot leicht" mit Ø 40 gegen „Bot
 * hart" mit Ø 90, beide gleichzeitig am Board. Wäre die Stärke eine Einstellung
 * des Matches statt des Profils, gäbe es pro Spiel nur eine.
 *
 * Vorher stand `|| 40` an fünf Stellen im Code (Spiel-Engine, drei
 * Trainingsmodi, Ausbullen) und `level * 10 + 20` an zwei weiteren. Der
 * Zielschnitt war damit einmal eine Zahl und einmal eine Stufe, und wer eine
 * davon anfasste, verschob die Bots nur auf der Hälfte der Screens.
 */

/**
 * Die Stufen, die die Oberfläche anbietet: von „trifft die 20 mit Mühe" bis
 * „räumt 501 in zwölf Darts". Bewusst in Zehnerschritten und bewusst als
 * Average und nicht als „Level 1–10" — ein Average ist die Zahl, die nach dem
 * Spiel im Profil steht, ein Level müsste man erst übersetzen.
 */
export const BOT_AVERAGES = [30, 40, 50, 60, 70, 80, 90, 100] as const;

/**
 * Für einen Bot, dessen Zielschnitt unbekannt ist.
 *
 * 40 und nicht etwa 60: das war der Wert, der vorher an allen fünf Fundstellen
 * als `|| 40` stand. Ein Bot, der jahrelang auf 40 gespielt hat, soll nach
 * diesem Umbau nicht plötzlich stärker sein.
 */
export const DEFAULT_BOT_AVERAGE = 40;

/** Vorauswahl beim Anlegen eines neuen Bots — mittlere Stärke. */
export const NEW_BOT_AVERAGE = 50;

/** Der Zielschnitt dieses Profils, oder der Rückfall. */
export const botAverage = (profile?: Pick<Profile, 'targetAverage'> | null): number =>
  profile?.targetAverage ?? DEFAULT_BOT_AVERAGE;

/**
 * Die Auswahlliste für ein bestimmtes Profil: die Stufen, plus dessen aktuellen
 * Wert, falls er auf keine davon fällt.
 *
 * Ohne diese Ergänzung stünde ein `<select>` leer da, sobald ein Profil einen
 * Zwischenwert trägt — etwa die 45 des früher mitgelieferten Bots oder die 88
 * aus den Testdaten. Den Wert stillschweigend auf die nächste Stufe zu runden
 * wäre die andere Möglichkeit, aber das änderte ohne Anlass die Stärke eines
 * Gegners, den jemand vielleicht genau so eingestellt hat.
 */
export const botAverageOptions = (current: number): number[] =>
  BOT_AVERAGES.includes(current as typeof BOT_AVERAGES[number])
    ? [...BOT_AVERAGES]
    : [...BOT_AVERAGES, current].sort((a, b) => a - b);

/**
 * Gibt jedem Bot einen ausdrücklichen Zielschnitt.
 *
 * Läuft beim Laden der Profile und ist idempotent — deshalb hängt sie NICHT an
 * `STORAGE_SCHEMA_VERSION`. Eine einmalige, versionierte Migration würde hier
 * nicht reichen: die Profile liegen auch in der Cloud, und von einem zweiten
 * Gerät kann jederzeit ein unmigrierter Satz zurückkommen. Eine Normalisierung
 * bei jedem Laden ist gegen diesen Fall immun.
 *
 * Sie füllt nur, was fehlt. Ein vorhandener Wert wird nie angetastet, auch kein
 * ungewöhnlicher: `botAverageOptions` sorgt dafür, dass er in der Oberfläche
 * trotzdem auftaucht.
 *
 * Gibt bei nichts zu tun das Original zurück, damit ein Aufrufer, der auf
 * Identität prüft, keinen Schreibvorgang auslöst.
 */
export const withBotAveragesFilled = (
  profiles: Record<string, Profile>
): Record<string, Profile> => {
  const incomplete = Object.entries(profiles).filter(
    ([, profile]) => profile?.isBot && profile.targetAverage === undefined
  );
  if (incomplete.length === 0) return profiles;

  const next = { ...profiles };
  incomplete.forEach(([name, profile]) => {
    next[name] = { ...profile, targetAverage: DEFAULT_BOT_AVERAGE };
  });
  return next;
};

/**
 * Wie ein Bot in einer Spielerliste heißt: Name plus Zielschnitt.
 *
 * Die Stärke gehört an die Stelle, an der man den Gegner auswählt. Sie nur im
 * Profil-Screen zu zeigen heißt, dass man beim Aufstellen nicht weiß, wen man
 * sich holt — und bei mehreren Bots in der Liste ist der Name allein keine
 * Auskunft mehr.
 */
export const botRosterLabel = (name: string, profile?: Profile | null): string =>
  profile?.isBot ? `${name} · Ø ${botAverage(profile)}` : name;
