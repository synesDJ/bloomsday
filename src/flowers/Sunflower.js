import { FlowerBase, easeOutCubic, smoothstep } from './FlowerBase.js';

export class Sunflower extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'sunflower' });
    this.petalCount = 18;
    this.petalSpin = Math.random() * Math.PI * 2;
    this.seeds = Array.from({ length: 40 }, (_, i) => {
      const golden = 2.399963;
      const r = Math.sqrt(i / 40) * 0.85;
      const a = i * golden;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, size: 0.8 + Math.random() * 0.5 };
    });
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const open = easeOutCubic(bloom);
    const baseAngle = this.petalSpin + this.getSway(t) * 0.03;

    ctx.save();
    ctx.translate(fx, fy);

    for (let i = 0; i < this.petalCount; i++) {
      const ang = baseAngle + (i / this.petalCount) * Math.PI * 2;
      const len = s * (0.9 + 0.5 * open);
      const wid = s * 0.22 * open;
      const tipX = Math.cos(ang) * len;
      const tipY = Math.sin(ang) * len;
      const px = Math.cos(ang + Math.PI / 2);
      const py = Math.sin(ang + Math.PI / 2);
      const midFrac = 0.5;

      const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
      grad.addColorStop(0, `rgba(${ro},${go},${bo},${0.9 * open})`);
      grad.addColorStop(0.4, `rgba(${ri},${gi},${bi},${0.85 * open})`);
      grad.addColorStop(1, `rgba(255, 250, 200, ${0.7 * open})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        Math.cos(ang) * len * midFrac + px * wid, Math.sin(ang) * len * midFrac + py * wid,
        Math.cos(ang) * len * 0.8 + px * wid * 0.5, Math.sin(ang) * len * 0.8 + py * wid * 0.5,
        tipX, tipY
      );
      ctx.bezierCurveTo(
        Math.cos(ang) * len * 0.8 - px * wid * 0.5, Math.sin(ang) * len * 0.8 - py * wid * 0.5,
        Math.cos(ang) * len * midFrac - px * wid, Math.sin(ang) * len * midFrac - py * wid,
        0, 0
      );
      ctx.fill();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 250, 200, ${0.3 * open})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tipX * 0.85, tipY * 0.85);
      ctx.stroke();
      ctx.restore();
    }

    const discR = s * (0.38 + 0.12 * open);
    const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, discR);
    disc.addColorStop(0, `rgba(60, 30, 10, ${0.95 * open})`);
    disc.addColorStop(0.6, `rgba(90, 50, 20, ${0.85 * open})`);
    disc.addColorStop(1, `rgba(${ro},${go},${bo}, ${0.6 * open})`);
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 0, discR, 0, Math.PI * 2);
    ctx.fill();

    if (open > 0.3) {
      const seedA = (open - 0.3) / 0.7;
      for (const seed of this.seeds) {
        const sx = seed.x * discR;
        const sy = seed.y * discR;
        ctx.fillStyle = `rgba(255, 220, 100, ${0.8 * seedA})`;
        ctx.beginPath();
        ctx.arc(sx, sy, seed.size * seedA, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, discR * 0.5);
    core.addColorStop(0, `rgba(255, 230, 150, ${0.6 * open})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, discR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
