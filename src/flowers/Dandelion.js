// Dandelion — bioluminescent radial seed head with golden-yellow glow.
// Tall dark-green stem, base leaves, 60+ luminous filaments emerging from a
// glowing core, occasional drifting seed wisps.

import { FlowerBase, smoothstep, easeOutCubic } from './FlowerBase.js';

const LEAF_DARK   = 'rgba(28, 60, 36, 0.92)';
const LEAF_GLOW   = 'rgba(120, 200, 130, 0.55)';

export class Dandelion extends FlowerBase {
  constructor(opts) {
    super({ ...opts, type: 'dandelion' });
    const n = 56 + Math.floor(Math.random() * 16);
    this.filaments = Array.from({ length: n }, (_, i) => ({
      ang: (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.05,
      lenScale: 1.20 + Math.random() * 0.30,
      curl:  (Math.random() - 0.5) * 0.18,
    }));
    const m = 32;
    this.innerFilaments = Array.from({ length: m }, (_, i) => ({
      ang: (i / m) * Math.PI * 2 + (Math.random() - 0.5) * 0.07,
      lenScale: 0.65 + Math.random() * 0.25,
      curl:  (Math.random() - 0.5) * 0.15,
    }));
    this.particleTimer = 0;
  }

  // override emitSparks because dandelion sparks are detached seed wisps
  emitSparks(t, fx, fy) {
    if (this.currentBloom < 0.55) return;
    this.particleTimer = (this.particleTimer || 0) + 16;  // approx per frame
    if (this.particleTimer > 800) {
      this.particleTimer = 0;
      this.spawnParticle({
        x: fx + (Math.random() - 0.5) * this.currentSize * 1.3,
        y: fy + (Math.random() - 0.5) * this.currentSize * 0.5,
        vx: (Math.random() - 0.5) * 0.10,
        vy: -0.30 - Math.random() * 0.15,
        r: 0.7 + Math.random() * 0.4,
        life: 3500,
        wisp: true,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  // override drawSparks — dandelion sparks are tiny X-shaped seed wisps
  drawSparks(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = Math.max(0, p.life / (p.maxLife || 3500)) * 0.85;
      // soft halo
      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
      halo.addColorStop(0, `rgba(255, 250, 210, ${a * 0.6})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      // X wisp
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle || 0) + performance.now() * 0.0005);
      ctx.strokeStyle = `rgba(255, 250, 220, ${a})`;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-3.4, 0); ctx.lineTo(3.4, 0);
      ctx.moveTo(0, -1.7); ctx.lineTo(0, 1.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Add base leaves
  drawBaseLeaves(ctx, t) {
    const seed = this.seedStage();
    if (seed < 0.05) return;
    const sway = this.getSway(t) * 0.18;
    const baseX = this.x + sway;
    const baseY = this.groundY - 1;

    ctx.save();
    for (const sgn of [-1, 1]) {
      const ang = sgn * (0.35 + Math.sin(this.swayOffset + sgn) * 0.06);
      const len = this.targetSize * 1.4 * seed;
      const wid = this.targetSize * 0.32;
      ctx.translate(0, 0);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      // toothed leaf shape
      const tipX = baseX + Math.cos(-Math.PI / 2 + ang) * len;
      const tipY = baseY + Math.sin(-Math.PI / 2 + ang) * len;
      const c1x = baseX + Math.cos(-Math.PI / 2 + ang + sgn * 0.4) * len * 0.55 + sgn * wid;
      const c1y = baseY + Math.sin(-Math.PI / 2 + ang + sgn * 0.4) * len * 0.55;
      const c2x = baseX + Math.cos(-Math.PI / 2 + ang - sgn * 0.4) * len * 0.55 - sgn * wid;
      const c2y = baseY + Math.sin(-Math.PI / 2 + ang - sgn * 0.4) * len * 0.55;
      ctx.bezierCurveTo(c1x, c1y, tipX + sgn * wid * 0.3, tipY, tipX, tipY);
      ctx.bezierCurveTo(c2x, c2y, baseX, baseY + 4, baseX, baseY);
      ctx.fillStyle = LEAF_DARK;
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = LEAF_GLOW;
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // central leaf vein
      ctx.strokeStyle = 'rgba(150, 220, 160, 0.5)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  drawHead(ctx, fx, fy, t) {
    const [r, g, b] = this.rgb;
    const [ri, gi, bi] = this.toneInner;
    const [ro, go, bo] = this.toneOuter;
    const s = this.currentSize;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;

    const wob = Math.sin(t * 0.002 + this.swayOffset) * 0.025;
    const open = easeOutCubic(bloom);

    ctx.save();
    ctx.translate(fx, fy);

    // ——— extra wide bloom halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (open > 0.05) {
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.2);
      halo.addColorStop(0,   `rgba(${ri},${gi},${bi},${0.45 * open})`);
      halo.addColorStop(0.55,`rgba(${ro},${go},${bo},${0.18 * open})`);
      halo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, s * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ——— outer filaments
    for (const f of this.filaments) {
      const ang = f.ang + wob + f.curl * 0.4;
      const len = s * f.lenScale * (0.35 + 0.7 * open);
      const tipX = Math.cos(ang) * len;
      const tipY = Math.sin(ang) * len;
      const midX = Math.cos(ang) * len * 0.55 + Math.cos(ang + Math.PI / 2) * f.curl * len * 0.18;
      const midY = Math.sin(ang) * len * 0.55 + Math.sin(ang + Math.PI / 2) * f.curl * len * 0.18;

      // luminous gradient stroke from base to tip
      const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
      grad.addColorStop(0,   `rgba(${ro},${go},${bo},${0.65 * open})`);
      grad.addColorStop(0.55,`rgba(${ri},${gi},${bi},${0.85 * open})`);
      grad.addColorStop(1,   `rgba(255, 250, 220, ${0.95 * open})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();

      // tip pinprick
      ctx.fillStyle = `rgba(255, 250, 220, ${0.95 * open})`;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 1.1 + 0.45 * open, 0, Math.PI * 2);
      ctx.fill();
    }

    // ——— inner halo of shorter filaments
    if (open > 0.25) {
      const innerA = (open - 0.25) / 0.75;
      for (const f of this.innerFilaments) {
        const ang = f.ang + wob;
        const len = s * f.lenScale * (0.4 + 0.45 * open);
        const tipX = Math.cos(ang) * len;
        const tipY = Math.sin(ang) * len;
        ctx.strokeStyle = `rgba(${ri},${gi},${bi},${0.55 * innerA})`;
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ——— bright glowing core
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.32);
    core.addColorStop(0, `rgba(255, 250, 220, ${0.95})`);
    core.addColorStop(0.5, `rgba(${ri},${gi},${bi}, 0.85)`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  draw(ctx, t) {
    if (this.currentGrow < 0.02 && this.currentBloom < 0.02) return;
    this.drawPlantedBase(ctx, t);
    this.drawBaseLeaves(ctx, t);
    const { topX, topY } = this.drawStem(ctx, t);
    this.drawHeadGlow(ctx, topX, topY);
    this.drawHead(ctx, topX, topY, t);
    this.emitSparks(t, topX, topY);
    this.drawSparks(ctx);
  }
}
