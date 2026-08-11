import * as THREE from 'three';
import {
  THREE_BOX_FACE_ORDER,
  getBedrockFaceRect,
  writeBedrockFaceUvs,
} from './bedrock-uv.js';

export const BEDROCK_UNIT_SCALE = 1 / 16;

export function canonicalBoneName(name) {
  return String(name ?? '').toLowerCase();
}

function createMarker(radius, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 }),
  );
}

function createCubeMesh(cube, bone, geometrySummary, palette, scale) {
  const size = cube.size ?? [1, 1, 1];
  const origin = cube.origin ?? [0, 0, 0];
  const inflate = Number(cube.inflate) || 0;
  const inflatedSize = size.map((value) => value + (inflate * 2));
  const inflatedOrigin = origin.map((value) => value - inflate);
  const bonePivot = bone.pivot ?? [0, 0, 0];
  const pivot = cube.pivot ?? bonePivot;
  const center = inflatedOrigin.map((value, index) => value + (inflatedSize[index] / 2));
  const cubeGroup = new THREE.Group();
  cubeGroup.name = `cube:${bone.name}`;
  cubeGroup.userData = { type: 'cube-transform', boneName: bone.name };
  cubeGroup.position.set(
    (pivot[0] - bonePivot[0]) * scale,
    (pivot[1] - bonePivot[1]) * scale,
    (pivot[2] - bonePivot[2]) * scale,
  );
  if (cube.rotation) {
    cubeGroup.rotation.set(
      THREE.MathUtils.degToRad(cube.rotation[0] ?? 0),
      THREE.MathUtils.degToRad(cube.rotation[1] ?? 0),
      THREE.MathUtils.degToRad(cube.rotation[2] ?? 0),
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
  mesh.position.set(
    (center[0] - pivot[0]) * scale,
    (center[1] - pivot[1]) * scale,
    (center[2] - pivot[2]) * scale,
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
    group.position.set(
      (pivot[0] - parentPivot[0]) * scale,
      (pivot[1] - parentPivot[1]) * scale,
      (pivot[2] - parentPivot[2]) * scale,
    );
    group.rotation.set(
      THREE.MathUtils.degToRad(bone.rotation?.[0] ?? 0),
      THREE.MathUtils.degToRad(bone.rotation?.[1] ?? 0),
      THREE.MathUtils.degToRad(bone.rotation?.[2] ?? 0),
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
      const cubeResult = createCubeMesh(cube, bone, geometrySummary, palette, scale);
      group.add(cubeResult.cubeGroup);
      meshRecords.push({ mesh: cubeResult.mesh, boneName: bone.name });
      cubeResult.materials.forEach((material) => materials.add(material));
    }

    if (includeLocators) {
      for (const [locatorName, locator] of Object.entries(bone.locators ?? {})) {
        const marker = createMarker(0.042, 0xf1c46f);
        marker.name = `locator:${locatorName}`;
        marker.position.set(
          (locator[0] - pivot[0]) * scale,
          (locator[1] - pivot[1]) * scale,
          (locator[2] - pivot[2]) * scale,
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
