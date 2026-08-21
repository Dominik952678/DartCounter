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

export const getAudioCtx = () => {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    // Versuche den Context aufzuwecken (Browser Policy)
    audioCtx.resume();
  }
  return audioCtx;
};

export const initAudio = () => {
  getAudioCtx();
};

// --- Web Speech API (TTS) ---

export const speak = (text: string) => {
  if (!soundEnabled || !window.speechSynthesis) return;

  // Wir brechen laufende Ansagen ab, damit es sich nicht überschneidet
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB'; // Britischer Darts Caller
  utterance.rate = 1.05; // Etwas flotter
  utterance.pitch = 1.1; // Etwas aufgeregter
  
  // Versuchen eine männliche britische Stimme zu finden (optional)
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'));
  if (enVoice) {
    utterance.voice = enVoice;
  }

  window.speechSynthesis.speak(utterance);
};

// --- Web Audio API (Arcade Synths) ---

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

export const playSciFiHitSound = (type: 'T20' | 'T19' | 'Bull') => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  
  // Melodisches "Dum-Du-Dyp"
  let f1 = 523.25; // C5
  let f2 = 659.25; // E5
  let f3 = 783.99; // G5
  let vol = 0.2;
  const waveType: OscillatorType = 'sine'; // Weich, nicht grell

  if (type === 'T19') {
    f1 = 440.00; // A4
    f2 = 523.25; // C5
    f3 = 659.25; // E5
    vol = 0.15;
  } else if (type === 'Bull') {
    f1 = 261.63; // C4
    f2 = 329.63; // E4
    f3 = 392.00; // G4
    vol = 0.25;
  }

  // Präzises Audio-Scheduling
  playTone(f1, waveType, 0.1, vol, 0);
  playTone(f2, waveType, 0.1, vol, 0.08);
  playTone(f3, waveType, 0.2, vol, 0.16);
};

export const playDartHitSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  // Dumpfes "Tock" (Pfeil landet im Board)
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
  // Ein tiefer, absteigender Buzzer
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
  // Kleiner Sieges-Jingle (Dur-Dreiklang)
  playTone(523.25, 'triangle', 0.2, 0.1, 0); // C5
  playTone(659.25, 'triangle', 0.2, 0.1, 0.15); // E5
  playTone(783.99, 'triangle', 0.4, 0.1, 0.3); // G5
  playTone(1046.50, 'triangle', 0.6, 0.1, 0.45); // C6
};

export const play180Sound = () => {
  if (!soundEnabled) return;
  speak("One Hundred and Eighty!");
};

// Um Stimmen einmal vorzuladen (Chrome Bug Fix)
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}
