import { FlowerBase, hexToRgb, FLOWER_COLORS, FLOWER_TONES, easeOutCubic, smoothstep, lerp } from './FlowerBase.js';

function blendColors(hexColors) {
  let r = 0, g = 0, b = 0;
  for (const hex of hexColors) {
    const [cr, cg, cb] = hexToRgb(hex);
    r += cr; g += cg; b += cb;
  }
  const n = hexColors.length;
  r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export class HybridFlower extends FlowerBase {
  constructor({ baseFlowers, x, y, size, noteIndices }) {
    super({
      type: 'hybrid',
      x, y, size,
      noteIndex: noteIndices[0],
      stemCurve: (Math.random() - 0.5) * 0.3,
    });
    this.tier = baseFlowers.length;
    this.baseFlowers = baseFlowers;
    this.noteIndices = noteIndices;

    const colors = baseFlowers.map(t => FLOWER_COLORS[t] || '#ffffff');
    this.color = blendColors(colors);
    this.rgb = hexToRgb(this.color);

    this.constituentRgbs = colors.map(c => hexToRgb(c));
    this.constituentTones = baseFlowers.map(t => {
      const tones = FLOWER_TONES[t] || [FLOWER_COLORS[t] || '#fff', FLOWER_COLORS[t] || '#fff'];
      return [hexToRgb(tones[0]), hexToRgb(tones[1])];
    });

    this.toneInner = hexToRgb(blendColors(baseFlowers.map(t => (FLOWER_TONES[t] || ['#fff'])[0])));
    this.toneOuter = hexToRgb(blendColors(baseFlowers.map(t => (FLOWER_TONES[t] || ['#fff', '#fff'])[1])));

    this.petalSpin = Math.random() * Math.PI * 2;
    this.petalCount = 5 + (this.tier - 1) * 3;
  }

  drawHead(ctx, fx, fy, t) {
    switch (this.tier) {
      case 2: this._drawTier2(ctx, fx, fy, t); break;
      case 3: this._drawTier3(ctx, fx, fy, t); break;
      case 4: this._drawTier4(ctx, fx, fy, t); break;
      case 5: this._drawTier5(ctx, fx, fy, t); break;
    }
  }

  // Tier 2: Two-tone alternating petals with gentle spiral
  _drawTier2(ctx, fx, fy, t) {
    const s = this.currentSize;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;
    const open = easeOutCubic(bloom);
    const baseAngle = this.petalSpin + this.getSway(t) * 0.04;

    ctx.save();
    ctx.translate(fx, fy);

    for (let i = 0; i < 8; i++) {
      const ang = baseAngle + (i / 8) * Math.PI * 2;
      const ci = i % 2;
      const rgb = this.constituentRgbs[ci] || this.rgb;
      const inner = this.constituentTones[ci] ? this.constituentTones[ci][0] : this.toneInner;
      const outer = this.constituentTones[ci] ? this.constituentTones[ci][1] : this.toneOuter;

      const len = s * (0.7 + 0.45 * open);
      const wid = s * 0.28 * open;
      const tipX = Math.cos(ang) * len;
      const tipY = Math.sin(ang) * len;
      const px = Math.cos(ang + Math.PI / 2);
      const py = Math.sin(ang + Math.PI / 2);

      const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
      grad.addColorStop(0, `rgba(${inner[0]},${inner[1]},${inner[2]},${0.85 * open})`);
      grad.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.75 * open})`);
      grad.addColorStop(1, `rgba(${outer[0]},${outer[1]},${outer[2]},${0.5 * open})`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        Math.cos(ang) * len * 0.35 + px * wid, Math.sin(ang) * len * 0.35 + py * wid,
        Math.cos(ang) * len * 0.75 + px * wid * 0.5, Math.sin(ang) * len * 0.75 + py * wid * 0.5,
        tipX, tipY
      );
      ctx.bezierCurveTo(
        Math.cos(ang) * len * 0.75 - px * wid * 0.5, Math.sin(ang) * len * 0.75 - py * wid * 0.5,
        Math.cos(ang) * len * 0.35 - px * wid, Math.sin(ang) * len * 0.35 - py * wid,
        0, 0
      );
      ctx.fill();
    }

    this._drawCore(ctx, s, open);
    ctx.restore();
  }

  // Tier 3: Three-ring mandala, each ring from a different parent
  _drawTier3(ctx, fx, fy, t) {
    const s = this.currentSize;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;
    const open = easeOutCubic(bloom);
    const baseAngle = this.petalSpin + this.getSway(t) * 0.04;

    ctx.save();
    ctx.translate(fx, fy);

    const rings = [
      { count: 5, rFrac: 0.85, wFrac: 0.24, bloomStart: 0.0 },
      { count: 7, rFrac: 0.60, wFrac: 0.20, bloomStart: 0.2 },
      { count: 4, rFrac: 0.35, wFrac: 0.18, bloomStart: 0.4 },
    ];

    for (let ri = 0; ri < rings.length; ri++) {
      const ring = rings[ri];
      const ringBloom = smoothstep(ring.bloomStart, ring.bloomStart + 0.5, bloom);
      if (ringBloom <= 0) continue;
      const ro = easeOutCubic(ringBloom);
      const ci = ri % this.constituentRgbs.length;
      const rgb = this.constituentRgbs[ci];
      const inner = this.constituentTones[ci] ? this.constituentTones[ci][0] : rgb;
      const outer = this.constituentTones[ci] ? this.constituentTones[ci][1] : rgb;

      for (let i = 0; i < ring.count; i++) {
        const ang = baseAngle + ri * 0.4 + (i / ring.count) * Math.PI * 2;
        const len = s * ring.rFrac * (0.5 + 0.5 * ro);
        const wid = s * ring.wFrac * ro;
        const tipX = Math.cos(ang) * len;
        const tipY = Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2);
        const py = Math.sin(ang + Math.PI / 2);

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, `rgba(${inner[0]},${inner[1]},${inner[2]},${0.8 * ro})`);
        grad.addColorStop(1, `rgba(${outer[0]},${outer[1]},${outer[2]},${0.5 * ro})`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.35 + px * wid, Math.sin(ang) * len * 0.35 + py * wid,
          Math.cos(ang) * len * 0.7 + px * wid * 0.5, Math.sin(ang) * len * 0.7 + py * wid * 0.5,
          tipX, tipY
        );
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.7 - px * wid * 0.5, Math.sin(ang) * len * 0.7 - py * wid * 0.5,
          Math.cos(ang) * len * 0.35 - px * wid, Math.sin(ang) * len * 0.35 - py * wid,
          0, 0
        );
        ctx.fill();
      }
    }

    this._drawCore(ctx, s, open);
    ctx.restore();
  }

  // Tier 4: Four-quadrant crystalline with rotating inner detail
  _drawTier4(ctx, fx, fy, t) {
    const s = this.currentSize;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;
    const open = easeOutCubic(bloom);
    const baseAngle = this.petalSpin + this.getSway(t) * 0.04;
    const innerRot = t * 0.0003;

    ctx.save();
    ctx.translate(fx, fy);

    // 4 quadrant arms, each colored by one constituent
    for (let q = 0; q < 4; q++) {
      const ci = q % this.constituentRgbs.length;
      const rgb = this.constituentRgbs[ci];
      const inner = this.constituentTones[ci] ? this.constituentTones[ci][0] : rgb;
      const outer = this.constituentTones[ci] ? this.constituentTones[ci][1] : rgb;

      // 3 petals per quadrant
      for (let p = 0; p < 3; p++) {
        const ang = baseAngle + (q / 4) * Math.PI * 2 + (p - 1) * 0.25;
        const len = s * (0.65 + 0.4 * open + p * 0.08);
        const wid = s * (0.18 + p * 0.04) * open;
        const tipX = Math.cos(ang) * len;
        const tipY = Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2);
        const py = Math.sin(ang + Math.PI / 2);

        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, `rgba(${inner[0]},${inner[1]},${inner[2]},${0.8 * open})`);
        grad.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.65 * open})`);
        grad.addColorStop(1, `rgba(${outer[0]},${outer[1]},${outer[2]},${0.4 * open})`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.35 + px * wid, Math.sin(ang) * len * 0.35 + py * wid,
          Math.cos(ang) * len * 0.7 + px * wid * 0.4, Math.sin(ang) * len * 0.7 + py * wid * 0.4,
          tipX, tipY
        );
        ctx.bezierCurveTo(
          Math.cos(ang) * len * 0.7 - px * wid * 0.4, Math.sin(ang) * len * 0.7 - py * wid * 0.4,
          Math.cos(ang) * len * 0.35 - px * wid, Math.sin(ang) * len * 0.35 - py * wid,
          0, 0
        );
        ctx.fill();
      }
    }

    // rotating inner detail
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(innerRot);
    const iCount = 6;
    for (let i = 0; i < iCount; i++) {
      const a = (i / iCount) * Math.PI * 2;
      const ir = s * 0.3 * open;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * open})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * ir, Math.sin(a) * ir);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 250, 240, ${0.7 * open})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * ir, Math.sin(a) * ir, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this._drawCore(ctx, s, open);
    ctx.restore();
  }

  // Tier 5: Five-arm starburst with aurora sweep
  _drawTier5(ctx, fx, fy, t) {
    const s = this.currentSize * 1.15;
    const bloom = this.currentBloom;
    if (s < 0.6 || bloom <= 0) return;
    const open = easeOutCubic(bloom);
    const baseAngle = this.petalSpin + this.getSway(t) * 0.04;

    ctx.save();
    ctx.translate(fx, fy);

    // aurora sweep arcs (rotating translucent color bands)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.constituentRgbs.length; i++) {
      const rgb = this.constituentRgbs[i];
      const auroraAng = t * 0.0004 + (i / this.constituentRgbs.length) * Math.PI * 2;
      const auroraR = s * (1.2 + 0.3 * Math.sin(t * 0.001 + i));
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.12 * open})`;
      ctx.lineWidth = s * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, auroraR * 0.7, auroraAng, auroraAng + Math.PI * 0.6);
      ctx.stroke();
    }
    ctx.restore();

    // 5 distinct petal arms
    for (let arm = 0; arm < 5; arm++) {
      const ci = arm % this.constituentRgbs.length;
      const rgb = this.constituentRgbs[ci];
      const inner = this.constituentTones[ci] ? this.constituentTones[ci][0] : rgb;
      const outer = this.constituentTones[ci] ? this.constituentTones[ci][1] : rgb;

      const armAng = baseAngle + (arm / 5) * Math.PI * 2;

      // main arm petal
      const len = s * (0.85 + 0.35 * open);
      const wid = s * 0.22 * open;
      const tipX = Math.cos(armAng) * len;
      const tipY = Math.sin(armAng) * len;
      const px = Math.cos(armAng + Math.PI / 2);
      const py = Math.sin(armAng + Math.PI / 2);

      const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
      grad.addColorStop(0, `rgba(${inner[0]},${inner[1]},${inner[2]},${0.85 * open})`);
      grad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.7 * open})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${0.5 * open})`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        Math.cos(armAng) * len * 0.3 + px * wid, Math.sin(armAng) * len * 0.3 + py * wid,
        Math.cos(armAng) * len * 0.7 + px * wid * 0.4, Math.sin(armAng) * len * 0.7 + py * wid * 0.4,
        tipX, tipY
      );
      ctx.bezierCurveTo(
        Math.cos(armAng) * len * 0.7 - px * wid * 0.4, Math.sin(armAng) * len * 0.7 - py * wid * 0.4,
        Math.cos(armAng) * len * 0.3 - px * wid, Math.sin(armAng) * len * 0.3 - py * wid,
        0, 0
      );
      ctx.fill();

      // side accent petals
      for (const side of [-0.3, 0.3]) {
        const sideAng = armAng + side;
        const sLen = len * 0.55;
        const sWid = wid * 0.6;
        const sTipX = Math.cos(sideAng) * sLen;
        const sTipY = Math.sin(sideAng) * sLen;
        const spx = Math.cos(sideAng + Math.PI / 2);
        const spy = Math.sin(sideAng + Math.PI / 2);

        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.45 * open})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(sideAng) * sLen * 0.4 + spx * sWid, Math.sin(sideAng) * sLen * 0.4 + spy * sWid,
          Math.cos(sideAng) * sLen * 0.7 + spx * sWid * 0.3, Math.sin(sideAng) * sLen * 0.7 + spy * sWid * 0.3,
          sTipX, sTipY
        );
        ctx.bezierCurveTo(
          Math.cos(sideAng) * sLen * 0.7 - spx * sWid * 0.3, Math.sin(sideAng) * sLen * 0.7 - spy * sWid * 0.3,
          Math.cos(sideAng) * sLen * 0.4 - spx * sWid, Math.sin(sideAng) * sLen * 0.4 - spy * sWid,
          0, 0
        );
        ctx.fill();
      }
    }

    // multi-layer core glow with all constituent colors
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.constituentRgbs.length; i++) {
      const rgb = this.constituentRgbs[i];
      const r = s * (0.35 - i * 0.04);
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g2.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.3 * open})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const wCore = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.15);
    wCore.addColorStop(0, `rgba(255, 255, 255, ${0.9 * open})`);
    wCore.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wCore;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  _drawCore(ctx, s, open) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = s * 0.22;
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    core.addColorStop(0, `rgba(255, 255, 255, ${0.85 * open})`);
    core.addColorStop(0.5, `rgba(${this.rgb[0]},${this.rgb[1]},${this.rgb[2]},${0.5 * open})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
