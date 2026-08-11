import assert from 'node:assert/strict';
import test from 'node:test';
import { PNG } from 'pngjs';
import {
  INVENTORY_ICON_CONFIG,
  INVENTORY_ICON_RENDERER_VERSION,
  inventoryIconFileName,
} from '../src/shared/inventory-icon-contract.js';
import {
  alphaBounds,
  renderInventoryIcon,
} from '../scripts/lib/inventory-icon-image.mjs';

test('defines a stable model-derived inventory icon preset', () => {
  assert.equal(INVENTORY_ICON_RENDERER_VERSION, 1);
  assert.equal(INVENTORY_ICON_CONFIG.subject, 'aspergillum');
  assert.equal(INVENTORY_ICON_CONFIG.material, 'pbr');
  assert.equal(INVENTORY_ICON_CONFIG.lighting, 'inventory');
  assert.equal(INVENTORY_ICON_CONFIG.transparent, true);
  assert.equal(INVENTORY_ICON_CONFIG.sourceSize, 512);
  assert.equal(INVENTORY_ICON_CONFIG.outputSize, 32);
  assert.equal(INVENTORY_ICON_CONFIG.rotationDegrees, 35);
  assert.deepEqual(INVENTORY_ICON_CONFIG.framing.direction, [1, 0.58, 1]);
});

test('maps the classic and variant ids to the published texture names', () => {
  assert.equal(inventoryIconFileName({ id: 'classic' }), 'aspergillum.png');
  assert.equal(
    inventoryIconFileName({ id: 'bronze_ivory' }),
    'aspergillum_bronze_ivory.png',
  );
});

test('rotates, fits and outlines a transparent model capture at native 32 px', () => {
  const source = new PNG({ width: 64, height: 64, colorType: 6 });
  for (let y = 8; y <= 55; y += 1) {
    for (let x = 26; x <= 37; x += 1) {
      const offset = (source.width * y + x) << 2;
      source.data[offset] = 170;
      source.data[offset + 1] = y < 25 ? 185 : 90;
      source.data[offset + 2] = 110;
      source.data[offset + 3] = 255;
    }
  }

  const rendered = renderInventoryIcon(source, INVENTORY_ICON_CONFIG);
  const bounds = alphaBounds(rendered, 8);
  assert.equal(rendered.width, 32);
  assert.equal(rendered.height, 32);
  assert.ok(bounds.width >= 18);
  assert.ok(bounds.height >= 25);
  assert.ok(bounds.minX >= 0 && bounds.maxX <= 31);
  assert.ok(bounds.minY >= 0 && bounds.maxY <= 31);
});
