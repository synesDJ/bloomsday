// FlowerBase — shared flower class with split grow/bloom + bioluminescent helpers
//
// Two independent 0..1 values drive the visual:
//   currentGrow   — stem length, branch offshoots, bud emergence
//   currentBloom  — petal opening, glow intensity, particle emission
//
// Bioluminescent rendering language:
//   • drawPlantedBase  — luminous circular ripple at ground anchor
//   • drawHeadGlow     — multi-pass radial halo (wide + mid + specular core)
//   • drawSparks       — additive-blended drifting particles
//   • drawVeinPetal    — bezier petal with luminous inner vein strokes
//
// Subclasses override drawPlantStructure() (stem/branches/leaves), drawHead(),
// and may extend emitSparks(). The base draw() composes them in correct order.

export const FLOWER_COLORS = {
  cherry_blossom: '#ffc0d8',
  iris:           '#ffa275',
  lotus:          '#b6ddff',
  wildflower:     '#ddf3a3',
  dandelion:      '#ffe071',
  sunflower:      '#f5b942',
  rose:           '#e84070',
  orchid:         '#b888ff',
  tulip:          '#ff5544',
  poppy:          '#ff7744',
  pink_lily:      '#ff9ccc',
  moon_iris:      '#8be8ff',
};

export const FLOWER_TONES = {
  cherry_blossom: ['#ffd6e6', '#ff86b8'],
  iris:           ['#ffd1a8', '#ff7048'],
  lotus:          ['#dff0ff', '#86a8ff'],
  wildflower:     ['#f6ffc4', '#a8e08a'],
  dandelion:      ['#fff2a0', '#ffb840'],
  sunflower:      ['#ffd06a', '#cc8800'],
  rose:           ['#ff6a90', '#c02050'],
  orchid:         ['#d0aaff', '#8855cc'],
  tulip:          ['#ff7766', '#cc3322'],
  poppy:          ['#ff9966', '#cc5522'],
  pink_lily:      ['#ffd6e8', '#ff5fb2'],
  moon_iris:      ['#e6fcff', '#6674ff'],
};

export const FLOWER_NAMES = {
  cherry_blossom: 'cherry blossom',
  iris:           'iris',
  lotus:          'lotus',
  wildflower:     'wildflower',
  dandelion:      'dandelion',
  sunflower:      'sunflower',
  rose:           'rose',
  orchid:         'orchid',
  tulip:          'tulip',
  poppy:          'poppy',
  pink_lily:      'pink lily',
  moon_iris:      'moon iris',
};

// dark green palette for stems/branches/leaves — shared across all flowers
export const STEM_GREEN_DEEP = 'rgba(28, 60, 36, 0.85)';
export const STEM_GREEN      = 'rgba(58, 110, 64, 0.9)';
export const STEM_GREEN_LITE = 'rgba(120, 184, 120, 0.55)';
export const LEAF_GREEN      = 'rgba(48, 96, 56, 0.92)';
export const LEAF_GREEN_LITE = 'rgba(132, 200, 130, 0.6)';

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rgbStr([r, g, b], a = 1) { return `rgba(${r},${g},${b},${a})`; }

let _id = 0;
export function nextId() { return `f_${Date.now()}_${++_id}`; }

export class FlowerBase {
  constructor({ type, x, y, size = 28, noteIndex = 0, stemCurve = 0 }) {
    this.id = nextId();
    this.type = type;
    this.x = x;
    this.y = y;
    this.size = size;
    this.targetSize = size;
    this.noteIndex = noteIndex;
    this.stemCurve = stemCurve;
    this.color = FLOWER_COLORS[type] || '#ffffff';
    this.rgb = hexToRgb(this.color);
    const tones = FLOWER_TONES[type] || [this.color, this.color];
    this.toneInner = hexToRgb(tones[0]);
    this.toneOuter = hexToRgb(tones[1]);

    this.currentGrow  = 0;
    this.currentBloom = 0;

    this.currentSize = 0;
    this.bloomed = false;
    this.bloomFired = false;
    this.birthTime = performance.now();
    this.externallyControlled = false;

    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed  = 0.0018 + Math.random() * 0.0012;

    this.particles = [];

    this.hovered = false;
    this.picked = false;

    this.tier = 1;
    this.baseFlowers = [type];
    this.noteIndices = [noteIndex];
    this.planted = false;
    this._isDragging = false;
    this._combineHighlight = false;
    this._dragOrigX = 0;
    this._dragOrigY = 0;

    this.stemLength = size * 3.4 + Math.random() * 12;
  }

  get growth() { return Math.max(this.currentGrow, this.currentBloom); }
  set growth(v) { this.setGrowth(v); }

