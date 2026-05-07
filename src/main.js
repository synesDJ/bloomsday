import { Garden }          from './garden/Garden.js';
import { AudioEngine }     from './audio/AudioEngine.js';
import { HandTracker }     from './gesture/HandTracker.js';
import { GestureDetector } from './gesture/GestureDetector.js';
import { PosterizeCamera } from './gesture/PosterizeCamera.js';
import { HandOverlay }     from './gesture/HandOverlay.js';
import { SerialBridge }    from './hardware/SerialBridge.js';
import { FLOWER_COLORS }   from './flowers/FlowerBase.js';
import { assignNote, setRealm } from './audio/pentatonic.js';

// ——— DOM references
const gardenCanvas  = document.getElementById('garden-canvas');
const cameraCanvas  = document.getElementById('camera-canvas');
const videoEl       = document.getElementById('camera-video');
const swatchButtons = document.querySelectorAll('.swatch');
const voiceButtons  = document.querySelectorAll('.voice-btn');
const realmButtons  = document.querySelectorAll('.realm-btn');
const loopToggle = document.getElementById('loop-toggle');
const loopSwitchState = document.getElementById('loop-switch-state');
const serialConnectBtn = document.getElementById('serial-connect');
const serialStatusEl = document.getElementById('serial-status');
const trashBinEl = document.getElementById('trash-bin');
const resetGardenBtn = document.getElementById('reset-garden');
const countTotalEl  = document.getElementById('count-total');
const countTypesEl  = document.getElementById('count-types');
const cameraToggleBtn = document.getElementById('camera-toggle');
const hintEl = document.getElementById('hint');
const loadingEl = document.getElementById('loading');
const enterBtn = document.getElementById('enter-btn');
const realmBackBtn = document.getElementById('realm-back');
const camPromptEl = document.getElementById('cam-prompt');
const cornerBouquet = document.getElementById('corner-bouquet');

// ——— state
let currentType = 'cherry_blossom';
let currentRealm = 'blues';
const loopPlaybackByRealm = {
  blues: true,
  pentatonic: true,
};

const STATE = {
  IDLE:              'idle',
  GROWING:           'growing',
  BLOOMING:          'blooming',
  GRABBING:          'grabbing',
  PLANTED:           'planted',
  DRAGGING_PLANTED:  'dragging_planted',
};
let state = STATE.IDLE;

let currentGrow  = 0;
let currentBloom = 0;

let fistOpenSince = 0;
const FIST_OPEN_DEBOUNCE = 220;

let releasedSince = 0;
const RELEASE_HOLD_MS = 1100;

const GROW_LERP   = 0.24;
const BLOOM_LERP  = 0.24;
const DECAY_TIME  = 9500;

// lowered thresholds for easier grab
const GRAB_GROW_THRESHOLD  = 0.48;
const GRAB_BLOOM_THRESHOLD = 0.42;

// ——— services
const audio = new AudioEngine();
const serialBridge = new SerialBridge();

const garden = new Garden({
  canvas: gardenCanvas,
  audio,
  onBloom: (flower) => {
    if (flower.rgb) {
      serialBridge.sendBloomRgb(flower.rgb);
    } else {
      serialBridge.sendBloom(flower.type);
    }
  },
});

const handOverlay = new HandOverlay({
  getSize: () => ({ w: window.innerWidth, h: window.innerHeight }),
});
garden.setHandOverlay(handOverlay);
garden.start();

function applyRealmTheme(realm) {
  document.body.classList.toggle('realm-pentatonic', realm === 'pentatonic');
  document.body.classList.toggle('realm-blues', realm !== 'pentatonic');
}

applyRealmTheme(currentRealm);

function applyLoopPlaybackForRealm(realm) {
  const enabled = loopPlaybackByRealm[realm] !== false;
  audio.setLoopPlaybackEnabled(enabled);
  if (loopToggle) loopToggle.checked = enabled;
  if (loopSwitchState) loopSwitchState.textContent = enabled ? 'on' : 'off';
}

applyLoopPlaybackForRealm(currentRealm);

