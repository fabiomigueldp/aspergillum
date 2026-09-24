import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  BEDROCK_GEOMETRY_BASIS,
  buildBedrockGeometry,
  findBoneGroup,
} from '../src/shared/bedrock-geometry.js';
import {
  applyEquipmentVisualBasis,
  graftEquipmentBones,
} from '../src/shared/avatar-equipment.js';
import { createPlayerGeometry } from '../src/shared/avatar-contract.js';

const material = { default: null };

function build(geometry, coordinateBasis = BEDROCK_GEOMETRY_BASIS.BEDROCK) {
  return buildBedrockGeometry(geometry, {
    identifier: geometry.description.identifier,
    textureWidth: geometry.description.texture_width ?? 64,
    textureHeight: geometry.description.texture_height ?? 64,
  }, material, { includePivots: false, includeLocators: false, coordinateBasis });
}

function buildPlayer() {
  return build(createPlayerGeometry('wide'), BEDROCK_GEOMETRY_BASIS.LEGACY_VIEWER);
}

test('grafts a head wearable at the matching player pivot', () => {
  const player = buildPlayer();
  const equipment = build({
    description: { identifier: 'geometry.test.head', texture_width: 16, texture_height: 16 },
    bones: [{ name: 'head', pivot: [0, 24, 0], cubes: [{ origin: [-1, 31, -1], size: [2, 1, 2], uv: [0, 0] }] }],
  });
  const [graft] = graftEquipmentBones(player, equipment);
  assert.equal(graft.boneName, 'head');
  assert.equal(findBoneGroup(equipment, 'head').parent, findBoneGroup(player, 'head'));
  assert.deepEqual(findBoneGroup(equipment, 'head').position.toArray(), [0, 0, 0]);
});

test('maps every nested matching branch to the corresponding animated player bone', () => {
  const player = buildPlayer();
  const equipment = build({
    description: { identifier: 'geometry.test.chest', texture_width: 16, texture_height: 16 },
    bones: [
      { name: 'group', pivot: [0, 12, 0] },
      { name: 'Waist', parent: 'group', pivot: [0, 12, 0] },
      { name: 'Body', parent: 'Waist', pivot: [0, 24, 0], cubes: [] },
    ],
  });
  const grafts = graftEquipmentBones(player, equipment);
  assert.deepEqual(grafts.map(({ boneName }) => boneName), ['Waist', 'Body']);
  assert.equal(findBoneGroup(equipment, 'Waist').parent, findBoneGroup(player, 'waist'));
  assert.equal(findBoneGroup(equipment, 'Body').parent, findBoneGroup(player, 'body'));
});

test('aligns a legacy zero-pivot helmet to the player head bone', () => {
  const player = buildPlayer();
  const equipment = build({
    description: { identifier: 'geometry.test.legacy-hat', texture_width: 16, texture_height: 16 },
    bones: [{ name: 'Head', pivot: [0, 0, 0], cubes: [{ origin: [-1, 9, -1], size: [2, 3, 2], uv: [0, 0] }] }],
  });
  graftEquipmentBones(player, equipment);
  assert.deepEqual(findBoneGroup(equipment, 'Head').position.toArray(), [0, 0, 0]);
  player.root.updateWorldMatrix(true, true);
  assert.deepEqual(findBoneGroup(equipment, 'Head').getWorldPosition(new THREE.Vector3()).toArray(), [0, 1.5, 0]);
});

test('converts the canonical Bedrock -Z equipment front into the viewer +Z basis once', () => {
  const player = buildPlayer();
  const equipment = build({
    description: { identifier: 'geometry.test.basis', texture_width: 16, texture_height: 16 },
    bones: [
      { name: 'head', pivot: [0, 24, 0], cubes: [{ origin: [1, 24, -4], size: [1, 1, 1], uv: [0, 0] }] },
      { name: 'object', pivot: [0, 0, 0], cubes: [{ origin: [1, 0, -4], size: [1, 1, 1], uv: [0, 0] }] },
    ],
  });
  player.root.add(equipment.root);
  const grafts = graftEquipmentBones(player, equipment);
  applyEquipmentVisualBasis(equipment, grafts);
  const convertedForward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(findBoneGroup(equipment, 'head').quaternion);
  assert.ok(convertedForward.z > 0.999999);
  player.root.updateWorldMatrix(true, true);
  const headCube = equipment.meshRecords.find(({ boneName }) => boneName === 'head').mesh;
  const worldCenter = headCube.getWorldPosition(new THREE.Vector3());
  assert.ok(worldCenter.x < 0, `a base visual deve levar o item à mão direita: ${worldCenter.x}`);
  assert.ok(worldCenter.z > 0, `-Z Bedrock deveria aparecer na frente +Z: ${worldCenter.z}`);
});
