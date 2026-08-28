import { describe, it, expect } from 'vitest';
import { getCheckoutSuggestion, CHECKOUTS } from '../checkouts';

describe('Checkout suggestions logic', () => {
  it('returns optimal 3-dart checkout for 170 in Double Out', () => {
    expect(getCheckoutSuggestion(170, 'DO', 0)).toBe('T20 T20 DB');
  });

  it('returns null for 170 if fewer than 3 darts remain', () => {
    expect(getCheckoutSuggestion(170, 'DO', 1)).toBeNull();
    expect(getCheckoutSuggestion(170, 'DO', 2)).toBeNull();
  });

  it('returns 2-dart checkout for 100 with 2 darts remaining', () => {
    expect(getCheckoutSuggestion(100, 'DO', 0)).toBe('T20 D20');
    expect(getCheckoutSuggestion(100, 'DO', 1)).toBe('T20 D20');
    expect(getCheckoutSuggestion(100, 'DO', 2)).toBeNull();
  });

  it('returns 1-dart checkout for 40 (D20)', () => {
    expect(getCheckoutSuggestion(40, 'DO', 0)).toBe('D20');
    expect(getCheckoutSuggestion(40, 'DO', 1)).toBe('D20');
    expect(getCheckoutSuggestion(40, 'DO', 2)).toBe('D20');
  });

  it('returns setup suggestion for bogie scores with 3 darts and null with fewer darts in DO', () => {
    const bogieScores = [169, 168, 166, 165, 163, 162, 159];
    bogieScores.forEach(score => {
      expect(getCheckoutSuggestion(score, 'DO', 0)).toBe('Setup: T20');
      expect(getCheckoutSuggestion(score, 'DO', 1)).toBeNull();
      expect(getCheckoutSuggestion(score, 'DO', 2)).toBeNull();
    });
  });

  it('handles score 1 properly in SO vs DO', () => {
    expect(getCheckoutSuggestion(1, 'SO', 0)).toBe('S1');
    expect(getCheckoutSuggestion(1, 'DO', 0)).toBeNull();
    expect(getCheckoutSuggestion(1, 'MO', 0)).toBeNull();
  });

  it('returns null for out of range scores', () => {
    expect(getCheckoutSuggestion(0, 'DO', 0)).toBeNull();
    expect(getCheckoutSuggestion(-5, 'DO', 0)).toBeNull();
    expect(getCheckoutSuggestion(171, 'DO', 0)).toBeNull();
    expect(getCheckoutSuggestion(501, 'DO', 0)).toBeNull();
  });

  it('contains valid checkouts map entries for common targets', () => {
    expect(CHECKOUTS[50]).toBe('DB');
    expect(CHECKOUTS[32]).toBe('D16');
    expect(CHECKOUTS[167]).toBe('T20 T19 DB');
  });
});
