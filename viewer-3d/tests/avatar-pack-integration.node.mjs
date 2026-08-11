import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  ASPERGILLUM_EMPIRICAL_GRIP,
  DEFAULT_AVATAR_PRESET,
} from '../src/shared/avatar-contract.js';

const viewerDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDirectory = path.resolve(viewerDirectory, '..');

test('ships the requested default skin byte-for-byte under the tool-only avatar library', async () => {
  const bytes = await readFile(path.join(viewerDirectory, 'public', DEFAULT_AVATAR_PRESET.skin));
  const catalog = JSON.parse(await readFile(
    path.join(viewerDirectory, 'public', 'avatar-library', 'presets.json'),
    'utf8',
  ));
  assert.equal(bytes.readUInt32BE(16), 128);
  assert.equal(bytes.readUInt32BE(20), 128);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), DEFAULT_AVATAR_PRESET.sha256);
  assert.equal(catalog.default, DEFAULT_AVATAR_PRESET.id);
  assert.deepEqual(catalog.presets[0], {
    id: DEFAULT_AVATAR_PRESET.id,
    label: DEFAULT_AVATAR_PRESET.label,
    file: 'batina_preta_com_pelerine.png',
    width: DEFAULT_AVATAR_PRESET.width,
    height: DEFAULT_AVATAR_PRESET.height,
    model: DEFAULT_AVATAR_PRESET.model,
    sha256: DEFAULT_AVATAR_PRESET.sha256,
  });
});

test('resolves the protected attachable binding and empirical grip from authoritative pack sources', async () => {
  const geometryFile = JSON.parse(await readFile(
    path.join(projectDirectory, 'packs', 'resource', 'models', 'entity', 'aspergillum.geo.json'),
    'utf8',
  ));
  const geometry = geometryFile['minecraft:geometry'][0];
  const byName = new Map(geometry.bones.map((bone) => [bone.name, bone]));
  assert.equal(geometryFile.format_version, '1.16.0');
  assert.equal(byName.get('aspergillum_bound').binding, 'q.item_slot_to_bone_name(context.item_slot)');
  assert.deepEqual(byName.get('aspergillum_bound').cubes, undefined);
  assert.deepEqual(byName.get('aspergillum_presentation').pivot, ASPERGILLUM_EMPIRICAL_GRIP);
  assert.equal(byName.get('aspergillum_presentation').parent, 'aspergillum_bound');
  assert.equal(byName.get('aspergillum_action').parent, 'aspergillum_presentation');
});
