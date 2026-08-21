import { describe, it, expect, vi, beforeEach } from 'vitest';
import { announceScore, announceCheckoutRequirement, announceGameShot, setSoundEnabled, isSoundEnabled } from '../audio';

describe('Voice Caller & Audio Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    setSoundEnabled(true);
    if (typeof window !== 'undefined') {
      window.speechSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn().mockReturnValue([]),
        onvoiceschanged: null,
        paused: false,
        pending: false,
        speaking: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }
  });

  it('announces 180 with excitement', () => {
    announceScore(180);
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('announces 0 as No score', () => {
    announceScore(0);
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('announces checkout requirement for scores <= 170', () => {
    announceCheckoutRequirement('Dominik', 40);
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('announces Game Shot and Match win', () => {
    announceGameShot(true);
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('toggles sound on and off correctly', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);

    announceScore(100);
    // When sound is disabled, speak is not called
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });
});
