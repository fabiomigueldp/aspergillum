/**
 * Material-group order emitted by THREE.BoxGeometry:
 * +X, -X, +Y, -Y, +Z, -Z.
 * Bedrock names +Z as south and -Z as north.
 */
export const THREE_BOX_FACE_ORDER = Object.freeze([
  'east',
  'west',
  'up',
  'down',
  'south',
  'north',
]);

export function getBedrockFaceRect(uvDefinition, faceName, size) {
  const [sizeX, sizeY, sizeZ] = size;
  const defaultUv = Array.isArray(uvDefinition) ? uvDefinition : [0, 0];
  const defaultRects = {
    east: [defaultUv[0], defaultUv[1] + sizeZ, sizeZ, sizeY],
    west: [defaultUv[0] + sizeZ + sizeX, defaultUv[1] + sizeZ, sizeZ, sizeY],
    up: [defaultUv[0] + sizeZ, defaultUv[1], sizeX, sizeZ],
    down: [defaultUv[0] + sizeZ + sizeX, defaultUv[1], sizeX, sizeZ],
    north: [defaultUv[0] + sizeZ, defaultUv[1] + sizeZ, sizeX, sizeY],
    south: [defaultUv[0] + sizeZ + sizeX + sizeZ, defaultUv[1] + sizeZ, sizeX, sizeY],
  };

  if (!uvDefinition || Array.isArray(uvDefinition)) {
    return {
      rect: defaultRects[faceName],
      materialInstance: 'default',
    };
  }

  const faceDefinition = uvDefinition[faceName] ?? {};
  const faceUv = faceDefinition.uv ?? defaultUv;
  const faceSize = faceDefinition.uv_size ?? defaultRects[faceName].slice(2);
  return {
    rect: [faceUv[0], faceUv[1], faceSize[0], faceSize[1]],
    materialInstance: faceDefinition.material_instance ?? 'default',
  };
}

/**
 * THREE.BoxGeometry stores each face as two vertex rows:
 * 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right.
 * Keep that order so both indexed triangles interpolate the same rectangle.
 * Signed uv_size values are intentionally preserved for Bedrock mirroring.
 */
export function writeBedrockFaceUvs(attribute, offset, rect, textureWidth, textureHeight) {
  const [u, v, width, height] = rect;
  const uStart = u / textureWidth;
  const uEnd = (u + width) / textureWidth;
  const vStart = 1 - (v / textureHeight);
  const vEnd = 1 - ((v + height) / textureHeight);

  attribute.setXY(offset, uStart, vStart);
  attribute.setXY(offset + 1, uEnd, vStart);
  attribute.setXY(offset + 2, uStart, vEnd);
  attribute.setXY(offset + 3, uEnd, vEnd);
}
