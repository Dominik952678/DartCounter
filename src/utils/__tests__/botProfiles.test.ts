import { describe, it, expect } from 'vitest';
import {
  BOT_AVERAGES,
  DEFAULT_BOT_AVERAGE,
  botAverage,
  botAverageOptions,
  botRosterLabel,
  withBotAveragesFilled
} from '../botProfiles';
import type { Profile } from '../../types';

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

describe('botAverage', () => {
  it('reads the profile value', () => {
    expect(botAverage(profile({ isBot: true, targetAverage: 70 }))).toBe(70);
  });

  /**
   * Der Rückfall ist 40, weil an fünf Stellen im Code `|| 40` stand. Ein Bot,
   * der jahrelang auf 40 gespielt hat, darf nach dem Umbau nicht stärker sein.
   */
  it.each([
    ['a bot without one', profile({ isBot: true })],
    ['undefined', undefined],
    ['null', null]
  ])('falls back to %s', (_label, input) => {
    expect(botAverage(input)).toBe(40);
    expect(DEFAULT_BOT_AVERAGE).toBe(40);
  });
});

describe('botAverageOptions', () => {
  it('offers the eight steps for a value that sits on one', () => {
    expect(botAverageOptions(60)).toEqual([...BOT_AVERAGES]);
  });

  /**
   * Ein Zwischenwert — die 45 des früher mitgelieferten Bots, die 88 aus den
   * Testdaten. Er wird eingereiht statt gerundet: Runden änderte ohne Anlass
   * die Stärke eines Gegners, den jemand vielleicht genau so eingestellt hat,
   * und ein `<select>` ohne den eigenen Wert stünde leer da.
   */
  it.each([45, 88, 25, 120])('slots an off-step value like %i in, in order', current => {
    const options = botAverageOptions(current);
    expect(options).toContain(current);
    expect(options).toHaveLength(BOT_AVERAGES.length + 1);
    expect([...options]).toEqual([...options].sort((a, b) => a - b));
  });
});

describe('withBotAveragesFilled', () => {
  it('gives a bot without one the fallback', () => {
    const next = withBotAveragesFilled({ Bot: profile({ isBot: true }) });
    expect(next.Bot.targetAverage).toBe(DEFAULT_BOT_AVERAGE);
  });

  it('never touches a value that is already there, however unusual', () => {
    const next = withBotAveragesFilled({ Bot: profile({ isBot: true, targetAverage: 45 }) });
    expect(next.Bot.targetAverage).toBe(45);
  });

  it('leaves a human alone', () => {
    const next = withBotAveragesFilled({ Anna: profile() });
    expect(next.Anna.targetAverage).toBeUndefined();
  });

  /**
   * Läuft bei jedem Laden statt einmalig versioniert, weil aus der Cloud
   * jederzeit ein unnormalisierter Satz zurückkommen kann. Damit muss sie zwei
   * Dinge können: mehrfach dasselbe Ergebnis liefern, und bei nichts zu tun das
   * Original zurückgeben — sonst löste jedes Laden einen Schreibvorgang aus.
   */
  it('is idempotent', () => {
    const once = withBotAveragesFilled({ Bot: profile({ isBot: true }) });
    expect(withBotAveragesFilled(once)).toBe(once);
  });

  it('returns the same object when there is nothing to fill', () => {
    const input = { Anna: profile(), Bot: profile({ isBot: true, targetAverage: 80 }) };
    expect(withBotAveragesFilled(input)).toBe(input);
  });

  it('fills several bots at once and keeps the rest', () => {
    const next = withBotAveragesFilled({
      Anna: profile({ wins: 3 }),
      'Bot leicht': profile({ isBot: true }),
      'Bot stark': profile({ isBot: true, targetAverage: 90 })
    });
    expect(next['Bot leicht'].targetAverage).toBe(DEFAULT_BOT_AVERAGE);
    expect(next['Bot stark'].targetAverage).toBe(90);
    expect(next.Anna.wins).toBe(3);
  });
});

describe('botRosterLabel', () => {
  it('appends the strength to a bot, so the pick is informed', () => {
    expect(botRosterLabel('Bot stark', profile({ isBot: true, targetAverage: 80 })))
      .toBe('Bot stark · Ø 80');
  });

  it('leaves a human name as it is', () => {
    expect(botRosterLabel('Anna', profile())).toBe('Anna');
    expect(botRosterLabel('Gast 1', undefined)).toBe('Gast 1');
  });
});
