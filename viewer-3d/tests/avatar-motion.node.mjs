import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateAvatarPose,
  evaluateFirstPersonAttack,
  evaluateRecoveryBridge,
  evaluateVanillaAttack,
  hermiteBlend,
  loadEnvelope,
  sampleAnimationChannel,
} from '../src/shared/avatar-motion.js';

test('matches the bounded Hermite load envelope used by the pack', () => {
  assert.equal(hermiteBlend(0), 0);
  assert.equal(hermiteBlend(1), 1);
  assert.equal(hermiteBlend(0.5), 0.5);
  assert.equal(loadEnvelope(0.04), 0);
  assert.equal(loadEnvelope(0.46), 1);
  assert.equal(loadEnvelope(0.54), 1);
  assert.equal(loadEnvelope(0.78), 0);
});

test('keeps the approved third-person hold and composes load over the vanilla first-person viewmodel', () => {
  assert.deepEqual(evaluateAvatarPose().bones.rightArm.rotation, [-18, 0, 0]);
  const third = evaluateAvatarPose({ action: 'load', time: 0.5, perspective: 'third' });
  const first = evaluateAvatarPose({ action: 'load', time: 0.5, perspective: 'first' });
  assert.deepEqual(third.bones.rightArm.rotation, [-38, -4, 3]);
  assert.deepEqual(first.bones.rightArm.position, [13.5, -10, 12]);
  assert.deepEqual(first.bones.rightArm.rotation, [88.6, -46.28, 115.96]);
  assert.deepEqual(first.bones.rightItem.position, [0, 0, -1]);
});

test('reproduces the bounded vanilla first-person attack curve independently', () => {
  assert.deepEqual(evaluateFirstPersonAttack(0).position, [0, 0, 0]);
  assert.deepEqual(evaluateFirstPersonAttack(1).rotation, [0, 0, 0]);
  const attack = evaluateFirstPersonAttack(0.5);
  assert.ok(attack.position.some((value) => Math.abs(value) > 0.1));
  assert.ok(attack.rotation.some((value) => Math.abs(value) > 1));
  const pose = evaluateAvatarPose({ action: 'sprinkle', time: 0.45, perspective: 'first' });
  assert.equal(pose.attackTime, 0.5);
  assert.notDeepEqual(pose.bones.rightArm.position, [13.5, -10, 12]);
});

test('models the vanilla attack curve and third-person recovery bridge independently', () => {
  assert.deepEqual(evaluateVanillaAttack(0).rightArm, [0, 0, 0]);
  assert.deepEqual(evaluateVanillaAttack(1).rightArm, [0, 0, 0]);
  assert.equal(evaluateRecoveryBridge(0.75, 'first'), 0);
  assert.equal(evaluateRecoveryBridge(0.5, 'third'), 0);
  assert.ok(evaluateRecoveryBridge(0.75, 'third') > 0);
  const pose = evaluateAvatarPose({ action: 'sprinkle', time: 0.45, perspective: 'third' });
  assert.equal(pose.attackTime, 0.5);
  assert.ok(pose.bones.rightArm.rotation[0] < -18);
});

test('samples numeric Bedrock channels with linear, step and Catmull-Rom interpolation', () => {
  assert.deepEqual(sampleAnimationChannel([1, 2, 3], 0.5, 1), [1, 2, 3]);
  assert.deepEqual(sampleAnimationChannel({
    0: { post: [0, 0, 0], lerp_mode: 'step' },
    1: { post: [10, 10, 10], lerp_mode: 'step' },
  }, 0.5, 1), [0, 0, 0]);
  assert.deepEqual(sampleAnimationChannel({ 0: [0, 0, 0], 1: [10, 20, 30] }, 0.5, 1), [5, 10, 15]);
  const catmull = sampleAnimationChannel({
    0: { post: [0, 0, 0], lerp_mode: 'catmullrom' },
    0.5: { post: [2, 0, 0], lerp_mode: 'catmullrom' },
    1: { post: [0, 0, 0], lerp_mode: 'catmullrom' },
  }, 0.5, 1);
  assert.deepEqual(catmull, [2, 0, 0]);
});
