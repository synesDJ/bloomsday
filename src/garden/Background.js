// Background - bioluminescent chord garden.
// The world brightens and grows denser as flowers and hybrids add notes/chords.

const SPORE_COLORS = [
  [135, 245, 255],
  [190, 140, 255],
  [125, 255, 190],
  [255, 165, 220],
  [255, 225, 120],
];

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function easeTo(cur, target, rate = 0.025) { return cur + (target - cur) * rate; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export class Background {
  constructor() {
    this.density = 0.48;
    this.harmony = 0.16;
    this.bloom = 0.52;
    this.flow = 0;
    this.ringTimer = 0;
    this.harmonicRings = [];
    this.realm = 'blues';

    this.spores = Array.from({ length: 90 }, (_, i) => ({
      seed: i * 41.37,
      x: Math.random(),
      y: Math.random(),
      r: 0.8 + Math.random() * 2.4,
      speed: 0.004 + Math.random() * 0.010,
      drift: 0.006 + Math.random() * 0.014,
      color: SPORE_COLORS[i % SPORE_COLORS.length],
      phase: Math.random() * Math.PI * 2,
    }));
  }

  setRealm(realm) {
    this.realm = realm === 'pentatonic' ? 'pentatonic' : 'blues';
  }

  update(dt, flowers) {
    const total = flowers.length;
    const chordNotes = flowers.reduce((sum, f) => sum + Math.max(0, (f.noteIndices?.length || 1) - 1), 0);
    const tierSum = flowers.reduce((sum, f) => sum + (f.tier || 1), 0);

    this.density = easeTo(this.density, Math.max(0.48, clamp01(total / 14)));
    this.harmony = easeTo(this.harmony, Math.max(0.16, clamp01(chordNotes / 10)));
    this.bloom = easeTo(this.bloom, Math.max(0.52, clamp01((total + tierSum) / 26)));
    this.flow += dt * (0.00008 + this.density * 0.00005);

    if (this.harmony > 0.05) {
      this.ringTimer += dt;
      const interval = 2400 - this.harmony * 1200;
      if (this.ringTimer > interval) {
        this.ringTimer = 0;
        this.harmonicRings.push({
          x: 0.22 + Math.random() * 0.62,
          y: 0.56 + Math.random() * 0.32,
          r: 12,
          maxR: 90 + this.harmony * 160 + Math.random() * 80,
          life: 5200,
          color: SPORE_COLORS[Math.floor(Math.random() * SPORE_COLORS.length)],
        });
      }
    }

    this.harmonicRings = this.harmonicRings.filter(r => r.life > 0);
    for (const r of this.harmonicRings) {
      r.r += dt * (0.018 + this.harmony * 0.018);
      r.life -= dt;
    }

    for (const s of this.spores) {
      s.y -= s.speed * dt * 0.006 * (0.8 + this.density);
      s.x += Math.sin(this.flow * 3 + s.phase) * s.drift * dt * 0.006;
      if (s.y < -0.08) {
        s.y = 1.08;
        s.x = (s.x + 0.37 + Math.random() * 0.26) % 1;
      }
      if (s.x < -0.08) s.x = 1.08;
      if (s.x > 1.08) s.x = -0.08;
    }
  }

  draw(ctx, w, h, t) {
    if (this.realm === 'pentatonic') {
      this.drawPentatonicGrove(ctx, w, h, t);
      return;
    }
    this.drawAtmosphere(ctx, w, h, t);
    this.drawHeroForest(ctx, w, h, t);
    this.drawCanopyMushrooms(ctx, w, h, t);
    this.drawDistantFlora(ctx, w, h, t);
    this.drawVines(ctx, w, h, t);
    this.drawBellClusters(ctx, w, h, t);
    this.drawCaustics(ctx, w, h, t);
    this.drawHarmonicRings(ctx, w, h);
    this.drawSpores(ctx, w, h, t);
    this.drawLivingGround(ctx, w, h, t);
    this.drawForegroundMist(ctx, w, h, t);
  }

  // ——— pentatonic pasture: ghibli-style alpine meadow
  // bright sky, drifting clouds, snow-capped mountains, winding lake with
  // flower-island shores, rolling foreground meadow with scattered blooms.
  drawPentatonicGrove(ctx, w, h, t) {
    // horizon sits ~55% down, water sits between ~58% and ~72%
    const horizonY = h * 0.55;

    // ——— 1. SKY: cyan top, soft cream toward horizon
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0,    '#5fa8d8');   // upper sky
    sky.addColorStop(0.45, '#88c4e3');   // mid sky
    sky.addColorStop(0.85, '#c8e3ed');   // hazy near horizon
    sky.addColorStop(1,    '#e2eddf');   // cream blending into mountains
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizonY + 2);

    // soft warm sun glow center-top (the source of the cloud highlight)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sunGrad = ctx.createRadialGradient(w * 0.50, h * 0.04, 0, w * 0.50, h * 0.04, w * 0.45);
    sunGrad.addColorStop(0,    'rgba(255, 250, 220, 0.35)');
    sunGrad.addColorStop(0.4,  'rgba(255, 245, 200, 0.10)');
    sunGrad.addColorStop(1,    'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, horizonY);
    ctx.restore();

    // ——— 2. CLOUDS: big soft cumulus drifting slowly right
    const cloudDrift = (t * 0.000018) % 1;   // very slow horizontal drift
    this._drawCloud(ctx, w, h, (0.50 + cloudDrift) % 1.2 - 0.1, 0.10, 1.30, 0.95);
    this._drawCloud(ctx, w, h, (0.18 + cloudDrift) % 1.2 - 0.1, 0.18, 0.85, 0.78);
    this._drawCloud(ctx, w, h, (0.82 + cloudDrift) % 1.2 - 0.1, 0.08, 0.55, 0.62);
    this._drawCloud(ctx, w, h, (0.05 + cloudDrift) % 1.2 - 0.1, 0.30, 0.40, 0.45);
    this._drawCloud(ctx, w, h, (0.70 + cloudDrift) % 1.2 - 0.1, 0.32, 0.35, 0.40);

    // ——— 3. MOUNTAINS: distant snow-capped range, left + right
    // far range (lighter, more atmospheric)
    this._drawMountainRange(ctx, w, h, horizonY, {
      seed: 11, peaks: 7, baseY: horizonY,
      heightRange: [0.18, 0.34],
      rockColor: 'rgba(140, 158, 168, 0.72)',
      shadowColor: 'rgba(95, 115, 130, 0.55)',
      snowColor: 'rgba(248, 252, 255, 0.92)',
      snowLine: 0.55,
      span: [-0.05, 1.05],
    });
    // closer range right side (darker, more saturated)
    this._drawMountainRange(ctx, w, h, horizonY, {
      seed: 27, peaks: 4, baseY: horizonY + 4,
      heightRange: [0.12, 0.22],
      rockColor: 'rgba(108, 128, 138, 0.92)',
      shadowColor: 'rgba(70, 90, 105, 0.78)',
      snowColor: 'rgba(245, 250, 255, 0.96)',
      snowLine: 0.62,
      span: [0.55, 1.10],
    });
    // closer range left side
    this._drawMountainRange(ctx, w, h, horizonY, {
      seed: 5, peaks: 3, baseY: horizonY + 6,
      heightRange: [0.13, 0.24],
      rockColor: 'rgba(115, 135, 145, 0.92)',
      shadowColor: 'rgba(75, 95, 110, 0.78)',
      snowColor: 'rgba(245, 250, 255, 0.96)',
      snowLine: 0.60,
      span: [-0.10, 0.42],
    });

    // ——— 4. FAR GREEN HILLS just below horizon
    ctx.save();
    ctx.fillStyle = 'rgba(120, 175, 95, 0.95)';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= w; x += 18) {
      const y = horizonY + 4 + Math.sin(x * 0.006) * 5 + Math.sin(x * 0.018) * 3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, horizonY + 22);
    ctx.lineTo(0, horizonY + 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ——— 5. LAKE: winding reflective water, sits behind the meadow
    const lakeTop = h * 0.575;
    const lakeBot = h * 0.72;
    ctx.save();
    const water = ctx.createLinearGradient(0, lakeTop, 0, lakeBot);
    water.addColorStop(0,   '#5a86b3');
    water.addColorStop(0.4, '#3d6a99');
    water.addColorStop(1,   '#2a4d75');
    ctx.fillStyle = water;
    // Lake outline: organic curving banks
    ctx.beginPath();
    // top bank (back shore)
    ctx.moveTo(0, lakeTop + 18);
    ctx.bezierCurveTo(w * 0.18, lakeTop + 8,  w * 0.32, lakeTop + 22, w * 0.44, lakeTop + 6);
    ctx.bezierCurveTo(w * 0.56, lakeTop - 4,  w * 0.68, lakeTop + 20, w * 0.82, lakeTop + 10);
    ctx.bezierCurveTo(w * 0.92, lakeTop + 4,  w * 0.97, lakeTop + 18, w,        lakeTop + 14);
    // right edge down
    ctx.lineTo(w, lakeBot - 8);
    // bottom bank (front shore — more dramatic curves, the lake "winds")
    ctx.bezierCurveTo(w * 0.84, lakeBot - 18, w * 0.74, lakeBot + 6,  w * 0.62, lakeBot - 14);
    ctx.bezierCurveTo(w * 0.50, lakeBot - 32, w * 0.40, lakeBot + 4,  w * 0.28, lakeBot - 20);
    ctx.bezierCurveTo(w * 0.18, lakeBot - 36, w * 0.08, lakeBot - 8,  0,        lakeBot - 18);
    ctx.closePath();
    ctx.fill();

    // water shimmer — horizontal highlight bands that sway gently
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(220, 235, 248, 0.18)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const yy = lakeTop + 12 + i * ((lakeBot - lakeTop - 12) / 6);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = yy + Math.sin(x * 0.014 + t * 0.00045 + i * 1.7) * 1.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // brighter shimmer near top of water (cloud reflection)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const yy = lakeTop + 6 + i * 4;
      ctx.beginPath();
      for (let x = w * 0.3; x <= w * 0.75; x += 14) {
        const y = yy + Math.sin(x * 0.02 + t * 0.0006 + i) * 1.2;
        if (x === w * 0.3) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // ——— 6. ISLANDS in the lake (small flower-covered spits)
    this._drawIsland(ctx, w, h, 0.32, 0.625, 0.10, 0.018, t);
    this._drawIsland(ctx, w, h, 0.66, 0.605, 0.08, 0.014, t);
    this._drawIsland(ctx, w, h, 0.86, 0.665, 0.07, 0.014, t);

    // ——— 7. FOREGROUND MEADOW: rolling green hill that fills bottom
    ctx.save();
    const meadow = ctx.createLinearGradient(0, lakeBot - 4, 0, h);
    meadow.addColorStop(0,    '#7fc056');
    meadow.addColorStop(0.35, '#6db248');
    meadow.addColorStop(1,    '#4d8a36');
    ctx.fillStyle = meadow;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, lakeBot - 4);
    // front shoreline (top of the meadow) — mirrors lake bottom bank
    ctx.bezierCurveTo(w * 0.08, lakeBot - 16, w * 0.18, lakeBot - 36, w * 0.28, lakeBot - 20);
    ctx.bezierCurveTo(w * 0.40, lakeBot + 4,  w * 0.50, lakeBot - 32, w * 0.62, lakeBot - 14);
    ctx.bezierCurveTo(w * 0.74, lakeBot + 6,  w * 0.84, lakeBot - 18, w,        lakeBot - 8);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // grass texture: short curved strokes scattered across the meadow
    ctx.strokeStyle = 'rgba(58, 110, 38, 0.45)';
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    for (let i = 0; i < 220; i++) {
      const px = ((i * 0.0731 + 0.13) % 1) * w;
      const py = lakeBot + 8 + ((i * 13.7) % (h - lakeBot - 12));
      const sway = Math.sin(t * 0.0008 + i * 0.7) * 1.2;
      ctx.beginPath();
      ctx.moveTo(px, py + 4);
      ctx.quadraticCurveTo(px + sway, py, px + sway * 1.4, py - 4);
      ctx.stroke();
    }
    // brighter grass highlights
    ctx.strokeStyle = 'rgba(170, 215, 110, 0.35)';
    for (let i = 0; i < 120; i++) {
      const px = ((i * 0.1117 + 0.41) % 1) * w;
      const py = lakeBot + 14 + ((i * 19.3) % (h - lakeBot - 16));
      const sway = Math.sin(t * 0.0009 + i * 1.1) * 1.0;
      ctx.beginPath();
      ctx.moveTo(px, py + 3);
      ctx.quadraticCurveTo(px + sway, py, px + sway * 1.3, py - 3);
      ctx.stroke();
    }
    ctx.restore();

    // ——— 8. SCATTERED MEADOW FLOWERS (decorative, not the user's flowers)
    // pinks, whites, yellows dotted across the foreground
    ctx.save();
    const flowerColors = [
      'rgba(255, 165, 200, 0.85)',  // pink
      'rgba(255, 200, 220, 0.80)',  // light pink
      'rgba(255, 240, 245, 0.75)',  // white
      'rgba(255, 230, 130, 0.78)',  // yellow
      'rgba(225, 130, 175, 0.80)',  // magenta
    ];
    for (let i = 0; i < 95; i++) {
      const px = ((i * 0.0537 + 0.07) % 1) * w;
      const py = lakeBot + 6 + ((i * 7.3) % (h - lakeBot - 8));
      const r = 1.6 + ((i * 3) % 4) * 0.6;
      const wobble = Math.sin(t * 0.0011 + i * 0.6) * 0.6;
      ctx.fillStyle = flowerColors[i % flowerColors.length];
      ctx.beginPath();
      ctx.arc(px + wobble, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // a denser band of pinks near the shoreline (matches reference)
    for (let i = 0; i < 70; i++) {
      const px = ((i * 0.0913 + 0.03) % 1) * w;
      const py = lakeBot - 4 + ((i * 4.1) % 28);
      const wobble = Math.sin(t * 0.0012 + i * 0.5) * 0.5;
      ctx.fillStyle = i % 2 === 0
        ? 'rgba(255, 150, 195, 0.88)'
        : 'rgba(255, 215, 230, 0.78)';
      ctx.beginPath();
      ctx.arc(px + wobble, py, 1.8 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ——— 9. SOFT ATMOSPHERIC HAZE near horizon
    ctx.save();
    const haze = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 30);
    haze.addColorStop(0,   'rgba(255, 255, 255, 0)');
    haze.addColorStop(0.5, 'rgba(230, 240, 235, 0.20)');
    haze.addColorStop(1,   'rgba(255, 255, 255, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizonY - 30, w, 60);
    ctx.restore();
  }

  // soft cumulus cloud — drawn from overlapping ellipses, with bright top + shaded bottom
  _drawCloud(ctx, w, h, nx, ny, scale, alpha) {
    const cx = nx * w;
    const cy = ny * h;
    const baseR = w * 0.06 * scale;
    if (cx + baseR * 3 < -50 || cx - baseR * 3 > w + 50) return; // off-screen cull

    ctx.save();
    // shadow underside (very soft)
    ctx.fillStyle = `rgba(180, 200, 215, ${0.35 * alpha})`;
    const puffs = [
      { dx: -1.6, dy:  0.35, r: 0.85 },
      { dx: -0.6, dy:  0.50, r: 0.95 },
      { dx:  0.5, dy:  0.45, r: 1.00 },
      { dx:  1.5, dy:  0.30, r: 0.80 },
    ];
    for (const p of puffs) {
      ctx.beginPath();
      ctx.ellipse(cx + p.dx * baseR, cy + p.dy * baseR * 0.5 + 4, baseR * p.r, baseR * p.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // mid body (off-white)
    ctx.fillStyle = `rgba(245, 250, 252, ${0.92 * alpha})`;
    const body = [
      { dx: -1.5, dy:  0.10, r: 0.82 },
      { dx: -0.5, dy: -0.10, r: 1.05 },
      { dx:  0.6, dy: -0.05, r: 1.10 },
      { dx:  1.4, dy:  0.10, r: 0.78 },
    ];
    for (const p of body) {
      ctx.beginPath();
      ctx.ellipse(cx + p.dx * baseR, cy + p.dy * baseR, baseR * p.r, baseR * p.r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // bright top highlight
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
    const top = [
      { dx: -0.9, dy: -0.40, r: 0.55 },
      { dx:  0.0, dy: -0.55, r: 0.70 },
      { dx:  0.9, dy: -0.40, r: 0.55 },
    ];
    for (const p of top) {
      ctx.beginPath();
      ctx.ellipse(cx + p.dx * baseR, cy + p.dy * baseR, baseR * p.r, baseR * p.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // mountain range: jagged silhouette with snow caps
  _drawMountainRange(ctx, w, h, horizonY, opts) {
    const { seed, peaks, baseY, heightRange, rockColor, shadowColor, snowColor, snowLine, span } = opts;
    const [x0n, x1n] = span;
    const x0 = x0n * w;
    const x1 = x1n * w;
    const totalSpan = x1 - x0;

    // pseudo-random per peak (deterministic so it doesn't shimmer between frames)
    const rand = (i, salt = 0) => {
      const s = Math.sin((i + 1) * 12.9898 + seed * 78.233 + salt * 37.719) * 43758.5453;
      return s - Math.floor(s);
    };

    // build peak points
    const points = [];
    for (let i = 0; i <= peaks; i++) {
      const px = x0 + (i / peaks) * totalSpan + (rand(i, 1) - 0.5) * (totalSpan / peaks) * 0.6;
      const peakHFrac = heightRange[0] + rand(i, 2) * (heightRange[1] - heightRange[0]);
      const py = baseY - peakHFrac * h;
      points.push({ x: px, y: py });
    }

    ctx.save();

    // ——— rock body
    ctx.fillStyle = rockColor;
    ctx.beginPath();
    ctx.moveTo(x0, baseY);
    // walk peaks with little ridge bumps between them
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) {
        ctx.lineTo(p.x, p.y);
      } else {
        const prev = points[i - 1];
        // valley between peaks
        const valleyX = (prev.x + p.x) / 2 + (rand(i, 5) - 0.5) * 18;
        const valleyY = Math.max(prev.y, p.y) + 30 + rand(i, 6) * 40;
        ctx.lineTo(valleyX, valleyY);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.lineTo(x1, baseY);
    ctx.closePath();
    ctx.fill();

    // ——— shadow side (darker right slope of each peak)
    ctx.fillStyle = shadowColor;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const next = points[i + 1];
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      // shadow goes down-right of peak
      const sx = p.x + 18 + rand(i, 7) * 12;
      const sy = p.y + 35 + rand(i, 8) * 25;
      ctx.lineTo(sx, sy);
      const bx = p.x + 4;
      const by = baseY;
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fill();
    }

    // ——— snow caps: small jagged white triangles on top of each peak
    ctx.fillStyle = snowColor;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const peakH = baseY - p.y;
      const snowH = peakH * (1 - snowLine);
      if (snowH < 8) continue;

      const snowBaseY = p.y + snowH;
      const snowSpread = 14 + rand(i, 9) * 18;

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      // jagged left edge down
      const jagL1x = p.x - snowSpread * 0.3;
      const jagL1y = p.y + snowH * 0.35;
      const jagL2x = p.x - snowSpread * 0.6;
      const jagL2y = p.y + snowH * 0.7;
      const jagL3x = p.x - snowSpread;
      const jagL3y = snowBaseY;
      ctx.lineTo(jagL1x, jagL1y);
      ctx.lineTo(jagL2x, jagL2y);
      ctx.lineTo(jagL3x, jagL3y);
      // bumpy bottom edge across
      const steps = 5;
      for (let s = 1; s <= steps; s++) {
        const tt = s / steps;
        const bx = jagL3x + tt * (snowSpread * 2);
        const by = snowBaseY + (rand(i * 7 + s, 10) - 0.5) * 6;
        ctx.lineTo(bx, by);
      }
      // jagged right edge back up
      const jagR1x = p.x + snowSpread * 0.6;
      const jagR1y = p.y + snowH * 0.65;
      const jagR2x = p.x + snowSpread * 0.25;
      const jagR2y = p.y + snowH * 0.3;
      ctx.lineTo(jagR1x, jagR1y);
      ctx.lineTo(jagR2x, jagR2y);
      ctx.closePath();
      ctx.fill();

      // tiny snow runs trickling down the rocks
      ctx.strokeStyle = snowColor;
      ctx.lineWidth = 1.2;
      for (let r = 0; r < 3; r++) {
        const sx = p.x + (rand(i * 11 + r, 11) - 0.5) * snowSpread * 1.4;
        const sy = snowBaseY + rand(i * 11 + r, 12) * 8;
        const ex = sx + (rand(i * 11 + r, 13) - 0.5) * 6;
        const ey = sy + 14 + rand(i * 11 + r, 14) * 18;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // a small flower-covered island in the lake
  _drawIsland(ctx, w, h, nx, ny, wFrac, hFrac, t) {
    const cx = nx * w;
    const cy = ny * h;
    const rx = wFrac * w;
    const ry = hFrac * h;

    ctx.save();
    // grass body
    const grad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
    grad.addColorStop(0,   '#7fc056');
    grad.addColorStop(0.5, '#6db248');
    grad.addColorStop(1,   '#3d6a99');  // blends into water at edge
    ctx.fillStyle = '#6db248';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // dark waterline shadow under island (where it meets water)
    ctx.fillStyle = 'rgba(20, 50, 70, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.7, rx * 1.05, ry * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // re-draw grass top half over the shadow so only bottom shows
    ctx.fillStyle = '#6db248';
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.1, rx * 0.98, ry * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // pink flower dots scattered on the island
    const flowerCount = Math.max(8, Math.floor(rx * 0.6));
    for (let i = 0; i < flowerCount; i++) {
      const ang = (i * 2.39) % (Math.PI * 2);
      const radius = Math.sqrt((i * 0.137) % 1) * 0.85;
      const fx = cx + Math.cos(ang) * rx * radius;
      const fy = cy - ry * 0.15 + Math.sin(ang) * ry * radius * 0.7;
      const wobble = Math.sin(t * 0.001 + i * 0.7) * 0.4;
      ctx.fillStyle = i % 3 === 0
        ? 'rgba(255, 230, 245, 0.9)'
        : (i % 3 === 1 ? 'rgba(255, 160, 200, 0.9)' : 'rgba(255, 200, 220, 0.85)');
      ctx.beginPath();
      ctx.arc(fx + wobble, fy, 1.6 + (i % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawHeroForest(ctx, w, h, t) {
    const glowPulse = 0.88 + Math.sin(t * 0.00085) * 0.12;
    const caps = [
      { x: 0.12, y: 0.20, rx: 0.15, ry: 0.055, stem: 0.22, c: [255, 82, 245], p: 0.0 },
      { x: 0.30, y: 0.10, rx: 0.13, ry: 0.070, stem: 0.29, c: [218, 105, 255], p: 1.2 },
      { x: 0.57, y: 0.27, rx: 0.18, ry: 0.060, stem: 0.23, c: [255, 92, 225], p: 2.1 },
      { x: 0.82, y: 0.37, rx: 0.12, ry: 0.040, stem: 0.14, c: [170, 98, 255], p: 3.3 },
    ];

    ctx.save();
    const pullBack = smoothstep(5000, 8500, t);
    const sceneScale = lerp(1, 0.58, pullBack);
    ctx.translate(w * 0.5, h * (-0.02 - pullBack * 0.38));
    ctx.scale(sceneScale, sceneScale);
    ctx.translate(-w * 0.5, -h * 0.14);

    // Tall organic silhouettes in front of the haze.
    ctx.strokeStyle = 'rgba(1, 7, 16, 0.74)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const x = (i / 17) * w + Math.sin(i * 1.9) * 28;
      const top = -30;
      const bottom = h * (0.82 + (i % 5) * 0.035);
      ctx.lineWidth = 3 + (i % 4) * 2.3;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.bezierCurveTo(
        x + Math.sin(i) * 38,
        h * 0.25,
        x - Math.cos(i * 0.7) * 46,
        h * 0.56,
        x + Math.sin(t * 0.00035 + i) * 16,
        bottom
      );
      ctx.stroke();
    }

    // Oversized glowing canopy blooms.
    for (const cap of caps) {
      const cx = cap.x * w;
      const cy = cap.y * h;
      const rx = cap.rx * w * (0.96 + Math.sin(t * 0.0005 + cap.p) * 0.035);
      const ry = cap.ry * h;
      const stemBottom = cy + cap.stem * h;
      const [r, g, b] = cap.c;

      ctx.save();

      // Soft magenta light plume.
      ctx.globalCompositeOperation = 'lighter';
      let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 1.45);
      grad.addColorStop(0, `rgba(255,245,255,${0.32 * glowPulse})`);
      grad.addColorStop(0.18, `rgba(${r},${g},${b},${0.42 * glowPulse})`);
      grad.addColorStop(0.58, `rgba(${r},${g},${b},${0.13 * glowPulse})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.55, ry * 4.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cap body with visible rim.
      grad = ctx.createRadialGradient(cx, cy + ry * 0.35, 0, cx, cy, rx);
      grad.addColorStop(0, `rgba(255,245,255,${0.58 * glowPulse})`);
      grad.addColorStop(0.2, `rgba(${r},${g},${b},${0.82})`);
      grad.addColorStop(0.72, `rgba(${Math.round(r * 0.55)},${Math.round(g * 0.42)},${Math.round(b * 0.85)},0.60)`);
      grad.addColorStop(1, 'rgba(35, 15, 78, 0.58)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 210, 255, ${0.38 * glowPulse})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Jellyfish-like glowing underside and tendrils.
      grad = ctx.createLinearGradient(cx, cy, cx, stemBottom);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.48)`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},0.22)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 1.2, rx * 0.32, cap.stem * h * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 15; i++) {
        const u = (i / 14 - 0.5);
        const x0 = cx + u * rx * 1.34;
        const len = cap.stem * h * (0.45 + (i % 5) * 0.12);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.26 + (i % 3) * 0.04})`;
        ctx.lineWidth = 1.4 + (i % 4) * 0.45;
        ctx.beginPath();
        ctx.moveTo(x0, cy + ry * 0.35);
        ctx.bezierCurveTo(
          x0 + Math.sin(t * 0.001 + i) * 10,
          cy + len * 0.26,
          x0 - Math.cos(t * 0.0008 + i) * 13,
          cy + len * 0.68,
          x0 + Math.sin(i * 1.7) * 7,
          cy + len
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    // Cyan bioluminescent seed-lamps scattered through the forest.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const x = ((i * 0.318) % 1) * w;
      const y = h * (0.12 + ((i * 0.217) % 0.62));
      const sway = Math.sin(t * 0.0012 + i) * 8;
      const size = 5 + (i % 5) * 1.6;
      const a = 0.46 + Math.sin(t * 0.0018 + i) * 0.16;

      ctx.strokeStyle = `rgba(111,255,238,${a * 0.55})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + sway, y);
      for (let k = 0; k < 4; k++) {
        const ang = -Math.PI / 2 + (k - 1.5) * 0.48;
        ctx.moveTo(x + sway, y);
        ctx.quadraticCurveTo(
          x + sway + Math.cos(ang) * size * 1.2,
          y + Math.sin(ang) * size * 1.0,
          x + sway + Math.cos(ang) * size * 2.2,
          y + Math.sin(ang) * size * 2.2
        );
      }
      ctx.stroke();

      const lamp = ctx.createRadialGradient(x + sway, y, 0, x + sway, y, size * 4.2);
      lamp.addColorStop(0, `rgba(200,255,248,${a})`);
      lamp.addColorStop(0.34, `rgba(80,245,255,${a * 0.28})`);
      lamp.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(x + sway, y, size * 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawAtmosphere(ctx, w, h, t) {
    const pulse = 0.5 + Math.sin(t * 0.0007) * 0.5;
    const glow = this.bloom * 0.45 + this.harmony * 0.35;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#070719');
    bg.addColorStop(0.42, '#111034');
    bg.addColorStop(0.74, '#071c2c');
    bg.addColorStop(1, '#041114');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    let g = ctx.createRadialGradient(w * 0.52, h * 0.66, 0, w * 0.52, h * 0.66, Math.max(w, h) * 0.72);
    g.addColorStop(0, `rgba(87, 255, 220, ${0.08 + glow * 0.20})`);
    g.addColorStop(0.32, `rgba(117, 113, 255, ${0.05 + glow * 0.16})`);
    g.addColorStop(0.72, `rgba(96, 24, 145, ${0.04 + pulse * glow * 0.07})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    g = ctx.createRadialGradient(w * 0.18, h * 0.84, 0, w * 0.18, h * 0.84, Math.min(w, h) * 0.58);
    g.addColorStop(0, `rgba(70, 255, 170, ${0.06 + this.density * 0.12})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    g = ctx.createRadialGradient(w * 0.86, h * 0.34, 0, w * 0.86, h * 0.34, Math.min(w, h) * 0.48);
    g.addColorStop(0, `rgba(205, 130, 255, ${0.07 + this.harmony * 0.14})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();

    const vignette = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  drawDistantFlora(ctx, w, h, t) {
    const a = 0.52 + this.density * 0.36;
    const bases = [
      { x: 0.08, y: 0.42, s: 0.50, c: [80, 255, 210], p: 0.0 },
      { x: 0.92, y: 0.39, s: 0.58, c: [185, 110, 255], p: 1.7 },
      { x: 0.35, y: 0.44, s: 0.44, c: [255, 155, 220], p: 3.2 },
      { x: 0.68, y: 0.43, s: 0.46, c: [120, 210, 255], p: 4.4 },
    ];

    for (const f of bases) {
      const sway = Math.sin(t * 0.00055 + f.p) * 10 * f.s;
      const x = w * f.x;
      const y = h * f.y;
      const stemH = h * 0.18 * f.s;
      const headY = y - stemH;
      const headR = Math.min(w, h) * 0.055 * f.s * (1 + this.harmony * 0.35);
      const [r, g, b] = f.c;

      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = `rgba(7, 20, 28, ${0.70})`;
      ctx.lineWidth = 12 * f.s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y + 20);
      ctx.bezierCurveTo(x + sway * 0.3, y - stemH * 0.35, x + sway, y - stemH * 0.72, x + sway * 0.55, headY);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(x + sway * 0.55, headY, 0, x + sway * 0.55, headY, headR * 3.7);
      halo.addColorStop(0, `rgba(${r},${g},${b},${0.20 + this.bloom * 0.20})`);
      halo.addColorStop(0.45, `rgba(${r},${g},${b},${0.07 + this.harmony * 0.10})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x + sway * 0.55, headY, headR * 3.7, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2 + Math.sin(t * 0.00035 + f.p) * 0.25;
        ctx.fillStyle = `rgba(${r},${g},${b},${0.16 + this.density * 0.13})`;
        ctx.beginPath();
        ctx.ellipse(
          x + sway * 0.55 + Math.cos(ang) * headR * 0.65,
          headY + Math.sin(ang) * headR * 0.42,
          headR * 0.28,
          headR * 1.08,
          ang,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawCanopyMushrooms(ctx, w, h, t) {
    const forms = [
      { x: 0.10, y: 0.11, w: 0.16, h: 0.040, drop: 0.08, c: [238, 87, 255], p: 0.2 },
      { x: 0.26, y: 0.05, w: 0.13, h: 0.050, drop: 0.11, c: [213, 95, 255], p: 1.4 },
      { x: 0.58, y: 0.14, w: 0.17, h: 0.044, drop: 0.09, c: [246, 93, 230], p: 2.5 },
      { x: 0.86, y: 0.22, w: 0.11, h: 0.030, drop: 0.06, c: [182, 85, 255], p: 3.8 },
    ];

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const m of forms) {
      const breathe = 0.86 + Math.sin(t * 0.00065 + m.p) * 0.08 + this.harmony * 0.16;
      const cx = m.x * w;
      const cy = m.y * h;
      const rx = m.w * w * breathe;
      const ry = m.h * h * breathe;
      const [r, g, b] = m.c;
      const glow = 0.30 + this.bloom * 0.26 + this.harmony * 0.18;

      const halo = ctx.createRadialGradient(cx, cy + ry * 0.1, 0, cx, cy + ry * 0.1, rx * 1.15);
      halo.addColorStop(0, `rgba(${r},${g},${b},${glow})`);
      halo.addColorStop(0.48, `rgba(${r},${g},${b},${glow * 0.34})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.12, ry * 3.3, 0, 0, Math.PI * 2);
      ctx.fill();

      const cap = ctx.createRadialGradient(cx, cy + ry * 0.35, ry * 0.2, cx, cy, rx);
      cap.addColorStop(0, `rgba(255,245,255,${0.38 + this.harmony * 0.16})`);
      cap.addColorStop(0.22, `rgba(${r},${g},${b},${0.50 + this.bloom * 0.20})`);
      cap.addColorStop(1, `rgba(54, 18, 94, ${0.28 + this.density * 0.12})`);
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.quadraticCurveTo(cx, cy + ry * 1.05, cx - rx, cy);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 210, 255, ${0.24 + this.harmony * 0.16})`;
      ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        const x = cx + (i / 5) * rx * 0.72;
        ctx.beginPath();
        ctx.moveTo(x, cy + ry * 0.2);
        ctx.quadraticCurveTo(cx + i * 4, cy + ry * 0.8, cx + i * 2, cy + m.drop * h);
        ctx.stroke();
      }

      for (let i = 0; i < 12; i++) {
        const a = (i / 11 - 0.5) * Math.PI;
        const x = cx + Math.sin(a) * rx * 0.88;
        const len = h * m.drop * (0.35 + (i % 4) * 0.12);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.24 + this.bloom * 0.16})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, cy + ry * 0.45);
        ctx.bezierCurveTo(
          x + Math.sin(t * 0.0008 + i) * 8,
          cy + len * 0.28,
          x - Math.cos(t * 0.0007 + i) * 9,
          cy + len * 0.70,
          x + Math.sin(i) * 4,
          cy + len
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawVines(ctx, w, h, t) {
    const vineCount = 12 + Math.floor(this.density * 10);
    ctx.save();
    ctx.lineCap = 'round';

    for (let i = 0; i < vineCount; i++) {
      const x0 = (i / Math.max(1, vineCount - 1)) * w + Math.sin(i * 2.1) * 44;
      const drop = h * (0.12 + ((i * 0.15) % 0.24)) * (0.62 + this.density * 0.38);
      const phase = t * 0.00055 + i * 1.4;
      ctx.strokeStyle = `rgba(3, 12, 20, ${0.55 + this.density * 0.26})`;
      ctx.lineWidth = 4 + (i % 3) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, -20);
      for (let y = -20; y <= drop; y += 42) {
        const x = x0 + Math.sin(y * 0.012 + phase) * (18 + i * 0.9);
        if (y === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(88, 255, 218, ${0.10 + this.harmony * 0.08})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  drawBellClusters(ctx, w, h, t) {
    const count = 34 + Math.floor(this.density * 22);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < count; i++) {
      const clusterX = ((i * 0.173) % 1) * w;
      const clusterY = h * (0.05 + ((i * 0.097) % 0.34));
      const scale = 0.65 + ((i * 29) % 9) * 0.08;
      const sway = Math.sin(t * 0.001 + i) * 7;
      const alpha = 0.34 + this.bloom * 0.24 + this.harmony * 0.16;

      ctx.strokeStyle = `rgba(100, 255, 230, ${alpha * 0.65})`;
      ctx.lineWidth = 0.8;
      for (let j = 0; j < 5; j++) {
        const ang = -Math.PI / 2 + (j - 2) * 0.34;
        const len = 18 * scale + j * 2;
        const x2 = clusterX + sway + Math.cos(ang) * len;
        const y2 = clusterY + Math.sin(ang) * len;
        ctx.beginPath();
        ctx.moveTo(clusterX + sway * 0.4, clusterY);
        ctx.quadraticCurveTo((clusterX + x2) / 2 + Math.sin(t * 0.0012 + j + i) * 5, (clusterY + y2) / 2, x2, y2);
        ctx.stroke();

        const glow = ctx.createRadialGradient(x2, y2, 0, x2, y2, 9 * scale);
        glow.addColorStop(0, `rgba(160,255,245,${alpha})`);
        glow.addColorStop(0.45, `rgba(70,235,255,${alpha * 0.22})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x2, y2, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawCaustics(ctx, w, h, t) {
    const alpha = 0.05 + this.bloom * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(125, 220, 255, ${alpha})`;
    ctx.lineWidth = 0.7;

    for (let band = 0; band < 8; band++) {
      const yBase = h * (0.16 + band * 0.095);
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 18) {
        const y = yBase
          + Math.sin(x * 0.012 + t * 0.00065 + band) * (8 + this.harmony * 9)
          + Math.sin(x * 0.026 - t * 0.00042) * 4;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  drawHarmonicRings(ctx, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const ring of this.harmonicRings) {
      const life = clamp01(ring.life / 5200);
      const [r, g, b] = ring.color;
      const x = ring.x * w;
      const y = ring.y * h;
      const alpha = Math.sin(life * Math.PI) * (0.18 + this.harmony * 0.22);

      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(x, y, ring.r, ring.r * 0.30, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.28})`;
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.ellipse(x, y, ring.r * 1.42, ring.r * 0.43, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawSpores(ctx, w, h, t) {
    const visible = 0.45 + this.density * 0.62 + this.harmony * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.spores.length; i++) {
      const s = this.spores[i];
      const [r, g, b] = s.color;
      const twinkle = 0.45 + Math.sin(t * 0.0015 + s.phase) * 0.35;
      const x = s.x * w;
      const y = s.y * h;
      const radius = s.r * (0.9 + this.harmony * 0.7);
      const alpha = visible * (0.25 + twinkle * 0.55);

      const g1 = ctx.createRadialGradient(x, y, 0, x, y, radius * 7);
      g1.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      g1.addColorStop(0.42, `rgba(${r},${g},${b},${alpha * 0.18})`);
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(x, y, radius * 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawLivingGround(ctx, w, h, t) {
    const baseY = h * 0.89;
    ctx.save();

    const mound = ctx.createLinearGradient(0, baseY, 0, h);
    mound.addColorStop(0, 'rgba(5, 15, 25, 0.25)');
    mound.addColorStop(0.28, 'rgba(4, 11, 18, 0.78)');
    mound.addColorStop(1, 'rgba(2, 5, 10, 0.92)');
    ctx.fillStyle = mound;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY + 34);
    for (let x = 0; x <= w; x += 32) {
      const y = baseY
        + Math.sin(x * 0.011 + t * 0.00035) * 18
        + Math.sin(x * 0.027 - t * 0.00022) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    const patches = 70 + Math.floor(this.density * 45);
    for (let i = 0; i < patches; i++) {
      const x = ((i * 0.071 + 0.13) % 1) * w;
      const y = baseY + 12 + ((i * 37) % 120);
      const r = 7 + (i % 6) * 3;
      const color = i % 3 === 0 ? [115, 255, 210] : i % 3 === 1 ? [175, 120, 255] : [85, 190, 255];
      const pulse = 0.35 + Math.sin(t * 0.001 + i) * 0.22;
      ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${(0.08 + this.bloom * 0.07) * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.7, r * 0.55, Math.sin(i) * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawForegroundMist(ctx, w, h, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const y = h * (0.68 + i * 0.075);
      const alpha = 0.025 + this.bloom * 0.026;
      ctx.strokeStyle = `rgba(${90 + i * 22}, ${145 + i * 12}, 255, ${alpha})`;
      ctx.lineWidth = 18 + i * 8;
      ctx.beginPath();
      for (let x = -80; x <= w + 80; x += 36) {
        const yy = y + Math.sin(x * 0.008 + t * 0.00035 + i * 1.7) * (14 + i * 3);
        if (x === -80) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
