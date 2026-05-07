// Wildflower — pale-green / soft-yellow bioluminescent bloom.
// 7 asymmetric bezier petals around a glowing pollen dome.
// Slender dark-green stem.

import { FlowerBase, smoothstep } from './FlowerBase.js';

export class Wildflower extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'wildflower' });
    this.petals = Array.from({ length: 7 }, () => ({
      lenScale: 0.85 + Math.random() * 0.30,
      widScale: 0.85 + Math.random() * 0.30,
      jitter:   (Math.random() - 0.5) * 0.20,
      tilt:     (Math.random() - 0.5) * 0.18,
    }));
  }

  drawHead(ctx, fx, fy, t) {
    const [r, g, b] = this.rgb;
    const s = this.currentSize * 1.24;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(this.swayOffset * 0.07);

    const open = smoothstep(0.0, 0.85, bloom);
    for (let i = 0; i < this.petals.length; i++) {
      const petal = this.petals[i];
      const ang = (i / this.petals.length) * Math.PI * 2 + petal.jitter - Math.PI / 2;
      const len = s * (0.68 + 0.64 * open) * petal.lenScale;
      const wid = s * (0.38 + 0.14 * open) * petal.widScale;
      this.drawVeinPetal(ctx, 0, 0, ang + petal.tilt * open, len, wid, {
        bloomScale: bloom,
        fillAlpha: 0.68,
      });
    }

    // ——— glowing pollen dome
    const stamenA = smoothstep(0.25, 0.85, bloom);
    if (stamenA > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const dome = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.50);
      dome.addColorStop(0,   `rgba(255, 248, 200, ${0.95 * stamenA})`);
      dome.addColorStop(0.45,`rgba(180, 230, 130, ${0.7 * stamenA})`);
      dome.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.50, 0, Math.PI * 2);
      ctx.fill();

      // pollen dots scattered
      for (let i = 0; i < 16; i++) {
        const da = (i / 16) * Math.PI * 2 + this.swayOffset;
        const dr = s * (0.10 + 0.16 * ((i * 13) % 7) / 7);
        ctx.fillStyle = `rgba(255, 240, 140, ${0.9 * stamenA})`;
        ctx.beginPath();
        ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // bright yellow core
      ctx.fillStyle = `rgba(255, 244, 170, ${0.95 * stamenA})`;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
