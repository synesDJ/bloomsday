# a common bloom — build skill

## project identity
name: **a common bloom**
tagline: *a shared digital garden grown by hands*
concept: communal gesture-driven web experience where visitors grow glowing flowers using webcam hand tracking. every flower adds a musical phrase to a shared evolving song. planting triggers a hummingbird visit; hugging yourself unlocks a fortune scroll.

---

## design tokens (use these everywhere, never deviate)

### colors
```css
/* backgrounds — 5 depth levels */
--bg-void:    #0a1209;
--bg-deep:    #0d1a12;   /* main page background */
--bg-surface: #111f16;   /* panels, cards */
--bg-card:    #162b1c;   /* hover states */
--bg-border:  #1e3326;   /* all borders */

/* text */
--text-primary:   #c8dfc0;
--text-secondary: #8aad90;
--text-muted:     #5a7860;
--text-label:     #3a6645;

/* flowers — bright pastel, always on dark */
--flower-cherry:    #ffb8d4;   /* cherry blossom */
--flower-iris:      #ff9e80;   /* iris */
--flower-lotus:     #a8d8ff;   /* lotus */
--flower-wild:      #a8f5a0;   /* wildflower */
--flower-dandelion: #fff080;   /* dandelion */
```

### typography
```css
/* always import both */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Mono:wght@300;400&display=swap');

font-family: 'Cormorant Garamond', serif;  /* display, headings, fortune text */
font-family: 'DM Mono', monospace;          /* ui, labels, metadata, hex */

/* weights: 300 only for display. 300/400 for mono. never bold. */
/* fortune text is always italic */
```

### borders
```css
border: 0.5px solid #1e3326;               /* standard */
border: 0.5px solid rgba(255,184,212,0.2); /* flower-tinted card */
```

---

## flower rendering rules

### glow effect (apply to ALL flowers)
```js
// 1. outer ambient glow (radial gradient)
const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, size * 2.5);
grad.addColorStop(0, `rgba(R,G,B, ${hovered ? 0.55 : 0.18})`);
grad.addColorStop(1, `rgba(R,G,B, 0)`);
ctx.fillStyle = grad; ctx.fill();

// 2. petal fill — always translucent
ctx.fillStyle = `rgba(R,G,B, 0.65)`;

// 3. petal stroke — slightly more opaque than fill
ctx.strokeStyle = `rgba(R,G,B, 0.85)`;
ctx.lineWidth = 0.4;

// glow states: rest=0.18, hover=0.35, bloom=0.55, picked=0.7 (double ring)
```

### sway (every flower must sway)
```js
this.swayOffset = Math.random() * Math.PI * 2;
this.swaySpeed  = 0.007 + Math.random() * 0.005;
const sway = Math.sin(t * this.swaySpeed + this.swayOffset) * 3.5;
// apply sway to stem + flower head x position
```

### stem
```js
ctx.beginPath();
ctx.moveTo(x + sway, groundY);
ctx.quadraticCurveTo(
  x + sway * 0.5 + stemCurve * 25,
  groundY - stemLength * 0.5,
  x + sway * 0.2,
  groundY - stemLength
);
ctx.strokeStyle = `rgba(70, 130, 60, 0.75)`;
ctx.lineWidth = 1.3;
```

### 5 flower shapes

**cherry blossom** — `#ffb8d4`
- 5 petals: ellipse per petal, rotate around center, notch at tip (small circle at petal end)
- 10 stamens: short lines radiating, dot tip, color `rgba(255,230,200,0.9)`
- center: circle `rgba(255,220,200,0.9)`
- particles: tiny petals drift down-left at 0.3px/frame

**iris** — `#ff9e80`
- 3 drooping falls: bezier curve downward, wide
- 3 upright standards: narrow ellipses pointing up, offset +60° from falls
- center: yellow-gold dot `rgba(255,200,140,0.9)`
- particles: slow ember drift, orange-red flecks

**lotus** — `#a8d8ff`
- 3 concentric rings: ring 0 = 6 petals at r*0.45, ring 1 = 8 at r*0.73, ring 2 = 10 at r*1.0
- each ring rotated slightly (0.35 rad per layer) + slow counter-rotation animation
- petal alpha increases per layer (inner most opaque)
- center: gold `rgba(220,190,100,0.9)`
- particles: sparkle dots, water-blue, orbit slowly

**wildflower** — `#a8f5a0`
- 7 petals: uneven sizes (±15% random variance per petal)
- stamen dome: large center circle `rgba(60,180,80,0.9)` with yellow dot core
- rough petal edges: add slight noise to ellipse control points
- particles: pollen dust — tiny yellow dots scatter upward

**dandelion** — `#fff080`
- 32–40 filaments: lines from center to radius * 1.4, slight wobble per filament
- tip sphere: small circle at each filament end (r=1.4)
- center: gold `rgba(200,180,60,0.9)`
- particles: seed wisps — long thin lines floating upward, rotating slowly

---

## audio rules

### pentatonic note assignment
```js
const PENTATONIC_NOTES = ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'];

// each flower gets a note based on its index within its type
function assignNote(flowerType, flowers) {
  const sameType = flowers.filter(f => f.type === flowerType);
  return PENTATONIC_NOTES[sameType.length % PENTATONIC_NOTES.length];
}
```

### instrument → flower mapping
```js
const INSTRUMENTS = {
  cherry_blossom: 'acoustic_grand_piano',
  iris:           'string_ensemble_1',
  lotus:          'pad_4_choir',       // or synthesize with MetalSynth
  wildflower:     'acoustic_guitar_nylon',
  dandelion:      'flute'
};
```

### sampler CDN base URLs (gleitz/midi-js-soundfonts)
```js
const BASE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/';
// append: instrument-mp3/  (e.g. acoustic_grand_piano-mp3/)
```

