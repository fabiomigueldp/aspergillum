import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  WORKBENCH_TOOLS,
  getWorkbenchTool,
  workbenchUrl,
} from '../src/shared/workbench-contract.js';

const viewerRoot = new URL('../', import.meta.url);

test('defines one stable route and standalone document for every 3D laboratory', () => {
  assert.deepEqual(WORKBENCH_TOOLS.map(({ id }) => id), ['model', 'bedrock', 'avatar']);
  assert.equal(new Set(WORKBENCH_TOOLS.map(({ document }) => document)).size, 3);
  assert.ok(WORKBENCH_TOOLS.every(({ main, status }) => main.startsWith('#') && status.length > 1));
});

test('normalizes legacy fidelity names without producing an invalid route', () => {
  assert.equal(getWorkbenchTool('fidelity').id, 'bedrock');
  assert.equal(getWorkbenchTool('renderer').id, 'bedrock');
  assert.equal(getWorkbenchTool('unknown').id, 'model');
  assert.equal(workbenchUrl('https://local.test/index.html?foo=1#trace', 'avatar'), '/index.html?foo=1&tool=avatar#trace');
});

test('loads workbench CSS before JavaScript and keeps standalone headless adapters styled', async () => {
  const [workbench, model, bedrock, avatar] = await Promise.all([
    readFile(new URL('index.html', viewerRoot), 'utf8'),
    readFile(new URL('model-lab.html', viewerRoot), 'utf8'),
    readFile(new URL('bedrock-renderer.html', viewerRoot), 'utf8'),
    readFile(new URL('avatar-lab.html', viewerRoot), 'utf8'),
  ]);
  const workbenchStyle = workbench.indexOf('/src/workbench/styles.css');
  const workbenchScript = workbench.indexOf('/src/workbench/main.js');
  assert.ok(workbenchStyle > 0 && workbenchStyle < workbenchScript);
  assert.match(workbench, /data-tool-styles="model"/);
  assert.match(workbench, /data-tool-styles="bedrock"/);
  assert.match(workbench, /data-tool-styles="avatar"/);
  assert.match(model, /href="\/src\/styles\.css"/);
  assert.match(bedrock, /href="\/src\/bedrock-renderer\/styles\.css"/);
  assert.match(avatar, /href="\/src\/avatar-lab\/styles\.css"/);
});