  get groundY() { return this.y + this.stemLength; }

  update(dt, t) {
    if (!this.externallyControlled) {
      if (this.currentGrow < 1) {
        this.currentGrow = Math.min(1, this.currentGrow + dt * 0.0021);
      } else if (this.currentBloom < 1) {
        this.currentBloom = Math.min(1, this.currentBloom + dt * 0.0019);
      }
      this._updateDerived();
    }
    this.updateParticles(dt, t);
  }

  _updateDerived() {
    const e = easeOutCubic(this.currentBloom);
    const budFraction = 0.20 * easeOutCubic(this.currentGrow);
    this.currentSize = lerp(budFraction * this.targetSize, this.targetSize, e);
    if (this.currentBloom >= 0.98 && !this.bloomed) this.bloomed = true;
  }

  setGrow(g) {
    this.currentGrow = Math.max(0, Math.min(1, g));
    this._updateDerived();
  }
  setBloom(b) {
    this.currentBloom = Math.max(0, Math.min(1, b));
    this._updateDerived();
  }
  setGrowth(g) {
    const v = Math.max(0, Math.min(1, g));
    const STEM_END = 0.55;
    if (v <= STEM_END) {
      this.currentGrow  = v / STEM_END;
      this.currentBloom = 0;
    } else {
      this.currentGrow  = 1;
      this.currentBloom = (v - STEM_END) / (1 - STEM_END);
    }
    this._updateDerived();
  }

  seedStage()   { return smoothstep(0.00, 0.10, this.currentGrow); }
  stemStage()   { return smoothstep(0.05, 0.65, this.currentGrow); }
  branchStage() { return smoothstep(0.40, 0.85, this.currentGrow); }
  budStage()    { return smoothstep(0.65, 1.00, this.currentGrow); }
  bloomEarly()  { return smoothstep(0.00, 0.55, this.currentBloom); }
  bloomLate()   { return smoothstep(0.45, 1.00, this.currentBloom); }

