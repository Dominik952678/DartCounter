let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Wir versuchen, den Zustand aus localStorage zu lesen (falls vorhanden)
try {
  const saved = localStorage.getItem('dart_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  } else {
    soundEnabled = true;
  }
} catch (e) {
  console.error(e);
}

export const isSoundEnabled = () => soundEnabled;

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
  try {
    localStorage.setItem('dart_sound_enabled', enabled.toString());
  } catch (e) {
    console.error(e);
  }
  if (enabled && !audioCtx) {
    initAudio();
  }
};

let cachedVoice: SpeechSynthesisVoice | null = null;

const loadVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoice = voices.find(v => (v.lang === 'en-GB' || v.lang.startsWith('en')) && v.name.toLowerCase().includes('male')) 
      || voices.find(v => v.lang === 'en-GB') 
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
  }
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export const getAudioCtx = () => {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const initAudio = () => {
  getAudioCtx();
  loadVoices();
};

// --- Web Speech API (TTS Darts Caller) ---

export const speak = (text: string, isExcited = false) => {
  if (!soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();

    if (!cachedVoice) loadVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = isExcited ? 1.12 : 1.02;
    utterance.pitch = isExcited ? 1.2 : 1.0;
    
    if (cachedVoice) {
      utterance.voice = cachedVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore TTS errors in restrictive environments
  }
};

export const announceScore = (score: number) => {
  if (score === 180) {
    speak("One Hundred and Eighty!", true);
  } else if (score === 0) {
    speak("No score");
  } else {
    speak(score.toString());
  }
};

export const announceCheckoutRequirement = (playerName: string, remainingScore: number) => {
  if (remainingScore <= 170 && remainingScore > 1) {
    speak(`${playerName}, you require ${remainingScore}`);
  }
};

export const announceGameShot = (isMatchWin: boolean) => {
  if (isMatchWin) {
    speak("Game, shot, and the match!", true);
  } else {
    speak("Game shot!", true);
  }
};

// --- Web Audio API (Arcade Synths & Crowd Applause) ---

const playTone = (frequency: number, type: OscillatorType, duration: number, vol = 0.1, delay = 0) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  const startTime = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(frequency, startTime);
  
  gainNode.gain.setValueAtTime(vol, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playCrowdCheer = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;

  // Synthesize stadium applause & noise
  const bufferSize = ctx.sampleRate * 1.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
  noise.stop(ctx.currentTime + 1.5);
};

export const playSciFiHitSound = (type: 'T20' | 'T19' | 'Bull') => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  
  let f1 = 523.25; // C5
  let f2 = 659.25; // E5
  let f3 = 783.99; // G5
  let vol = 0.2;
  const waveType: OscillatorType = 'sine';

  if (type === 'T19') {
    f1 = 440.00;
    f2 = 523.25;
    f3 = 659.25;
    vol = 0.15;
  } else if (type === 'Bull') {
    f1 = 261.63;
    f2 = 329.63;
    f3 = 392.00;
    vol = 0.25;
  }

  playTone(f1, waveType, 0.1, vol, 0);
  playTone(f2, waveType, 0.1, vol, 0.08);
  playTone(f3, waveType, 0.2, vol, 0.16);
};

export const playDartHitSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.08);

  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
};

export const playBustSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
  
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
};

export const playHighFinishSound = () => {
  if (!soundEnabled) return;
  playTone(523.25, 'triangle', 0.2, 0.1, 0); // C5
  playTone(659.25, 'triangle', 0.2, 0.1, 0.15); // E5
  playTone(783.99, 'triangle', 0.4, 0.1, 0.3); // G5
  playTone(1046.50, 'triangle', 0.6, 0.1, 0.45); // C6
  playCrowdCheer();
};

export const play180Sound = () => {
  if (!soundEnabled) return;
  announceScore(180);
  playCrowdCheer();
};

// Um Stimmen einmal vorzuladen (Chrome / WebKit)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}
