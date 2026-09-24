import * as THREE from 'three';
import {
  canonicalBoneName,
  findBoneGroup,
} from './bedrock-geometry.js';

export const PLAYER_EQUIPMENT_BONES = Object.freeze([
  'root',
  'waist',
  'body',
  'head',
  'hat',
  'leftarm',
  'rightarm',
  'leftleg',
  'rightleg',
  'leftitem',
  'rightitem',
]);
export const PLAYER_VISUAL_BASIS_YAW = Math.PI;

const playerBoneSet = new Set(PLAYER_EQUIPMENT_BONES);

export function equipmentMode(slot) {
  if (slot === 'head' || slot === 'chest') return 'wearable';
  if (slot === 'hand') return 'held-player-space';
  return 'overlay';
}

/**
 * Emulates Bedrock's attachable merge-by-bone behavior. A matching equipment
 * branch is grafted onto the player's bone pivot, while unmatched roots remain
 * in player-model space. This is essential for armor authored with independent
 * `head`, `body` or `waist` roots and for legacy hand assets with a free object
 * root next to the player skeleton.
 */
export function graftEquipmentBones(playerBuilt, equipmentBuilt) {
  const matchingRecords = equipmentBuilt.boneRecords.filter(({ bone }) => (
    playerBoneSet.has(canonicalBoneName(bone.name)) && findBoneGroup(playerBuilt, bone.name)
  ));
  const grafts = [];

  for (const record of matchingRecords) {
    const target = findBoneGroup(playerBuilt, record.bone.name);
    const sourcePivot = record.pivot ?? record.bone.pivot ?? [0, 0, 0];
    const targetPivot = target.userData.pivot ?? [0, 0, 0];
    target.add(record.group);
    // Bedrock synchronizes a matching attachable branch to the owner's bone.
    // Its authored pivot remains the local origin for cubes, but does not move
    // the merged branch back into absolute model space.
    record.group.position.set(0, 0, 0);
    record.basePosition.copy(record.group.position);
    grafts.push({
      boneName: record.bone.name,
      sourcePivot: [...sourcePivot],
      targetPivot: [...targetPivot],
      localOffset: record.group.position.toArray(),
      target,
      group: record.group,
    });
  }

  return grafts;
}

/**
 * The development player exposes its visual front on +Z so Minecraft skins
 * read correctly to the inspection camera. Bedrock player-space attachables
 * are authored against the canonical -Z front. This single basis conversion
 * maps the complete equipment graph instead of rotating individual assets.
 */
export function applyEquipmentVisualBasis(equipmentBuilt, grafts, yaw = PLAYER_VISUAL_BASIS_YAW) {
  const basis = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  equipmentBuilt.root.quaternion.premultiply(basis);
  equipmentBuilt.root.userData.visualBasisYaw = yaw;
  for (const graft of grafts) {
    graft.group.quaternion.premultiply(basis);
    const record = equipmentBuilt.boneRecords.find(({ group }) => group === graft.group);
    if (record) record.baseRotation.copy(graft.group.rotation);
    graft.visualBasisYaw = yaw;
  }
  return yaw;
}

export function equipmentAnchor(playerBuilt, slot) {
  const targetName = slot === 'head' ? 'head' : slot === 'chest' ? 'body' : slot === 'hand' ? 'rightItem' : 'root';
  const target = findBoneGroup(playerBuilt, targetName);
  return {
    targetName,
    target,
    pivot: target?.userData?.pivot ? [...target.userData.pivot] : [0, 0, 0],
  };
}

export function authoredPlayerBoneRotation(equipmentBuilt, boneName) {
  const record = equipmentBuilt?.boneRecords?.find(({ bone }) => (
    canonicalBoneName(bone.name) === canonicalBoneName(boneName)
  ));
  return record?.bone?.rotation ? [...record.bone.rotation] : null;
}

export function graftSnapshot(grafts = []) {
  return grafts.map(({ boneName, sourcePivot, targetPivot, group }) => ({
    boneName,
    sourcePivot,
    targetPivot,
    worldPosition: group.getWorldPosition(new THREE.Vector3()).toArray(),
  }));
}
