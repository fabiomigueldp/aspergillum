import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const viewerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = JSON.parse(await readFile(path.join(viewerRoot, 'public', 'asset-library', 'workspace.json'), 'utf8'));
const server = await createServer({
  root: viewerRoot,
  configFile: path.join(viewerRoot, 'vite.config.js'),
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0, strictPort: false },
});

let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('O servidor do smoke test não expôs uma porta TCP.');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto(`${baseUrl}/?tool=model`, { waitUntil: 'domcontentloaded' });
  const firstPaint = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    shell: getComputedStyle(document.querySelector('.workbench-shell')).display,
  }));
  assert.notEqual(firstPaint.background, 'rgb(255, 255, 255)');
  assert.equal(firstPaint.shell, 'grid');
  await page.waitForFunction(() => (
    document.body.dataset.activeTool === 'model'
    && document.querySelector('#sync-status')?.textContent.includes('arquivos locais')
  ));

  const timings = {};
  for (const tool of ['bedrock', 'avatar']) {
    const startedAt = performance.now();
    await page.click(`[data-tool-link="${tool}"]`);
    await page.waitForFunction((expected) => document.body.dataset.activeTool === expected, tool);
    if (tool === 'bedrock') {
      await page.waitForFunction(() => window.__BEDROCK_CAPTURE__?.ready === true);
    } else {
      await page.waitForFunction(() => window.__BEDROCK_AVATAR_CAPTURE__?.ready === true);
    }
    timings[tool] = Number((performance.now() - startedAt).toFixed(1));
  }

  await page.click('[data-action="sprinkle"]');
  assert.equal(await page.locator('#action-readout').textContent(), 'Aspersão');
  await page.click('[data-tool-link="model"]');
  await page.waitForFunction(() => document.body.dataset.activeTool === 'model');
  await page.click('[data-tool-link="avatar"]');
  await page.waitForFunction(() => document.body.dataset.activeTool === 'avatar');
  assert.equal(await page.locator('#action-readout').textContent(), 'Aspersão');

  await page.goBack();
  await page.waitForFunction(() => document.body.dataset.activeTool === 'model');
  await page.goForward();
  await page.waitForFunction(() => document.body.dataset.activeTool === 'avatar');
  await page.keyboard.press('Alt+Digit1');
  await page.waitForFunction(() => document.body.dataset.activeTool === 'model');
  await page.keyboard.press('Alt+Digit3');
  await page.waitForFunction(() => document.body.dataset.activeTool === 'avatar');

  const navigationsBeforeProjectSwitch = await page.evaluate(() => (
    performance.getEntriesByType('navigation').length
  ));
  let projectSwitch = null;
  if (workspace.projects.some(({ id }) => id === 'ornatum')) {
    await page.selectOption('#workbench-project-select', 'ornatum');
    await page.waitForFunction(() => (
      document.title.startsWith('Ornatum /')
      && window.__BEDROCK_AVATAR_CAPTURE__?.ready === true
      && window.__BEDROCK_AVATAR_CAPTURE__.project()?.id === 'ornatum'
    ));
    projectSwitch = await page.evaluate(() => ({
      selected: document.querySelector('#workbench-project-select')?.value,
      project: window.__BEDROCK_AVATAR_CAPTURE__.project(),
      equipmentCount: window.__BEDROCK_AVATAR_CAPTURE__.equipment().length,
      navigationEntries: performance.getEntriesByType('navigation').length,
    }));
    assert.equal(projectSwitch.selected, 'ornatum');
    assert.equal(projectSwitch.project.id, 'ornatum');
    assert.equal(projectSwitch.equipmentCount, 39);
    assert.equal(projectSwitch.navigationEntries, navigationsBeforeProjectSwitch);
  } else {
    assert.equal(await page.locator('#workbench-project-select').inputValue(), workspace.defaultProjectId);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const responsive = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    navVisible: document.querySelector('.workbench-nav')?.getBoundingClientRect().height > 0,
    hostVisible: document.querySelector('#tool-host')?.getBoundingClientRect().height > 0,
  }));
  assert.ok(responsive.documentWidth <= responsive.viewportWidth);
  assert.equal(responsive.navVisible, true);
  assert.equal(responsive.hostVisible, true);

  const workbench = await page.evaluate(() => ({
    activeTool: document.body.dataset.activeTool,
    navigationEntries: performance.getEntriesByType('navigation').length,
    enabledStyles: [...document.querySelectorAll('[data-tool-styles]')]
      .filter((link) => !link.disabled && link.media === 'all')
      .map((link) => link.dataset.toolStyles),
    currentNav: document.querySelector('.workbench-nav [aria-current="page"]')?.dataset.toolLink,
    hostBusy: document.querySelector('#tool-host')?.getAttribute('aria-busy'),
    selectedProject: document.querySelector('#workbench-project-select')?.value,
  }));
  assert.equal(workbench.navigationEntries, 1);
  assert.deepEqual(workbench.enabledStyles, ['avatar']);
  assert.equal(workbench.currentNav, 'avatar');
  assert.equal(workbench.hostBusy, 'false');
  assert.deepEqual(errors, []);

  const rapidPage = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const rapidErrors = [];
  rapidPage.on('console', (message) => {
    if (message.type() === 'error') rapidErrors.push(`console: ${message.text()}`);
  });
  rapidPage.on('pageerror', (error) => rapidErrors.push(`pageerror: ${error.message}`));
  await rapidPage.goto(`${baseUrl}/?tool=model`, { waitUntil: 'domcontentloaded' });
  await rapidPage.click('[data-tool-link="bedrock"]');
  await rapidPage.click('[data-tool-link="avatar"]');
  await rapidPage.waitForFunction(() => (
    document.body.dataset.activeTool === 'avatar'
    && window.__BEDROCK_AVATAR_CAPTURE__?.ready === true
  ));
  assert.deepEqual(rapidErrors, []);
  await rapidPage.close();

  for (const standalone of [
    { path: 'model-lab.html', selector: '#sync-status' },
    { path: 'bedrock-renderer.html', api: '__BEDROCK_CAPTURE__' },
    { path: 'avatar-lab.html', api: '__BEDROCK_AVATAR_CAPTURE__' },
  ]) {
    const adapter = await browser.newPage({ viewport: { width: 640, height: 640 } });
    await adapter.goto(`${baseUrl}/${standalone.path}`, { waitUntil: 'domcontentloaded' });
    if (standalone.api) {
      await adapter.waitForFunction((name) => window[name]?.ready === true, standalone.api);
    } else {
      await adapter.waitForFunction((selector) => (
        document.querySelector(selector)?.textContent.includes('arquivos locais')
      ), standalone.selector);
    }
    await adapter.close();
  }

  process.stdout.write(`${JSON.stringify({ firstPaint, timings, projectSwitch, workbench, responsive }, null, 2)}\n`);
} finally {
  await browser?.close();
  await server.close();
}
