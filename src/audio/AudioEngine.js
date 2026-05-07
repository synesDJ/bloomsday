// AudioEngine — Tone.js + gleitz midi soundfonts
//
// My Singing Monsters style symphony:
//   · Each planted flower gets its OWN looping pattern that starts the
//     moment it's planted — not on a shared global slot. The pattern is a
//     short rhythmic phrase (1–4 notes spread across a bar) so each flower
//     sounds like its own little voice in the choir.
//   · All flowers share a 90 BPM transport so they stay in sync, but each
//     flower's loop is independent — adding/removing one doesn't touch any
//     other.
//   · Loops keep playing as long as the user is on the website. They never
//     stop until the flower is deleted. Empty garden = silent transport
//     (still ticking, no Tone.Sequence instances active).
//
// Performance-aware:
//   · waits for Tone to load on the page
//   · lazy-loads each instrument Sampler the first time it's needed
//   · only 3 sample MP3s per instrument (Tone.Sampler interpolates)
//   · reverb generates in background — audio plays dry until ready

import { noteByIndex } from './pentatonic.js';

const SOUNDFONT_BASE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/';

const VOICES = {
  guitar: {
    kind: 'sampler',
    instrument: 'acoustic_guitar_nylon',
    urls: { C4: 'C4.mp3', G4: 'G4.mp3', C5: 'C5.mp3' },
    volume: 9,
    release: 2.2,
  },
  flute: {
    kind: 'sampler',
    instrument: 'flute',
    urls: { C5: 'C5.mp3', G5: 'G5.mp3', C6: 'C6.mp3' },
    volume: 9,
    release: 1.4,
  },
  synth: {
    kind: 'synth',
  },
};

const MASTER_VOLUME = 6;
const DEFAULT_VOLUME = -2;
const LOOP_BPM = 90;

// Each flower picks one of these patterns. Numbers are sixteenth-note offsets
// within a bar (16 sixteenths = 4 beats). Choosing different patterns for
// different flowers creates layered polyrhythm without dissonance.
//
// First pattern is the simplest (just downbeat 1) — the first flower planted
// always gets it so the player hears one clean pulse before things layer up.
const RHYTHM_PATTERNS = [
  [0],                  // whole-note pulse on beat 1
  [0, 8],               // beats 1 and 3
  [4, 12],              // beats 2 and 4 (off-pulse)
  [0, 6, 10],           // beat 1, "and" of 2, "and" of 3
  [2, 8, 14],           // syncopated triplet feel
  [0, 4, 8, 12],        // four-on-the-floor
  [0, 3, 8, 11],        // dotted-feel pulse
  [4, 10],              // sparse offbeats
  [6, 14],              // sparse "and" beats
  [0, 5, 10],           // 3-against-4 polyrhythm
];

function waitForTone(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function check() {
      if (window.Tone) return resolve(window.Tone);
      if (Date.now() - t0 > timeoutMs) return reject(new Error('Tone.js load timeout'));
      setTimeout(check, 50);
    })();
  });
}

export class AudioEngine {
  constructor() {
    this.started = false;
    this.starting = null;
    this.Tone = null;
    this.layerActive = {};
    this.out = null;
    this.reverb = null;
    this.wind = null;
    this.voice = 'guitar';
    this.sources = {};
    this.sourcePromises = {};

    // ——— per-flower loops (my singing monsters style)
    // flowerId → { seq, noteIndex, pattern, velocity }
    this.flowerLoops = new Map();
    this.loopPlaybackEnabled = true;
    this._patternCursor = 0;   // round-robin through patterns for variety
  }

  async start() {
    if (this.started) return;
    if (this.starting) return this.starting;
    this.starting = (async () => {
      try {
        this.Tone = await waitForTone();
      } catch (e) {
        console.warn('Tone.js not available', e);
        return;
      }
      try {
        await this.Tone.start();
      } catch (e) {
        console.warn('Tone.start() failed', e);
      }

      this.out = new this.Tone.Volume(MASTER_VOLUME).toDestination();

      // reverb in background
      const reverb = new this.Tone.Reverb({ decay: 6, wet: 0.35 });
      reverb.generate().then(() => {
        reverb.toDestination();
        this.out.disconnect();
        this.out.connect(reverb);
        this.reverb = reverb;
      }).catch(() => {});

      // quiet wind ambience
      try {
        this.wind = new this.Tone.Noise('pink').start();
        const windFilter = new this.Tone.Filter(400, 'lowpass');
        const windVol = new this.Tone.Volume(-52);
        this.wind.connect(windFilter);
        windFilter.connect(windVol);
        windVol.connect(this.out);
      } catch (e) {}

      // start the global transport — flower loops sync to this
      try {
        this.Tone.Transport.bpm.value = LOOP_BPM;
        this.Tone.Transport.start();
      } catch (e) {
        console.warn('transport start failed', e);
      }

      this.started = true;
    })();
    return this.starting;
  }

  setVoice(voice) {
    if (!VOICES[voice]) return;
    this.voice = voice;
    if (this.started) this._ensureVoiceSource();
  }

  setLoopPlaybackEnabled(enabled) {
    this.loopPlaybackEnabled = !!enabled;
  }

  _ensureVoiceSource() {
    if (!this.started) return null;
    const config = VOICES[this.voice] || VOICES.guitar;
    if (config.kind === 'synth') return this._ensureSynth();
    return this._ensureSampler(this.voice, config);
  }

  _voiceVolume() {
    const config = VOICES[this.voice] || VOICES.guitar;
    return config.volume ?? (config.kind === 'synth' ? -13 : DEFAULT_VOLUME);
  }

