import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// audio.ts keeps its AudioContext and sound flag at module level, so every test
// imports a fresh copy after setting up the fakes it needs.

const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static initialState = 'running';

  state = FakeAudioContext.initialState;
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  started: string[] = [];
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator() {
    return { type: 'sine', frequency: param(), connect: vi.fn(), start: vi.fn(() => this.started.push('osc')), stop: vi.fn() };
  }
  createGain() {
    return { gain: param(), connect: vi.fn() };
  }
  createBiquadFilter() {
    return { type: '', frequency: param(), Q: param(), connect: vi.fn() };
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    return { buffer: null, connect: vi.fn(), start: vi.fn(() => this.started.push('noise')), stop: vi.fn() };
  }
}

const loadAudio = async () => {
  vi.resetModules();
  return import('../audio');
};

const setUserAgent = (ua: string) => {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
};

describe('Web Audio hit sounds', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    localStorage.clear();
    FakeAudioContext.instances = [];
    FakeAudioContext.initialState = 'running';
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setUserAgent(originalUserAgent);
    Reflect.deleteProperty(navigator, 'audioSession');
  });

  it('plays a three-note chime for T20, T19 and the bull', async () => {
    const audio = await loadAudio();
    audio.playSciFiHitSound('T20');
    audio.playSciFiHitSound('T19');
    audio.playSciFiHitSound('Bull');
    expect(FakeAudioContext.instances[0].started).toEqual(Array(9).fill('osc'));
  });

  it('layers an audible tick over the low board thud', async () => {
    const audio = await loadAudio();
    audio.playDartHitSound();
    expect(FakeAudioContext.instances[0].started).toEqual(['osc', 'osc']);
  });

  it('wakes a context iOS left interrupted after the lock screen', async () => {
    FakeAudioContext.initialState = 'interrupted';
    const audio = await loadAudio();
    audio.playSciFiHitSound('T20');
    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalled();
  });

  it('recreates a closed context instead of scheduling into it', async () => {
    const audio = await loadAudio();
    audio.playDartHitSound();
    FakeAudioContext.instances[0].state = 'closed';
    audio.playDartHitSound();
    expect(FakeAudioContext.instances).toHaveLength(2);
  });

  it('claims a playback audio session so the silent switch does not mute the tones', async () => {
    const session = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true });
    const audio = await loadAudio();

    audio.playSciFiHitSound('T20');
    expect(session.type).toBe('playback');

    audio.setSoundEnabled(false);
    expect(session.type).toBe('auto');
  });

  it('falls back to a looping silent element on iOS without the audio session API', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148');
    const play = vi.spyOn(globalThis.Audio.prototype, 'play');
    const pause = vi.spyOn(globalThis.Audio.prototype, 'pause');
    const audio = await loadAudio();

    audio.playDartHitSound();
    expect(play).toHaveBeenCalledTimes(1);

    audio.setSoundEnabled(false);
    expect(pause).toHaveBeenCalled();
  });

  it('leaves other browsers without an audio session alone', async () => {
    const play = vi.spyOn(globalThis.Audio.prototype, 'play');
    const audio = await loadAudio();
    audio.playDartHitSound();
    expect(play).not.toHaveBeenCalled();
  });

  it('stays silent and creates no context while muted', async () => {
    const audio = await loadAudio();
    audio.setSoundEnabled(false);
    audio.playSciFiHitSound('T20');
    audio.playDartHitSound();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });
});
