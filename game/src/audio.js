// Lentera Malam — all sound is synthesized with WebAudio oscillators.
// No audio files are shipped: every effect is a few oscillators with
// gain envelopes, and the night ambience is a slow detuned pad.
// Everything is guarded: in a headless browser without audio the
// engine quietly becomes a no-op instead of throwing.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
    this.padNodes = null;
  }

  // Must be called from a user gesture at least once; browsers lock
  // audio until then. Safe to call repeatedly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.4);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // One oscillator note with a quick attack and exponential decay.
  note(freq, { type = 'sine', at = 0, dur = 0.18, vol = 0.5, slideTo = null } = {}) {
    if (!this.ctx || !this.master) return;
    try {
      const t0 = this.ctx.currentTime + at;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  // A short burst of filtered noise (whoosh, thud).
  noise({ at = 0, dur = 0.2, vol = 0.4, freq = 800 } = {}) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    try {
      const t0 = this.ctx.currentTime + at;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  // Ember pickup: a bright blip that climbs with the combo.
  pickup(combo) {
    const base = 620 + Math.min(combo, 5) * 70;
    this.note(base, { type: 'sine', dur: 0.12, vol: 0.4 });
    this.note(base * 1.5, { type: 'sine', at: 0.04, dur: 0.14, vol: 0.25 });
  }

  // A lantern catches: a warm three-note chime.
  lanternLit() {
    this.note(392, { type: 'triangle', dur: 0.35, vol: 0.5 });
    this.note(523.25, { type: 'triangle', at: 0.07, dur: 0.4, vol: 0.45 });
    this.note(783.99, { type: 'sine', at: 0.14, dur: 0.55, vol: 0.35 });
  }

  // Wave cleared: a small rising melody.
  waveClear(wave) {
    const root = 440 + wave * 12;
    [0, 0.09, 0.18, 0.3].forEach((at, i) => {
      this.note(root * [1, 1.25, 1.5, 2][i], { type: 'triangle', at, dur: 0.3, vol: 0.4 });
    });
  }

  // Taking a hit: a low thud plus a falling tone.
  hit() {
    this.noise({ dur: 0.25, vol: 0.5, freq: 320 });
    this.note(220, { type: 'sawtooth', dur: 0.3, vol: 0.3, slideTo: 70 });
  }

  // Dash: a soft airy whoosh.
  dash() {
    this.noise({ dur: 0.16, vol: 0.22, freq: 2400 });
  }

  // Game over: three slow descending notes.
  gameOver() {
    [330, 262, 196].forEach((freq, i) => {
      this.note(freq, { type: 'triangle', at: i * 0.22, dur: 0.5, vol: 0.4 });
    });
  }

  // Victory: a bright little fanfare.
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.note(freq, { type: 'triangle', at: i * 0.11, dur: 0.4, vol: 0.42 });
      this.note(freq / 2, { type: 'sine', at: i * 0.11, dur: 0.45, vol: 0.2 });
    });
  }

  uiClick() {
    this.note(880, { type: 'sine', dur: 0.07, vol: 0.25 });
  }
}
