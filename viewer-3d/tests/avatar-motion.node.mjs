import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateAvatarPose,
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

test('keeps the approved holding pose and applies first-person load weight only to load motion', () => {
  assert.deepEqual(evaluateAvatarPose().bones.rightArm.rotation, [-18, 0, 0]);
  const third = evaluateAvatarPose({ action: 'load', time: 0.5, perspective: 'third' });
  const first = evaluateAvatarPose({ action: 'load', time: 0.5, perspective: 'first' });
  assert.deepEqual(third.bones.rightArm.rotation, [-38, -4, 3]);
  assert.deepEqual(first.bones.rightArm.rotation, [-24.4, -1.28, 0.96]);
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
