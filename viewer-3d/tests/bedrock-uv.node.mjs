import assert from 'node:assert/strict';
import test from 'node:test';
import {
  THREE_BOX_FACE_ORDER,
  getBedrockFaceRect,
  writeBedrockFaceUvs,
} from '../src/shared/bedrock-uv.js';

function captureUvs(rect, textureWidth = 64, textureHeight = 64) {
  const values = [];
  const attribute = {
    setXY(index, u, v) {
      values[index] = [u, v];
    },
  };
  writeBedrockFaceUvs(attribute, 0, rect, textureWidth, textureHeight);
  return values;
}

test('matches THREE.BoxGeometry row-major vertex order without diagonal shear', () => {
  assert.deepEqual(captureUvs([16, 8, 4, 2]), [
    [0.25, 0.875],
    [0.3125, 0.875],
    [0.25, 0.84375],
    [0.3125, 0.84375],
  ]);
});

test('preserves signed uv_size for horizontal and vertical Bedrock mirroring', () => {
  assert.deepEqual(captureUvs([20, 10, -4, -2]), [
    [0.3125, 0.84375],
    [0.25, 0.84375],
    [0.3125, 0.875],
    [0.25, 0.875],
  ]);
});

test('maps THREE +Z to Bedrock south and -Z to north', () => {
  assert.deepEqual(THREE_BOX_FACE_ORDER, ['east', 'west', 'up', 'down', 'south', 'north']);
});

test('expands Bedrock Box UV into the six canonical face rectangles', () => {
  const uv = [10, 20];
  const size = [4, 2, 3];
  assert.deepEqual(getBedrockFaceRect(uv, 'east', size).rect, [10, 23, 3, 2]);
  assert.deepEqual(getBedrockFaceRect(uv, 'west', size).rect, [17, 23, 3, 2]);
  assert.deepEqual(getBedrockFaceRect(uv, 'up', size).rect, [13, 20, 4, 3]);
  assert.deepEqual(getBedrockFaceRect(uv, 'down', size).rect, [17, 20, 4, 3]);
  assert.deepEqual(getBedrockFaceRect(uv, 'north', size).rect, [13, 23, 4, 2]);
  assert.deepEqual(getBedrockFaceRect(uv, 'south', size).rect, [20, 23, 4, 2]);
});

test('uses explicit per-face uv_size and material instance without quantizing', () => {
  const result = getBedrockFaceRect({
    north: {
      uv: [6, 7],
      uv_size: [-3, 2],
      material_instance: 'water',
    },
  }, 'north', [4, 2, 3]);
  assert.deepEqual(result, {
    rect: [6, 7, -3, 2],
    materialInstance: 'water',
  });
});

test('treats an omitted per-face UV as an intentionally unrendered Bedrock face', () => {
  assert.equal(getBedrockFaceRect({
    up: { uv: [4, 4], uv_size: [2, 2] },
  }, 'down', [2, 2, 2]), null);
});
