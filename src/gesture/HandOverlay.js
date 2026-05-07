// HandOverlay — live per-hand labels + progress rings on the garden canvas
//
// Receives gesture frames from GestureDetector and renders, for each hand:
//   · a progress ring around the hand center
//   · a pointer line to a label badge
//   · a label badge showing the current gesture hint
//   · a central instruction banner spanning both hands when both are present
//
// Coordinates are MediaPipe-normalized (0..1); we translate using the current
// window size (screen-space, not device-pixels, because the garden ctx already
// has devicePixelRatio baked into its transform).

export class HandOverlay {
  constructor({ getSize }) {
    this.getSize = getSize;
    this.hands = [];
    this.gesture = null;
    this.matching = false;
    this.progress = 0;
    this.flowerColor = '#c8dfc0';
    // Per-hand labels keyed by side ('left' / 'right')
    this.leftLabel  = '';
    this.rightLabel = '';
  }

  update({ hands, gesture, matching, progress, flowerColor, leftLabel, rightLabel }) {
    this.hands = hands || [];
    this.gesture = gesture || null;
    this.matching = !!matching;
    this.progress = progress || 0;
    if (flowerColor) this.flowerColor = flowerColor;
    if (leftLabel  !== undefined) this.leftLabel  = leftLabel;
    if (rightLabel !== undefined) this.rightLabel = rightLabel;
  }

  draw(ctx) {
    if (!this.gesture) return;
    const { w, h } = this.getSize();
    if (this.hands.length === 0) {
      this._drawCenterPrompt(ctx, w, h, 'show both hands to begin');
      return;
    }
    if (this.hands.length === 1) {
      this._drawCenterPrompt(ctx, w, h, 'raise your other hand · ' + this.gesture.instruction);
    }

    // per-hand: use side-aware labels
    for (let i = 0; i < this.hands.length; i++) {
      const hand = this.hands[i];
      const c = hand[9]; // middle finger MCP ≈ hand center
      const x = c.x * w;
      const y = c.y * h;
      const side = (x < w / 2) ? 'left' : 'right';
      const label = side === 'left' ? (this.leftLabel || this.gesture.hint)
                                    : (this.rightLabel || this.gesture.hint);
      this._drawProgressRing(ctx, x, y);
      this._drawLabel(ctx, x, y, label, side);
      this._drawHandSkeleton(ctx, hand, w, h);
    }

    // instruction banner spans both hands
    if (this.hands.length >= 2) {
      this._drawInstructionBanner(ctx, w, h);
    }
  }