function setSerialStatus(status, connected = serialBridge.connected) {
  if (!serialConnectBtn || !serialStatusEl) return;
  const labels = {
    unsupported: 'web serial unavailable',
    disconnected: 'not connected',
    connecting: 'choosing port',
    connected: 'lights connected',
    error: 'connection error',
  };
  serialStatusEl.textContent = labels[status] || status;
  serialConnectBtn.textContent = connected ? 'disconnect lights' : 'connect lights';
  serialConnectBtn.classList.toggle('connected', !!connected);
  serialConnectBtn.disabled = status === 'unsupported' || status === 'connecting';
  serialConnectBtn.title = status === 'unsupported'
    ? 'Use Chrome or Edge on localhost for Web Serial'
    : 'connect LED panel';
}

serialBridge.setStatusHandler(setSerialStatus);

// ——— flower selection
function setFlowerType(type) {
  currentType = type;
  garden.setPreviewType(type);
  swatchButtons.forEach(b => b.classList.toggle('active', b.dataset.flower === type));
  if (posterize) posterize.setTintType(type);
  if (detector)  detector.setSelectedFlower(type);
  if (garden.growingFlower) {
    garden.abortGrowingFlower();
    currentGrow = 0;
    currentBloom = 0;
    state = STATE.IDLE;
  }
  updateHintForState();
}

swatchButtons.forEach(btn => {
  btn.addEventListener('click', () => setFlowerType(btn.dataset.flower));
  btn.addEventListener('pointerenter', () => {
    const type = btn.dataset.flower;
    if (!type) return;
    audio.start().then(() => {
      const { index } = assignNote(type, garden.flowers);
      audio.playNote(type, index, { duration: '16n', velocity: 0.28 });
    }).catch(() => {});
  });
});

voiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const voice = btn.dataset.voice;
    audio.setVoice(voice);
    voiceButtons.forEach(b => b.classList.toggle('active', b === btn));
  });
});

if (loopToggle) {
  loopToggle.addEventListener('change', () => {
    loopPlaybackByRealm[currentRealm] = loopToggle.checked;
    applyLoopPlaybackForRealm(currentRealm);
  });
}

if (serialConnectBtn) {
  serialConnectBtn.addEventListener('click', async () => {
    const connected = await serialBridge.toggle();
    if (connected) serialBridge.sendRealm(currentRealm);
  });
}

if (resetGardenBtn) {
  resetGardenBtn.addEventListener('click', () => {
    garden.reset();
    mouseDragFlower = null;
    mouseDragStartPos = null;
    gestureDragFlower = null;
    state = STATE.IDLE;
    fistOpenSince = 0;
    suppressNextClick = true;
    setTrashVisible(false);
    updateHintForState();
    updateCounts();
    serialBridge.sendClear();
  });
}

realmButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentRealm = btn.dataset.realm || 'blues';
    setRealm(currentRealm);
    garden.setRealm(currentRealm);
    applyRealmTheme(currentRealm);
    applyLoopPlaybackForRealm(currentRealm);
    serialBridge.sendRealm(currentRealm);
    realmButtons.forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ——— mouse fallback plant + drag-to-combine
let lastPlantTime = 0;
let mouseDragFlower = null;
let mouseDragStartPos = null;
let suppressNextClick = false;

