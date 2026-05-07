import { FlowerBase, easeOutCubic, smoothstep, lerp } from './FlowerBase.js';

export class Rose extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'rose' });
    this.petalSpin = Math.random() * Math.PI * 2;
    this.rings = [
      { count: 5, radiusFrac: 0.25, lenFrac: 0.44, widFrac: 0.34, curl: 0.16, bloomStart: 0.58 },
      { count: 8, radiusFrac: 0.45, lenFrac: 0.68, widFrac: 0.38, curl: 0.28, bloomStart: 0.28 },
      { count: 11, radiusFrac: 0.65, lenFrac: 0.94, widFrac: 0.42, curl: 0.42, bloomStart: 0.0 },
      { count: 13, radiusFrac: 0.82, lenFrac: 1.12, widFrac: 0.34, curl: 0.52, bloomStart: 0.0 },
    ];
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize * 1.22;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const baseAngle = this.petalSpin + this.getSway(t) * 0.04;

    ctx.save();
    ctx.translate(fx, fy);

    for (let ri2 = this.rings.length - 1; ri2 >= 0; ri2--) {
      const ring = this.rings[ri2];
      const ringBloom = smoothstep(ring.bloomStart, ring.bloomStart + 0.5, bloom);
      if (ringBloom <= 0) continue;

      const open = easeOutCubic(ringBloom);
      for (let i = 0; i < ring.count; i++) {
        const ang = baseAngle + (i / ring.count) * Math.PI * 2 + ri2 * 0.3;
        const len = s * ring.lenFrac * (0.56 + 0.5 * open);
        const wid = s * ring.widFrac * open;
        const curlAmt = ring.curl * open;

        const tipX = Math.cos(ang) * len;
        const tipY = Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2);
        const py = Math.sin(ang + Math.PI / 2);

        const curlOffX = -Math.cos(ang) * len * curlAmt;
        const curlOffY = -Math.sin(ang) * len * curlAmt;

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        const depth = 1 - ri2 / this.rings.length;
        grad.addColorStop(0, `rgba(${ri}, ${gi}, ${bi}, ${(0.85 + depth * 0.1) * open})`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.8 * open})`);
        grad.addColorStop(1, `rgba(${ro}, ${go}, ${bo}, ${0.6 * open})`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.3 + px * wid,
          Math.sin(ang) * len * 0.3 + py * wid,
          tipX + px * wid * 0.3 + curlOffX,
          tipY + py * wid * 0.3 + curlOffY,
          tipX + curlOffX, tipY + curlOffY
        );
        ctx.bezierCurveTo(
          tipX - px * wid * 0.3 + curlOffX,
          tipY - py * wid * 0.3 + curlOffY,
          Math.cos(ang) * len * 0.3 - px * wid,
          Math.sin(ang) * len * 0.3 - py * wid,
          0, 0
        );
        ctx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 200, 220, ${0.25 * open})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          Math.cos(ang) * len * 0.5,
          Math.sin(ang) * len * 0.5,
          tipX + curlOffX, tipY + curlOffY
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const coreR = s * 0.24;
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    core.addColorStop(0, `rgba(255, 220, 240, ${0.9 * bloom})`);
    core.addColorStop(0.5, `rgba(${ri}, ${gi}, ${bi}, ${0.5 * bloom})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
