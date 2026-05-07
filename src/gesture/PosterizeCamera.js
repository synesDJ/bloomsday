// CameraPreview — renders the live webcam into the bottom-right preview canvas.
// Normal mirrored video, no posterize / tint / threshold filter.
// The canvas sits on top of the raw <video> element and stays transparent
// (we only use it so we have a consistent rendering path; the video itself
// also shows through beneath it).

export class PosterizeCamera {
  constructor({ videoEl, canvasEl }) {
    this.video  = videoEl;
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this.active = false;
    this.frame  = this.frame.bind(this);
  }

  // kept for API compatibility — no-op now that we removed the tint
  setTintType(_type) {}

  start() {
    this.active = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.active = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(64, Math.round(rect.width  || 260));
    const h = Math.max(64, Math.round(rect.height || 170));
    this.canvas.width  = w;
    this.canvas.height = h;
  }

  frame() {
    if (!this.active) return;
    // Canvas is kept fully transparent — the <video> element beneath shows
    // the live feed directly (CSS transform: scaleX(-1) mirrors it).
    // We just clear to transparent so nothing obscures the video.
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    requestAnimationFrame(this.frame);
  }
}
