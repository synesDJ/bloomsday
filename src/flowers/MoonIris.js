import { FlowerBase, easeOutCubic, smoothstep } from './FlowerBase.js';

export class MoonIris extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'moon_iris' });
    this.spin = Math.random() * Math.PI * 2;
    this.orbit = Math.random() * Math.PI * 2;
    this.motes = Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * Math.PI * 2 + Math.random() * 0.2,
      r: 0.36 + Math.random() * 0.48,
      size: 0.8 + Math.random() * 1.4,
    }));
  }

  drawHead(ctx, fx, fy, t) {
    const s = this.currentSize * 1.22;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const open = easeOutCubic(bloom);
    const phase = this.spin + Math.sin(t * 0.00045 + this.orbit) * 0.12;
    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;

    ctx.save();
    ctx.translate(fx, fy);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 3.2);
    halo.addColorStop(0, `rgba(210, 252, 255, ${0.24 * bloom})`);
    halo.addColorStop(0.42, `rgba(${r},${g},${b},${0.14 * bloom})`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, s * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Six moon-shaped petals: wide, curved, and asymmetric.
    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? 3 : 3;
      const offset = ring * Math.PI / 3;
      const ringOpen = smoothstep(ring * 0.12, 0.75 + ring * 0.1, bloom);
      if (ringOpen <= 0) continue;
      const ropen = easeOutCubic(ringOpen);

      for (let i = 0; i < count; i++) {
        const a = phase + offset + (i / count) * Math.PI * 2 - Math.PI / 2;
        const len = s * (0.82 + ring * 0.24) * (0.55 + ropen * 0.62);
        const wid = s * (0.30 + ring * 0.09) * ropen;
        const curve = s * 0.18 * ropen * (ring === 0 ? 1 : -1);
        const tipX = Math.cos(a) * len;
        const tipY = Math.sin(a) * len;
        const px = Math.cos(a + Math.PI / 2);
        const py = Math.sin(a + Math.PI / 2);

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, `rgba(${ri},${gi},${bi},${0.86 * ropen})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${0.68 * ropen})`);
        grad.addColorStop(1, `rgba(${ro},${go},${bo},${0.42 * ropen})`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(a) * len * 0.28 + px * (wid + curve),
          Math.sin(a) * len * 0.28 + py * (wid + curve),
          Math.cos(a) * len * 0.72 + px * wid * 0.55,
          Math.sin(a) * len * 0.72 + py * wid * 0.55,
          tipX, tipY
        );
        ctx.bezierCurveTo(
          Math.cos(a) * len * 0.70 - px * wid * 0.40,
          Math.sin(a) * len * 0.70 - py * wid * 0.40,
          Math.cos(a) * len * 0.25 - px * (wid * 0.65 - curve),
          Math.sin(a) * len * 0.25 - py * (wid * 0.65 - curve),
          0, 0
        );
        ctx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(235, 252, 255, ${0.36 * ropen})`;
        ctx.lineWidth = 0.72;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          Math.cos(a) * len * 0.45 + px * curve * 0.5,
          Math.sin(a) * len * 0.45 + py * curve * 0.5,
          tipX, tipY
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    // Thin orbital filaments make it feel like a distinct moon bloom, not iris.
    const orbitOpen = smoothstep(0.35, 1.0, bloom);
    if (orbitOpen > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(165, 238, 255, ${0.28 * orbitOpen})`;
      ctx.lineWidth = 0.75;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(phase * 0.3 + i * Math.PI / 3);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * (0.78 + i * 0.14), s * (0.20 + i * 0.04), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (const mote of this.motes) {
        const a = mote.a + t * 0.00025;
        const x = Math.cos(a) * s * mote.r;
        const y = Math.sin(a) * s * mote.r * 0.55;
        ctx.fillStyle = `rgba(230, 252, 255, ${0.76 * orbitOpen})`;
        ctx.beginPath();
        ctx.arc(x, y, mote.size * orbitOpen, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pearl = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.38);
    pearl.addColorStop(0, `rgba(255,255,255,${0.96 * open})`);
    pearl.addColorStop(0.35, `rgba(205,250,255,${0.58 * open})`);
    pearl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pearl;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
