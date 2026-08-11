import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AVATAR_BINDING_CHAIN,
  AVATAR_CAPTURE_VIEWS,
  AVATAR_MODELS,
  ASPERGILLUM_EMPIRICAL_GRIP,
  DEFAULT_AVATAR_PRESET,
  createMinecraftSkinUv,
  createPlayerGeometry,
  inferSkinModelFromRgba,
  normalizeAvatarRecipe,
  resolveAvatarCaptureViews,
  validateSkinDimensions,
} from '../src/shared/avatar-contract.js';

test('pins the supplied clerical skin as the wide default preset', () => {
  assert.equal(DEFAULT_AVATAR_PRESET.skin, 'avatar-library/batina_preta_com_pelerine.png');
  assert.equal(DEFAULT_AVATAR_PRESET.model, 'wide');
  assert.equal(DEFAULT_AVATAR_PRESET.width, 128);
  assert.equal(DEFAULT_AVATAR_PRESET.height, 128);
  assert.equal(DEFAULT_AVATAR_PRESET.sha256, 'b2ad2e38d47616f9f5b245d212786cfc64a15097845fc63c9127d97cbc11ae2b');
  assert.deepEqual(ASPERGILLUM_EMPIRICAL_GRIP, [-6, 24, 1]);
});

test('defines distinct canonical right arm and rightItem pivots for wide and slim rigs', () => {
  assert.deepEqual(AVATAR_MODELS.wide.rightArmPivot, [-5, 22, 0]);
  assert.deepEqual(AVATAR_MODELS.wide.rightItemPivot, [-6, 15, 1]);
  assert.deepEqual(AVATAR_MODELS.slim.rightArmPivot, [-5, 21.5, 0]);
  assert.deepEqual(AVATAR_MODELS.slim.rightItemPivot, [-6, 14.5, 1]);
  assert.equal(AVATAR_MODELS.wide.armWidth, 4);
  assert.equal(AVATAR_MODELS.slim.armWidth, 3);
});

test('builds a player geometry with the exact rightItem hierarchy and standard skin UVs', () => {
  for (const model of ['wide', 'slim']) {
    const geometry = createPlayerGeometry(model);
    const byName = new Map(geometry.bones.map((bone) => [bone.name, bone]));
    assert.equal(byName.get('rightArm').parent, 'body');
    assert.equal(byName.get('rightItem').parent, 'rightArm');
    assert.deepEqual(byName.get('rightItem').pivot, AVATAR_MODELS[model].rightItemPivot);
    assert.deepEqual(byName.get('rightArm').cubes[0].uv, createMinecraftSkinUv(
      [40, 16],
      [AVATAR_MODELS[model].armWidth, 12, 4],
    ));
    assert.deepEqual(byName.get('rightSleeve').cubes[0].uv, createMinecraftSkinUv(
      [40, 32],
      [AVATAR_MODELS[model].armWidth, 12, 4],
    ));
    assert.equal(byName.get('rightArm').cubes[0].size[0], AVATAR_MODELS[model].armWidth);
    assert.equal(geometry.description.texture_width, 64);
  }
});

test('maps the complete Minecraft skin toward the avatar visual front', () => {
  const uv = createMinecraftSkinUv([0, 0], [8, 8, 8]);
  assert.deepEqual(uv.south, { uv: [8, 8], uv_size: [8, 8] });
  assert.deepEqual(uv.north, { uv: [24, 8], uv_size: [8, 8] });
  assert.deepEqual(uv.east, { uv: [16, 8], uv_size: [8, 8] });
  assert.deepEqual(uv.west, { uv: [0, 8], uv_size: [8, 8] });
  assert.deepEqual(uv.up, { uv: [8, 0], uv_size: [8, 8] });
  assert.deepEqual(uv.down, { uv: [16, 8], uv_size: [8, -8] });
});

test('normalizes a reproducible scene recipe without mutating gameplay state', () => {
  const recipe = normalizeAvatarRecipe({
    model: 'slim',
    action: 'sprinkle',
    time: 3,
    perspective: 'first',
    material: 'classic',
    outerLayers: false,
  });
  assert.equal(recipe.schemaVersion, 1);
  assert.equal(recipe.avatar.model, 'slim');
  assert.equal(recipe.avatar.outerLayers, false);
  assert.equal(recipe.presentation.time, 0.9);
  assert.equal(recipe.presentation.duration, 0.9);
  assert.equal(recipe.equipment.targetBone, 'rightItem');
  assert.equal(recipe.equipment.binding, 'q.item_slot_to_bone_name(context.item_slot)');
  assert.deepEqual(AVATAR_BINDING_CHAIN.slice(-3), [
    'aspergillum_bound',
    'aspergillum_presentation',
    'aspergillum_action',
  ]);
});

test('validates modern square skins and resolves capture views in requested order', () => {
  assert.equal(validateSkinDimensions(64, 64), true);
  assert.equal(validateSkinDimensions(128, 128), true);
  assert.equal(validateSkinDimensions(64, 32), false);
  assert.equal(validateSkinDimensions(256, 256), false);
  assert.deepEqual(resolveAvatarCaptureViews(['grip', 'front']).map(({ id }) => id), ['grip', 'front']);
  assert.equal(AVATAR_CAPTURE_VIEWS.some(({ id }) => id === 'first-person'), true);
  assert.throws(() => resolveAvatarCaptureViews(['unknown']), /desconhecida/);
});

test('infers slim only from transparent reserved arm strips and keeps the result advisory', () => {
  const wide = new Uint8Array(64 * 64 * 4).fill(255);
  assert.deepEqual(inferSkinModelFromRgba(wide, 64, 64), {
    model: 'wide',
    method: 'reserved-arm-alpha',
    authoritative: false,
  });
  const slim = wide.slice();
  for (const [x, y, width, height] of [[50, 16, 2, 4], [54, 20, 2, 12], [42, 48, 2, 4], [46, 52, 2, 12]]) {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) slim[((py * 64) + px) * 4 + 3] = 0;
    }
  }
  assert.equal(inferSkinModelFromRgba(slim, 64, 64).model, 'slim');
  assert.throws(() => inferSkinModelFromRgba(slim, 32, 32), /não suportada/);
});