function screenToGarden(ev) {
  const rect = gardenCanvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function pointInTrash(x, y) {
  if (!trashBinEl) return false;
  const r = trashBinEl.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function setTrashHot(hot) {
  if (trashBinEl) trashBinEl.classList.toggle('hot', !!hot);
}

function setTrashVisible(visible) {
  if (trashBinEl) trashBinEl.classList.toggle('visible', !!visible);
  if (!visible) setTrashHot(false);
}

gardenCanvas.addEventListener('mousedown', (ev) => {
  const pos = screenToGarden(ev);
  const hit = garden.flowerAt(pos.x, pos.y);
  if (hit && hit.planted && hit.bloomed) {
    mouseDragFlower = hit;
    mouseDragStartPos = pos;
    garden.beginDragFlower(hit);
    setTrashVisible(true);
    ev.preventDefault();
  }
});

gardenCanvas.addEventListener('mousemove', (ev) => {
  const pos = screenToGarden(ev);
  if (mouseDragFlower) {
    const groundY = window.innerHeight * 0.78;
    garden.updateDragPosition(mouseDragFlower, pos.x, groundY);
    const target = garden.findCombineTarget(mouseDragFlower, pos.x, pos.y);
    garden.setCombineHighlight(target);
    setTrashHot(pointInTrash(ev.clientX, ev.clientY));
    return;
  }
  if (cameraOn) return;
  garden.setPreviewPos(pos);
});

gardenCanvas.addEventListener('mouseup', (ev) => {
  if (mouseDragFlower) {
    const pos = screenToGarden(ev);
    const moved = mouseDragStartPos
      ? Math.hypot(pos.x - mouseDragStartPos.x, pos.y - mouseDragStartPos.y) > 10
      : false;
    const target = garden.findCombineTarget(mouseDragFlower, pos.x, pos.y);
    const overTrash = pointInTrash(ev.clientX, ev.clientY);
    if (overTrash && moved) {
      garden.deleteFlower(mouseDragFlower);
      updateCounts();
      suppressNextClick = true;
    } else if (target && moved) {
      garden.combineFlowers(mouseDragFlower, target);
      updateCounts();
    } else if (!moved) {
      garden.replayFlower(mouseDragFlower, { velocity: 0.72 });
      garden.endDragFlower(mouseDragFlower);
    } else {
      garden.endDragFlower(mouseDragFlower);
    }
    mouseDragFlower = null;
    mouseDragStartPos = null;
    setTrashVisible(false);
    return;
  }
});

gardenCanvas.addEventListener('mouseleave', () => {
  if (mouseDragFlower) {
    garden.endDragFlower(mouseDragFlower);
    mouseDragFlower = null;
    mouseDragStartPos = null;
    setTrashVisible(false);
  }
  if (!cameraOn) garden.setPreviewPos(null);
});

gardenCanvas.addEventListener('click', async (ev) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  if (mouseDragFlower) return;
  await audio.start();
  const pos = screenToGarden(ev);

  // click on a planted bloomed flower → just replay its sound
  const hit = garden.flowerAt(pos.x, pos.y);
  if (hit && hit.bloomed) {
    garden.replayFlower(hit, { velocity: 0.7 });
    return;
  }

  if (cameraOn) return;

  if (pos.y < window.innerHeight * 0.25) return;
  const now = performance.now();
  if (now - lastPlantTime < 200) return;
  lastPlantTime = now;
  garden.plantAt(pos.x, pos.y, currentType);
  updateCounts();
});

// ——— counts
function updateCounts() {
  countTotalEl.textContent = garden.flowers.length;
  countTypesEl.textContent = garden.activeInstrumentCount();
}

// ——— loading dismiss
(function hideLoaderFast() {
  const hide = () => requestAnimationFrame(() =>
    setTimeout(() => loadingEl.classList.add('hidden'), 150)
  );
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hide, { once: true });
  } else {
    hide();
  }
})();

// ——— MediaPipe
let tracker = null;
let detector = null;
let posterize = null;
let cameraOn = false;
const GROUND_Y_FRAC = 0.78;

function hintForState() {
  if (!cameraOn) {
    return 'click to plant · drag flowers together or into the bin';
  }
  switch (state) {
    case STATE.IDLE:             return 'choose a flower · then <strong>right-pinch open</strong> to grow';
    case STATE.GROWING:          return '<strong>right pinch apart</strong> to grow the stem';
    case STATE.BLOOMING:         return '<strong>left pinch apart</strong> to bloom';
    case STATE.GRABBING:         return 'open your right hand to <strong>plant</strong>';
    case STATE.PLANTED:          return 'planted · choose another flower to grow';
    case STATE.DRAGGING_PLANTED: return 'drag onto another flower to <strong>combine</strong> · drag to bin to delete';
    default:                     return '';
  }
}

function updateHintForState() {
  if (!hintEl) return;
  hintEl.innerHTML = hintForState();
}

function setCamStatus(text) {
  cameraToggleBtn.title = text;
  if (hintEl) hintEl.textContent = text;
}

async function enableCamera() {
  if (cameraOn) return;
  setCamStatus('loading hand tracker…');
  cameraToggleBtn.disabled = true;

  posterize = new PosterizeCamera({ videoEl, canvasEl: cameraCanvas });
  posterize.setTintType(currentType);

  detector = new GestureDetector({
    mirror: true,
    onFrame: (info) => handleGestureFrame(info),
  });
  detector.setSelectedFlower(currentType);

  tracker = new HandTracker({
    videoEl,
    onResults: (results) => detector && detector.process(results),
    onProgress: (msg) => { if (msg) setCamStatus(msg); },
  });

  const ok = await tracker.start();
  cameraToggleBtn.disabled = false;
  if (!ok) {
    setCamStatus('camera unavailable. click × to retry');
    cameraToggleBtn.classList.remove('on');
    return;
  }
  posterize.start();
  cameraOn = true;
  document.body.classList.add('cam-on');
  cameraToggleBtn.title = 'disable camera';
  cameraToggleBtn.classList.add('on');
  state = STATE.IDLE;
  updateHintForState();
}

