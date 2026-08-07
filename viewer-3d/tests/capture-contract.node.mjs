import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAPTURE_SUBJECTS,
  CAPTURE_VIEWS,
  getCaptureSubject,
  getCaptureView,
  resolveCaptureViews,
} from '../src/shared/capture-contract.js';

test('exposes the three visual subjects used by the add-on', () => {
  assert.deepEqual(Object.keys(CAPTURE_SUBJECTS), ['aspergillum', 'aspersorium', 'docked']);
  assert.equal(CAPTURE_SUBJECTS.docked.modelId, CAPTURE_SUBJECTS.aspersorium.modelId);
  assert.equal(CAPTURE_SUBJECTS.docked.docked, true);
});

test('defines normalized cardinal, oblique, top and bottom capture directions', () => {
  assert.equal(CAPTURE_VIEWS.length, 9);
  for (const view of CAPTURE_VIEWS) {
    assert.equal(view.direction.length, 3);
    assert.ok(view.direction.some((value) => value !== 0));
    assert.equal(view.up.length, 3);
  }
  assert.deepEqual(getCaptureView('top').up, [0, 0, -1]);
  assert.deepEqual(getCaptureView('bottom').up, [0, 0, 1]);
});

test('resolves requested views in order and rejects unknown ids', () => {
  assert.deepEqual(resolveCaptureViews(['right', 'front']).map(({ id }) => id), ['right', 'front']);
  assert.equal(getCaptureSubject('aspergillum').label, 'Aspersório');
  assert.throws(() => resolveCaptureViews(['diagonal-inexistente']), /desconhecida/);
});
