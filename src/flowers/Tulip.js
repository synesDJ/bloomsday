import { FlowerBase, easeOutCubic, smoothstep } from './FlowerBase.js';

export class Tulip extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'tulip' });
    this.petalSpin = Math.random() * Math.PI * 2;
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize * 1.25;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const open = easeOutCubic(bloom);
    const baseAngle = this.petalSpin;

    ctx.save();
    ctx.translate(fx, fy);

    // 6 cup-shaped petals forming a chalice
    const petalCount = 6;
    for (let layer = 0; layer < 2; layer++) {
      const count = 3;
      const offset = layer * (Math.PI / 3);
      const layerAlpha = layer === 0 ? 0.85 : 0.95;

      for (let i = 0; i < count; i++) {
        const ang = baseAngle + offset + (i / count) * Math.PI * 2;
        const spread = 0.18 + 0.42 * open;
        const petalAng = ang * spread - Math.PI / 2;
        const len = s * (0.96 + 0.34 * open);
        const wid = s * (0.38 + 0.12 * open);

        const tipX = Math.sin(ang) * s * spread * 0.3;
        const tipY = -len;

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, `rgba(${ro},${go},${bo},${layerAlpha * open})`);
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${0.85 * open})`);
        grad.addColorStop(0.85, `rgba(${ri},${gi},${bi},${0.75 * open})`);
        grad.addColorStop(1, `rgba(255, 240, 230, ${0.5 * open})`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);

        const curlBack = s * 0.08 * open;
        ctx.bezierCurveTo(
          tipX - wid, tipY * 0.3,
          tipX - wid * 0.7, tipY * 0.85,
          tipX, tipY + curlBack
        );
        ctx.bezierCurveTo(
          tipX + wid * 0.7, tipY * 0.85,
          tipX + wid, tipY * 0.3,
          0, 0
        );
        ctx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 230, 210, ${0.34 * open})`;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(tipX, tipY * 0.5, tipX, tipY + curlBack);
        ctx.stroke();
        ctx.restore();
      }
    }

    // inner glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const innerR = s * 0.38;
    const inner = ctx.createRadialGradient(0, -s * 0.15, 0, 0, -s * 0.15, innerR);
    inner.addColorStop(0, `rgba(255, 240, 200, ${0.7 * open})`);
    inner.addColorStop(0.5, `rgba(${ri},${gi},${bi},${0.35 * open})`);
    inner.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
