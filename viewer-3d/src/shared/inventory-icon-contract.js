export const INVENTORY_ICON_RENDERER_VERSION = 1;

export const INVENTORY_ICON_CONFIG = Object.freeze({
  subject: 'aspergillum',
  material: 'pbr',
  lighting: 'inventory',
  transparent: true,
  water: 'empty',
  pose: 'neutral',
  view: 'front-right',
  framing: Object.freeze({
    distanceScale: 0.86,
    targetOffset: Object.freeze([0, 0, 0]),
    direction: Object.freeze([1, 0.58, 1]),
    up: Object.freeze([0, 1, 0]),
  }),
  sourceSize: 512,
  outputSize: 32,
  contentSize: 29,
  rotationDegrees: 35,
  samplesPerAxis: 4,
  sourceAlphaThreshold: 8,
  outline: Object.freeze({
    radius: 1,
    color: Object.freeze([27, 33, 32, 224]),
  }),
});

export function inventoryIconFileName(cosmetic) {
  return cosmetic.id === 'classic'
    ? 'aspergillum.png'
    : `aspergillum_${cosmetic.id}.png`;
}
