import { describe, it, expect } from 'vitest';
import { isBogey } from '../checkouts';

/** BOGEY auf dem Match-Screen: im Checkout-Bereich, aber mit drei Darts nicht zu beenden. */
describe('isBogey', () => {
  it.each([169, 168, 166, 165, 163, 162, 159])('knows %i cannot be finished in Double Out', score => {
    expect(isBogey(score, 'DO')).toBe(true);
  });

  it.each([170, 167, 164, 161, 160, 158, 100, 40, 2])('offers a finish from %i in Double Out', score => {
    expect(isBogey(score, 'DO')).toBe(false);
  });

  it('calls nothing a bogey outside the checkout band', () => {
    expect(isBogey(171, 'DO')).toBe(false);
    expect(isBogey(501, 'DO')).toBe(false);
    expect(isBogey(1, 'DO')).toBe(false);
  });

  it('reads the wider Master Out band', () => {
    expect(isBogey(168, 'MO')).toBe(false);
  });
});
