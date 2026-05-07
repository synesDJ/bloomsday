# 🌸 a common bloom

> *a shared digital garden grown by hands — every visitor leaves a flower, every flower adds a voice*

## concept

a common bloom is a communal, gesture-driven web experience where visitors use their hands (via webcam + MediaPipe) to grow glowing flowers in a shared garden. every flower planted adds a new musical phrase to a collaborative, ever-evolving song. when a flower fully blooms, a hummingbird visits — and the visitor must hug themselves to receive a personal fortune scroll.

the garden is never finished. it belongs to everyone who has ever visited.

---

## running locally

this project is a static browser app. run it from a local web server so ES modules, camera permissions, and CDN-loaded audio/gesture libraries work correctly.

```bash
cd bloomsday
python3 -m http.server 8000
```

then open `http://localhost:8000` in a browser and allow camera access when prompted. internet access is needed for the CDN dependencies used by Tone.js and MediaPipe.

---

## core experience flow

```
landing page
  → click to get started (camera permission prompt)
  → main garden (full-screen canvas)
      → pick your flower (panel: cherry blossom / iris / lotus / wildflower / dandelion)
      → hand gesture grows flower on canvas
      → flower fully blooms → hummingbird flies in
      → "a message is here · hug yourself to open"
      → both wrists cross centerline → fortune scroll unfurls
      → scroll shows: fortune text + "you + N others planted a [flower] today"
  → garden persists for all visitors (Firebase Realtime DB)
```

---

## flower taxonomy

each flower type = one instrument layer in the collaborative song.
each individual flower instance = a unique note/variation within that instrument.

| flower | instrument | musical role | visual signature | glow color |
|---|---|---|---|---|
| cherry blossom | acoustic grand piano | melody · high register | 5 notched petals, stamens, petal-fall particles | `#ffb8d4` |
| iris | cello / string ensemble | harmony · warm chord bed | 3 drooping falls + 3 upright standards | `#ff9e80` |
| lotus | tibetan singing bowl | texture · resonance · atmosphere | 3 layered concentric petal rings | `#a8d8ff` |
| wildflower | acoustic guitar fingerpicking | rhythm · heartbeat groove | 7 uneven petals, stamen dome, pollen particles | `#a8f5a0` |
| dandelion | concert flute | countermelody · the exhale | 32–40 radial filaments, tip spheres, seed wisps | `#fff080` |

### my singing monsters model
- each flower type = one instrument track (always loops)
- each *individual* flower instance = unique note in pentatonic scale
- duplicate flower types → richer, more complex phrase (more notes, not louder)
- all notes locked to pentatonic → always harmonically safe
- song layers unlock permanently as each flower type first appears

### song assembly
```
0 flowers      → wind ambience only
1st cherry     → piano enters (lonely single note phrase)
1st iris       → cello joins (chord warmth)
1st lotus      → singing bowl resonates (textural depth)
1st wildflower → guitar pulses (rhythmic heartbeat)
1st dandelion  → flute soars (countermelody, song complete)
hug moment     → all active layers swell together, then settle
```

---

## visual design system

### color palette
```
backgrounds:
  #0a1209  void / deepest dark
  #0d1a12  deep forest (main bg)
  #111f16  surface / panels
  #162b1c  card / hover state
  #1e3326  border

text:
  #c8dfc0  primary
  #8aad90  secondary
  #5a7860  muted
  #3a6645  label / meta
  #1e3326  border

flowers (bright pastel on dark):
  #ffb8d4  cherry blossom · pink
  #ff9e80  iris · coral-peach
  #a8d8ff  lotus · periwinkle
  #a8f5a0  wildflower · mint
  #fff080  dandelion · lemon
```

### typography
- **display / headings / fortune text**: Cormorant Garamond · weight 300 · italic for fortunes
- **ui / labels / metadata / hex codes**: DM Mono · weight 300–400

