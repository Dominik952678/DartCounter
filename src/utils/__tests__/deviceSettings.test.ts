import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyDefaultGame,
  clearDefaultGame,
  defaultGameDistance,
  defaultGameTitle,
  readCheckoutHints,
  readDefaultGame,
  readKeepAwake,
  saveDefaultGame,
  writeCheckoutHints,
  writeKeepAwake
} from '../deviceSettings';
import { readStoredMatchConfig } from '../../components/matchSetup/useMatchSetupConfig';
import { exportSettings } from '../storage';

beforeEach(() => localStorage.clear());

describe('Standardspiel', () => {
  it('is unset until one is saved, and can be removed again', () => {
    expect(readDefaultGame()).toBeNull();

    saveDefaultGame({ startScore: 701, outMode: 'SO', setsToWin: 2, legsToWin: 3 });
    expect(readDefaultGame()).toEqual({ startScore: 701, outMode: 'SO', setsToWin: 2, legsToWin: 3 });

    clearDefaultGame();
    expect(readDefaultGame()).toBeNull();
  });

  it('ignores a stored value that no setup could produce', () => {
    localStorage.setItem('dart_default_game', JSON.stringify({ startScore: 1, outMode: 'DO', setsToWin: 1, legsToWin: 3 }));
    expect(readDefaultGame()).toBeNull();
    localStorage.setItem('dart_default_game', JSON.stringify({ startScore: 501, outMode: 'XO', setsToWin: 1, legsToWin: 3 }));
    expect(readDefaultGame()).toBeNull();
    localStorage.setItem('dart_default_game', '{kaputt');
    expect(readDefaultGame()).toBeNull();
  });

  it('hands its values to the setup screen', () => {
    applyDefaultGame({ startScore: 301, outMode: 'MO', setsToWin: 1, legsToWin: 5 });

    expect(readStoredMatchConfig()).toMatchObject({ startScore: 301, outMode: 'MO', setsToWin: 1, legsToWin: 5 });
  });

  it('reads as a title and a distance', () => {
    expect(defaultGameTitle({ startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 })).toBe('501 · Double Out');
    expect(defaultGameDistance({ startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 })).toBe('Bis 3 Legs');
    expect(defaultGameDistance({ startScore: 501, outMode: 'DO', setsToWin: 2, legsToWin: 3 })).toBe('Bis 2 Sätze · 3 Legs');
  });
});

describe('Schalter', () => {
  it('shows checkout hints and keeps the screen awake unless switched off', () => {
    expect(readCheckoutHints()).toBe(true);
    expect(readKeepAwake()).toBe(true);

    writeCheckoutHints(false);
    writeKeepAwake(false);

    expect(readCheckoutHints()).toBe(false);
    expect(readKeepAwake()).toBe(false);
  });

  it('travels with a backup', () => {
    writeCheckoutHints(false);
    saveDefaultGame({ startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 });

    expect(exportSettings()).toMatchObject({ checkoutHints: 'false', defaultGame: expect.stringContaining('501') });
  });
});
