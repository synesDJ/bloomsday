import { createFlower, createHybridFlower } from '../flowers/index.js';
import { assignNote } from '../audio/pentatonic.js';
import { Background } from './Background.js';
import { Hummingbird } from './Hummingbird.js';

const MAX_FLOWERS = 80;
const HOVER_PLAY_COOLDOWN = 2500;

export class Garden {
  constructor({ canvas, audio, fortunes, onBloom }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.fortunes = fortunes;
    this.onBloom = onBloom;

    this.flowers = [];
    this.growingFlower = null;
    this.background = new Background();
    this.hummingbird = new Hummingbird();
    this.handOverlay = null;

    this.previewType = 'cherry_blossom';
    this.previewPos = null;
    this.mouseDown = false;

    // drag-to-combine state
    this.draggedFlower = null;
    this.combineTarget = null;
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;

    // hover-to-hear cooldown tracking
    this._lastHoverPlayTime = {};

    this.lastT = performance.now();
    this.resize = this.resize.bind(this);
    this.loop   = this.loop.bind(this);

    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.hummingbird.setBounds(w, h);
  }

  setPreviewType(type) { this.previewType = type; }
  setPreviewPos(pos)   { this.previewPos = pos; }
  setHandOverlay(ov)   { this.handOverlay = ov; }
  setRealm(realm)      { if (this.background.setRealm) this.background.setRealm(realm); }

  // ——— externally-driven (gesture) growth API
  beginGrowingFlower(x, groundY, type) {
    const size = 24 + Math.random() * 8;
    const stemCurve = (Math.random() - 0.5) * 0.3;
    const { index: noteIndex } = assignNote(type, this.flowers);
    const flower = createFlower(type, {
      x, y: groundY, size, noteIndex, stemCurve,
    });
    flower.y = groundY - flower.stemLength;
    flower.externallyControlled = true;
    flower.setGrow(0);
    flower.setBloom(0);
    this.growingFlower = flower;
    return flower;
  }

  updateGrowingFlowerPosition(x, groundY) {
    if (!this.growingFlower) return;
    this.growingFlower.x = x;
    this.growingFlower.y = groundY - this.growingFlower.stemLength;
  }

  setGrowingFlowerProgress(p) {
    if (!this.growingFlower) return;
    this.growingFlower.setGrowth(p);
  }

  setGrowingFlowerGrow(g) {
    if (!this.growingFlower) return;
    this.growingFlower.setGrow(g);
  }

  setGrowingFlowerBloom(b) {
    if (!this.growingFlower) return;
    this.growingFlower.setBloom(b);
  }

  commitGrowingFlower() {
    if (!this.growingFlower) return null;
    const f = this.growingFlower;
    f.externallyControlled = false;
    f.planted = true;
    f.setGrow(1);
    f.setBloom(1);
    if (this.flowers.length >= MAX_FLOWERS) {
      const evicted = this.flowers.shift();
      if (this.audio?.removeLoopVoice) this.audio.removeLoopVoice(evicted.id);
    }
    this.flowers.push(f);
    this.growingFlower = null;
    if (this.audio?.addLoopVoice) {
      const noteArg = (f.noteIndices && f.noteIndices.length > 1) ? f.noteIndices : f.noteIndex;
      this.audio.addLoopVoice(f.id, noteArg, { velocity: 0.55 });
    }
    return f;
  }

  abortGrowingFlower() { this.growingFlower = null; }

  plantAt(x, y, type = this.previewType, opts = {}) {
    if (this.flowers.length >= MAX_FLOWERS) {
      const evicted = this.flowers.shift();
      if (this.audio?.removeLoopVoice) this.audio.removeLoopVoice(evicted.id);
    }
    const { index: noteIndex } = assignNote(type, this.flowers);
    const size = 22 + Math.random() * 10;
    const stemCurve = (Math.random() - 0.5) * 0.4;

    const flower = createFlower(type, {
      x, y: y - size * 2.8,
      size, noteIndex, stemCurve,
    });
    flower.y = y - flower.stemLength;
    flower.planted = true;
    this.flowers.push(flower);

    if (this.audio) {
      this.audio.awakenLayer(type);
      this.audio.playNote(type, noteIndex, { velocity: 0.6 + Math.random() * 0.2 });
      if (this.audio.addLoopVoice) {
        this.audio.addLoopVoice(flower.id, noteIndex, { velocity: 0.55 });
      }
    }

    return flower;
  }

  // ——— drag-to-combine API
  beginDragFlower(flower) {
    flower._dragOrigX = flower.x;
    flower._dragOrigY = flower.y;
    flower._isDragging = true;
    this.draggedFlower = flower;
  }

  updateDragPosition(flower, x, groundY) {
    flower.x = x;
    flower.y = groundY - flower.stemLength;
  }

  endDragFlower(flower) {
    if (!flower) return;
    flower.x = flower._dragOrigX;
    flower.y = flower._dragOrigY;
    flower._isDragging = false;
    this.draggedFlower = null;
    this.setCombineHighlight(null);
  }

