// Authoritative design. Model units: 16 = one block; head top = 32; front = -Z.
// Authored in Bedrock 1.16 coordinates, independently of Ornatum's cached assets.
export const ATLAS = 256;
export const DENSITY = 16;
export const round = (n) => Math.round(n * 100000) / 100000;
const mod = (a, b) => ((a % b) + b) % b;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const hash = (x, y, seed = 0) => {
  let n = Math.imul(x + seed * 7919, 374761393) ^ Math.imul(y + 1013, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const tint = (rgb, v) => rgb.map((c) => Math.round(clamp(c + v, 0, 255)));
const sample = (rgb, height = 0.4, metal = 40, rough = 170) => ({ rgb, height, metal, rough });

function brocade(x, y, seed = 0) {
  const noise = (hash(x, y, seed) - 0.5) * 9;
  const weave = ((x + y) % 2 ? 3 : -3) + (x % 4 === 0 ? 2 : 0);
  let color = tint([143, 128, 78], weave + noise);
  let height = 0.35, metal = 65;
  const u = mod(x, 32), v = mod(y, 32);
  const dx = Math.abs(u - 15.5), dy = Math.abs(v - 15.5);
  const square = Math.max(dx, dy);
  const interlace = (square >= 11 && square <= 13)
    || (dx < 1.5 && dy < 9) || (dy < 1.5 && dx < 9)
    || (Math.abs(dx + dy - 8) < 1.1);
  if (interlace) {
    color = tint([196, 177, 111], noise + ((u + v) % 3 === 0 ? 13 : 0));
    height = 0.72; metal = 140;
  } else if ((square > 13 && square < 15) || Math.abs(dx + dy - 10) < 1) {
    color = tint([106, 91, 49], noise); height = 0.23;
  }
  return sample(color, height, metal, 155);
}

function braid(x, y) {
  const edge = y < 2 || y > 21;
  const diagonal = mod(x + y, 8) < 3 || mod(x - y, 8) < 2;
  return sample(edge ? [255, 222, 130] : diagonal ? [216, 179, 83] : [117, 88, 36], edge ? 0.85 : diagonal ? 0.7 : 0.3, 195, 115);
}

function panel(x, y, back = false) {
  const s = brocade(x, y, back ? 2 : 1);
  // Bottom orphrey: alternating stitched diamonds, gilt cords and ivory seed pearls.
  if (y > 164) {
    const yy = y - 165;
    const diamond = Math.abs(mod(x, 24) - 12) + Math.abs(yy - 13);
    if (yy < 3 || yy > 23) return sample([224, 193, 114], 0.85, 190, 120);
    if (diamond < 5) return sample(diamond < 2 ? [249, 233, 177] : [205, 165, 68], 0.8, 160, 140);
    return sample(tint([108, 91, 47], (hash(x, y) - 0.5) * 10), 0.32, 65, 190);
  }
  if (back) {
    const dx = Math.abs(x - 76), dy = Math.abs(y - 99);
    if ((dx < 4 && dy < 29) || (dy < 4 && dx < 22)) return sample([235, 209, 137], 0.84, 175, 120);
    const radius = Math.sqrt((dx / 1.12) ** 2 + dy ** 2);
    if (radius > 32 && radius < 35 && mod(x + y, 8) < 5) return sample([216, 192, 113], 0.7, 150, 140);
  }
  // Vertical embroidered ribbon, a classical mitre's titulus.
  if (Math.abs(x - 76) < 7) {
    if (Math.abs(x - 76) > 4) return sample([213, 185, 114], 0.76, 160, 130);
    if (mod(y, 14) < 2) return sample([235, 215, 154], 0.7, 150, 140);
    return sample([161, 139, 75], 0.45, 95, 175);
  }
  return s;
}

function lappet(x, y) {
  const s = sample(tint([219, 204, 157], ((x + y) % 2 ? 3 : -3) + (hash(x, y) - 0.5) * 5), 0.35, 15, 205);
  const edge = Math.min(x, 31 - x);
  if (edge < 2) return sample([115, 88, 37], 0.5, 110, 160);
  if (edge < 4) return sample([232, 192, 92], 0.85, 180, 140);
  const dx = Math.abs(x - 15.5), dy = Math.abs(y - 106);
  if ((dx < 2 && dy < 17) || (dy < 2 && dx < 10)) return sample([163, 123, 45], 0.74, 160, 140);
  if (y > 138) return braid(x, mod(y, 24));
  if (Math.abs(dx + Math.abs(mod(y, 28) - 14) - 8) < 1) return sample([183, 158, 92], 0.6, 80, 180);
  return s;
}

function fry(x, y, seed) {
  const edge = Math.min(x, 15 - x);
  const stripe = hash(Math.floor(x / 2), Math.floor(y / 12), seed);
  const toast = edge < 2 ? -31 : edge < 4 ? -10 : 8;
  const cap = y < 4 ? -17 : y < 9 ? -5 : 0;
  const fleck = hash(x, y, seed + 20) > 0.98 ? -36 : 0;
  return sample(tint([242, 188, 61], toast + cap + fleck + (stripe - 0.5) * 15), 0.38 + stripe * 0.1, 0, 215);
}

export function textureDefinitions() {
  return [
    { id: 'front', w: 152, h: 192, paint: (x, y) => panel(x, y) },
    { id: 'lappet', w: 32, h: 160, paint: lappet },
    ...Array.from({ length: 3 }, (_, i) => ({ id: `fry${i}`, w: 16, h: 128, paint: (x, y) => fry(x, y, i + 1) })),
    { id: 'lining', w: 32, h: 32, paint: (x, y) => sample(tint([92, 70, 40], (x + y) % 3 === 0 ? 7 : 0), 0.3, 0, 235) },
    { id: 'braid', w: 48, h: 24, paint: braid },
    { id: 'gold', w: 16, h: 16, paint: (x, y) => sample(tint([216, 173, 72], (x < 3 ? 29 : x > 12 ? -32 : 8) + ((x + y) % 3 === 0 ? 7 : 0)), 0.65, 220, 100) },
    { id: 'arches', w: 16, h: 16, paint: (x, y) => sample(tint([255, 203, 37], x < 4 ? 27 : x > 12 ? -25 : (y % 3 === 0 ? 8 : 0)), 0.7, 145, 105) },
    { id: 'pearl', w: 8, h: 8, paint: (x, y) => sample(tint([239, 220, 166], 10 - (x + y) * 3), 0.7, 60, 125) },
    { id: 'fringe', w: 8, h: 24, paint: (x, y) => sample(tint([209, 170, 81], x % 3 === 0 ? 22 : -8), 0.55, 120, 190) },
    { id: 'tip', w: 16, h: 16, paint: (x, y) => sample(tint([255, 211, 98], Math.min(x, y, 15 - x, 15 - y) < 2 ? -30 : (hash(x, y) - 0.5) * 12), 0.4, 0, 225) },
  ];
}

export function authorModel() {
  const bones = [{ name: 'head', pivot: [0, 24, 0] }];
  const bone = (name, pivot = [0, 24, 0], rotation) => {
    const b = { name, parent: 'head', pivot, cubes: [] };
    if (rotation) b.rotation = rotation;
    bones.push(b); return b;
  };
  const add = (b, name, origin, size, surface, extra = {}) => {
    const c = { name, origin: origin.map(round), size: size.map(round), surface, ...extra };
    b.cubes.push(c); return c;
  };
  // A solid rectangular rod between two XY points; rotation convention is Bedrock.
  const rod = (b, name, p, q, z, width, depth, surface) => {
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const length = Math.hypot(dx, dy);
    const center = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, z];
    return add(b, name, [center[0] - width / 2, center[1] - length / 2, z - depth / 2], [width, length, depth], surface,
      { pivot: center.map(round), rotation: [0, 0, round(Math.atan2(dx, dy) * 180 / Math.PI)] });
  };

  // Two slightly inclined, physically thick shields. The aperture fits an 8-unit head.
  for (const back of [false, true]) {
    const z = back ? 4.3 : -4.75;
    const b = bone(back ? 'mitre_back' : 'mitre_front', [0, 30.5, back ? 4.75 : -4.75], [back ? 5 : -5, 0, 0]);
    const panelSurface = back ? 'back' : 'front';
    const face = back ? 'south' : 'north';
    add(b, 'lower_shield', [-4.75, 30.5, z], [9.5, 4, 0.45], 'lining', { panel: { surface: panelSurface, face } });
    // 16 half-unit steps form the pointed silhouette; shared Y coordinates avoid cracks.
    for (let i = 0; i < 16; i++) {
      const w = 9.5 - i * 0.5625;
      add(b, `crown_step_${i}`, [-w / 2, 34.5 + i * 0.5, z], [w, 0.5, 0.45], 'lining', { panel: { surface: panelSurface, face } });
    }
    const outerZ = back ? z + 0.51 : z - 0.06;
    rod(b, 'edge_left', [-4.72, 34.45], [-0.22, 42.28], outerZ, 0.22, 0.2, 'gold');
    rod(b, 'edge_right', [4.72, 34.45], [0.22, 42.28], outerZ, 0.22, 0.2, 'gold');
    for (const x of [-4.64, 4.64]) add(b, `side_seam_${x}`, [x - 0.1, 30.5, outerZ - 0.1], [0.2, 4.1, 0.2], 'gold');
    for (const y of [30.5, 32.15]) add(b, `hem_${y}`, [-4.75, y, outerZ - 0.1], [9.5, 0.16, 0.2], 'gold');
    for (const x of [-3.75, -2.25, -0.75, 0.75, 2.25, 3.75]) {
      add(b, `seed_pearl_${x}`, [x - 0.09, 31.25, outerZ - 0.16], [0.18, 0.18, 0.23], 'pearl');
    }
    if (!back) {
      // A pair of tall arches in actual relief; the fabric is visible through their openings.
      for (const cx of [-1.4, 1.4]) {
        const points = Array.from({ length: 13 }, (_, i) => {
          const t = i / 12 * Math.PI;
          return [cx - 1.4 * Math.cos(t), 32.9 + 4.35 * Math.sin(t)];
        });
        for (let i = 0; i < points.length - 1; i++) {
          rod(b, `arch_${cx}_${i}`, points[i], points[i + 1], outerZ - 0.15, 0.38, 0.24, 'arches');
        }
      }
      add(b, 'apex_stitch_vertical', [-0.07, 39.6, outerZ - 0.12], [0.14, 1.35, 0.12], 'gold');
      add(b, 'apex_stitch_crossbar', [-0.39, 40.35, outerZ - 0.13], [0.78, 0.14, 0.12], 'gold');
    } else {
      add(b, 'rear_cross_vertical', [-0.09, 34.35, outerZ - 0.02], [0.18,3.6,0.16], 'gold');
      add(b, 'rear_cross_horizontal', [-1, 36.75, outerZ + 0.015], [2,0.18,0.16], 'gold');
    }
  }

  const band = bone('mitre_gussets');
  for (const sign of [-1, 1]) {
    const x = sign < 0 ? -4.75 : 4.35;
    add(band, `side_${sign}`, [x, 30.5, -4.3], [0.4, 3.75, 8.6], 'side', { innerFace: sign < 0 ? 'east' : 'west' });
    for (const y of [30.5, 32.15]) add(band, `side_hem_${sign}_${y}`, [x - 0.025, y, -4.32], [0.45, 0.16, 8.64], 'gold');
    for (let i=0;i<2;i++) {
      const half=4.5-i*0.375;
      add(band, `folded_gusset_${sign}_${i}`, [sign<0?-half:half-0.4,34.25+i*0.75,-4.05], [0.4,0.75,8.1], 'gusset', {innerFace:sign<0?'east':'west'});
    }
  }

  // Irregular, staggered fans: each fry is a solid cuboid plus an individually browned tip.
  const fries = bone('fries');
  const sticks = [
    [-3.8,-2.4,6.0,0.64,-12,-10],[-2.7,-2.2,7.3,0.65,7,-5],[-1.45,-2.1,7.5,0.7,-8,4],
    [0,-2.2,7.1,0.65,9,-3],[1.4,-2.2,7.8,0.68,-6,7],[2.75,-2.15,6.5,0.7,8,10],[3.8,-2.2,5.6,0.65,-9,14],
    [-3.7,-0.3,7.6,0.72,3,-15],[-2.4,0,8.2,0.7,-6,-8],[-0.9,0,8.4,0.62,5,-3],
    [0.65,0,8.0,0.7,-8,4],[2.15,0,7.3,0.7,6,9],[3.6,-0.1,7.1,0.66,-3,16],
    [-3.7,2.1,6.5,0.72,12,-9],[-2.45,2.1,7.7,0.66,-6,-3],[-1.05,2.1,7.1,0.69,9,5],
    [0.4,2.2,8.1,0.63,-5,2],[1.8,2.2,7.0,0.72,8,10],[3.35,2.2,6.7,0.67,-7,8],
  ];
  sticks.forEach(([x,z,h,w,rx,rz], i) => {
    const y = 34.15 + (i % 3) * 0.18;
    const pivot = [x, y, z], rotation = [rx, (i % 5 - 2) * 7, rz];
    add(fries, `fry_${i}`, [x-w/2,y,z-w/2], [w,h-0.25,w], `fry${i%3}`, {pivot,rotation});
    add(fries, `fry_tip_${i}`, [x-w/2+0.035,y+h-0.25,z-w/2+0.035], [w-0.07,0.25,w-0.07], 'tip', {pivot,rotation});
  });

  // Independent ivory ribbons with folds, embroidered crosses and separated gilt fringe.
  for (const sign of [-1, 1]) {
    const b = bone(sign < 0 ? 'lappet_left' : 'lappet_right');
    const x = sign * 2.2;
    const pieces = [
      { y:26.5,h:4,z:4.76,rx:8,offset:0 },
      { y:22.5,h:4,z:5.32,rx:1,offset:64 },
      { y:20.5,h:2,z:5.4,rx:-7,offset:128 },
    ];
    for (const [i,p] of pieces.entries()) {
      add(b, `ribbon_${i}`, [x-1,p.y,p.z], [2,p.h,0.18], 'lappet', {
        pivot: [x,p.y+p.h,p.z], rotation:[p.rx,0,0], ribbonOffset:p.offset,
      });
    }
    for (let i = 0; i < 7; i++) {
      add(b, `fringe_${i}`, [x-0.91+i*0.27,19.5-(i%2)*0.12,5.14], [0.14,1.05+(i%2)*0.12,0.14], 'fringe');
    }
  }
  return { bones, fryCount: sticks.length };
}