  updateParticles(dt, t) {
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += (p.vx || 0) * dt * 0.06;
      p.y += (p.vy || 0) * dt * 0.06;
      p.life -= dt;
    }
  }

  getSway(t) {
    return Math.sin(t * this.swaySpeed + this.swayOffset) * 3.5;
  }

  // ——— SHARED BIOLUMINESCENT HELPERS ———

  // Luminous circular ripple at ground anchor — appears as soon as stem starts.
  drawPlantedBase(ctx, t) {
    const sway = this.getSway(t) * 0.18;
    const baseX = this.x + sway;
    const baseY = this.groundY;
    const seed  = this.seedStage();
    if (seed < 0.02) return;

    const [r, g, b] = this.rgb;
    const intensity = 0.35 + this.currentBloom * 0.65;
    const ringMax = this.targetSize * (1.4 + this.currentBloom * 0.6) * seed;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // soft ambient pool
    const pool = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, ringMax * 1.4);
    pool.addColorStop(0,   `rgba(${r},${g},${b},${0.30 * intensity})`);
    pool.addColorStop(0.4, `rgba(${r},${g},${b},${0.10 * intensity})`);
    pool.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, ringMax * 1.4, ringMax * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // two pulsing concentric rings (orbiting outward, fading as they go)
    const phase = ((t * 0.0011) + this.swayOffset * 0.16) % 1;
    for (let i = 0; i < 2; i++) {
      const rphase = (phase + i * 0.5) % 1;
      const radius = ringMax * (0.35 + rphase * 0.85);
      const alpha = (1 - rphase) * 0.45 * intensity;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 0.9 + (1 - rphase) * 0.6;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY, radius, radius * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // bright center dot
    ctx.fillStyle = `rgba(255,255,255,${0.55 * intensity})`;
    ctx.beginPath();
    ctx.arc(baseX, baseY, 1.4 + intensity * 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Multi-pass radial glow around the head.
  drawHeadGlow(ctx, fx, fy, scale = 1) {
    const [r, g, b] = this.rgb;
    const bloom = this.currentBloom;
    if (bloom <= 0.02 && !this.picked && !this.hovered) return;

    const intensity = this.picked ? 1.2
                    : (this.hovered ? 1.0
                    : 0.4 + bloom * 0.7);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Wide ambient halo
    const wide = this.currentSize * (3.6 + bloom * 1.4) * scale;
    let g1 = ctx.createRadialGradient(fx, fy, 0, fx, fy, wide);
    g1.addColorStop(0,   `rgba(${r},${g},${b},${0.22 * intensity})`);
    g1.addColorStop(0.45,`rgba(${r},${g},${b},${0.08 * intensity})`);
    g1.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.arc(fx, fy, wide, 0, Math.PI * 2); ctx.fill();

    // Mid-radius hot zone
    const mid = this.currentSize * (1.9 + bloom * 0.6) * scale;
    let g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, mid);
    g2.addColorStop(0,   `rgba(${r},${g},${b},${0.45 * intensity})`);
    g2.addColorStop(0.55,`rgba(${r},${g},${b},${0.18 * intensity})`);
    g2.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(fx, fy, mid, 0, Math.PI * 2); ctx.fill();

    // Tight specular core
    const core = this.currentSize * 0.65 * scale;
    let g3 = ctx.createRadialGradient(fx, fy, 0, fx, fy, core);
    g3.addColorStop(0,   `rgba(255,255,255,${0.55 * intensity})`);
    g3.addColorStop(0.4, `rgba(${r},${g},${b},${0.5 * intensity})`);
    g3.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g3;
    ctx.beginPath(); ctx.arc(fx, fy, core, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // Bezier petal with translucent fill, gradient outline, and inner luminous veins.
  // Anchor (ax, ay) is the petal base, dir is direction angle, length & width set the silhouette.
  drawVeinPetal(ctx, ax, ay, dir, length, width, opts = {}) {
    const bloom = opts.bloomScale ?? this.currentBloom;
    if (bloom < 0.05) return;

    const tip = {
      x: ax + Math.cos(dir) * length,
      y: ay + Math.sin(dir) * length,
    };
    // perpendicular for control points
    const px = Math.cos(dir + Math.PI / 2);
    const py = Math.sin(dir + Math.PI / 2);
    const w = width * bloom;

    const c1 = { x: ax + Math.cos(dir) * length * 0.35 + px *  w, y: ay + Math.sin(dir) * length * 0.35 + py *  w };
    const c2 = { x: ax + Math.cos(dir) * length * 0.7  + px *  w * 0.6, y: ay + Math.sin(dir) * length * 0.7  + py *  w * 0.6 };
    const c3 = { x: ax + Math.cos(dir) * length * 0.7  + px * -w * 0.6, y: ay + Math.sin(dir) * length * 0.7  + py * -w * 0.6 };
    const c4 = { x: ax + Math.cos(dir) * length * 0.35 + px * -w, y: ay + Math.sin(dir) * length * 0.35 + py * -w };

    const inner = opts.inner || this.toneInner;
    const outer = opts.outer || this.toneOuter;
    const fillAlpha = (opts.fillAlpha ?? 0.55) * bloom;

    // Translucent fill — radial gradient from base to tip
    const grad = ctx.createLinearGradient(ax, ay, tip.x, tip.y);
    grad.addColorStop(0,    `rgba(${inner[0]},${inner[1]},${inner[2]},${fillAlpha * 1.2})`);
    grad.addColorStop(0.45, `rgba(${outer[0]},${outer[1]},${outer[2]},${fillAlpha * 0.85})`);
    grad.addColorStop(1,    `rgba(${outer[0]},${outer[1]},${outer[2]},${fillAlpha * 0.35})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, tip.x, tip.y);
    ctx.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, ax, ay);
    ctx.fill();

    // Luminous outline ribbon
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,255,255,${0.30 * bloom})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, tip.x, tip.y);
    ctx.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, ax, ay);
    ctx.stroke();

    // Inner veins — central + 2 hair veins
    const veinAlpha = 0.55 * bloom;
    ctx.strokeStyle = `rgba(255,255,255,${veinAlpha})`;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(
      ax + Math.cos(dir) * length * 0.5,
      ay + Math.sin(dir) * length * 0.5,
      tip.x, tip.y
    );
    ctx.stroke();

    // side hair veins
    ctx.strokeStyle = `rgba(${inner[0]},${inner[1]},${inner[2]},${veinAlpha * 0.7})`;
    ctx.lineWidth = 0.4;
    for (const sgn of [-1, 1]) {
      const mx = ax + Math.cos(dir) * length * 0.4 + px * sgn * w * 0.4;
      const my = ay + Math.sin(dir) * length * 0.4 + py * sgn * w * 0.4;
      const tx = ax + Math.cos(dir) * length * 0.85 + px * sgn * w * 0.15;
      const ty = ay + Math.sin(dir) * length * 0.85 + py * sgn * w * 0.15;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, tx, ty);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Drifting upward sparks — emitted continuously while flower is bloomed.
  emitSparks(t, fx, fy) {
    const bloom = this.currentBloom;
    if (bloom < 0.25) return;
    const targetCount = 5 + Math.floor(bloom * 6);
    if (this.particles.length < targetCount && Math.random() < 0.35) {
      const ang = Math.random() * Math.PI * 2;
      const r = this.currentSize * (0.55 + Math.random() * 0.7);
      this.spawnParticle({
        x: fx + Math.cos(ang) * r,
        y: fy + Math.sin(ang) * r,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.18 - Math.random() * 0.32,
        r: 0.6 + Math.random() * 1.0,
        life: 1500 + Math.random() * 1500,
      });
    }
  }

  drawSparks(ctx) {
    const [r, g, b] = this.rgb;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const lifeT = Math.max(0, p.life / (p.maxLife || 2000));
      const a = Math.sin(lifeT * Math.PI) * 0.85;
      // soft halo
      const halo = (p.r || 1) * 6;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
      grd.addColorStop(0,   `rgba(${r},${g},${b},${a * 0.65})`);
      grd.addColorStop(0.5, `rgba(${r},${g},${b},${a * 0.18})`);
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, halo, 0, Math.PI * 2);
      ctx.fill();
      // bright pinprick
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r || 1) * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Stem with halo + dark-green core. Returns top point + sway.
  drawStem(ctx, t, opts = {}) {
    const sway = this.getSway(t);
    const gy = this.groundY;
    const grow = easeOutCubic(this.currentGrow);
    const topX = this.x + sway * 0.2;
    const topY = gy - this.stemLength * grow;
    const ctrlX = this.x + sway * 0.5 + this.stemCurve * 25;
    const ctrlY = gy - this.stemLength * 0.5 * grow;

    const stroke = opts.color || STEM_GREEN;
    const halo   = opts.halo  || STEM_GREEN_LITE;
    const width  = opts.width || 1.5;

    ctx.save();
    // halo glow (additive)
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(this.x + sway, gy);
    ctx.quadraticCurveTo(ctrlX, ctrlY, topX, topY);
    ctx.strokeStyle = halo;
    ctx.lineWidth   = width + 2.4;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.restore();

    // dark core
    ctx.beginPath();
    ctx.moveTo(this.x + sway, gy);
    ctx.quadraticCurveTo(ctrlX, ctrlY, topX, topY);
    ctx.strokeStyle = STEM_GREEN_DEEP;
    ctx.lineWidth   = width + 0.8;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // bright thread
    ctx.beginPath();
    ctx.moveTo(this.x + sway, gy);
    ctx.quadraticCurveTo(ctrlX, ctrlY, topX, topY);
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.stroke();

    return { topX, topY, sway, grow, ctrlX, ctrlY };
  }

  // Default head — overridden by each subclass.
  drawHead(ctx, fx, fy, t) {
    const [r, g, b] = this.rgb;
    ctx.fillStyle = `rgba(${r},${g},${b},${0.5 + this.currentBloom * 0.4})`;
    ctx.beginPath();
    ctx.arc(fx, fy, this.currentSize, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCombineHighlight(ctx, t) {
    const sway = this.getSway(t);
    const fx = this.x + sway * 0.2;
    const fy = this.groundY - this.stemLength * easeOutCubic(this.currentGrow);
    const r = this.currentSize * 2.2;
    const pulse = 0.6 + Math.sin(t * 0.006) * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grd = ctx.createRadialGradient(fx, fy, r * 0.3, fx, fy, r);
    grd.addColorStop(0, `rgba(255, 255, 255, ${0.25 * pulse})`);
    grd.addColorStop(0.5, `rgba(${this.rgb[0]},${this.rgb[1]},${this.rgb[2]}, ${0.2 * pulse})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx, t) {
    if (this.currentGrow < 0.02 && this.currentBloom < 0.02) return;
    this.drawPlantedBase(ctx, t);
    const { topX, topY } = this.drawStem(ctx, t);
    this.drawHeadGlow(ctx, topX, topY);
    this.drawHead(ctx, topX, topY, t);
    this.emitSparks(t, topX, topY);
    this.drawSparks(ctx);
    if (this._combineHighlight) this.drawCombineHighlight(ctx, t);
  }

  hitTest(px, py) {
    const sway = this.getSway(performance.now());
    const fx = this.x + sway * 0.2;
    const fy = this.groundY - this.stemLength * easeOutCubic(this.currentGrow);
    const d = Math.hypot(px - fx, py - fy);
    return d < this.currentSize * 1.4;
  }

  spawnParticle(opts) {
    this.particles.push({
      x: opts.x, y: opts.y,
      vx: opts.vx || 0, vy: opts.vy || 0,
      r: opts.r || 1.2,
      life: opts.life || 1800,
      maxLife: opts.life || 1800,
      ...opts
    });
  }
}