  findCombineTarget(draggedFlower, px, py) {
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const f = this.flowers[i];
      if (f === draggedFlower) continue;
      if (f.hitTest(px, py)) {
        const dragTier = draggedFlower.tier || 1;
        const targetTier = f.tier || 1;
        if (dragTier + targetTier <= 5) return f;
      }
    }
    return null;
  }

  setCombineHighlight(flower) {
    if (this.combineTarget && this.combineTarget !== flower) {
      this.combineTarget._combineHighlight = false;
    }
    this.combineTarget = flower;
    if (flower) flower._combineHighlight = true;
  }

  combineFlowers(flower1, flower2) {
    this.flowers = this.flowers.filter(f => f !== flower1 && f !== flower2);
    if (this.audio?.removeLoopVoice) {
      this.audio.removeLoopVoice(flower1.id);
      this.audio.removeLoopVoice(flower2.id);
    }
    const hybrid = createHybridFlower(flower1, flower2);
    this.flowers.push(hybrid);
    flower1._isDragging = false;
    this.draggedFlower = null;
    this.setCombineHighlight(null);

    if (this.audio) {
      this.audio.playChord(hybrid.noteIndices, { velocity: 0.8 });
      if (this.audio.addLoopVoice && hybrid.noteIndices?.length) {
        const noteArg = hybrid.noteIndices.length > 1 ? hybrid.noteIndices : hybrid.noteIndices[0];
        this.audio.addLoopVoice(hybrid.id, noteArg, { velocity: 0.55 });
      }
    }

    if (!this.hummingbird.active) {
      this.hummingbird.visit(hybrid);
    }

    return hybrid;
  }

  deleteFlower(flower) {
    const before = this.flowers.length;
    this.flowers = this.flowers.filter(f => f !== flower);
    if (this.draggedFlower === flower) this.draggedFlower = null;
    if (this.combineTarget === flower) this.setCombineHighlight(null);
    if (this.audio?.removeLoopVoice) this.audio.removeLoopVoice(flower.id);
    return this.flowers.length !== before;
  }

  reset() {
    if (this.audio?.clearLoopVoices) this.audio.clearLoopVoices();
    this.flowers = [];
    this.growingFlower = null;
    this.draggedFlower = null;
    this.setCombineHighlight(null);
    this._lastHoverPlayTime = {};
    this.hummingbird.active = false;
  }

  // find a flower whose head contains (px, py)
  flowerAt(px, py) {
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      if (this.flowers[i].hitTest(px, py)) return this.flowers[i];
    }
    return null;
  }

  start() { requestAnimationFrame(this.loop); }

  loop(t) {
    const dt = Math.min(64, t - this.lastT);
    this.lastT = t;
    this.update(dt, t);
    this.draw(t);
    requestAnimationFrame(this.loop);
  }

  update(dt, t) {
    this.background.update(dt, this.flowers);

    for (const f of this.flowers) {
      f.update(dt, t);

      const wasHovered = f.hovered;
      f.hovered = this.previewPos && !this.draggedFlower
        ? f.hitTest(this.previewPos.x, this.previewPos.y)
        : false;

      // hover-to-hear
      if (f.hovered && !wasHovered && f.planted) {
        const now = performance.now();
        const lastPlay = this._lastHoverPlayTime[f.id] || 0;
        if (now - lastPlay > HOVER_PLAY_COOLDOWN) {
          this._lastHoverPlayTime[f.id] = now;
          this._playFlowerSound(f);
        }
      }

      if (f.bloomed && !f.bloomFired) {
        f.bloomFired = true;
        this.onBloomFlower(f);
      }
    }

    if (this.growingFlower) this.growingFlower.update(dt, t);

    this.hummingbird.update(dt);
  }

  _playFlowerSound(flower) {
    if (!this.audio) return;
    if (flower.noteIndices && flower.noteIndices.length > 1) {
      this.audio.playChord(flower.noteIndices, { velocity: 0.45 });
    } else {
      this.audio.playNote(flower.type, flower.noteIndex, { velocity: 0.45 });
    }
  }

  replayFlower(flower, opts = {}) {
    if (!flower || !this.audio) return;
    const velocity = opts.velocity || 0.72;
    if (flower.noteIndices && flower.noteIndices.length > 1) {
      this.audio.playChord(flower.noteIndices, { velocity });
    } else {
      this.audio.playNote(flower.type, flower.noteIndex, { velocity });
    }
  }

  onBloomFlower(flower) {
    if (!this.hummingbird.active) {
      this.hummingbird.visit(flower);
    }
    if (this.onBloom) this.onBloom(flower);
  }

  getTypeCounts() {
    const counts = {};
    for (const f of this.flowers) {
      counts[f.type] = (counts[f.type] || 0) + 1;
    }
    return counts;
  }

  activeInstrumentCount() {
    const c = this.getTypeCounts();
    return Object.keys(c).length;
  }

  draw(t) {
    const { ctx, w, h } = this;
    ctx.fillStyle = '#070719';
    ctx.fillRect(0, 0, w, h);

    this.background.draw(ctx, w, h, t);

    const sorted = [...this.flowers].sort((a, b) => a.groundY - b.groundY);
    for (const f of sorted) {
      if (f === this.draggedFlower) continue;
      f.draw(ctx, t);
    }

    // dragged flower renders on top
    if (this.draggedFlower) this.draggedFlower.draw(ctx, t);

    if (this.growingFlower) this.growingFlower.draw(ctx, t);

    this.hummingbird.draw(ctx);

    if (this.handOverlay) this.handOverlay.draw(ctx);
  }
}