  _ensureSampler(key, config) {
    if (this.sourcePromises[key]) return this.sourcePromises[key];
    this.sourcePromises[key] = new Promise((resolve) => {
      const sampler = new this.Tone.Sampler({
        urls: config.urls,
        baseUrl: `${SOUNDFONT_BASE}${config.instrument}-mp3/`,
        volume: config.volume ?? DEFAULT_VOLUME,
        release: config.release,
        onload: () => resolve(sampler),
      });
      sampler.connect(this.out);
      this.sources[key] = sampler;
    });
    return this.sourcePromises[key];
  }

  _ensureSynth() {
    if (this.sources.synth) return Promise.resolve(this.sources.synth);
    const synth = new this.Tone.PolySynth(this.Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.025, decay: 0.28, sustain: 0.34, release: 1.6 },
    });
    synth.volume.value = -6;
    synth.connect(this.out);
    synth.loaded = true;
    this.sources.synth = synth;
    return Promise.resolve(synth);
  }

  awakenLayer(type) {
    if (!this.started || this.layerActive[type]) return;
    this.layerActive[type] = true;
    const p = this._ensureVoiceSource();
    if (!p) return;
    p.then((source) => {
      if (source.volume?.rampTo) source.volume.rampTo(this._voiceVolume(), 2);
    });
  }

  // one-shot played outside the loop (hover, click-replay, etc)
  playNote(type, noteIndex, opts = {}) {
    if (!this.started) return;
    const p = this._ensureVoiceSource();
    if (!p) return;
    p.then((source) => {
      if (!source.loaded) return;
      try {
        const note = noteByIndex(noteIndex);
        const duration = opts.duration || '4n';
        const velocity = opts.velocity || 0.7;
        source.triggerAttackRelease(note, duration, this.Tone.now(), velocity);
      } catch (e) {}
    });
  }

  playChord(noteIndices, opts = {}) {
    if (!this.started || !noteIndices?.length) return;
    const p = this._ensureVoiceSource();
    if (!p) return;
    p.then((source) => {
      if (!source.loaded) return;
      const velocity = opts.velocity || 0.65;
      const stagger = opts.stagger ?? 0;
      const duration = opts.duration || '4n';
      noteIndices.forEach((idx, i) => {
        const note = noteByIndex(idx);
        setTimeout(() => {
          try {
            source.triggerAttackRelease(note, duration, this.Tone.now(), velocity);
          } catch (e) {}
        }, i * stagger);
      });
    });
  }

  hugSwell(noteIndices = []) {
    if (!this.started) return;
    const p = this._ensureVoiceSource();
    if (!p) return;
    p.then((source) => {
      const rest = this._voiceVolume();
      if (source.volume?.rampTo) {
        source.volume.rampTo(rest + 8, 0.5);
        setTimeout(() => source.volume.rampTo(rest, 2), 1800);
      }
      if (source.loaded && noteIndices.length) {
        this.playChord(noteIndices, { duration: '1n', velocity: 0.55 });
      }
    });
  }

  // ————————————————————————————————————————————————————————————————
  //  PER-FLOWER LOOP API — my singing monsters style
  // ————————————————————————————————————————————————————————————————

  // Register a flower. Its note(s) will play on a personal looping pattern,
  // starting at the next bar boundary and continuing forever until removed.
  //
  //   id          : unique flower id
  //   noteIndex   : pentatonic index, OR an array of indices for a chord
  addLoopVoice(id, noteIndex, opts = {}) {
    // queue if start() hasn't fully resolved yet
    if (!this.started) {
      if (this.starting) {
        this.starting.then(() => this.addLoopVoice(id, noteIndex, opts));
      }
      return;
    }
    if (id == null || noteIndex == null) return;

    // replace any existing loop for this id
    this.removeLoopVoice(id);

    const isChord = Array.isArray(noteIndex);
    const pattern = opts.pattern || RHYTHM_PATTERNS[this._patternCursor % RHYTHM_PATTERNS.length];
    this._patternCursor++;
    const velocity = opts.velocity ?? 0.55;

    // Build a Tone.Sequence: 16 sixteenth-note slots; truthy entries fire.
    const events = new Array(16).fill(null);
    for (const slot of pattern) events[slot % 16] = true;

    const seq = new this.Tone.Sequence((time, event) => {
      if (!event) return;
      if (!this.loopPlaybackEnabled) return;
      const p = this._ensureVoiceSource();
      if (!p) return;
      p.then((source) => {
        if (!source.loaded) return;
        try {
          if (isChord) {
            for (const idx of noteIndex) {
              source.triggerAttackRelease(noteByIndex(idx), '8n', time, velocity);
            }
          } else {
            source.triggerAttackRelease(noteByIndex(noteIndex), '8n', time, velocity);
          }
        } catch (e) {}
      });
    }, events, '16n');

    // Start at the next bar so new flowers lock to the grid cleanly.
    seq.start('@1m');

    this.flowerLoops.set(id, { seq, noteIndex, pattern, velocity });
  }

  removeLoopVoice(id) {
    const entry = this.flowerLoops.get(id);
    if (!entry) return;
    try {
      entry.seq.stop();
      entry.seq.dispose();
    } catch (e) {}
    this.flowerLoops.delete(id);
  }

  clearLoopVoices() {
    for (const id of [...this.flowerLoops.keys()]) {
      this.removeLoopVoice(id);
    }
    this._patternCursor = 0;
  }

  isReady() { return this.started; }
}