### flower rendering (glowing lotus style)
each flower is drawn on HTML5 Canvas with:
1. **radial gradient core** — bright center fading to translucent petals
2. **double-ring glow** — `ctx.shadowBlur` + layered radial gradient halo
3. **particle system** — type-specific particles (petal drift / ember / water drops / pollen / seed wisps)
4. **sway animation** — each flower has unique `swaySpeed` + `swayOffset`
5. **glow states**: rest → hover → bloom → picked (increasing radius + alpha)

### evolving background
background environment fades in based on flower count:
- cherry blossom ×3 → faint branching tree appears (left side) + falling blossom petals
- lotus ×3 → faint pond appears (center-right) + ripple rings + water droplet sparkles
- dandelion ×3 → swaying grass field fades in (ground level)
- all flowers → ambient wind bands drift across (speed scales with flower count)

### posterized self-portrait (camera section)
user's webcam feed is processed each frame:
```js
// threshold to 2 tonal levels
brightness > 128 → light tone (tinted with current flower's color)
brightness <= 128 → dark tone (#0d1a12, blends into background)
```
result: user appears as a flat, illustrated silhouette embedded in the garden — not a camera window, but part of the scene. light tone color shifts based on selected flower type.

---

## gesture system (mediapipe hands)

| gesture | detection method | action |
|---|---|---|
| plant flower | index + thumb pinch (distance < threshold) | locks flower to canvas, triggers bloom animation + sound |
| flower select | dwell hover over swatch (1.5s) | selects flower type without click |
| hug to open | both wrist x-coords cross body centerline | unlocks fortune scroll, triggers music swell |
| grow preview | open hand present | shows live flower preview at hand position |

### mediapipe setup
```js
import { Hands } from '@mediapipe/hands';
const hands = new Hands({ locateFile: f => 
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1,
  minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
```

### hug detection
```js
// both hands present, wrists crossed
const leftWrist = results.multiHandLandmarks[0][0];
const rightWrist = results.multiHandLandmarks[1][0];
const hugging = leftWrist.x > 0.5 && rightWrist.x < 0.5; // crossed centerline
```

---

## sound implementation

### library: tone.js + gleitz midi soundfonts
```js
// load real instrument samples (no download, CDN)
const piano = new Tone.Sampler({
  urls: { C4:"C4.mp3", E4:"E4.mp3", G4:"G4.mp3", C5:"C5.mp3", E5:"E5.mp3" },
  baseUrl: "https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/"
}).toDestination();

const flute = new Tone.Sampler({
  urls: { C5:"C5.mp3", E5:"E5.mp3", G5:"G5.mp3" },
  baseUrl: "https://gleitz.github.io/midi-js-soundfonts/MusyngKite/flute-mp3/"
}).toDestination();
```

### pentatonic scale (all flowers stay in key)
```js
const PENTATONIC = ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'];
// assign note by flower index within its type
const note = PENTATONIC[flowerIndexOfType % PENTATONIC.length];
```

### per-instrument samplers
```
cherry blossom → acoustic_grand_piano
iris           → string_ensemble_1 (or cello)
lotus          → pad_4_choir (or synthesize: MetalSynth + reverb)
wildflower     → acoustic_guitar_nylon
dandelion      → flute
ambient wind   → Tone.Noise (filtered, low volume)
```

### hug swell
```js
// all active instrument volumes ramp up, then back down
Object.values(activeSamplers).forEach(s => {
  s.volume.rampTo(s.volume.value + 8, 0.5);
  setTimeout(() => s.volume.rampTo(s.volume.value - 8, 2), 2000);
});
```

---

## persistence (shared garden)

### firebase realtime database schema
```json
{
  "flowers": {
    "flowerID": {
      "type": "cherry_blossom",
      "x": 0.42,
      "y": 0.81,
      "noteIndex": 3,
      "color": "#ffb8d4",
      "stemCurve": 0.18,
      "size": 26.4,
      "timestamp": 1745000000000
    }
  },
  "counts": {
    "cherry_blossom": 2841,
    "lotus": 1203,
    "wildflower": 987,
    "iris": 743,
    "dandelion": 512
  }
}
```

