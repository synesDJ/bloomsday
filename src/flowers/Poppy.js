import { FlowerBase, easeOutCubic, smoothstep } from './FlowerBase.js';

export class Poppy extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'poppy' });
    this.petalSpin = Math.random() * Math.PI * 2;
    this.crinkles = Array.from({ length: 4 }, () =>
      Array.from({ length: 6 }, () => (Math.random() - 0.5) * 0.12)
    );
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const open = easeOutCubic(bloom);
    const baseAngle = this.petalSpin;

    ctx.save();
    ctx.translate(fx, fy);

    // 4 large tissue-paper petals
    for (let i = 0; i < 4; i++) {
      const ang = baseAngle + (i / 4) * Math.PI * 2;
      const len = s * (0.9 + 0.5 * open);
      const wid = s * (0.5 + 0.15 * open);
      const crinkle = this.crinkles[i];

      const tipX = Math.cos(ang) * len;
      const tipY = Math.sin(ang) * len;
      const px = Math.cos(ang + Math.PI / 2);
      const py = Math.sin(ang + Math.PI / 2);

      const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
      grad.addColorStop(0, `rgba(${ro},${go},${bo},${0.9 * open})`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},${0.85 * open})`);
      grad.addColorStop(0.7, `rgba(${ri},${gi},${bi},${0.75 * open})`);
      grad.addColorStop(1, `rgba(255, 240, 230, ${0.55 * open})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);

      // crinkled edge - wide bezier with wavy control points
      const steps = crinkle.length;
      for (let j = 0; j < steps; j++) {
        const frac = (j + 1) / steps;
        const prevFrac = j / steps;
        const cx1 = Math.cos(ang) * len * (prevFrac + 0.5/steps) + px * wid * (1 + crinkle[j]);
        const cy1 = Math.sin(ang) * len * (prevFrac + 0.5/steps) + py * wid * (1 + crinkle[j]);

        if (j === steps - 1) {
          ctx.quadraticCurveTo(cx1, cy1, tipX, tipY);
        } else {
          const ex = Math.cos(ang) * len * frac + px * wid * (0.8 + crinkle[j] * 0.5);
          const ey = Math.sin(ang) * len * frac + py * wid * (0.8 + crinkle[j] * 0.5);
          ctx.quadraticCurveTo(cx1, cy1, ex, ey);
        }
      }
      for (let j = steps - 1; j >= 0; j--) {
        const frac = j / steps;
        const cx1 = Math.cos(ang) * len * (frac + 0.5/steps) - px * wid * (1 + crinkle[j]);
        const cy1 = Math.sin(ang) * len * (frac + 0.5/steps) - py * wid * (1 + crinkle[j]);

        if (j === 0) {
          ctx.quadraticCurveTo(cx1, cy1, 0, 0);
        } else {
          const ex = Math.cos(ang) * len * frac - px * wid * (0.8 + crinkle[j] * 0.5);
          const ey = Math.sin(ang) * len * frac - py * wid * (0.8 + crinkle[j] * 0.5);
          ctx.quadraticCurveTo(cx1, cy1, ex, ey);
        }
      }
      ctx.fill();

      // translucent veins
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * open})`;
      ctx.lineWidth = 0.4;
      for (let v = -1; v <= 1; v += 0.5) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const vTipX = Math.cos(ang) * len * 0.85 + px * wid * v * 0.3;
        const vTipY = Math.sin(ang) * len * 0.85 + py * wid * v * 0.3;
        ctx.quadraticCurveTo(
          Math.cos(ang) * len * 0.4 + px * wid * v * 0.15,
          Math.sin(ang) * len * 0.4 + py * wid * v * 0.15,
          vTipX, vTipY
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    // dark center dome
    const domeR = s * (0.25 + 0.1 * open);
    const dome = ctx.createRadialGradient(0, 0, 0, 0, 0, domeR);
    dome.addColorStop(0, `rgba(30, 15, 10, ${0.95 * open})`);
    dome.addColorStop(0.7, `rgba(60, 30, 20, ${0.85 * open})`);
    dome.addColorStop(1, `rgba(${ro},${go},${bo},${0.4 * open})`);
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.arc(0, 0, domeR, 0, Math.PI * 2);
    ctx.fill();

    // stamens around the dome
    if (open > 0.4) {
      const stamenA = (open - 0.4) / 0.6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const stamenCount = 14;
      for (let i = 0; i < stamenCount; i++) {
        const a = (i / stamenCount) * Math.PI * 2;
        const sr = domeR * (0.8 + Math.sin(i * 3.7) * 0.3);
        const sx = Math.cos(a) * sr;
        const sy = Math.sin(a) * sr;
        ctx.strokeStyle = `rgba(255, 220, 150, ${0.6 * stamenA})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * domeR * 0.3, Math.sin(a) * domeR * 0.3);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 240, 180, ${0.85 * stamenA})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
