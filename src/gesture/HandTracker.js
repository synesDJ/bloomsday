// HandTracker — thin wrapper around MediaPipe Hands
//
// MediaPipe scripts are NOT eagerly included in garden.html. They're injected
// dynamically here on the first start() call, so the initial page load stays
// fast for users who don't enable the camera.

const HANDS_SRC  = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
const CAMERA_SRC = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // already present?
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load',  () => resolve());
      existing.addEventListener('error', () => reject(new Error(`failed: ${src}`)));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.addEventListener('load',  () => { s.dataset.loaded = '1'; resolve(); });
    s.addEventListener('error', () => reject(new Error(`failed: ${src}`)));
    document.head.appendChild(s);
  });
}

async function ensureMediaPipe() {
  if (window.Hands && window.Camera) return;
  // load sequentially to avoid a race where camera_utils evaluates before hands
  await loadScript(HANDS_SRC);
  await loadScript(CAMERA_SRC);
}

export class HandTracker {
  constructor({ videoEl, onResults, onProgress }) {
    this.videoEl = videoEl;
    this.onResults = onResults;
    this.onProgress = onProgress;   // optional: called with status strings
    this.hands = null;
    this.camera = null;
    this.active = false;
  }

  _status(msg) { if (this.onProgress) this.onProgress(msg); }

  async start() {
    try {
      this._status('loading hand tracker…');
      await ensureMediaPipe();
    } catch (err) {
      console.warn('MediaPipe load failed', err);
      this._status('hand tracker unavailable');
      return false;
    }

    try {
      this._status('initializing model…');
      this.hands = new window.Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
      });
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,              // lower complexity = faster warm-up
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });
      this.hands.onResults((results) => this.onResults && this.onResults(results));

      this._status('requesting camera…');
      this.camera = new window.Camera(this.videoEl, {
        onFrame: async () => {
          if (this.active && this.hands) {
            await this.hands.send({ image: this.videoEl });
          }
        },
        width: 640, height: 480,
      });
      await this.camera.start();
      this.active = true;
      this._status('');
      return true;
    } catch (err) {
      console.warn('HandTracker start failed', err);
      this._status('camera unavailable');
      this.active = false;
      return false;
    }
  }

  async stop() {
    this.active = false;
    if (this.camera) {
      try { await this.camera.stop(); } catch (e) {}
    }
  }
}
