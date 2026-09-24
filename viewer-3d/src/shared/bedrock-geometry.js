import * as THREE from 'three';
import {
  THREE_BOX_FACE_ORDER,
  getBedrockFaceRect,
  writeBedrockFaceUvs,
} from './bedrock-uv.js';

export const BEDROCK_UNIT_SCALE = 1 / 16;
export const BEDROCK_EULER_ORDER = 'ZYX';
export const BEDROCK_GEOMETRY_EULER_ORDER = 'ZYX';
export const BEDROCK_GEOMETRY_BASIS = Object.freeze({
  BEDROCK: 'bedrock',
  LEGACY_VIEWER: 'legacy-viewer',
});

function negateNumber(value) {
  const number = Number(value) || 0;
  return number === 0 ? 0 : -number;
}

/**
 * Converts Bedrock animation translations into the visual coordinate system
 * used by our Three.js scene. The scene deliberately presents the player from
 * +Z, while Bedrock authoring uses the opposite handed X axis for animation
 * channels. Keeping this conversion explicit prevents pack data from being
 * "fixed" with compensating offsets in individual viewers.
 */
export function bedrockAnimationPosition(value = [0, 0, 0]) {
  return [negateNumber(value[0]), Number(value[1]) || 0, Number(value[2]) || 0];
}

/**
 * Bedrock's player curves are composed in ZYX order. Third-person assets in
 * this renderer use the established +Z inspection basis; the actual Bedrock
 * first-person viewmodel uses the canonical imported pitch sign.
 */
export function bedrockAnimationRotation(value = [0, 0, 0], perspective = 'third') {
  const x = Number(value[0]) || 0;
  const z = Number(value[2]) || 0;
  return [
    perspective === 'first' ? negateNumber(x) : x,
    negateNumber(value[1]),
    perspective === 'first' ? z : negateNumber(z),
  ];
}

export function bedrockGeometryRotation(value = [0, 0, 0], perspective = 'third') {
  const x = Number(value[0]) || 0;
  const z = Number(value[2]) || 0;
  return [
    perspective === 'first' ? negateNumber(x) : x,
    negateNumber(value[1]),
    perspective === 'first' ? z : negateNumber(z),
  ];
}

/**
 * Converts Bedrock's authored model coordinates into the viewer scene.
 *
 * This viewer intentionally keeps Bedrock positions verbatim. Its player-space
 * compositor performs the explicit 180° presentation-basis rotation later, so
 * reflecting X here would invert held-item handedness a second time. Authored
 * rotations still need a basis-aware sign conversion; applying only the outer
 * yaw makes unrotated boxes look plausible, but rotated cubes (notably legacy
 * hats) separate because their pivots are evaluated with incompatible Euler
 * signs.
 */
export function bedrockGeometryPoint(value = [0, 0, 0], basis = BEDROCK_GEOMETRY_BASIS.BEDROCK) {
  const point = [0, 1, 2].map((index) => Number(value[index]) || 0);
  void basis;
  return point;
}

export function bedrockAuthoredRotation(
  value = [0, 0, 0],
  basis = BEDROCK_GEOMETRY_BASIS.BEDROCK,
) {
  if (basis === BEDROCK_GEOMETRY_BASIS.LEGACY_VIEWER) {
    return bedrockGeometryRotation(value);
  }
  return [negateNumber(value[0]), Number(value[1]) || 0, negateNumber(value[2])];
}

function bedrockGeometryDelta(from, to, basis) {
  return bedrockGeometryPoint([
    (Number(from[0]) || 0) - (Number(to[0]) || 0),
    (Number(from[1]) || 0) - (Number(to[1]) || 0),
    (Number(from[2]) || 0) - (Number(to[2]) || 0),
  ], basis);
}

export function canonicalBoneName(name) {
  return String(name ?? '').toLowerCase();
}

function createMarker(radius, color) {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 6),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
    }),
  );
  marker.renderOrder = 100;
  return marker;
}

function versionParts(value) {
  return String(value ?? '').split('.').map((part) => Number(part) || 0);
}

export function usesUpsideDownCubePivot(formatVersion) {
  const [major, minor] = versionParts(formatVersion);
  return major === 1 && minor >= 12 && minor < 14;
}