### fortune text (per flower, communal count)
```
"beauty is most alive in its passing"
"you + 2,841 others planted a cherry blossom today"
```
fortune is deterministic from flower's noteIndex → same flower, same fortune on every device.

---

## fortune library

### cherry blossom
- beauty is most alive in its passing
- you arrived at exactly the right moment
- softness is its own kind of strength
- the bloom knows when to let go

### iris
- what burns in you is not too much
- your edges are part of your grace
- intensity is a form of love
- you contain more than one season

### lotus
- stillness is not emptiness
- clarity comes from within
- you are not behind — you are becoming
- your roots are deeper than you know

### wildflower
- grow toward what feels true
- you belong here, even unbidden
- ordinary days contain everything
- persistence looks different from outside

### dandelion
- let go of what was never yours
- your light finds places you will never see
- the ending is also a dispersal
- make a wish and mean it

---

## tech stack

| layer | tool | version |
|---|---|---|
| framework | vanilla HTML/CSS/JS or React + Vite | — |
| hand tracking | @mediapipe/hands | 0.4.x |
| audio | Tone.js | 14.x |
| sound samples | gleitz/midi-js-soundfonts | CDN |
| rendering | HTML5 Canvas 2D | — |
| persistence | Firebase Realtime Database | 10.x |
| fonts | Cormorant Garamond + DM Mono | Google Fonts |
| deployment | Vercel or Netlify | — |

---

## file structure (recommended)
```
a-common-bloom/
├── index.html              ← landing page
├── garden.html             ← main experience
├── src/
│   ├── flowers/
│   │   ├── FlowerBase.js   ← shared flower class (sway, glow, particles)
│   │   ├── CherryBlossom.js
│   │   ├── Iris.js
│   │   ├── Lotus.js
│   │   ├── Wildflower.js
│   │   └── Dandelion.js
│   ├── audio/
│   │   ├── AudioEngine.js  ← tone.js setup, sampler loading
│   │   ├── layers.js       ← per-instrument layer management
│   │   └── pentatonic.js   ← scale + note assignment
│   ├── gesture/
│   │   ├── HandTracker.js  ← mediapipe setup
│   │   ├── GestureDetector.js ← pinch, hug, dwell
│   │   └── PosterizeCamera.js ← threshold + tint effect
│   ├── garden/
│   │   ├── Garden.js       ← main canvas, flower collection
│   │   ├── Background.js   ← tree, pond, grass, wind layers
│   │   └── Hummingbird.js  ← flight path, trigger logic
│   └── firebase/
│       ├── config.js       ← firebase init
│       └── sync.js         ← read/write flowers, counts
├── assets/
│   └── hummingbird.png     ← illustrated hummingbird asset
└── README.md
```

---

## build phases

### phase 1 — core garden (single user, no backend)
- [ ] landing page with Cormorant Garamond title + flower silhouettes
- [ ] main canvas with all 5 flower types (mouse/click to plant)
- [ ] flower rendering: glow + particles + sway
- [ ] evolving background (tree / pond / grass unlock)
- [ ] wind animation
- [ ] Tone.js audio: pentatonic notes, layer unlock per flower type
- [ ] fortune scroll (click to open, no hug yet)

### phase 2 — gesture + camera
- [ ] MediaPipe hands integration
- [ ] pinch to plant gesture
- [ ] dwell to select flower type
- [ ] posterized self-portrait (camera → threshold → tint)
- [ ] hug gesture detection → fortune unlock
- [ ] hummingbird trigger + animation

### phase 3 — communal / shared garden
- [ ] firebase realtime database setup
- [ ] all visitors see all flowers
- [ ] flower count in fortune text
- [ ] new flower arrival animation for other users' flowers
- [ ] gleitz soundfont CDN samplers (real piano/flute/cello/guitar)

### phase 4 — polish
- [ ] mobile touch fallback (no camera)
- [ ] day/night cycle
- [ ] performance optimization (max 80 flowers, cull oldest)
- [ ] accessibility: keyboard fallback for all gestures
- [ ] OG image + share card
