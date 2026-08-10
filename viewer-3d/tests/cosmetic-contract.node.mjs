import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cosmeticLabel,
  cosmeticTextureSuffix,
  resolveCosmetic,
  resolveCosmetics,
} from '../src/shared/cosmetic-contract.js';

const cosmetics = [
  { id: 'classic', metal: 'silver', grip: 'chestnut', index: 0 },
  { id: 'gilded_black', metal: 'gilded', grip: 'black', index: 1 },
];

test('resolves the classic finish by default and preserves requested order', () => {
  assert.equal(resolveCosmetic(cosmetics).id, 'classic');
  assert.deepEqual(
    resolveCosmetics(cosmetics, ['gilded_black', 'classic']).map(({ id }) => id),
    ['gilded_black', 'classic'],
  );
});

test('provides readable finish labels and stable texture suffixes', () => {
  assert.equal(cosmeticLabel(cosmetics[0]), 'Prata clássica · Couro castanho');
  assert.equal(cosmeticTextureSuffix(cosmetics[0]), '');
  assert.equal(cosmeticTextureSuffix(cosmetics[1]), '_gilded_black');
});

test('rejects an unknown finish instead of silently capturing the classic one', () => {
  assert.throws(() => resolveCosmetic(cosmetics, 'missing'), /Acabamento desconhecido/);
});