async function disableCamera() {
  if (!cameraOn) return;
  if (tracker)   await tracker.stop();
  if (posterize) posterize.stop();
  garden.abortGrowingFlower();
  currentGrow = 0;
  currentBloom = 0;
  state = STATE.IDLE;
  handOverlay.update({ hands: [], gesture: null, matching: false, progress: 0 });
  cameraOn = false;
  document.body.classList.remove('cam-on');
  cameraToggleBtn.title = 'enable camera';
  cameraToggleBtn.classList.remove('on');
  updateHintForState();
}

cameraToggleBtn.addEventListener('click', () => {
  if (cameraOn) disableCamera(); else enableCamera();
});

// ——— landing → garden cross-fade
function enterGardenView() {
  document.body.classList.remove('in-landing');
  document.body.classList.add('in-garden');
  if (cornerBouquet) cornerBouquet.classList.add('hidden');
}

async function returnToLandingView() {
  if (cameraOn) await disableCamera();
  document.body.classList.remove('in-garden');
  document.body.classList.add('in-landing');
  if (cornerBouquet) cornerBouquet.classList.remove('hidden');
  if (enterBtn) enterBtn.disabled = false;
  if (camPromptEl) camPromptEl.textContent = '';
  garden.setPreviewPos(null);
  setTrashVisible(false);
  updateHintForState();
}

if (realmBackBtn) {
  realmBackBtn.addEventListener('click', () => {
    returnToLandingView().catch(err => console.warn('[a common bloom] landing return failed:', err));
  });
}

if (enterBtn) {
  enterBtn.addEventListener('click', async () => {
    enterBtn.disabled = true;
    if (camPromptEl) camPromptEl.textContent = 'asking for camera access…';

    audio.start().catch(() => {});

    try { await enableCamera(); }
    catch (err) { console.warn('[a common bloom] camera enable failed:', err); }

    if (camPromptEl) {
      camPromptEl.textContent = cameraOn
        ? ''
        : 'you can still enter. retry the camera with the × button inside the garden.';
    }

    setTimeout(enterGardenView, cameraOn ? 250 : 600);
  });
}

// ——— gesture frame handler — runs the state machine
let lastGestureT = performance.now();

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// gesture-driven drag state
let gestureDragFlower = null;

