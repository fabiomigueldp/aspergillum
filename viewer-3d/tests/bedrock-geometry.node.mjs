import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  BEDROCK_GEOMETRY_BASIS,
  BEDROCK_UNIT_SCALE,
  bedrockAnimationPosition,
  bedrockAnimationRotation,
  bedrockAuthoredRotation,
  bedrockGeometryPoint,
  bedrockGeometryRotation,
  buildBedrockGeometry,
  findBoneGroup,
  resetBedrockPose,
  resolveBedrockCubePivot,
  usesUpsideDownCubePivot,
} from '../src/shared/bedrock-geometry.js';

function material() {
  return new THREE.MeshBasicMaterial({ color: 0xffffff });
}

test('converts Bedrock channels for the established third-person and canonical viewmodel bases', () => {
  assert.deepEqual(bedrockAnimationPosition([5, -1.5, -2.25]), [-5, -1.5, -2.25]);
  assert.deepEqual(bedrockAnimationRotation([10, 20, -12], 'third'), [10, -20, 12]);
  assert.deepEqual(bedrockAnimationRotation([10, 20, -12], 'first'), [-10, -20, -12]);
  assert.deepEqual(bedrockGeometryRotation([25, 0, -12], 'third'), [25, 0, 12]);
  assert.deepEqual(bedrockGeometryRotation([25, 0, -12], 'first'), [-25, 0, -12]);
});

test('converts authored Bedrock geometry into the Three.js coordinate basis', () => {
  assert.deepEqual(bedrockGeometryPoint([4, 12, -7]), [4, 12, -7]);
  assert.deepEqual(bedrockAuthoredRotation([15, -90, 90]), [-15, -90, -90]);
  assert.deepEqual(
    bedrockGeometryPoint([4, 12, -7], BEDROCK_GEOMETRY_BASIS.LEGACY_VIEWER),
    [4, 12, -7],
  );
});

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
    coordinateBasis: BEDROCK_GEOMETRY_BASIS.LEGACY_VIEWER,
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

test('honors the upside-down cube pivot convention unique to geometry 1.12', () => {
  const cube = { origin: [-4, 9, -4], size: [8, 4, 8], pivot: [-3, -23.875, 4] };
  assert.equal(usesUpsideDownCubePivot('1.12.0'), true);
  assert.equal(usesUpsideDownCubePivot('1.14.0'), false);
  // The 1.12 file already stores its inverted authoring value. Consuming it
  // verbatim is what reproduces Bedrock; negating Y again is a double flip.
  assert.deepEqual(resolveBedrockCubePivot(cube, { pivot: [0, 0, 0] }, '1.12.0'), [-3, -23.875, 4]);
  assert.deepEqual(resolveBedrockCubePivot(cube, { pivot: [0, 0, 0] }, '1.14.0'), [-3, -23.875, 4]);
});

test('keeps the rotated panels of a legacy 1.12 barrette assembled', () => {
  const cubes = [
    { origin: [-4, 9.12445, 4.54103], size: [8, 4, 5], pivot: [-3, -23.87555, 4.54103], rotation: [15, 0, 0], uv: [21, 4] },
    { origin: [-4, 9.12445, -9.54103], size: [8, 4, 5], pivot: [-3, -23.87555, -4.54103], rotation: [-15, 0, 0], uv: [0, 18] },
    { origin: [3.54103, 9.12445, -8], size: [8, 4, 5], pivot: [4.54103, -23.87555, -3], rotation: [-105, -90, 90], uv: [0, 9] },
    { origin: [-11.54103, 9.12445, -8], size: [8, 4, 5], pivot: [-4.54103, -23.87555, -3], rotation: [-105, 90, -90], uv: [0, 0] },
  ];
  const built = buildBedrockGeometry({
    bones: [{ name: 'Head', pivot: [0, 0, 0], cubes }],
  }, {
    identifier: 'geometry.test.barrette-1.12',
    formatVersion: '1.12.0',
    textureWidth: 64,
    textureHeight: 64,
  }, { default: material() }, {
    scale: 1,
    includePivots: false,
    includeLocators: false,
  });
  built.root.updateMatrixWorld(true);
  const centers = built.meshRecords.map(({ mesh }) => mesh.getWorldPosition(new THREE.Vector3()));
  const bounds = new THREE.Box3().setFromPoints(centers);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x < 4.3, `painéis se separaram em X: ${size.x}`);
  assert.ok(size.y < 0.01, `painéis se separaram em Y: ${size.y}`);
  assert.ok(size.z < 4.3, `painéis se separaram em Z: ${size.z}`);
  assert.ok(bounds.min.y > 10 && bounds.max.y < 11);
});

test('rotates a cube without an explicit pivot around its own center', () => {
  assert.deepEqual(resolveBedrockCubePivot(
    { origin: [2, 4, 6], size: [2, 4, 6], rotation: [0, 45, 0] },
    { pivot: [0, 0, 0] },
    '1.16.0',
  ), [3, 6, 9]);
});
