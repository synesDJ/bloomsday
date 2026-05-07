// Iris — coral-orange iris with luminous beard veins.
// 3 drooping bezier falls + 3 upright standards. Tall dark-green stem.
// Inner glowing veins running through each fall (the "beard") give it
// the bioluminescent reference look.

import { FlowerBase, smoothstep, easeOutCubic } from './FlowerBase.js';

export class Iris extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'iris' });
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    ctx.save();
    ctx.translate(fx, fy);

    // ——— 3 falls (drooping outer petals)
    const fallsOpen = smoothstep(0.0, 0.55, bloom);
    if (fallsOpen > 0) {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + Math.PI / 2;
        ctx.save();
        ctx.rotate(ang);
        this._drawFall(ctx, s, fallsOpen);
        ctx.restore();
      }
    }

    // ——— 3 standards (upright inner petals)
    const standOpen = smoothstep(0.30, 1.00, bloom);
    if (standOpen > 0) {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
        ctx.save();
        ctx.rotate(ang);
        this._drawStandard(ctx, s, standOpen);
        ctx.restore();
      }
    }

    // ——— bright throat (glowing core)
    if (bloom > 0.3) {
      const t2 = (bloom - 0.3) / 0.7;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const throat = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.45);
      throat.addColorStop(0,   `rgba(255, 248, 220, ${0.95 * t2})`);
      throat.addColorStop(0.5, `rgba(255, 200, 140, ${0.55 * t2})`);
      throat.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = throat;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  _drawFall(ctx, s, open) {
    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const len = s * (0.6 + 0.6 * open);
    const wide = s * (0.32 + 0.20 * open);

    // translucent fill — coral inner, deep orange outer
    const grad = ctx.createLinearGradient(0, 0, 0, len * 1.15);
    grad.addColorStop(0,   `rgba(${ri},${gi},${bi},${0.78 * open})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${0.7 * open})`);
    grad.addColorStop(1,   `rgba(${ro},${go},${bo},${0.45 * open})`);
    ctx.fillStyle = grad;

    // drooping calligraphic lobe
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wide * 1.6, len * 0.25,  -wide, len * 1.05, 0, len);
    ctx.bezierCurveTo( wide,        len * 1.05,  wide * 1.6, len * 0.25, 0, 0);
    ctx.fill();

    // luminous outline + beard veins (additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 220, 180, ${0.5 * open})`;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wide * 1.6, len * 0.25,  -wide, len * 1.05, 0, len);
    ctx.bezierCurveTo( wide,        len * 1.05,  wide * 1.6, len * 0.25, 0, 0);
    ctx.stroke();

    if (open > 0.3) {
      const beardA = (open - 0.3) / 0.7;
      // central beard vein — bright golden glow
      ctx.strokeStyle = `rgba(255, 240, 200, ${0.85 * beardA})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(0, len * 0.5, 0, len * 0.95);
      ctx.stroke();
      // side beard hairs
      ctx.strokeStyle = `rgba(255, 200, 130, ${0.6 * beardA})`;
      ctx.lineWidth = 0.45;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, len * 0.1);
        ctx.quadraticCurveTo(sgn * wide * 0.35, len * 0.55, sgn * wide * 0.15, len * 0.85);
        ctx.stroke();
      }
      // cross hairs along beard
      const hairs = 5;
      for (let i = 1; i <= hairs; i++) {
        const yy = len * (0.18 + i * 0.12);
        const ww = wide * (0.12 + Math.sin(i * 1.3) * 0.04);
        ctx.strokeStyle = `rgba(255, 230, 180, ${0.45 * beardA})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(-ww, yy);
        ctx.lineTo( ww, yy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawStandard(ctx, s, open) {
    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const len = s * (0.5 + 0.45 * open);
    const wide = s * (0.20 + 0.06 * open);

    // narrower flame-shape — base bright, tip dim
    const grad = ctx.createLinearGradient(0, 0, 0, -len * 1.2);
    grad.addColorStop(0, `rgba(${ri},${gi},${bi},${0.8 * open})`);
    grad.addColorStop(1, `rgba(${ro},${go},${bo},${0.35 * open})`);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wide * 1.4, -len * 0.30, -wide * 0.7, -len * 0.95, 0, -len);
    ctx.bezierCurveTo( wide * 0.7, -len * 0.95,  wide * 1.4, -len * 0.30, 0, 0);
    ctx.fill();

    // luminous central stroke
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 230, 200, ${0.7 * open})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 220, 170, ${0.45 * open})`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wide * 1.4, -len * 0.30, -wide * 0.7, -len * 0.95, 0, -len);
    ctx.bezierCurveTo( wide * 0.7, -len * 0.95,  wide * 1.4, -len * 0.30, 0, 0);
    ctx.stroke();
    ctx.restore();
  }
}
