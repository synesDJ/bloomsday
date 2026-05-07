// Hummingbird — flies in from right, hovers near newest bloomed flower, exits left
// drawn in canvas (no image asset required)

export class Hummingbird {
  constructor() {
    this.active = false;
    this.phase = 'idle';     // idle | enter | hover | exit
    this.x = 0; this.y = 0;
    this.targetX = 0; this.targetY = 0;
    this.hoverTimer = 0;
    this.wingPhase = 0;
    this.canvasW = 0;
    this.canvasH = 0;
  }

  setBounds(w, h) { this.canvasW = w; this.canvasH = h; }

  visit(flower) {
    if (this.active) return;
    this.active = true;
    this.phase = 'enter';
    this.x = this.canvasW + 80;
    this.y = this.canvasH * (0.3 + Math.random() * 0.15);
    const fx = flower.x;
    const fy = flower.groundY - flower.stemLength - flower.targetSize * 1.8;
    this.targetX = fx + 25;
    this.targetY = fy;
    this.hoverTimer = 0;
    this.onBloomPause = null;
    this.currentFlower = flower;
  }

  onHoverComplete(cb) { this.onBloomPause = cb; }

  update(dt) {
    if (!this.active) return;
    this.wingPhase += dt * 0.04;

    if (this.phase === 'enter') {
      this.x += (this.targetX - this.x) * 0.04;
      this.y += (this.targetY - this.y) * 0.04;
      if (Math.abs(this.x - this.targetX) < 3 && Math.abs(this.y - this.targetY) < 3) {
        this.phase = 'hover';
      }
    } else if (this.phase === 'hover') {
      this.hoverTimer += dt;
      // small bob
      this.x = this.targetX + Math.sin(this.hoverTimer * 0.005) * 3;
      this.y = this.targetY + Math.cos(this.hoverTimer * 0.004) * 2;
      if (this.hoverTimer === dt || Math.abs(this.hoverTimer - dt) < 16) {
        if (this.onBloomPause) this.onBloomPause(this.currentFlower);
      }
      if (this.hoverTimer > 3000) this.phase = 'exit';
    } else if (this.phase === 'exit') {
      this.x -= 1.2 * dt * 0.06;
      this.y -= 0.5 * dt * 0.06;
      if (this.x < -100) {
        this.active = false;
        this.phase = 'idle';
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const bob = Math.sin(this.wingPhase * 0.8) * 2;
    const wing = Math.sin(this.wingPhase) * 6;

    ctx.save();
    ctx.translate(this.x, this.y + bob);

    // body (green iridescent)
    ctx.fillStyle = 'rgba(90, 170, 110, 0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.fillStyle = 'rgba(120, 200, 140, 0.95)';
    ctx.beginPath();
    ctx.arc(8, -1, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // throat ruby
    ctx.fillStyle = 'rgba(200, 80, 90, 0.85)';
    ctx.beginPath();
    ctx.arc(9, 1.5, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.strokeStyle = 'rgba(20, 30, 18, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(11, -1); ctx.lineTo(18, -0.5); ctx.stroke();

    // tail
    ctx.fillStyle = 'rgba(60, 120, 80, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-18, -3);
    ctx.lineTo(-18, 3);
    ctx.closePath();
    ctx.fill();

    // wings (fast blur via multiple alphas)
    ctx.fillStyle = 'rgba(230, 240, 235, 0.25)';
    ctx.beginPath();
    ctx.ellipse(-1, -5 + wing * 0.5, 10, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(230, 240, 235, 0.15)';
    ctx.beginPath();
    ctx.ellipse(-1, -5 - wing * 0.5, 10, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