export function resolveBedrockCubePivot(cube, bone, formatVersion) {
  if (!cube.pivot) return cube.origin?.map((value, index) => (
    Number(value) + ((Number(cube.size?.[index]) || 0) / 2)
  )) ?? bone.pivot ?? [0, 0, 0];
  // 1.12 serializes the cube pivot with its legacy upside-down convention.
  // The stored value is already the value consumed by the transform. Flipping
  // it here a second time breaks valid legacy models; 1.14+ simply authors the
  // corrected value. `formatVersion` remains part of this resolver so callers
  // can diagnose the convention without mutating pack data.
  void formatVersion;
  return cube.pivot.map((value) => Number(value) || 0);
}

function createCubeMesh(cube, bone, geometrySummary, palette, scale, coordinateBasis) {
  const size = cube.size ?? [1, 1, 1];
  const origin = cube.origin ?? [0, 0, 0];
  const inflate = Number(cube.inflate) || 0;
  const inflatedSize = size.map((value) => value + (inflate * 2));
  const inflatedOrigin = origin.map((value) => value - inflate);
  const bonePivot = bone.pivot ?? [0, 0, 0];
  const pivot = resolveBedrockCubePivot(cube, bone, geometrySummary.formatVersion);
  const center = inflatedOrigin.map((value, index) => value + (inflatedSize[index] / 2));
  const cubeGroup = new THREE.Group();
  cubeGroup.name = `cube:${bone.name}`;
  cubeGroup.userData = { type: 'cube-transform', boneName: bone.name };
  cubeGroup.position.fromArray(
    bedrockGeometryDelta(pivot, bonePivot, coordinateBasis).map((value) => value * scale),
  );
  if (cube.rotation) {
    const rotation = bedrockAuthoredRotation(cube.rotation, coordinateBasis);
    cubeGroup.rotation.set(
      THREE.MathUtils.degToRad(rotation[0]),
      THREE.MathUtils.degToRad(rotation[1]),
      THREE.MathUtils.degToRad(rotation[2]),
      BEDROCK_GEOMETRY_EULER_ORDER,
    );
  }

  const boxGeometry = new THREE.BoxGeometry(
    inflatedSize[0] * scale,
    inflatedSize[1] * scale,
    inflatedSize[2] * scale,
  );
  if (cube.mirror ?? bone.mirror) boxGeometry.scale(-1, 1, 1);

  const uvAttribute = boxGeometry.getAttribute('uv');
  boxGeometry.clearGroups();
  const materials = [...new Set([
    palette.default,
    palette.water,
    ...Object.values(palette.named ?? {}),
  ].filter(Boolean))];
  const materialIndex = new Map(materials.map((material, index) => [material, index]));

  for (let index = 0; index < THREE_BOX_FACE_ORDER.length; index += 1) {
    const faceName = THREE_BOX_FACE_ORDER[index];
    const face = getBedrockFaceRect(cube.uv, faceName, size);
    if (!face) continue;
    writeBedrockFaceUvs(
      uvAttribute,
      index * 4,
      face.rect,
      geometrySummary.textureWidth,
      geometrySummary.textureHeight,
    );
    const material = face.materialInstance === 'water'
      ? palette.water
      : palette.named?.[face.materialInstance] ?? palette.default;
    boxGeometry.addGroup(index * 6, 6, materialIndex.get(material) ?? 0);
  }
  uvAttribute.needsUpdate = true;

  const mesh = new THREE.Mesh(boxGeometry, materials);
  mesh.name = `${bone.name} / cube ${(bone.cubes ?? []).indexOf(cube) + 1}`;
  mesh.position.fromArray(
    bedrockGeometryDelta(center, pivot, coordinateBasis).map((value) => value * scale),
  );
  mesh.userData = { type: 'cube', boneName: bone.name, cube };
  cubeGroup.add(mesh);
  return { cubeGroup, mesh, materials };
}

/**
 * Builds a Bedrock bone hierarchy without global state. `externalParentPivot`
 * is the absolute Bedrock-space pivot of a foreign parent such as rightItem.
 * Subtracting it from each root pivot preserves the binding transform exactly.
 */
