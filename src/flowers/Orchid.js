import { FlowerBase, easeOutCubic, smoothstep } from './FlowerBase.js';

export class Orchid extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'orchid' });
    this.petalSpin = Math.random() * Math.PI * 2;
    this.spots = Array.from({ length: 8 }, () => ({
      x: (Math.random() - 0.5) * 0.5,
      y: Math.random() * 0.6 + 0.3,
      r: 1 + Math.random() * 1.5,
    }));
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize * 1.24;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const open = easeOutCubic(bloom);

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(this.petalSpin * 0.1);

    // 3 outer sepals
    const sepalOpen = smoothstep(0.0, 0.5, bloom);
    if (sepalOpen > 0) {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const len = s * (0.95 + 0.45 * sepalOpen);
        const wid = s * 0.18 * sepalOpen;
        const tipX = Math.cos(ang) * len;
        const tipY = Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2);
        const py = Math.sin(ang + Math.PI / 2);

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, `rgba(${ri},${gi},${bi},${0.7 * sepalOpen})`);
        grad.addColorStop(1, `rgba(${ro},${go},${bo},${0.5 * sepalOpen})`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.4 + px * wid, Math.sin(ang) * len * 0.4 + py * wid,
          Math.cos(ang) * len * 0.8 + px * wid * 0.4, Math.sin(ang) * len * 0.8 + py * wid * 0.4,
          tipX, tipY
        );
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.8 - px * wid * 0.4, Math.sin(ang) * len * 0.8 - py * wid * 0.4,
          Math.cos(ang) * len * 0.4 - px * wid, Math.sin(ang) * len * 0.4 - py * wid,
          0, 0
        );
        ctx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * sepalOpen})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tipX * 0.9, tipY * 0.9);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2 lateral petals
    const petalOpen = smoothstep(0.15, 0.65, bloom);
    if (petalOpen > 0) {
      for (let i = 0; i < 2; i++) {
        const ang = (i === 0 ? -Math.PI * 0.35 : Math.PI * 0.35) - Math.PI / 2;
        const len = s * (0.72 + 0.36 * petalOpen);
        const wid = s * 0.34 * petalOpen;
        const tipX = Math.cos(ang) * len;
        const tipY = Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2);
        const py = Math.sin(ang + Math.PI / 2);

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, `rgba(${r},${g},${b},${0.8 * petalOpen})`);
        grad.addColorStop(1, `rgba(${ri},${gi},${bi},${0.6 * petalOpen})`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.35 + px * wid, Math.sin(ang) * len * 0.35 + py * wid,
          Math.cos(ang) * len * 0.7 + px * wid * 0.6, Math.sin(ang) * len * 0.7 + py * wid * 0.6,
          tipX, tipY
        );
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.7 - px * wid * 0.6, Math.sin(ang) * len * 0.7 - py * wid * 0.6,
          Math.cos(ang) * len * 0.35 - px * wid, Math.sin(ang) * len * 0.35 - py * wid,
          0, 0
        );
        ctx.fill();
      }
    }

    // labellum (lip) — larger, pointing down, with spots
    const lipOpen = smoothstep(0.3, 0.8, bloom);
    if (lipOpen > 0) {
      const lipLen = s * (0.82 + 0.34 * lipOpen);
      const lipWid = s * 0.46 * lipOpen;
      const lipAng = Math.PI / 2;
      const tipX = Math.cos(lipAng) * lipLen;
      const tipY = Math.sin(lipAng) * lipLen;
      const px = Math.cos(lipAng + Math.PI / 2);
      const py = Math.sin(lipAng + Math.PI / 2);

      const lipGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
      lipGrad.addColorStop(0, `rgba(${ri},${gi},${bi},${0.85 * lipOpen})`);
      lipGrad.addColorStop(0.5, `rgba(${r},${g},${b},${0.75 * lipOpen})`);
      lipGrad.addColorStop(1, `rgba(255, 255, 255, ${0.4 * lipOpen})`);
      ctx.fillStyle = lipGrad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        px * lipWid * 1.2, py * lipWid * 1.2,
        tipX + px * lipWid * 0.8, tipY + py * lipWid * 0.8,
        tipX, tipY
      );
      ctx.bezierCurveTo(
        tipX - px * lipWid * 0.8, tipY - py * lipWid * 0.8,
        -px * lipWid * 1.2, -py * lipWid * 1.2,
        0, 0
      );
      ctx.fill();

      for (const spot of this.spots) {
        const sx = spot.x * lipWid * 2;
        const sy = spot.y * lipLen;
        ctx.fillStyle = `rgba(${ro},${go},${bo},${0.6 * lipOpen})`;
        ctx.beginPath();
        ctx.arc(sx, sy, spot.r * 1.45 * lipOpen, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // glowing center
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const coreR = s * 0.30;
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    core.addColorStop(0, `rgba(255, 240, 255, ${0.85 * open})`);
    core.addColorStop(0.5, `rgba(${ri},${gi},${bi},${0.45 * open})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
