// GestureDetector — continuous distance-based gesture grammar
//
//   • RIGHT pinch  (continuous thumb-index distance) → grow stem / branches / buds
//   • LEFT  pinch  (continuous thumb-index distance) → bloom petals / glow
//   • RIGHT fist closed → grab/pluck the current flower (it follows the right hand)
//   • RIGHT fist opens  → plant the flower at current position
//
// MediaPipe gives us 21 landmarks per hand in normalized [0,1] image coords.
// We mirror x so screen-space matches the user's mental model (their left hand
// appears on the LEFT side of the preview). After mirroring, the user's left
// hand has the smaller x — we use that to disambiguate handedness instead of
// MediaPipe's `multiHandedness` (which is unreliable when the camera is mirrored).
//
// Key landmarks:
//   0  = wrist
//   4  = thumb tip          · 8  = index tip
//   12 = middle tip         · 16 = ring tip · 20 = pinky tip
//   5  = index MCP          · 17 = pinky MCP
//   9  = middle finger MCP (≈ hand center, used for hand position)

// distance thresholds (MediaPipe-normalized 0..1 image coords)
const PINCH_CLOSED = 0.045;
const PINCH_OPEN   = 0.13;

// fist detection thresholds (avg fingertip-to-palm-center distance)
const FIST_CLOSED  = 0.10;
const FIST_OPEN    = 0.145;

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// continuous pinch progress: 0 when fingers are touching, 1 when fully apart
function pinchProgress(lm) {
  const d = dist(lm[4], lm[8]);
  return clamp((d - PINCH_CLOSED) / (PINCH_OPEN - PINCH_CLOSED), 0, 1);
}

// average fingertip-to-palm distance — used to detect closed fist vs open hand
function palmTipSpread(lm) {
  // palm center: average of wrist (0), index MCP (5), pinky MCP (17)
  const cx = (lm[0].x + lm[5].x + lm[17].x) / 3;
  const cy = (lm[0].y + lm[5].y + lm[17].y) / 3;
  // average distance of fingertips (8/12/16/20) from that center
  const tips = [8, 12, 16, 20];
  let sum = 0;
  for (const t of tips) sum += Math.hypot(lm[t].x - cx, lm[t].y - cy);
  return sum / tips.length;
}

export class GestureDetector {
  constructor({ onFrame, mirror = true }) {
    this.onFrame = onFrame;
    this.mirror = mirror;
    this.selectedFlower = 'cherry_blossom';
    // hysteresis state for right-hand fist
    this._wasRightFist = false;
  }

  setSelectedFlower(type) { this.selectedFlower = type; }

  _mirror(hand) {
    if (!this.mirror) return hand;
    return hand.map(lm => ({ ...lm, x: 1 - lm.x }));
  }

  // called by HandTracker's onResults
  process(results) {
    const raw = results?.multiHandLandmarks || [];
    const hands = raw.map(h => this._mirror(h));

    // assign handedness by x position after mirroring:
    //   smaller x → user's LEFT hand  (left side of screen)
    //   larger  x → user's RIGHT hand
    let leftHand = null, rightHand = null;
    if (hands.length === 1) {
      if (hands[0][9].x < 0.5) leftHand = hands[0];
      else                     rightHand = hands[0];
    } else if (hands.length >= 2) {
      const sorted = [...hands].sort((a, b) => a[9].x - b[9].x);
      leftHand  = sorted[0];
      rightHand = sorted[1];
    }

    // continuous pinch progress per hand (0 closed, 1 fully open)
    const rightGrowValue  = rightHand ? pinchProgress(rightHand) : 0;
    const leftBloomValue  = leftHand  ? pinchProgress(leftHand)  : 0;

    // raw distances also exposed for debug / tuning
    const rightPinchDist  = rightHand ? dist(rightHand[4], rightHand[8]) : null;
    const leftPinchDist   = leftHand  ? dist(leftHand[4],  leftHand[8])  : null;

    // right-hand fist with hysteresis
    let isRightFist = false;
    let isOpenHand  = false;
    if (rightHand) {
      const spread = palmTipSpread(rightHand);
      if (this._wasRightFist) {
        // need to open clearly to release
        isRightFist = spread < FIST_OPEN;
      } else {
        // need to close clearly to engage
        isRightFist = spread < FIST_CLOSED;
      }
      isOpenHand = spread > FIST_OPEN;
      this._wasRightFist = isRightFist;
    } else {
      this._wasRightFist = false;
    }

    // right-hand position in normalized 0..1 image coords (using middle MCP)
    const rightHandPos = rightHand
      ? { x: rightHand[9].x, y: rightHand[9].y }
      : null;
    const leftHandPos = leftHand
      ? { x: leftHand[9].x, y: leftHand[9].y }
      : null;

    if (this.onFrame) {
      this.onFrame({
        hands,
        leftHand, rightHand,
        leftPinchDist, rightPinchDist,
        leftBloomValue, rightGrowValue,
        isRightFist, isOpenHand,
        rightHandPos, leftHandPos,
        selected: this.selectedFlower,
      });
    }
  }
}

// Per-flower gesture map is no longer used — every flower follows the same
// continuous right-grow / left-bloom / right-fist plant grammar.
export const GESTURES = {};