export function buildBedrockGeometry(
  geometryData,
  geometrySummary,
  palette,
  {
    scale = BEDROCK_UNIT_SCALE,
    externalParentPivot = [0, 0, 0],
    includePivots = true,
    includeLocators = true,
    coordinateBasis = BEDROCK_GEOMETRY_BASIS.BEDROCK,
  } = {},
) {
  const root = new THREE.Group();
  root.name = geometrySummary.identifier;
  root.userData = { type: 'model', identifier: geometrySummary.identifier };
  const bones = geometryData.bones ?? [];
  const children = new Map();
  const boneByName = new Map();
  for (const bone of bones) {
    const parentName = bone.parent ?? null;
    if (!children.has(parentName)) children.set(parentName, []);
    children.get(parentName).push(bone);
    boneByName.set(canonicalBoneName(bone.name), bone);
  }

  const boneGroups = new Map();
  const canonicalBoneGroups = new Map();
  const boneRecords = [];
  const meshRecords = [];
  const pivotRecords = [];
  const locatorRecords = [];
  const materials = new Set();

  function addBone(bone, parentGroup, parentPivot) {
    const pivot = bone.pivot ?? [0, 0, 0];
    const group = new THREE.Group();
    group.name = `bone:${bone.name}`;
    group.userData = { type: 'bone', boneName: bone.name, pivot: [...pivot] };
    group.position.fromArray(
      bedrockGeometryDelta(pivot, parentPivot, coordinateBasis).map((value) => value * scale),
    );
    const rotation = bedrockAuthoredRotation(bone.rotation, coordinateBasis);
    group.rotation.set(
      THREE.MathUtils.degToRad(rotation[0]),
      THREE.MathUtils.degToRad(rotation[1]),
      THREE.MathUtils.degToRad(rotation[2]),
      BEDROCK_GEOMETRY_EULER_ORDER,
    );
    group.visible = !bone.neverRender;
    parentGroup.add(group);
    boneGroups.set(bone.name, group);
    canonicalBoneGroups.set(canonicalBoneName(bone.name), group);

    if (includePivots) {
      const marker = createMarker(0.032, 0x74d9c3);
      marker.name = `pivot:${bone.name}`;
      marker.userData = { type: 'pivot', boneName: bone.name };
      group.add(marker);
      pivotRecords.push({ marker, boneName: bone.name });
    }

    for (const cube of bone.cubes ?? []) {
      const cubeResult = createCubeMesh(
        cube,
        bone,
        geometrySummary,
        palette,
        scale,
        coordinateBasis,
      );
      group.add(cubeResult.cubeGroup);
      meshRecords.push({ mesh: cubeResult.mesh, boneName: bone.name });
      cubeResult.materials.forEach((material) => materials.add(material));
    }

    if (includeLocators) {
      for (const [locatorName, locator] of Object.entries(bone.locators ?? {})) {
        const marker = createMarker(0.042, 0xf1c46f);
        marker.name = `locator:${locatorName}`;
        marker.position.fromArray(
          bedrockGeometryDelta(locator, pivot, coordinateBasis).map((value) => value * scale),
        );
        marker.userData = { type: 'locator', boneName: bone.name, locatorName };
        group.add(marker);
        locatorRecords.push({ marker, boneName: bone.name, locatorName, position: [...locator] });
      }
    }

    boneRecords.push({
      bone,
      group,
      pivot: [...pivot],
      basePosition: group.position.clone(),
      baseRotation: group.rotation.clone(),
      baseScale: group.scale.clone(),
    });

    for (const child of children.get(bone.name) ?? []) addBone(child, group, pivot);
  }

  for (const rootBone of children.get(null) ?? []) addBone(rootBone, root, externalParentPivot);
  for (const bone of bones) {
    if (!boneGroups.has(bone.name)) addBone(bone, root, externalParentPivot);
  }

  return {
    root,
    coordinateBasis,
    boneGroups,
    canonicalBoneGroups,
    boneByName,
    boneRecords,
    meshRecords,
    pivotRecords,
    locatorRecords,
    materials,
  };
}

export function findBoneGroup(built, boneName) {
  return built?.boneGroups?.get(boneName)
    ?? built?.canonicalBoneGroups?.get(canonicalBoneName(boneName))
    ?? null;
}

export function resetBedrockPose(boneRecords = []) {
  for (const record of boneRecords) {
    record.group.position.copy(record.basePosition);
    record.group.rotation.copy(record.baseRotation);
    record.group.scale.copy(record.baseScale);
  }
}

export function setPivotVisibility(pivotRecords = [], visible = false) {
  for (const { marker } of pivotRecords) marker.visible = visible;
}
