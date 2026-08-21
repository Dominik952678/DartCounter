import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Web Speech API
if (typeof window !== 'undefined') {
  globalThis.SpeechSynthesisUtterance = class {
    text: string = '';
    lang: string = 'en-GB';
    rate: number = 1;
    pitch: number = 1;
    voice: any = null;
    constructor(text?: string) {
      if (text) this.text = text;
    }
  } as any;

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

// Mock Web Audio API / Audio elements
globalThis.Audio = class {
  src = '';
  volume = 1;
  currentTime = 0;
  play() {
    return Promise.resolve();
  }
  pause() {}
  load() {}
} as any;
