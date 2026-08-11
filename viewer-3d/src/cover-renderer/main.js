import {
  COVER_RENDERER_VERSION,
  normalizeCoverConfig,
} from '../shared/cover-contract.js';
import './styles.css';

const ui = {
  art: document.querySelector('#cover-art'),
  title: document.querySelector('#cover-title'),
  titleDepth: document.querySelector('#title-depth'),
  titleFace: document.querySelector('#title-face'),
  model: document.querySelector('#hero-model'),
  status: document.querySelector('#render-status'),
  source: document.querySelector('#bedrock-source'),
};

const coverApi = {
  version: COVER_RENDERER_VERSION,
  ready: false,
  error: null,
  metadata: null,
};

window.__ASPERGILLUM_COVER__ = coverApi;

function readConfig() {
  return normalizeCoverConfig(Object.fromEntries(new URLSearchParams(window.location.search)));
}

function waitForSourceFrame() {
  if (ui.source.contentDocument?.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => ui.source.addEventListener('load', resolve, { once: true }));
}

async function waitForCaptureApi(timeoutMs = 30000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const api = ui.source.contentWindow?.__ASPERGILLUM_CAPTURE__;
    if (api?.error) throw new Error(api.error);
    if (api?.ready) return api;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('O renderer Bedrock não ficou pronto dentro do tempo esperado.');
}

async function decodeImage(image) {
  if (typeof image.decode === 'function') {
    await image.decode();
    return;
  }
  await new Promise((resolve, reject) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', reject, { once: true });
  });
}

function measureOpaqueCoverage(image) {
  const sampleSize = 128;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Não foi possível validar a cobertura do render 3D.');
  context.drawImage(image, 0, 0, sampleSize, sampleSize);
  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
  let opaquePixels = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 12) opaquePixels += 1;
  }
  return opaquePixels / (sampleSize * sampleSize);
}

async function nextPaint() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function initialize() {
  const config = readConfig();
  ui.title.setAttribute('aria-label', config.title);
  ui.titleDepth.textContent = config.title;
  ui.titleFace.textContent = config.title;
  ui.art.setAttribute('aria-label', `Capa do Add-On ${config.title}`);

  await Promise.all([document.fonts.ready, waitForSourceFrame()]);
  const captureApi = await waitForCaptureApi();
  const source = await captureApi.configure({
    subject: config.subject,
    material: config.material,
    cosmetic: config.cosmetic,
    water: config.water,
    grid: false,
    wireframe: false,
    transparent: true,
    lighting: config.lighting,
  });
  captureApi.setView(config.view, config.framing);
  captureApi.render();
  await nextPaint();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const capture = captureApi.capture(config.view, config.framing);
  ui.model.src = capture.dataUrl;
  await decodeImage(ui.model);
  const opaqueCoverage = measureOpaqueCoverage(ui.model);
  if (opaqueCoverage < 0.04) {
    throw new Error(`O render 3D veio vazio ou incompleto (${(opaqueCoverage * 100).toFixed(2)}% de cobertura).`);
  }

  coverApi.metadata = {
    config,
    source: {
      captureApiVersion: captureApi.version,
      ...source,
      view: capture.id,
      camera: capture.camera,
      target: capture.target,
      framing: capture.framing,
      opaqueCoverage,
    },
    font: {
      family: 'Bowlby One SC',
      file: 'public/fonts/bowlby-one-sc/BowlbyOneSC-Regular.ttf',
      license: 'SIL Open Font License 1.1',
    },
  };
  document.body.classList.add('is-ready');
  ui.status.textContent = 'Cena pronta';
  await nextPaint();
  coverApi.ready = true;
}

initialize().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  coverApi.error = message;
  ui.status.textContent = `Falha ao montar a cena: ${message}`;
  document.body.classList.add('has-error');
});
