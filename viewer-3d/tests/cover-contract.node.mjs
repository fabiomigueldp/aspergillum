import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COVER_PRESETS,
  COVER_RENDERER_VERSION,
  createCoverSearchParams,
  normalizeCoverConfig,
} from '../src/shared/cover-contract.js';

test('defines a deterministic docked sacristy cover preset', () => {
  const config = normalizeCoverConfig();
  assert.equal(COVER_RENDERER_VERSION, 1);
  assert.equal(config.title, 'ASPERGILLUM');
  assert.equal(config.subject, 'docked');
  assert.equal(config.lighting, 'cinematic');
  assert.equal(config.material, 'pbr');
  assert.equal(config.water, 'full');
  assert.deepEqual(config.framing.targetOffset, [0, 0.03, 0]);
  assert.deepEqual(config.framing.direction, [1, 1.08, 1]);
  assert.equal(COVER_PRESETS.sacristy.framing.distanceScale, 0.9);
});

test('normalizes title whitespace and casing without changing the requested finish', () => {
  const config = normalizeCoverConfig({
    title: '  Aspergillum  ',
    cosmetic: 'antique_oxblood',
    material: 'classic',
    water: 'high',
  });
  assert.equal(config.title, 'ASPERGILLUM');
  assert.equal(config.cosmetic, 'antique_oxblood');
  assert.equal(config.material, 'classic');
  assert.equal(config.water, 'high');
});

test('keeps the authored default camera but honors an explicitly requested capture view', () => {
  assert.deepEqual(normalizeCoverConfig().framing.direction, [1, 1.08, 1]);
  assert.deepEqual(normalizeCoverConfig({ view: 'right' }).framing.direction, [1, 0, 0]);
  assert.deepEqual(normalizeCoverConfig({ view: 'top' }).framing.up, [0, 0, -1]);
});

test('rejects unsafe or unsupported cover parameters', () => {
  assert.throws(() => normalizeCoverConfig({ title: '<img>' }), /caracteres/);
  assert.throws(() => normalizeCoverConfig({ title: 'A'.repeat(25) }), /24/);
  assert.throws(() => normalizeCoverConfig({ preset: 'neon' }), /Preset/);
  assert.throws(() => normalizeCoverConfig({ cosmetic: '../classic' }), /acabamento/);
  assert.throws(() => normalizeCoverConfig({ water: 'empty' }), /água visível/);
  assert.throws(() => normalizeCoverConfig({ view: 'inventada' }), /Vista/);
});

test('serializes a stable browser query', () => {
  assert.equal(
    createCoverSearchParams({ title: 'Aspergillum' }).toString(),
    'title=ASPERGILLUM&preset=sacristy&cosmetic=classic&material=pbr&water=full&view=front-right',
  );
});
