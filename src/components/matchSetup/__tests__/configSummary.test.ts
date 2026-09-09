import { describe, it, expect } from 'vitest';
import { configPills, distanceLabel, lineupLabel, outModeLabel } from '../configSummary';
import type { MatchSetupConfig } from '../useMatchSetupConfig';

const config = (over: Partial<MatchSetupConfig> = {}): MatchSetupConfig => ({
  setsToWin: 1, legsToWin: 1, startScore: 501, outMode: 'DO', is2v2: false, playerCount: 2, ...over
});

describe('outModeLabel', () => {
  it('writes the mode out in full', () => {
    expect(outModeLabel('SO')).toBe('Single Out');
    expect(outModeLabel('DO')).toBe('Double Out');
    expect(outModeLabel('MO')).toBe('Master Out');
  });

  /** Ein Wert aus dem Speicher, den es nicht mehr gibt, darf nichts umbringen. */
  it('passes an unknown value through', () => {
    expect(outModeLabel('XX')).toBe('XX');
  });
});

describe('distanceLabel', () => {
  /**
   * Die Engine spielt „first to N", nicht „best of N": bei legsToWin = 3 ist
   * nach zwei gewonnenen Legs Schluss. Deshalb „Bis 3 Legs" und nie „Best of".
   */
  it('says how far it goes, not how many are played', () => {
    expect(distanceLabel({ setsToWin: 1, legsToWin: 3 })).toBe('Bis 3 Legs');
  });

  it('names the sets once there is more than one', () => {
    expect(distanceLabel({ setsToWin: 3, legsToWin: 5 })).toBe('Bis 3 Sätze');
  });
});

describe('lineupLabel', () => {
  it('counts the seats in singles', () => {
    expect(lineupLabel({ is2v2: false, playerCount: 3 })).toBe('3 Spieler');
  });

  it('says what one player alone is', () => {
    expect(lineupLabel({ is2v2: false, playerCount: 1 })).toBe('1 Spieler allein');
  });

  it('names the mode in doubles, where the count is always four', () => {
    expect(lineupLabel({ is2v2: true, playerCount: 4 })).toBe('2v2 Doppel');
  });
});

describe('configPills', () => {
  it('reads score, out mode, distance and line-up, in that order', () => {
    expect(configPills(config({ startScore: 701, outMode: 'MO', legsToWin: 3, playerCount: 3 })))
      .toEqual(['701', 'Master Out', 'Bis 3 Legs', '3 Spieler']);
  });

  /**
   * Sets und Legs sind `''`, solange ihr Zahlenfeld gerade neu getippt wird.
   * Die Karte zeigt dann die 1, mit der `toGameConfig` das Match ohnehin
   * starten würde — nicht „Bis  Legs" mit einer Lücke.
   */
  it('shows the 1 that a half-typed field would start with', () => {
    expect(configPills(config({ setsToWin: '', legsToWin: '' }))[2]).toBe('Bis 1 Legs');
  });

  /** Vier und nicht mehr: ab der fünften Pille liest man sie nicht mehr. */
  it('stays at four pills', () => {
    expect(configPills(config())).toHaveLength(4);
  });
});
