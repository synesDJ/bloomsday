// blues-plus scale + note assignment
// Starts from C blues, with complementary chord tones for richer hybrids.

export const BLUES_SCALE = [
  'C3','D3','Eb3','E3','F3','Gb3','G3','Ab3','A3','Bb3',
  'C4','D4','Eb4','E4','F4','Gb4','G4','Ab4','A4','Bb4',
  'C5','D5','Eb5','E5','F5','Gb5','G5','Ab5','A5','Bb5',
];

export const PENTATONIC_SCALE = [
  'C3','D3','E3','G3','A3',
  'C4','D4','E4','G4','A4',
  'C5','D5','E5','G5','A5',
];

// Kept as a compatibility alias for existing imports.
export const PENTATONIC = BLUES_SCALE;

const REALM_SCALES = {
  blues: BLUES_SCALE,
  pentatonic: PENTATONIC_SCALE,
};

let activeRealm = 'blues';

export function setRealm(realm) {
  if (!REALM_SCALES[realm]) return;
  activeRealm = realm;
}

export function getRealm() {
  return activeRealm;
}

function activeScale() {
  return REALM_SCALES[activeRealm] || BLUES_SCALE;
}

export const TYPE_NOTE_INDEX = {
  cherry_blossom: 0,
  iris:           1,
  lotus:          2,
  wildflower:     3,
  dandelion:      4,
  sunflower:      5,
  rose:           6,
  orchid:         7,
  tulip:          8,
  poppy:          9,
  pink_lily:      10,
  moon_iris:      11,
};

export function assignNote(type, flowers) {
  const scale = activeScale();
  const sameType = flowers.filter(f => f.type === type);
  const base = TYPE_NOTE_INDEX[type] ?? sameType.length;
  const octaveStride = activeRealm === 'pentatonic' ? 5 : 10;
  const colorStride = 3;
  const idx = (base + sameType.length * octaveStride + Math.floor(sameType.length / 3) * colorStride) % scale.length;
  return { note: scale[idx], index: idx };
}

export function noteByIndex(idx) {
  const scale = activeScale();
  return scale[idx % scale.length];
}
