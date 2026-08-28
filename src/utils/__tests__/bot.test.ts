import { describe, it, expect } from 'vitest';
import { getBotDart, throwAtTarget, BOARD_NEIGHBORS } from '../bot';

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

  it('scales checkout hit rates according to target average', () => {
    const iterations = 500;
    let lowAvgHits = 0;
    let highAvgHits = 0;

    for (let i = 0; i < iterations; i++) {
      const lowDart = getBotDart(30, 40); // Avg 30 aiming at D20
      if (lowDart.base === 20 && lowDart.mult === 2) lowAvgHits++;

      const highDart = getBotDart(90, 40); // Avg 90 aiming at D20
      if (highDart.base === 20 && highDart.mult === 2) highAvgHits++;
    }

    // High average bot should have significantly higher hit rate than low average bot
    expect(highAvgHits).toBeGreaterThan(lowAvgHits);
    // Low avg double hit rate should be realistic (around 5% - 20%)
    expect(lowAvgHits / iterations).toBeLessThan(0.25);
    expect(lowAvgHits / iterations).toBeGreaterThan(0.02);
  });

  it('scatters misses into board neighbors when aiming for T20', () => {
    const iterations = 500;
    let neighborHits = 0;
    for (let i = 0; i < iterations; i++) {
      const dart = throwAtTarget(20, 3, 35); // Low skill aiming at T20
      if (dart.base === 1 || dart.base === 5) {
        neighborHits++;
      }
    }
    // A low skill bot aiming at 20 should frequently hit adjacent 1 or 5
    expect(neighborHits).toBeGreaterThan(50);
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

  it('handles SO and MO modes correctly', () => {
    // Single Out at score 16 should aim for S16
    const soDart = getBotDart(80, 16, 'SO');
    expect(soDart.base).toBeDefined();

    // Master Out at score 60 can finish on T20
    let moT20Hits = 0;
    for (let i = 0; i < 100; i++) {
      const moDart = getBotDart(90, 60, 'MO');
      if (moDart.base === 20 && moDart.mult === 3) moT20Hits++;
    }
    expect(moT20Hits).toBeGreaterThan(0);
  });

  it('has correct board neighbor mapping for all 20 segments', () => {
    for (let i = 1; i <= 20; i++) {
      expect(BOARD_NEIGHBORS[i]).toBeDefined();
      expect(BOARD_NEIGHBORS[i].length).toBe(2);
      expect(BOARD_NEIGHBORS[i][0]).toBeGreaterThanOrEqual(1);
      expect(BOARD_NEIGHBORS[i][0]).toBeLessThanOrEqual(20);
      expect(BOARD_NEIGHBORS[i][1]).toBeGreaterThanOrEqual(1);
      expect(BOARD_NEIGHBORS[i][1]).toBeLessThanOrEqual(20);
    }
  });
});
