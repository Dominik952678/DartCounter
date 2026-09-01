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

  it('simulates complete 501 legs smoothly without getting stuck', () => {
    const simulateLeg = (targetAvg: number) => {
      let score = 501;
      let darts = 0;
      let turnDarts: { base: number, mult: number }[] = [];
      let turnScore = 0;

      while (score > 0 && darts < 150) {
        darts++;
        const dart = getBotDart(targetAvg, score - turnScore, 'DO');
        const dartVal = dart.base * dart.mult;

        if (score - turnScore - dartVal === 0 && dart.mult === 2) {
          // Checked out!
          score = 0;
          break;
        } else if (score - turnScore - dartVal < 2) {
          // Bust!
          turnDarts = [];
          turnScore = 0;
        } else {
          turnScore += dartVal;
          turnDarts.push(dart);
          if (turnDarts.length === 3) {
            score -= turnScore;
            turnScore = 0;
            turnDarts = [];
          }
        }
      }
      return { darts, finished: score === 0, avg: (501 / darts) * 3 };
    };

    // Simulate 20 legs for Avg 40 bot
    const legs40 = Array.from({ length: 20 }, () => simulateLeg(40));
    const finishedCount40 = legs40.filter(l => l.finished).length;
    expect(finishedCount40).toBe(20); // All 20 legs must successfully finish

    const avgDarts40 = legs40.reduce((acc, l) => acc + l.darts, 0) / 20;
    // An avg 40 bot should finish legs in ~30-45 darts
    expect(avgDarts40).toBeGreaterThanOrEqual(25);
    expect(avgDarts40).toBeLessThanOrEqual(55);

    // Simulate 20 legs for Avg 75 bot
    const legs75 = Array.from({ length: 20 }, () => simulateLeg(75));
    const avgDarts75 = legs75.reduce((acc, l) => acc + l.darts, 0) / 20;
    // An avg 75 bot should finish legs faster (around 18-24 darts)
    expect(avgDarts75).toBeLessThan(avgDarts40);
  });

  describe('2v2 Team Freeze Tactical Decisions ("Immer Block vor Check!")', () => {
    it('does NOT throw at checkout double when bot team is FROZEN', () => {
      // Bot has 40 points left. Partner has 200 points. Opponents have 50 + 50 = 100 points.
      // Partner (200) > Opponents (100) -> FROZEN!
      const teamContext = {
        is2v2: true,
        partnerScore: 200,
        opponent1Score: 50,
        opponent2Score: 50
      };

      for (let i = 0; i < 50; i++) {
        const dart = getBotDart(80, 40, 'DO', teamContext);
        // The bot should NOT hit D20 (which would be a freeze bust!)
        // It should throw safe single or miss outside safely
        const dartVal = dart.base * dart.mult;
        expect(dartVal).not.toBe(40);
      }
    });

    it('DOES throw at checkout double when bot team is UNFROZEN', () => {
      // Bot has 40 points left. Partner has 60 points. Opponents have 50 + 50 = 100 points.
      // Partner (60) <= Opponents (100) -> UNFROZEN!
      const teamContext = {
        is2v2: true,
        partnerScore: 60,
        opponent1Score: 50,
        opponent2Score: 50
      };

      let d20Attempts = 0;
      for (let i = 0; i < 100; i++) {
        const dart = getBotDart(80, 40, 'DO', teamContext);
        if (dart.base === 20 && dart.mult === 2) {
          d20Attempts++;
        }
      }
      expect(d20Attempts).toBeGreaterThan(0);
    });

    it('scores heavily on T20 when frozen with high score to reduce team total', () => {
      // Bot has 300 points left. Partner has 250 points. Opponents have 100 + 100 = 200 points.
      // Frozen!
      const teamContext = {
        is2v2: true,
        partnerScore: 250,
        opponent1Score: 100,
        opponent2Score: 100
      };

      let twentySegmentHits = 0;
      for (let i = 0; i < 50; i++) {
        const dart = getBotDart(70, 300, 'DO', teamContext);
        if (dart.base === 20 || dart.base === 1 || dart.base === 5) {
          twentySegmentHits++;
        }
      }
      expect(twentySegmentHits).toBeGreaterThan(40);
    });

    it('actively places a block on opponents by aiming at T20 when opponents are threatening a finish', () => {
      // Opponent 1 has 32 points left (threatening finish).
      // Bot has 80 points left (cannot checkout in 1 dart in DO).
      // Bot should prioritize BLOCKING opponents with heavy T20 scoring instead of a small setup single!
      const teamContext = {
        is2v2: true,
        partnerScore: 80,
        opponent1Score: 32,
        opponent2Score: 120
      };

      let twentySegmentHits = 0;
      for (let i = 0; i < 50; i++) {
        const dart = getBotDart(75, 80, 'DO', teamContext);
        if (dart.base === 20 || dart.base === 1 || dart.base === 5) {
          twentySegmentHits++;
        }
      }
      expect(twentySegmentHits).toBeGreaterThan(40);
    });

    it('actively unfreezes partner by aiming at T20 when partner is on a finish', () => {
      // Partner has 40 points left.
      // Bot has 90 points left.
      // Bot aggressively scores on T20 to unblock partner for next turn!
      const teamContext = {
        is2v2: true,
        partnerScore: 40,
        opponent1Score: 100,
        opponent2Score: 100
      };

      let twentySegmentHits = 0;
      for (let i = 0; i < 50; i++) {
        const dart = getBotDart(75, 90, 'DO', teamContext);
        if (dart.base === 20 || dart.base === 1 || dart.base === 5) {
          twentySegmentHits++;
        }
      }
      expect(twentySegmentHits).toBeGreaterThan(40);
    });
  });
});
