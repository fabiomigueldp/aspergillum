import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  BEDROCK_UNIT_SCALE,
  buildBedrockGeometry,
  findBoneGroup,
  resetBedrockPose,
} from '../src/shared/bedrock-geometry.js';

function material() {
  return new THREE.MeshBasicMaterial({ color: 0xffffff });
}

test('subtracts an external Bedrock pivot when grafting a bound geometry', () => {
  const built = buildBedrockGeometry({
    bones: [
      { name: 'aspergillum_bound', pivot: [0, 0, 0] },
      { name: 'presentation', parent: 'aspergillum_bound', pivot: [-6, 24, 1] },
    ],
  }, {
    identifier: 'geometry.test.bound',
    textureWidth: 16,
    textureHeight: 16,
  }, { default: material() }, {
    externalParentPivot: [-6, 15, 1],
    includePivots: false,
    includeLocators: false,
  });
  assert.deepEqual(findBoneGroup(built, 'aspergillum_bound').position.toArray(), [
    6 * BEDROCK_UNIT_SCALE,
    -15 * BEDROCK_UNIT_SCALE,
    -1 * BEDROCK_UNIT_SCALE,
  ]);
  assert.deepEqual(findBoneGroup(built, 'presentation').position.toArray(), [
    -6 * BEDROCK_UNIT_SCALE,
    24 * BEDROCK_UNIT_SCALE,
    1 * BEDROCK_UNIT_SCALE,
  ]);
});

test('resolves bone names case-insensitively and restores authored transforms', () => {
  const built = buildBedrockGeometry({
    bones: [{ name: 'rightArm', pivot: [-5, 22, 0], rotation: [1, 2, 3] }],
  }, {
    identifier: 'geometry.test.player',
    textureWidth: 64,
    textureHeight: 64,
  }, { default: material() }, { includePivots: false, includeLocators: false });
  const group = findBoneGroup(built, 'rightarm');
  assert.ok(group);
  const base = group.rotation.toArray();
  group.rotation.x += 1;
  resetBedrockPose(built.boneRecords);
  assert.deepEqual(group.rotation.toArray(), base);
});

test('returns mesh, locator and material records without relying on global renderer state', () => {
  const sharedMaterial = material();
  const built = buildBedrockGeometry({
    bones: [{
      name: 'root',
      pivot: [0, 0, 0],
      cubes: [{ origin: [0, 0, 0], size: [1, 1, 1], uv: [0, 0] }],
      locators: { tip: [0, 1, 0] },
    }],
  }, {
    identifier: 'geometry.test.records',
    textureWidth: 16,
    textureHeight: 16,
  }, { default: sharedMaterial });
  assert.equal(built.meshRecords.length, 1);
  assert.equal(built.locatorRecords.length, 1);
  assert.equal(built.materials.has(sharedMaterial), true);
  assert.equal(built.boneRecords.length, 1);
});
