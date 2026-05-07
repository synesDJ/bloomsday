import { FlowerBase, easeOutCubic, smoothstep } from './FlowerBase.js';

export class PinkLily extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'pink_lily' });
    this.petalSpin = Math.random() * Math.PI * 2;
    this.freckles = Array.from({ length: 18 }, (_, i) => ({
      a: (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.16,
      r: 0.22 + Math.random() * 0.48,
      size: 0.7 + Math.random() * 1.2,
    }));
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize * 1.18;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const open = easeOutCubic(bloom);
    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const baseAngle = this.petalSpin + this.getSway(t) * 0.035;

    ctx.save();
    ctx.translate(fx, fy);

    for (let layer = 0; layer < 2; layer++) {
      const count = 3;
      const offset = layer * Math.PI / 3;
      const len = s * (1.0 + layer * 0.16) * (0.55 + 0.62 * open);
      const wid = s * (0.28 + layer * 0.08) * open;

      for (let i = 0; i < count; i++) {
        const ang = baseAngle + offset + (i / count) * Math.PI * 2 - Math.PI / 2;
        const tipX = Math.cos(ang) * len;
        const tipY = Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2);
        const py = Math.sin(ang + Math.PI / 2);

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, `rgba(${ri},${gi},${bi},${0.86 * open})`);
        grad.addColorStop(0.46, `rgba(${r},${g},${b},${0.74 * open})`);
        grad.addColorStop(1, `rgba(${ro},${go},${bo},${0.42 * open})`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.30 + px * wid,
          Math.sin(ang) * len * 0.30 + py * wid,
          Math.cos(ang) * len * 0.74 + px * wid * 0.55,
          Math.sin(ang) * len * 0.74 + py * wid * 0.55,
          tipX, tipY
        );
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.74 - px * wid * 0.55,
          Math.sin(ang) * len * 0.74 - py * wid * 0.55,
          Math.cos(ang) * len * 0.30 - px * wid,
          Math.sin(ang) * len * 0.30 - py * wid,
          0, 0
        );
        ctx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 235, 245, ${0.34 * open})`;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(ang) * len * 0.5, Math.sin(ang) * len * 0.5, tipX, tipY);
        ctx.stroke();
        ctx.restore();
      }
    }

    const freckleA = smoothstep(0.35, 1.0, bloom);
    if (freckleA > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const dot of this.freckles) {
        const x = Math.cos(dot.a) * s * dot.r;
        const y = Math.sin(dot.a) * s * dot.r;
        ctx.fillStyle = `rgba(255, 85, 165, ${0.48 * freckleA})`;
        ctx.beginPath();
        ctx.arc(x, y, dot.size * freckleA, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + baseAngle;
      const len = s * 0.44 * open;
      ctx.strokeStyle = `rgba(255, 240, 190, ${0.58 * open})`;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 245, 170, ${0.86 * open})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * len, Math.sin(a) * len, 1.35 * open, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
}
