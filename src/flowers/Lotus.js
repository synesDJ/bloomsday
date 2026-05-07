import {
  FlowerBase, easeOutCubic, smoothstep, lerp,
} from './FlowerBase.js';

const CYAN = [0, 240, 255];
const BLUE = [20, 100, 255];
const DEEP_BLUE = [2, 5, 20];
const GLOW_WHITE = [240, 255, 255];

function clampN(v, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

export class Lotus extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'lotus' });

    this.stemLength = 0;
    this.rotation = Math.random() * Math.PI * 2;

    // Performance controls
    this.lastSparkTime = 0;
    this.maxSparkCount = 32;
  }

  updateParticles(dt, t) {
    super.updateParticles(dt, t);
    this.rotation += dt * 0.000015;
  }

  // ------------------------------------------------------------
// WATER POOL & RINGS — OPTIMIZED / REDUCED
// ------------------------------------------------------------
_drawWaterBase(ctx, cx, cy, t) {
  const bloom = this.currentBloom;
  const grow = this.currentGrow;

  if (grow < 0.02 && bloom < 0.02) return;

  const s = this.targetSize * 1.05;
  const intensity = Math.max(grow * 0.45, bloom * 0.55);

  ctx.save();

  // Small water shadow only.
  const pool = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.45);
  pool.addColorStop(
    0,
    `rgba(${DEEP_BLUE[0]},${DEEP_BLUE[1]},${DEEP_BLUE[2]}, ${0.38 * intensity})`
  );
  pool.addColorStop(
    0.65,
    `rgba(${BLUE[0]},${BLUE[1]},${BLUE[2]}, ${0.08 * intensity})`
  );
  pool.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 1.25, s * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // One static thin ripple. No dash animation.
  if (bloom > 0.35) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.12 * bloom})`;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.ellipse(cx, cy - s * 0.03, s * 0.95, s * 0.20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

  // ------------------------------------------------------------
  // CURVED PETAL WITH INNER SHADOW
  // ------------------------------------------------------------
  _drawPetal(ctx, bx, by, tx, ty, width, alpha, opts = {}) {
    const {
      curl = 0,
      lift = 0,
      front = false,
      outlineOpacity = 1,
    } = opts;

    if (alpha <= 0.01) return;

    const dx = tx - bx;
    const dy = ty - by;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    // Softer, more organic petal geometry
    const bellyLen = len * (0.38 - lift * 0.22);
    const shoulderLen = len * (0.72 - lift * 0.16);

    const leftBellyX = bx + ux * bellyLen - nx * width + nx * curl * width;
    const leftBellyY = by + uy * bellyLen - ny * width;

    const rightBellyX = bx + ux * bellyLen + nx * width + nx * curl * width;
    const rightBellyY = by + uy * bellyLen + ny * width;

    const leftShoulderX = bx + ux * shoulderLen - nx * width * 0.46 + nx * curl * width * 0.8;
    const leftShoulderY = by + uy * shoulderLen - ny * width * 0.46;

    const rightShoulderX = bx + ux * shoulderLen + nx * width * 0.46 + nx * curl * width * 0.8;
    const rightShoulderY = by + uy * shoulderLen + ny * width * 0.46;

    const tipSoftX = tx - ux * width * 0.08;
    const tipSoftY = ty - uy * width * 0.08;

    const drawPath = () => {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(
        leftBellyX,
        leftBellyY,
        leftShoulderX,
        leftShoulderY,
        tipSoftX - nx * width * 0.08,
        tipSoftY - ny * width * 0.08,
      );
      ctx.quadraticCurveTo(tx, ty, tipSoftX + nx * width * 0.08, tipSoftY + ny * width * 0.08);
      ctx.bezierCurveTo(
        rightShoulderX,
        rightShoulderY,
        rightBellyX,
        rightBellyY,
        bx,
        by,
      );
      ctx.closePath();
    };

    ctx.save();

    // Solid inner fill
    const innerShadow = ctx.createLinearGradient(bx, by, tx, ty);
    innerShadow.addColorStop(0, `rgba(${DEEP_BLUE[0]},${DEEP_BLUE[1]},${DEEP_BLUE[2]}, ${0.92 * alpha})`);
    innerShadow.addColorStop(0.45, `rgba(${BLUE[0]},${BLUE[1]},${BLUE[2]}, ${0.44 * alpha})`);
    innerShadow.addColorStop(0.78, `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]}, ${0.16 * alpha})`);
    innerShadow.addColorStop(1, `rgba(${GLOW_WHITE[0]},${GLOW_WHITE[1]},${GLOW_WHITE[2]}, ${0.10 * alpha})`);

    ctx.fillStyle = innerShadow;
    drawPath();
    ctx.fill();

    // Clipped base shadow for dimension
    ctx.save();
    drawPath();
    ctx.clip();

    const baseShadow = ctx.createRadialGradient(bx, by, 0, bx, by, width * 2.1);
    baseShadow.addColorStop(0, `rgba(0,0,0,${0.30 * alpha})`);
    baseShadow.addColorStop(0.5, `rgba(${DEEP_BLUE[0]},${DEEP_BLUE[1]},${DEEP_BLUE[2]},${0.18 * alpha})`);
    baseShadow.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = baseShadow;
    ctx.beginPath();
    ctx.ellipse(bx, by, width * 1.05, width * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Glowing outline — lower shadowBlur than before
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]}, ${0.65 * alpha})`;
    ctx.shadowBlur = front ? 7 : 3.5;

    const edgeGrad = ctx.createLinearGradient(bx, by, tx, ty);
    edgeGrad.addColorStop(0, `rgba(${BLUE[0]},${BLUE[1]},${BLUE[2]}, ${0.28 * alpha * outlineOpacity})`);
    edgeGrad.addColorStop(0.55, `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]}, ${0.72 * alpha * outlineOpacity})`);
    edgeGrad.addColorStop(1, `rgba(${GLOW_WHITE[0]},${GLOW_WHITE[1]},${GLOW_WHITE[2]}, ${0.90 * alpha * outlineOpacity})`);

    ctx.strokeStyle = edgeGrad;
    ctx.lineWidth = front ? 1.5 : 1.05;
    drawPath();
    ctx.stroke();

    // Center glowing vein
    ctx.shadowBlur = 3.5;
    ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]}, ${0.42 * alpha})`;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(
      bx + ux * bellyLen + nx * curl * width,
      by + uy * bellyLen,
      tx,
      ty,
    );
    ctx.stroke();

    // Smaller tip light
    ctx.shadowBlur = 4;
    ctx.shadowColor = `rgba(${GLOW_WHITE[0]},${GLOW_WHITE[1]},${GLOW_WHITE[2]}, 0.8)`;
    ctx.fillStyle = `rgba(${GLOW_WHITE[0]},${GLOW_WHITE[1]},${GLOW_WHITE[2]}, ${0.82 * alpha})`;
    ctx.beginPath();
    ctx.arc(tx, ty, front ? 1.25 : 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ------------------------------------------------------------
  // FALLEN / BASE PETALS
  // ------------------------------------------------------------
  _drawFallenPetals(ctx, cx, cy, open) {
    if (open < 0.55) return;

    const s = this.targetSize * 1.45;
    const alpha = smoothstep(0.55, 1.0, open);

    ctx.save();

    // Reduced from 4 to 3 fallen petals
    const angles = [0.45, 3.1, 5.75];

    angles.forEach((angle) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.25);
      ctx.rotate(angle);

      const px = s * 0.38;
      const py = 0;
      const tx = s * 1.25;
      const ty = 0;
      const width = s * 0.28;

      const drawFlatPetal = () => {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + (tx - px) * 0.48, py - width, tx, ty);
        ctx.quadraticCurveTo(px + (tx - px) * 0.48, py + width, px, py);
        ctx.closePath();
      };

      ctx.fillStyle = `rgba(${DEEP_BLUE[0]},${DEEP_BLUE[1]},${DEEP_BLUE[2]}, ${0.68 * alpha})`;
      drawFlatPetal();
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]}, ${0.5 * alpha})`;
      ctx.shadowBlur = 4;
      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]}, ${0.45 * alpha})`;
      ctx.lineWidth = 1.4;
      drawFlatPetal();
      ctx.stroke();

      ctx.fillStyle = `rgba(${GLOW_WHITE[0]},${GLOW_WHITE[1]},${GLOW_WHITE[2]}, ${0.75 * alpha})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }

  // ------------------------------------------------------------
  // CORE STAMENS — OPTIMIZED, NO PER-FRAME RANDOM
  // ------------------------------------------------------------
  _drawEnergyCore(ctx, cx, cy, t, alpha) {
    if (alpha < 0.05) return;

    const s = this.targetSize;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.45);
    coreGrad.addColorStop(0, `rgba(${GLOW_WHITE[0]},${GLOW_WHITE[1]},${GLOW_WHITE[2]},${0.82 * alpha})`);
    coreGrad.addColorStop(0.34, `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.38 * alpha})`);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Reduced from 24 to 10 tendrils
    const tendrils = 10;

    for (let i = 0; i < tendrils; i += 1) {
      const p = i / Math.max(1, tendrils - 1);
      const angle = Math.PI * 1.22 + p * Math.PI * 0.56;
      const wave = Math.sin(i * 12.9898 + t * 0.002);
      const h = s * (0.46 + wave * 0.12);

      const bx = cx + Math.sin(i * 4.7) * s * 0.10;
      const by = cy;
      const tx = cx + Math.cos(angle) * h;
      const ty = cy + Math.sin(angle) * h - s * 0.15;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(cx, cy - h * 0.45, tx, ty);

      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${0.42 * alpha})`;
      ctx.lineWidth = 1.05;
      ctx.stroke();

      ctx.fillStyle = `rgba(${GLOW_WHITE[0]},${GLOW_WHITE[1]},${GLOW_WHITE[2]},${0.72 * alpha})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ------------------------------------------------------------
  // BLOOM COMPOSITION — REDUCED PETAL COUNT
  // ------------------------------------------------------------
  _drawBloom(ctx, cx, cy, t) {
    const bloom = this.currentBloom;
    if (bloom < 0.02) return;

    const open = easeOutCubic(clampN(bloom));
    const s = this.targetSize * 2.05;
    const baseY = cy - s * lerp(0.1, 0.25, open);

    // 3 back petals
    const back = [
      [-0.42, -0.66, 0.34, -0.16, 0.42],
      [0.00, -0.76, 0.34, 0.00, 0.50],
      [0.42, -0.66, 0.34, 0.16, 0.42],
    ];

    back.forEach(([x, y, w, c, l]) => {
      this._drawPetal(
        ctx,
        cx,
        baseY + s * 0.05,
        cx + x * s * open,
        baseY + y * s * open,
        w * s,
        open * 0.82,
        {
          curl: c,
          lift: l,
          outlineOpacity: 0.55,
        },
      );
    });

    // 4 mid petals
    const mid = [
      [-0.68, -0.25, 0.42, -0.34, 0.20],
      [-0.25, -0.44, 0.40, -0.12, 0.28],
      [0.25, -0.44, 0.40, 0.12, 0.28],
      [0.68, -0.25, 0.42, 0.34, 0.20],
    ];

    mid.forEach(([x, y, w, c, l]) => {
      this._drawPetal(
        ctx,
        cx,
        baseY + s * 0.10,
        cx + x * s * open,
        baseY + y * s * open,
        w * s,
        open * 0.95,
        {
          curl: c,
          lift: l,
          outlineOpacity: 0.78,
        },
      );
    });

    // 3 front petals
    const front = [
      [-0.38, 0.07, 0.40, -0.30, -0.08],
      [0.00, 0.00, 0.44, 0.00, 0.00],
      [0.38, 0.07, 0.40, 0.30, -0.08],
    ];

    front.forEach(([x, y, w, c, l]) => {
      const tx = cx + x * s * open;
      const ty = baseY + y * s * open + s * 0.15;

      this._drawPetal(
        ctx,
        cx,
        baseY + s * 0.18,
        tx,
        ty,
        w * s,
        open,
        {
          curl: c,
          lift: l,
          front: true,
          outlineOpacity: 1.0,
        },
      );
    });

    this._drawEnergyCore(ctx, cx, baseY + s * 0.12, t, open);
  }

  // ------------------------------------------------------------
  // VERTICAL PARTICLES — THROTTLED
  // ------------------------------------------------------------
