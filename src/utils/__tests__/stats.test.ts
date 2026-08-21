import { describe, it, expect } from 'vitest';

export function calculate3DartAverage(points: number, darts: number): string {
  if (darts <= 0) return '0.00';
  return ((points / darts) * 3).toFixed(2);
}

export function calculateDartsPerLeg(targetScore: number, overallAvg: number): string {
  if (overallAvg <= 0) return '–';
  return ((targetScore * 3) / overallAvg).toFixed(1);
}

export function calculateCheckoutQuote(successes: number, attempts: number): string {
  if (attempts <= 0) return '–';
  return ((successes / attempts) * 100).toFixed(1) + '%';
}

export function calculateWinRate(wins: number, matches: number): string {
  if (matches <= 0) return '0%';
  return Math.round((wins / matches) * 100) + '%';
}

describe('Statistics Calculations and Formulas', () => {
  describe('3-Dart Average', () => {
    it('calculates exact 3-dart average for standard values', () => {
      // 501 scored in 15 darts -> avg = (501 / 15) * 3 = 100.20
      expect(calculate3DartAverage(501, 15)).toBe('100.20');
      // 501 scored in 20 darts -> avg = (501 / 20) * 3 = 75.15
      expect(calculate3DartAverage(501, 20)).toBe('75.15');
      // 501 scored in 30 darts -> avg = (501 / 30) * 3 = 50.10
      expect(calculate3DartAverage(501, 30)).toBe('50.10');
    });

    it('handles 0 darts gracefully without NaN or infinity', () => {
      expect(calculate3DartAverage(0, 0)).toBe('0.00');
      expect(calculate3DartAverage(100, 0)).toBe('0.00');
    });
  });

  describe('Darts per Leg Formula', () => {
    it('calculates theoretical darts per leg based on 501 target score and 3-dart average', () => {
      // Average 100.20 -> (501 * 3) / 100.20 = 1503 / 100.20 = 15.0 darts
      expect(calculateDartsPerLeg(501, 100.20)).toBe('15.0');
      // Average 75.15 -> 1503 / 75.15 = 20.0 darts
      expect(calculateDartsPerLeg(501, 75.15)).toBe('20.0');
      // Average 60.00 -> 1503 / 60.00 = 25.1 darts
      expect(calculateDartsPerLeg(501, 60.00)).toBe('25.1');
      // Average 50.10 -> 1503 / 50.10 = 30.0 darts
      expect(calculateDartsPerLeg(501, 50.10)).toBe('30.0');
    });

    it('adapts to custom start scores (e.g. 301, 701)', () => {
      // 301 target score, 60 average -> (301 * 3) / 60 = 903 / 60 = 15.1 darts
      expect(calculateDartsPerLeg(301, 60)).toBe('15.1');
      // 701 target score, 70 average -> (701 * 3) / 70 = 2103 / 70 = 30.0 darts
      expect(calculateDartsPerLeg(701, 70)).toBe('30.0');
    });

    it('returns dash when average is 0 or negative', () => {
      expect(calculateDartsPerLeg(501, 0)).toBe('–');
    });
  });

  describe('Checkout Quote and Win Rate', () => {
    it('computes checkout percentage accurately', () => {
      expect(calculateCheckoutQuote(1, 2)).toBe('50.0%');
      expect(calculateCheckoutQuote(3, 9)).toBe('33.3%');
      expect(calculateCheckoutQuote(0, 0)).toBe('–');
    });

    it('computes win rate percentage accurately', () => {
      expect(calculateWinRate(5, 10)).toBe('50%');
      expect(calculateWinRate(7, 10)).toBe('70%');
      expect(calculateWinRate(0, 0)).toBe('0%');
    });
  });
});