function handleGestureFrame(info) {
  const now = performance.now();
  const dt = Math.min(80, now - lastGestureT);
  lastGestureT = now;

  const {
    hands,
    rightHand, leftHand,
    rightGrowValue, leftBloomValue,
    isRightFist, isOpenHand,
    rightHandPos, leftHandPos,
  } = info;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const groundY = H * GROUND_Y_FRAC;

  const anchorHand =
       rightHand ? rightHandPos
    :  leftHand  ? leftHandPos
    :  null;

  // always update preview position for hover-to-hear
  if (anchorHand && state === STATE.IDLE) {
    garden.setPreviewPos({ x: anchorHand.x * W, y: anchorHand.y * H });
  }

  // ——— DRAGGING_PLANTED state (gesture-driven drag)
  if (state === STATE.DRAGGING_PLANTED) {
    if (rightHandPos) {
      const x = rightHandPos.x * W;
      const screenY = rightHandPos.y * H;
      const gy = Math.min(groundY, rightHandPos.y * H + 60);
      garden.updateDragPosition(gestureDragFlower, x, gy);
      const target = garden.findCombineTarget(gestureDragFlower, x, screenY);
      garden.setCombineHighlight(target);
      setTrashVisible(true);
      setTrashHot(pointInTrash(x, screenY));
    }

    if (isOpenHand && !isRightFist) {
      if (!fistOpenSince) fistOpenSince = now;
      if (now - fistOpenSince >= FIST_OPEN_DEBOUNCE) {
        const px = rightHandPos ? rightHandPos.x * W : gestureDragFlower.x;
        const py = rightHandPos ? rightHandPos.y * H : gestureDragFlower.groundY;
        const target = garden.findCombineTarget(gestureDragFlower, px, py);
        if (pointInTrash(px, py)) {
          garden.deleteFlower(gestureDragFlower);
          updateCounts();
        } else if (target) {
          garden.combineFlowers(gestureDragFlower, target);
          updateCounts();
        } else {
          garden.endDragFlower(gestureDragFlower);
        }
        gestureDragFlower = null;
        state = STATE.IDLE;
        fistOpenSince = 0;
        setTrashVisible(false);
        updateHintForState();
      }
    } else {
      fistOpenSince = 0;
    }
    // update hand overlay for drag state
    handOverlay.update({
      hands,
      gesture: { hint: 'drag onto another flower to combine · drag to bin to delete', instruction: 'drag onto another flower to combine · drag to bin to delete' },
      matching: true,
      progress: 1,
      flowerColor: FLOWER_COLORS[currentType],
      leftLabel: '',
      rightLabel: 'open hand to release',
    });
    return;
  }

  // ——— IDLE: check for fist near planted flower (gesture drag) OR start growing
  if (state === STATE.IDLE) {
    // fist near a planted flower → drag it
    if (isRightFist && rightHandPos) {
      const px = rightHandPos.x * W;
      const py = rightHandPos.y * H;
      const hit = garden.flowerAt(px, py);
      if (hit && hit.planted && hit.bloomed) {
        gestureDragFlower = hit;
        garden.beginDragFlower(hit);
        setTrashVisible(true);
        state = STATE.DRAGGING_PLANTED;
        fistOpenSince = 0;
        updateHintForState();
        return;
      }
    }

    const triggerValue = Math.max(rightGrowValue || 0, leftBloomValue || 0);
    if (anchorHand && triggerValue > 0.04) {
      const x = anchorHand.x * W;
      garden.beginGrowingFlower(x, groundY, currentType);
      audio.start().catch(() => {});
      state = STATE.GROWING;
      releasedSince = 0;
    }
  }

  // While in GROWING/BLOOMING, follow the active hand to position the flower.
  if ((state === STATE.GROWING || state === STATE.BLOOMING) && anchorHand) {
    const x = anchorHand.x * W;
    garden.updateGrowingFlowerPosition(x, groundY);
  }

  // Smooth grow / bloom toward gesture targets while not grabbing
  if (state === STATE.GROWING || state === STATE.BLOOMING) {
    const bothHands = !!leftHand && !!rightHand;

    if (bothHands) {
      currentGrow  = lerp(currentGrow,  rightGrowValue, GROW_LERP);
      const bloomGate = clamp((currentGrow - 0.4) / 0.5, 0, 1);
      currentBloom = lerp(currentBloom, leftBloomValue * bloomGate, BLOOM_LERP);
    } else if (rightHand) {
      currentGrow  = lerp(currentGrow,  rightGrowValue, GROW_LERP);
      const bloomGate = clamp((currentGrow - 0.40) / 0.40, 0, 1);
      const target   = rightGrowValue * bloomGate;
      if (target > currentBloom * 0.9) {
        currentBloom = lerp(currentBloom, target, BLOOM_LERP * 0.85);
      }
    } else if (leftHand) {
      currentGrow  = lerp(currentGrow,  leftBloomValue, GROW_LERP);
      const bloomGate = clamp((currentGrow - 0.40) / 0.40, 0, 1);
      const target   = leftBloomValue * bloomGate;
      if (target > currentBloom * 0.9) {
        currentBloom = lerp(currentBloom, target, BLOOM_LERP * 0.85);
      }
    }

    garden.setGrowingFlowerGrow(currentGrow);
    garden.setGrowingFlowerBloom(currentBloom);

    if (state === STATE.GROWING && currentGrow > 0.55 && currentBloom > 0.05) {
      state = STATE.BLOOMING;
    }
    if (state === STATE.BLOOMING && currentBloom < 0.02 && currentGrow < 0.45) {
      state = STATE.GROWING;
    }

    // GRAB transition — lowered thresholds
    if (isRightFist && currentGrow > GRAB_GROW_THRESHOLD && currentBloom > GRAB_BLOOM_THRESHOLD) {
      state = STATE.GRABBING;
      fistOpenSince = 0;
      releasedSince = 0;
      currentGrow = 1;
      currentBloom = Math.max(currentBloom, 0.85);
      garden.setGrowingFlowerGrow(1);
      garden.setGrowingFlowerBloom(currentBloom);
    }

    // decay
    const handsPresent = !!rightHand || !!leftHand;
    const closedRight  = !rightHand || rightGrowValue < 0.05;
    const closedLeft   = !leftHand  || leftBloomValue < 0.05;
    const released     = handsPresent && closedRight && closedLeft && !isRightFist;
    if (released) {
      if (!releasedSince) releasedSince = now;
      if (now - releasedSince >= RELEASE_HOLD_MS) {
        currentGrow  = Math.max(0, currentGrow  - dt / DECAY_TIME);
        currentBloom = Math.max(0, currentBloom - dt / DECAY_TIME);
        garden.setGrowingFlowerGrow(currentGrow);
        garden.setGrowingFlowerBloom(currentBloom);
      }
      if (currentGrow <= 0.01 && currentBloom <= 0.01) {
        garden.abortGrowingFlower();
        state = STATE.IDLE;
        releasedSince = 0;
      }
    } else {
      releasedSince = 0;
    }
  }

  // While GRABBING, the flower follows the right hand
  if (state === STATE.GRABBING) {
    if (rightHandPos) {
      const x = rightHandPos.x * W;
      const y = rightHandPos.y * H;
      const planted = Math.min(groundY, y + 60);
      garden.updateGrowingFlowerPosition(x, planted);
    }
    if (isOpenHand && !isRightFist) {
      if (!fistOpenSince) fistOpenSince = now;
      if (now - fistOpenSince >= FIST_OPEN_DEBOUNCE) {
        const flower = garden.commitGrowingFlower();
        if (flower) {
          audio.awakenLayer(flower.type);
          audio.playNote(flower.type, flower.noteIndex, { velocity: 0.7 + Math.random() * 0.15 });
          updateCounts();
        }
        currentGrow = 0;
        currentBloom = 0;
        state = STATE.PLANTED;
        setTimeout(() => {
          if (state === STATE.PLANTED) { state = STATE.IDLE; updateHintForState(); }
        }, 1500);
      }
    } else {
      fistOpenSince = 0;
    }
  }

  // ——— overlay
  const readyToGrab = currentGrow > GRAB_GROW_THRESHOLD && currentBloom > GRAB_BLOOM_THRESHOLD;

  let rightLabel, leftLabel, overlayInstruction;

  if (state === STATE.GRABBING) {
    rightLabel = 'Open your fist to plant';
    leftLabel  = '';
    overlayInstruction = 'open your right fist to plant';
  } else if (state === STATE.PLANTED) {
    rightLabel = '';
    leftLabel  = '';
    overlayInstruction = 'planted · choose another flower';
  } else if (state === STATE.IDLE) {
    rightLabel = 'Expand right thumb and index finger to GROW';
    leftLabel  = 'Expand left thumb and index finger to BLOOM';
    overlayInstruction = 'pinch open to grow';
  } else {
    if (readyToGrab) {
      rightLabel = 'Make your right hand into a fist to grab';
      leftLabel  = 'Expand left thumb and index finger to BLOOM';
    } else {
      rightLabel = 'Expand right thumb and index finger to GROW';
      leftLabel  = 'Expand left thumb and index finger to BLOOM';
    }
    overlayInstruction = readyToGrab ? 'make a right fist to grab' : 'grow · then bloom';
  }

  handOverlay.update({
    hands,
    gesture: { hint: overlayInstruction, instruction: overlayInstruction },
    matching: state !== STATE.IDLE && state !== STATE.PLANTED,
    progress: Math.max(currentGrow, currentBloom),
    flowerColor: FLOWER_COLORS[currentType],
    leftLabel,
    rightLabel,
  });

  updateHintForState();
}

// ——— keyboard shortcuts
window.addEventListener('keydown', (ev) => {
  const keyToType = {
    '1': 'cherry_blossom',
    '2': 'iris',
    '3': 'lotus',
    '4': 'wildflower',
    '5': 'dandelion',
    '6': 'sunflower',
    '7': 'rose',
    '8': 'orchid',
    '9': 'tulip',
    '0': 'poppy',
    '-': 'pink_lily',
    '=': 'moon_iris',
  };
  if (keyToType[ev.key]) setFlowerType(keyToType[ev.key]);
});

// initial
updateHintForState();
updateCounts();
