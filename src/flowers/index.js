import { CherryBlossom } from './CherryBlossom.js';
import { Iris } from './Iris.js';
import { Lotus } from './Lotus.js';
import { Wildflower } from './Wildflower.js';
import { Dandelion } from './Dandelion.js';
import { Sunflower } from './Sunflower.js';
import { Rose } from './Rose.js';
import { Orchid } from './Orchid.js';
import { Tulip } from './Tulip.js';
import { Poppy } from './Poppy.js';
import { PinkLily } from './PinkLily.js';
import { MoonIris } from './MoonIris.js';
import { HybridFlower } from './HybridFlower.js';

const MAP = {
  cherry_blossom: CherryBlossom,
  iris:           Iris,
  lotus:          Lotus,
  wildflower:     Wildflower,
  dandelion:      Dandelion,
  sunflower:      Sunflower,
  rose:           Rose,
  orchid:         Orchid,
  tulip:          Tulip,
  poppy:          Poppy,
  pink_lily:      PinkLily,
  moon_iris:      MoonIris,
};

export function createFlower(type, opts) {
  const Cls = MAP[type];
  if (!Cls) throw new Error(`unknown flower type: ${type}`);
  return new Cls(opts);
}

export function createHybridFlower(flower1, flower2) {
  const base1 = flower1.baseFlowers || [flower1.type];
  const base2 = flower2.baseFlowers || [flower2.type];
  const combined = [...base1, ...base2];

  const notes1 = flower1.noteIndices || [flower1.noteIndex];
  const notes2 = flower2.noteIndices || [flower2.noteIndex];
  const noteIndices = [...notes1, ...notes2];

  const size = Math.max(flower1.size || flower1.targetSize, flower2.size || flower2.targetSize) * (1 + combined.length * 0.05);

  const hybrid = new HybridFlower({
    baseFlowers: combined,
    x: flower2.x,
    y: flower2.y,
    size,
    noteIndices,
  });
  hybrid.planted = true;
  hybrid.setGrow(1);
  hybrid.setBloom(1);
  return hybrid;
}

export const FLOWER_TYPES = Object.keys(MAP);
