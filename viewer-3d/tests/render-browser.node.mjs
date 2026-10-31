import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSettings, isSoftwareRenderer, launchRenderBrowser} from '../scripts/lib/render-browser.mjs';

function fixture({hardware = 'ANGLE (Intel, Intel Iris Xe D3D11)', failLaunch = false} = {}) {
  const calls = [], browsers = [];
  const chromium = {async launch(options) {
    calls.push(options);
    if (options.channel && failLaunch) throw new Error('Chromium not installed');
    const b = {mode: options.channel ? 'hardware' : 'software', closed: false, async close() {this.closed = true;}, version: () => 'test'};
    browsers.push(b); return b;
  }};
  const options = {settings: {backend: 'auto', softwareCpus: 4}, log() {}, async inspect(b) {return {renderer: b.mode === 'hardware' ? hardware : 'SwiftShader', maxTextureSize: 8192};}, async constrain(b, count) {b.constrained = count; return {count};}};
  return {chromium, options, calls, browsers};
}
test('auto uses verified hardware without applying software limits', async () => {
  const f = fixture(), b = await launchRenderBrowser(f.chromium, f.options);
  assert.equal(b.renderDiagnostics.backend, 'hardware');
  assert.equal(b.constrained, undefined); assert.equal(f.calls.length, 1);
  assert.ok(f.calls[0].args.includes('--enable-gpu'));
  await b.close(); assert.equal(b.closed, true);
});
test('auto closes a software-disguised hardware browser before bounded fallback', async () => {
  const f = fixture({hardware: 'ANGLE SwiftShader'}), b = await launchRenderBrowser(f.chromium, f.options);
  assert.equal(f.browsers[0].closed, true); assert.equal(b.constrained, 4);
  assert.equal(b.renderDiagnostics.backend, 'software');
  assert.match(b.renderDiagnostics.fallbackReasons[0], /selected software/);
});
test('hardware mode fails explicitly, while missing Chromium permits auto fallback', async () => {
  const f = fixture({failLaunch: true});
  assert.equal((await launchRenderBrowser(f.chromium, f.options)).renderDiagnostics.backend, 'software');
  f.options.settings.backend = 'hardware';
  await assert.rejects(launchRenderBrowser(f.chromium, f.options), /Chromium not installed/);
});
test('explicit software uses legacy renderer and preserves CPU limit failures', async () => {
  const f = fixture(); f.options.settings.backend = 'software';
  f.options.constrain = async () => {throw new Error('Cannot constrain browser');};
  await assert.rejects(launchRenderBrowser(f.chromium, f.options), /Cannot constrain browser/);
  assert.equal(f.browsers[0].closed, true); assert.equal(f.calls.length, 1);
  assert.ok(f.calls[0].args.includes('--use-angle=swiftshader'));
});
test('failed pixel probe closes hardware and validates fallback independently', async () => {
  const f = fixture(); let probes = 0;
  f.options.inspect = async b => {probes++; if (b.mode === 'hardware') throw new Error('pixel readback failed'); return {renderer: 'SwiftShader'};};
  const b = await launchRenderBrowser(f.chromium, f.options);
  assert.equal(probes, 2); assert.equal(f.browsers[0].closed, true);
  assert.equal(b.renderDiagnostics.backend, 'software');
});
test('software limits are reapplied after context initialization', async () => {
  const f = fixture(), order = []; f.options.settings.backend = 'software';
  f.options.constrain = async () => {order.push('constrain'); return {};};
  f.options.inspect = async () => {order.push('inspect'); return {renderer: 'SwiftShader'};};
  await launchRenderBrowser(f.chromium, f.options);
  assert.deepEqual(order, ['constrain', 'inspect', 'constrain']);
});
test('invalid settings fail before launch and software renderer detection is conservative', () => {
  assert.deepEqual(renderSettings({}), {backend: 'auto', softwareCpus: 4});
  assert.throws(() => renderSettings({ASPERGILLUM_RENDER_BACKEND: 'fast'}));
  for (const value of ['0', '-1', '2.5', 'NaN', '99']) assert.throws(() => renderSettings({ASPERGILLUM_SOFTWARE_CPUS: value}));
  assert.ok(isSoftwareRenderer('Microsoft Basic Render Driver'));
  assert.ok(isSoftwareRenderer('Mesa llvmpipe'));
  assert.equal(isSoftwareRenderer('ANGLE NVIDIA GeForce MX550'), false);
});