### layer management
```js
// first flower of each type → fade in that instrument layer
// volume rampTo 0 (from -Infinity) over 2s
// subsequent same-type flowers → add another note to that layer's loop
// hug moment → all active layers: volume +8dB for 2s, then restore
```

---

## gesture detection (mediapipe)

### setup
```js
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});
hands.setOptions({
  maxNumHands: 2, modelComplexity: 1,
  minDetectionConfidence: 0.7, minTrackingConfidence: 0.5
});
```

### pinch (plant)
```js
const thumb  = landmarks[4];
const index  = landmarks[8];
const dist   = Math.hypot(thumb.x - index.x, thumb.y - index.y);
const pinching = dist < 0.05;
```

### hug (fortune unlock)
```js
// requires 2 hands detected
const lWrist = results.multiHandLandmarks[0][0]; // left hand wrist
const rWrist = results.multiHandLandmarks[1][0];
// crossed: left wrist is right of center, right wrist is left of center
const hugging = lWrist.x > 0.52 && rWrist.x < 0.48;
```

### dwell select (flower type)
```js
// track hand position over swatch for 1.5s
if (handOverSwatch(landmarks, swatchBounds)) {
  dwellTimer += deltaTime;
  if (dwellTimer >= 1500) { selectFlower(swatchType); dwellTimer = 0; }
} else { dwellTimer = 0; }
```

---

## camera posterization
```js
function posterizeFrame(videoEl, canvasEl, flowerColor) {
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  const img = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
  const [fr, fg, fb] = hexToRgb(flowerColor); // light tone = flower color tinted
  for (let i = 0; i < img.data.length; i += 4) {
    const brightness = (img.data[i] + img.data[i+1] + img.data[i+2]) / 3;
    if (brightness > 128) {
      // light tone: tinted with current flower color
      img.data[i]   = Math.min(255, fr + 40);
      img.data[i+1] = Math.min(255, fg + 40);
      img.data[i+2] = Math.min(255, fb + 40);
    } else {
      // dark tone: forest background (blends in)
      img.data[i] = 13; img.data[i+1] = 26; img.data[i+2] = 18;
    }
  }
  ctx.putImageData(img, 0, 0);
}
```

---

## evolving background rules

```js
function updateBackground(flowers, ctx, t) {
  const cherryCount    = flowers.filter(f => f.type === 'cherry_blossom').length;
  const lotusCount     = flowers.filter(f => f.type === 'lotus').length;
  const dandelionCount = flowers.filter(f => f.type === 'dandelion').length;

  const treeAlpha  = Math.min(cherryCount / 3, 1);    // faint tree left side
  const pondAlpha  = Math.min(lotusCount / 3, 1);     // pond center-right + ripples
  const grassAlpha = Math.min(dandelionCount / 3, 1); // swaying grass ground
  const windAlpha  = Math.min(flowers.length / 8, 1); // wind bands

  // draw tree: recursive branch function, blossoms at tips
  // draw pond: ellipse, shimmer lines, ripple rings (animated dr)
  // draw grass: short quadratic curves, sin wobble
  // draw wind: slow horizontal sinusoidal bands drifting right
}
```

---

## firebase schema
```json
{
  "flowers": {
    "{id}": {
      "type": "cherry_blossom",
      "x": 0.42,
      "y": 0.81,
      "noteIndex": 3,
      "stemCurve": 0.18,
      "size": 26.4,
      "timestamp": 1745000000000
    }
  },
  "counts": {
    "cherry_blossom": 2841,
    "iris": 743,
    "lotus": 1203,
    "wildflower": 987,
    "dandelion": 512
  }
}
```

---

## fortune format (always include communal count)
```
"[fortune text]"

you + [N] others planted a [flower name] today
```
fortune is deterministic: `fortunes[type][noteIndex % fortunes[type].length]`

---

## ui component rules

### flower selector panel
- position: top-left, `background: #111f16`, border `0.5px solid #1e3326`
- title: Cormorant Garamond italic 16px `#8aad90` — *"pick your flower"*
- each swatch: oval shape (not circle), labeled below in DM Mono 9px
- selected state: swatch glow ring matching flower color
- dwell progress ring: thin arc draws around swatch over 1.5s

### fortune scroll
- parchment aesthetic: `background: #d4b47a`, aged texture via subtle horizontal lines
- rolled ends: darker rounded rects top + bottom
- text: Cormorant Garamond italic, dark brown `#3a2810`
- animation: scaleY from 0 → 1 over 0.6s, ease out back
- leaf decoration: small SVG leaf top-right corner

### hummingbird
- use provided illustrated asset (green/white/red ruby-throated)
- flight path: enters from right edge, arcs to hover above newest flower, pauses 3s, exits left
- wing flap: oscillate wing y position at 20hz (fast blur effect)
- trigger: fires when any flower reaches targetSize (fully bloomed)

---

## build order (phase 1 checklist)
- [ ] HTML skeleton: landing + garden pages, font imports
- [ ] canvas setup: resize handler, animation loop (requestAnimationFrame)
- [ ] FlowerBase class: sway, glow, stem, hitTest, update
- [ ] 5 flower subclasses: cherry blossom, iris, lotus, wildflower, dandelion
- [ ] particle system: per-type particles
- [ ] background layer: tree, pond, grass, wind
- [ ] flower selector panel (click version, no gestures yet)
- [ ] Tone.js audio: pentatonic note assignment, layer fade-in
- [ ] fortune scroll animation
- [ ] hummingbird trigger + flight
- [ ] MediaPipe hands: pinch plant, hug detect
- [ ] posterized camera feed
- [ ] Firebase sync

