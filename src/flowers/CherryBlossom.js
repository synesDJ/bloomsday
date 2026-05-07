// CherryBlossom.js
// Updates the actual blooming/growing flower, not the picker icon.
// This version overrides drawHead(), which is what FlowerBase actually calls.

import {
  FlowerBase,
  easeOutCubic,
  smoothstep,
  lerp,
} from './FlowerBase.js';

const PETAL_INNER = [255, 186, 216];
const PETAL_MID = [255, 132, 188];
const PETAL_TIP = [255, 228, 240];

const CENTER = 'rgba(226, 76, 142, 0.95)';
const CENTER_GLOW = 'rgba(255, 150, 205, 0.65)';
const VEIN = 'rgba(255, 245, 250, 0.72)';
const ANTHER = 'rgba(255, 226, 124, 0.96)';

export class CherryBlossom extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'cherry_blossom' });

    this.petalCount = 5;
    this.rotation = Math.random() * Math.PI * 2;
    this.stemLength = this.size * 3.6 + Math.random() * 10;
  }

  drawCherryPetal(ctx, cx, cy, angle, length, width, openAmount) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const len = length * openAmount;
    const wid = width * lerp(0.45, 1.0, openAmount);

    const tipY = -len;
    const notchY = -len * 0.88;

    ctx.beginPath();

    // base
    ctx.moveTo(0, 0);

    // right side
    ctx.bezierCurveTo(
      wid * 0.52,
      -len * 0.22,
      wid * 0.58,
      -len * 0.68,
      wid * 0.16,
      notchY
    );

    // small cherry-blossom notch
    ctx.quadraticCurveTo(
      wid * 0.05,
      tipY,
      0,
      -len * 0.92
    );

    ctx.quadraticCurveTo(
      -wid * 0.05,
      tipY,
      -wid * 0.16,
      notchY
    );

    // left side
    ctx.bezierCurveTo(
      -wid * 0.58,
      -len * 0.68,
      -wid * 0.52,
      -len * 0.22,
      0,
      0
    );

    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, tipY);
    grad.addColorStop(0, `rgba(${PETAL_MID[0]}, ${PETAL_MID[1]}, ${PETAL_MID[2]}, 0.88)`);
    grad.addColorStop(0.48, `rgba(${PETAL_INNER[0]}, ${PETAL_INNER[1]}, ${PETAL_INNER[2]}, 0.82)`);
    grad.addColorStop(1, `rgba(${PETAL_TIP[0]}, ${PETAL_TIP[1]}, ${PETAL_TIP[2]}, 0.92)`);

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = `rgba(255, 245, 252, ${0.32 * openAmount})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // center vein
    ctx.strokeStyle = VEIN;
    ctx.lineWidth = 0.55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.08);
    ctx.quadraticCurveTo(0, -len * 0.45, 0, -len * 0.78);
    ctx.stroke();

    // side veins
    ctx.strokeStyle = `rgba(255, 210, 230, ${0.45 * openAmount})`;
    ctx.lineWidth = 0.42;

    ctx.beginPath();
    ctx.moveTo(0, -len * 0.12);
    ctx.quadraticCurveTo(wid * 0.16, -len * 0.42, wid * 0.10, -len * 0.62);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -len * 0.12);
    ctx.quadraticCurveTo(-wid * 0.16, -len * 0.42, -wid * 0.10, -len * 0.62);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  drawHead(ctx, fx, fy, t) {
    const bloom = this.currentBloom;
    const grow = this.currentGrow;

    if (grow < 0.05) return;

    const s = this.targetSize;

    // This opens the petals quickly once bloom starts.
    const openAmount = smoothstep(0.04, 0.72, bloom);

    // If bloom has barely started, show a small pointed bud instead of a circle.
    if (openAmount < 0.08) {
      ctx.save();
      ctx.translate(fx, fy);

      const budH = s * lerp(0.35, 0.72, grow);
      const budW = s * 0.34;

      const grad = ctx.createLinearGradient(0, budH * 0.3, 0, -budH);
      grad.addColorStop(0, 'rgba(255, 132, 188, 0.88)');
      grad.addColorStop(1, 'rgba(255, 225, 238, 0.96)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -budH);
      ctx.bezierCurveTo(budW, -budH * 0.55, budW * 0.8, budH * 0.18, 0, budH * 0.28);
      ctx.bezierCurveTo(-budW * 0.8, budH * 0.18, -budW, -budH * 0.55, 0, -budH);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      return;
    }

    const sway = this.getSway(t) * 0.015;
    const rotation = this.rotation + sway;

    const petalLength = s * 1.35;
    const petalWidth = s * 0.58;
    const petalBaseOffset = s * 0.18;

    // Soft halo behind petals.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 2.2);
    halo.addColorStop(0, `rgba(255, 170, 215, ${0.18 + bloom * 0.18})`);
    halo.addColorStop(0.45, `rgba(255, 120, 195, ${0.10 * bloom})`);
    halo.addColorStop(1, 'rgba(255, 120, 195, 0)');

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(fx, fy, s * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Five distinct petals.
    for (let i = 0; i < this.petalCount; i++) {
      const angle = rotation + i * ((Math.PI * 2) / this.petalCount);

      const px = fx + Math.cos(angle - Math.PI / 2) * petalBaseOffset * openAmount;
      const py = fy + Math.sin(angle - Math.PI / 2) * petalBaseOffset * openAmount;

      this.drawCherryPetal(
        ctx,
        px,
        py,
        angle,
        petalLength,
        petalWidth,
        openAmount
      );
    }

    // Center glow.
    ctx.save();

    const centerR = s * 0.24 * openAmount;
    const centerGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, centerR * 1.7);
    centerGrad.addColorStop(0, CENTER);
    centerGrad.addColorStop(0.6, CENTER_GLOW);
    centerGrad.addColorStop(1, 'rgba(255, 120, 190, 0)');

    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, centerR * 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Stamens.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const stamenCount = 12;
    const stamenLen = s * 0.48 * openAmount;

    for (let i = 0; i < stamenCount; i++) {
      const a = rotation + i * ((Math.PI * 2) / stamenCount);
      const r = stamenLen * (0.72 + 0.18 * Math.sin(i * 2.1));

      const sx = fx + Math.cos(a) * r;
      const sy = fy + Math.sin(a) * r;

      ctx.strokeStyle = `rgba(255, 220, 236, ${0.52 * openAmount})`;
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      ctx.fillStyle = ANTHER;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.25 * openAmount, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * openAmount})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 1.35 * openAmount, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  emitSparks(t, fx, fy) {
    const bloom = this.currentBloom;
    if (bloom < 0.35) return;

    const targetCount = 8 + Math.floor(bloom * 8);

    if (this.particles.length < targetCount && Math.random() < 0.38) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.targetSize * (0.6 + Math.random() * 1.1);

      this.spawnParticle({
        x: fx + Math.cos(angle) * radius,
        y: fy + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.38,
        vy: -0.18 - Math.random() * 0.28,
        r: 0.6 + Math.random() * 1.1,
        life: 1200 + Math.random() * 1300,
      });
    }
  }

  hitTest(px, py) {
    const sway = this.getSway(performance.now());
    const fx = this.x + sway * 0.2;
    const fy = this.groundY - this.stemLength * easeOutCubic(this.currentGrow);

    const d = Math.hypot(px - fx, py - fy);
    return d < this.targetSize * 1.9;
  }
}