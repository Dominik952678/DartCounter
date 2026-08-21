import { describe, it, expect } from 'vitest';
import { getBotDart } from '../bot';

describe('Bot AI Dart Generation', () => {
  it('returns valid base and mult values for high score scoring phase', () => {
    for (let i = 0; i < 50; i++) {
      const dart = getBotDart(60, 501);
      expect(dart.base).toBeGreaterThanOrEqual(0);
      expect(dart.base).toBeLessThanOrEqual(25);
      expect([1, 2, 3]).toContain(dart.mult);
      const val = dart.base * dart.mult;
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(60);
    }
  });

  it('attempts double finish when on double score (<= 40 even)', () => {
    let doubleHits = 0;
    const iterations = 200;
    for (let i = 0; i < iterations; i++) {
      const dart = getBotDart(80, 40);
      if (dart.base === 20 && dart.mult === 2) {
        doubleHits++;
      }
    }
    // High average bot should have a decent hit rate on D20
    expect(doubleHits).toBeGreaterThan(0);
  });

  it('handles Bull (50) finish attempt correctly', () => {
    let bullAttempts = 0;
    for (let i = 0; i < 100; i++) {
      const dart = getBotDart(100, 50);
      if (dart.base === 25 && dart.mult === 2) {
        bullAttempts++;
      }
    }
    expect(bullAttempts).toBeGreaterThan(0);
  });

  it('handles low target average without crashing', () => {
    const dart = getBotDart(20, 301);
    expect(dart.base).toBeDefined();
    expect(dart.mult).toBeDefined();
  });
});
