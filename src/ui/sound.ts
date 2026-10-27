// Sound effects made on the fly with the Web Audio API: no audio files to download or license.
// Every function is safe to call anywhere: if audio isn't available, nothing happens.

export type SoundName =
  | 'dice'
  | 'hop'
  | 'coins'
  | 'pay'
  | 'buy'
  | 'build'
  | 'card'
  | 'jail'
  | 'unlock'
  | 'trade'
  | 'bankrupt'
  | 'win'
  | 'enter'
  | 'whoosh'
  | 'thud';

const MUTE_KEY = 'dangopoly.muted';
const VOLUME_KEY = 'dangopoly.volume';
let context: AudioContext | null = null;
let master: GainNode | null = null; // every sound goes through this, so one setting sets the volume
let muted = readMuted();
let volume = readVolume();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function readVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return localStorage.getItem(VOLUME_KEY) !== null && v >= 0 && v <= 100 ? v : 80;
  } catch {
    return 80;
  }
}

/** Sound effects volume, 0–100. */
export function getVolume(): number {
  return volume;
}

export function setVolume(value: number): void {
  volume = Math.round(Math.min(100, Math.max(0, value)));
  if (master) master.gain.value = volume / 100;
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // the choice just won't be remembered
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // the choice just won't be remembered
  }
}

function audio(): AudioContext | null {
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = volume / 100;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

/** A short note that fades out; optionally slides to another pitch. */
function tone(c: AudioContext, at: number, freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {}) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, at);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(master ?? c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** A burst of filtered noise: rattles, swishes and clunks. */
function noise(c: AudioContext, at: number, dur: number, opts: { freq?: number; gain?: number; q?: number } = {}) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = opts.freq ?? 2000;
  filter.Q.value = opts.q ?? 1;
  gain.gain.value = opts.gain ?? 0.3;
  source.connect(filter).connect(gain).connect(master ?? c.destination);
  source.start(at);
}

const SOUNDS: Record<SoundName, (c: AudioContext, t: number) => void> = {
  // dice clattering on a table
  dice: (c, t) => {
    for (let i = 0; i < 7; i++) noise(c, t + i * 0.07 + Math.random() * 0.03, 0.05, { freq: 2500 + Math.random() * 2500, q: 3 });
  },
  // a soft wooden tick for each step of a token
  hop: (c, t) => tone(c, t, 520, 0.06, { type: 'triangle', gain: 0.08, slideTo: 380 }),
  // two bright coins
  coins: (c, t) => {
    tone(c, t, 1318, 0.18, { type: 'square', gain: 0.05 });
    tone(c, t + 0.08, 1760, 0.25, { type: 'square', gain: 0.05 });
  },
  // money leaving: a falling tone
  pay: (c, t) => tone(c, t, 660, 0.25, { type: 'triangle', gain: 0.14, slideTo: 330 }),
  // cash register: ka-ching
  buy: (c, t) => {
    noise(c, t, 0.05, { freq: 3000, q: 2, gain: 0.2 });
    tone(c, t + 0.05, 1568, 0.3, { type: 'square', gain: 0.05 });
    tone(c, t + 0.05, 2093, 0.35, { type: 'sine', gain: 0.08 });
  },
  // two hammer taps
  build: (c, t) => {
    for (const d of [0, 0.14]) {
      noise(c, t + d, 0.06, { freq: 900, q: 4, gain: 0.35 });
      tone(c, t + d, 180, 0.08, { type: 'square', gain: 0.06 });
    }
  },
  // a card sliding off the deck
  card: (c, t) => noise(c, t, 0.22, { freq: 4500, q: 0.7, gain: 0.18 }),
  // a heavy door closing
  jail: (c, t) => {
    noise(c, t, 0.25, { freq: 300, q: 2, gain: 0.5 });
    tone(c, t, 110, 0.35, { type: 'sawtooth', gain: 0.07, slideTo: 70 });
  },
  // a key turning, then a bright note
  unlock: (c, t) => {
    noise(c, t, 0.06, { freq: 3500, q: 6, gain: 0.25 });
    tone(c, t + 0.08, 880, 0.2, { type: 'triangle', gain: 0.12, slideTo: 1320 });
  },
  // a handshake: two friendly notes
  trade: (c, t) => {
    tone(c, t, 784, 0.15, { type: 'triangle', gain: 0.12 });
    tone(c, t + 0.12, 1047, 0.25, { type: 'triangle', gain: 0.12 });
  },
  // a sad slide down
  bankrupt: (c, t) => {
    [392, 370, 349, 311].forEach((f, i) => tone(c, t + i * 0.22, f, 0.3, { type: 'sawtooth', gain: 0.06 }));
  },
  // a little fanfare
  win: (c, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.13, f, i === 3 ? 0.6 : 0.18, { type: 'square', gain: 0.06 }));
  },
  // Something flying past: a quick airy swish
  whoosh: (c, t) => noise(c, t, 0.35, { freq: 1200, q: 0.6, gain: 0.25 }),
  // ...and landing on someone: bộp!
  thud: (c, t) => {
    noise(c, t, 0.09, { freq: 500, q: 1.5, gain: 0.5 });
    tone(c, t, 150, 0.12, { type: 'sine', gain: 0.25, slideTo: 80 });
  },
  // Entering the game: a plucked five-note run, like a đàn tranh
  enter: (c, t) => {
    [392, 440, 523, 587, 659].forEach((f, i) => tone(c, t + i * 0.07, f, 0.5, { type: 'triangle', gain: 0.1 }));
  },
};

/** Development only: the names of sounds played, so test scripts can check them. */
const devLog: SoundName[] | null = import.meta.env.DEV ? [] : null;
if (devLog) (window as unknown as { __dangopolySounds: SoundName[] }).__dangopolySounds = devLog;

export function playSound(name: SoundName): void {
  if (muted || volume === 0) return;
  devLog?.push(name);
  const c = audio();
  if (!c) return;
  try {
    SOUNDS[name](c, c.currentTime + 0.01);
  } catch {
    // never let a sound break the game
  }
}
