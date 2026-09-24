import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractBedrockGeometries,
  findBedrockGeometry,
  modelIdFromSource,
  normalizeTextureStem,
} from '../src/shared/bedrock-document.js';

test('normaliza documentos minecraft:geometry modernos', () => {
  const geometry = { description: { identifier: 'geometry.modern' }, bones: [] };
  assert.deepEqual(extractBedrockGeometries({ 'minecraft:geometry': [geometry] }), [geometry]);
  assert.equal(findBedrockGeometry({ 'minecraft:geometry': [geometry] }, 'geometry.modern'), geometry);
});

test('normaliza geometrias Bedrock legadas sem perder bones', () => {
  const document = {
    format_version: '1.10.0',
    'geometry.legacy': { texturewidth: 32, textureheight: 64, bones: [{ name: 'head' }] },
  };
  const [geometry] = extractBedrockGeometries(document);
  assert.equal(geometry.description.identifier, 'geometry.legacy');
  assert.equal(geometry.description.texture_width, 32);
  assert.equal(geometry.description.texture_height, 64);
  assert.equal(geometry.bones[0].name, 'head');
});

test('gera IDs estáveis para .json e .geo.json e normaliza texturas', () => {
  assert.equal(modelIdFromSource('entity/aspergillum.geo.json'), 'entity__aspergillum');
  assert.equal(modelIdFromSource('entity/pa_mitra.json'), 'entity__pa_mitra');
  assert.equal(normalizeTextureStem('textures/entity/foo.texture_set.json'), 'textures/entity/foo');
});