emitSparks(t, cx, cy) {
  const bloom = this.currentBloom;

  // Do not spawn particles during grow phase.
  // Only show particles once flower is mostly bloomed.
  if (bloom < 0.65) return;

  if (t - this.lastSparkTime < 90) return;
  this.lastSparkTime = t;

  const target = 8 + Math.floor(bloom * 10);

  if (this.particles.length < Math.min(target, 18)) {
    const angle = Math.random() * Math.PI * 2;
    const r = this.targetSize * (0.1 + Math.random() * 0.85);

    this.spawnParticle({
      x: cx + Math.cos(angle) * r,
      y: cy - this.targetSize * 0.5 + Math.sin(angle) * r * 0.2,
      vx: (Math.random() - 0.5) * 0.03,
      vy: -0.06 - Math.random() * 0.14,
      r: Math.random() > 0.8 ? 1.0 : 0.55,
      life: 800 + Math.random() * 900,
      color: Math.random() > 0.5 ? CYAN : GLOW_WHITE,
    });
  }
}

  drawSparks(ctx) {
    if (!this.particles || this.particles.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Lower shadow blur for performance
    ctx.shadowBlur = 4;
    ctx.shadowColor = `rgba(${CYAN[0]}, ${CYAN[1]}, ${CYAN[2]}, 1)`;

    for (const p of this.particles) {
      const a = p.life / p.maxLife;
      ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ------------------------------------------------------------
  // MAIN DRAW
  // ------------------------------------------------------------
  draw(ctx, t) {
    if (this.currentBloom < 0.02) return;

    // Smaller sway calculation
    const cx = this.x + Math.sin(t * 0.00045) * 3;
    const cy = this.groundY;

    this._drawWaterBase(ctx, cx, cy, t);
    this._drawFallenPetals(ctx, cx, cy, this.currentBloom);
    this._drawBloom(ctx, cx, cy, t);
    this.emitSparks(t, cx, cy);
    this.drawSparks(ctx);
  }

  hitTest(px, py) {
    const cx = this.x;
    const cy = this.groundY - this.targetSize * 0.75;
    const r = this.targetSize * (1.85 + this.currentBloom * 1.3);
    return Math.hypot(px - cx, py - cy) < r;
  }
}