  _accentFill(alpha) {
    const c = this.flowerColor;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  _drawProgressRing(ctx, x, y) {
    const outerR = 36;
    ctx.save();
    // background ring
    ctx.strokeStyle = 'rgba(200, 223, 192, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.stroke();

    // progress arc
    if (this.progress > 0) {
      ctx.strokeStyle = this.matching ? this._accentFill(0.95) : 'rgba(200, 223, 192, 0.55)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, outerR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.progress);
      ctx.stroke();
    }

    // glow when matching
    if (this.matching) {
      const grad = ctx.createRadialGradient(x, y, outerR * 0.2, x, y, outerR * 1.8);
      grad.addColorStop(0, this._accentFill(0.25));
      grad.addColorStop(1, this._accentFill(0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, outerR * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawLabel(ctx, x, y, text, side) {
    ctx.save();
    ctx.font = 'italic 300 13px "Cormorant Garamond", serif';
    const padX = 10;
    const padY = 6;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;
    const boxH = 20;
    const boxY = y - 54;
    let boxX;
    let lineFrom, lineTo;
    if (side === 'left') {
      boxX = x - 56 - boxW;
      lineFrom = { x: x - 36, y };
      lineTo   = { x: boxX + boxW, y: boxY + boxH / 2 };
    } else {
      boxX = x + 56;
      lineFrom = { x: x + 36, y };
      lineTo   = { x: boxX, y: boxY + boxH / 2 };
    }

    // connector line
    ctx.strokeStyle = this.matching ? this._accentFill(0.8) : 'rgba(140, 170, 140, 0.55)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(lineFrom.x, lineFrom.y);
    ctx.lineTo(lineTo.x, lineTo.y);
    ctx.stroke();

    // box
    ctx.fillStyle = this.matching ? this._accentFill(0.92) : 'rgba(17, 31, 22, 0.85)';
    ctx.strokeStyle = this.matching ? this._accentFill(1) : 'rgba(58, 102, 69, 0.9)';
    ctx.lineWidth = 0.5;
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    // text
    ctx.fillStyle = this.matching ? '#0a1209' : '#c8dfc0';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + padX, boxY + boxH / 2 + 0.5);
    ctx.restore();
  }

  _drawHandSkeleton(ctx, lm, w, h) {
    const edges = [
      [0,1],[1,2],[2,3],[3,4],        // thumb
      [0,5],[5,6],[6,7],[7,8],        // index
      [5,9],[9,10],[10,11],[11,12],   // middle
      [9,13],[13,14],[14,15],[15,16], // ring
      [13,17],[17,18],[18,19],[19,20],// pinky
      [0,17],                         // palm
    ];
    ctx.save();
    ctx.strokeStyle = this.matching
      ? this._accentFill(0.55)
      : 'rgba(200, 223, 192, 0.22)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const [a, b] of edges) {
      const pa = lm[a], pb = lm[b];
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
    }
    ctx.stroke();
    // fingertip dots
    const tips = [4, 8, 12, 16, 20];
    ctx.fillStyle = this.matching ? this._accentFill(0.85) : 'rgba(200, 223, 192, 0.45)';
    for (const t of tips) {
      ctx.beginPath();
      ctx.arc(lm[t].x * w, lm[t].y * h, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawInstructionBanner(ctx, w, h) {
    if (!this.gesture) return;
    const hand0 = this.hands[0][9];
    const hand1 = this.hands[1][9];
    const midX = ((hand0.x + hand1.x) / 2) * w;
    const midY = ((hand0.y + hand1.y) / 2) * h - 96;

    const text = this.matching
      ? 'hold steady. growing…'
      : this.gesture.instruction;

    ctx.save();
    ctx.font = 'italic 300 16px "Cormorant Garamond", serif';
    const tw = ctx.measureText(text).width;
    const pad = 18;
    const boxW = tw + pad * 2;
    const boxH = 30;
    const boxX = midX - boxW / 2;
    const boxY = midY - boxH / 2;
    ctx.fillStyle = this.matching ? this._accentFill(0.22) : 'rgba(17, 31, 22, 0.7)';
    ctx.strokeStyle = this.matching ? this._accentFill(0.8) : 'rgba(58, 102, 69, 0.6)';
    ctx.lineWidth = 0.5;
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.matching ? '#0a1209' : '#c8dfc0';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + pad, boxY + boxH / 2 + 0.5);
    ctx.restore();
  }

  _drawCenterPrompt(ctx, w, h, text) {
    ctx.save();
    ctx.font = 'italic 300 17px "Cormorant Garamond", serif';
    const tw = ctx.measureText(text).width;
    const pad = 20;
    const boxW = tw + pad * 2;
    const boxH = 34;
    const boxX = (w - boxW) / 2;
    const boxY = h * 0.32;
    ctx.fillStyle = 'rgba(17, 31, 22, 0.82)';
    ctx.strokeStyle = 'rgba(58, 102, 69, 0.6)';
    ctx.lineWidth = 0.5;
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 17);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c8dfc0';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + pad, boxY + boxH / 2 + 0.5);
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y,     x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x,     y + h, rr);
    ctx.arcTo(x,     y + h, x,     y,     rr);
    ctx.arcTo(x,     y,     x + w, y,     rr);
    ctx.closePath();
  }
}
