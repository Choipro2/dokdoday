// =============================================================
//  소리 (파일 없이 WebAudio로 만드는 음악·파도·효과음)
// =============================================================
let ctx = null;
let master, musicGain, ambGain, sfxGain;
let musicTimer = null;
let started = false;

const vol = { master: 0.8, music: 0.5, amb: 0.6, sfx: 0.8, muted: false };

export function loadVolume(v) { Object.assign(vol, v || {}); apply(); }
export function getVolume() { return { ...vol }; }

function apply() {
  if (!ctx) return;
  master.gain.value = vol.muted ? 0 : vol.master;
  musicGain.gain.value = vol.music * 0.35;
  ambGain.gain.value = vol.amb * 0.5;
  sfxGain.gain.value = vol.sfx * 0.7;
}

export function setVolume(key, value) { vol[key] = value; apply(); }
export function toggleMute() { vol.muted = !vol.muted; apply(); return vol.muted; }
export function isMuted() { return vol.muted; }

export function startAudio() {
  if (started) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { return; }
  started = true;
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.connect(master);
  ambGain = ctx.createGain(); ambGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.connect(master);
  apply();
  startWaves();
  startMusic();
}

// 파도 소리: 걸러진 잡음을 천천히 키웠다 줄였다
function startWaves() {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  const g = ctx.createGain(); g.gain.value = 0.5;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.35;
  lfo.connect(lfoG); lfoG.connect(g.gain);
  src.connect(lp); lp.connect(g); g.connect(ambGain);
  src.start(); lfo.start();
}

// 잔잔한 오음음계 음악
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const PROG = [[57, 64, 69], [53, 60, 65], [55, 62, 67], [52, 59, 64]];
function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function startMusic() {
  let step = 0;
  const beat = 0.42;
  const tick = () => {
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = PROG[Math.floor(step / 8) % PROG.length];
    if (step % 8 === 0) chord.forEach(n => pad(mtof(n - 12), now, beat * 8));
    if (Math.random() < 0.72) {
      const n = 69 + SCALE[Math.floor(Math.random() * SCALE.length)];
      pluck(mtof(n), now, 0.12);
    }
    step++;
  };
  musicTimer = setInterval(tick, beat * 1000);
}
function pad(freq, t, dur) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 1); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + dur + 0.1);
}
function pluck(freq, t, amp) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 1.2);
}

// 효과음
export function sfx(name) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const tone = (f1, f2, dur, type = 'sine', amp = 0.3, delay = 0) => {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f1, t + delay); o.frequency.exponentialRampToValueAtTime(f2, t + delay + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(amp, t + delay); g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
    o.connect(g); g.connect(sfxGain); o.start(t + delay); o.stop(t + delay + dur + 0.05);
  };
  switch (name) {
    case 'eat': tone(520, 900, 0.12, 'triangle', 0.3); tone(780, 1200, 0.1, 'triangle', 0.2, 0.08); break;
    case 'hurt': tone(300, 120, 0.25, 'sawtooth', 0.18); break;
    case 'bump': tone(200, 140, 0.15, 'square', 0.12); break;
    case 'card': [0, 4, 7, 12].forEach((s, i) => tone(mtof(72 + s), mtof(72 + s), 0.3, 'triangle', 0.18, i * 0.07)); break;
    case 'observe': tone(660, 990, 0.2, 'sine', 0.22); tone(990, 1320, 0.25, 'sine', 0.16, 0.12); break;
    case 'dash': tone(220, 520, 0.18, 'triangle', 0.12); break;
    case 'splash': tone(900, 200, 0.25, 'sine', 0.15); break;
    case 'bark': tone(420, 300, 0.12, 'sawtooth', 0.12); tone(460, 320, 0.14, 'sawtooth', 0.12, 0.16); break;
    case 'portal': [0, 7, 12, 19].forEach((s, i) => tone(mtof(64 + s), mtof(64 + s + 12), 0.5, 'sine', 0.15, i * 0.1)); break;
    case 'right': tone(660, 660, 0.12, 'triangle', 0.22); tone(880, 880, 0.2, 'triangle', 0.22, 0.12); break;
    case 'wrong': tone(300, 260, 0.25, 'triangle', 0.2); break;
    case 'click': tone(800, 700, 0.05, 'sine', 0.12); break;
    case 'grow': [0, 4, 7, 12, 16].forEach((s, i) => tone(mtof(67 + s), mtof(67 + s), 0.25, 'triangle', 0.18, i * 0.08)); break;
  }
}
