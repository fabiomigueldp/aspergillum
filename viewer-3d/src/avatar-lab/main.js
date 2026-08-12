import {
  AVATAR_ACTIONS,
  AVATAR_CAPTURE_VIEWS,
  AVATAR_MODELS,
  DEFAULT_AVATAR_PRESET,
  inferSkinModelFromRgba,
  validateSkinDimensions,
} from '../shared/avatar-contract.js';
import { AvatarScene } from './avatar-scene.js';
import './styles.css';

const ui = {
  canvas: document.querySelector('#viewport-canvas'),
  stage: document.querySelector('#viewport-stage'),
  loading: document.querySelector('#loading-state'),
  error: document.querySelector('#error-state'),
  errorMessage: document.querySelector('#error-message'),
  runtimeStatus: document.querySelector('#runtime-status'),
  runtimeStatusText: document.querySelector('#runtime-status-text'),
  skinPreview: document.querySelector('#skin-preview'),
  skinName: document.querySelector('#skin-name'),
  skinMeta: document.querySelector('#skin-meta'),
  skinHelp: document.querySelector('#skin-help'),
  skinImportButton: document.querySelector('#skin-import-button'),
  skinInput: document.querySelector('#skin-input'),
  modelSelect: document.querySelector('#model-select'),
  cosmeticSelect: document.querySelector('#cosmetic-select'),
  materialButtons: [...document.querySelectorAll('[data-material]')],
  perspectiveButtons: [...document.querySelectorAll('[data-perspective]')],
  actionButtons: [...document.querySelectorAll('[data-action]')],
  outerLayers: document.querySelector('#outer-layers-toggle'),
  grid: document.querySelector('#grid-toggle'),
  pivots: document.querySelector('#pivots-toggle'),
  skeleton: document.querySelector('#skeleton-toggle'),
  wireframe: document.querySelector('#wireframe-toggle'),
  fitButton: document.querySelector('#fit-button'),
  resetButton: document.querySelector('#reset-button'),
  playButton: document.querySelector('#play-button'),
  playGlyph: document.querySelector('#play-glyph'),
  timeline: document.querySelector('#timeline'),
  timeReadout: document.querySelector('#time-readout'),
  actionReadout: document.querySelector('#action-readout'),
  speedSelect: document.querySelector('#speed-select'),
  bindingDot: document.querySelector('#binding-dot'),
  bindingReadout: document.querySelector('#binding-readout'),
  sceneReadout: document.querySelector('#scene-readout'),
  traceStatus: document.querySelector('#trace-status'),
  contractProperties: document.querySelector('#contract-properties'),
  matrixList: document.querySelector('#matrix-list'),
  recipeOutput: document.querySelector('#recipe-output'),
  copyTraceButton: document.querySelector('#copy-trace-button'),
  toast: document.querySelector('#toast'),
};

let currentSnapshot = null;
let customSkinUrl = null;
let toastTimer = null;
let rebuilding = false;

function formatNumber(value, digits = 2) {
  return Number(value ?? 0).toFixed(digits).replace('.', ',');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setPressed(buttons, activeValue, attribute) {
  for (const button of buttons) {
    const active = button.dataset[attribute] === activeValue;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2600);
}

function setBusy(busy) {
  rebuilding = busy;
  document.body.classList.toggle('is-rebuilding', busy);
  ui.loading.hidden = !busy;
}

function renderPlayback(snapshot) {
  if (!snapshot) return;
  const { action, time, duration } = snapshot.recipe.presentation;
  ui.timeline.max = String(duration);
  ui.timeline.value = String(time);
  ui.timeline.disabled = duration <= 0;
  ui.actionReadout.textContent = AVATAR_ACTIONS[action].label;
  ui.timeReadout.textContent = `${formatNumber(time)} / ${formatNumber(duration)} s`;
  ui.playGlyph.textContent = snapshot.playback.playing ? 'Ⅱ' : '▶';
  ui.playButton.setAttribute('aria-label', snapshot.playback.playing ? 'Pausar animação' : 'Reproduzir animação');
  ui.playButton.disabled = duration <= 0;
}

function renderSnapshot(snapshot) {
  if (!snapshot) return;
  currentSnapshot = snapshot;
  renderPlayback(snapshot);
  const {
    recipe, binding, runtime, collision,
  } = snapshot;
  const exact = binding.exact;
  const parityValid = exact && collision.headClear && collision.gripEngaged;
  ui.bindingDot.classList.toggle('is-valid', parityValid);
  ui.bindingDot.classList.toggle('is-invalid', !parityValid);
  ui.bindingReadout.textContent = parityValid ? 'Binding e folgas válidos' : 'Paridade divergente';
  ui.sceneReadout.textContent = `${recipe.avatar.model} · ${recipe.presentation.perspective === 'first' ? '1ª pessoa' : '3ª pessoa'} · ${recipe.presentation.material.toUpperCase()}`;
  ui.traceStatus.textContent = parityValid ? 'VALIDADO' : 'REVISAR';
  ui.traceStatus.classList.toggle('is-valid', parityValid);
  ui.contractProperties.innerHTML = `
    <div><dt>Attachable</dt><dd>${escapeHtml(runtime.attachable)}</dd></div>
    <div><dt>Geometria</dt><dd>${escapeHtml(runtime.geometry)}</dd></div>
    <div><dt>Binding</dt><dd title="${escapeHtml(runtime.binding)}">item slot → bone</dd></div>
    <div><dt>Target</dt><dd>${escapeHtml(binding.targetBone)}</dd></div>
    <div><dt>Pivot target</dt><dd>${binding.targetPivot.join(' · ')}</dd></div>
    <div><dt>Centro do cabo</dt><dd>${collision.applicable ? (collision.gripCentered ? `centralizado · ${formatNumber(collision.gripCenterError)} u` : `deslocado · ${formatNumber(collision.gripCenterError)} u`) : 'viewmodel'}</dd></div>
    <div><dt>Offset XYZ</dt><dd>${collision.applicable ? collision.gripCenterOffset.join(' · ') : '—'}</dd></div>
    <div><dt>Empunhadura</dt><dd>${collision.gripEngaged ? 'eixo dentro da mão' : 'encaixe inválido'}</dd></div>
    <div><dt>Cabeça</dt><dd>${collision.applicable ? (collision.headClear ? `livre · ${formatNumber(collision.minimumHeadClearance)} u` : 'interseção') : 'viewmodel'}</dd></div>
    <div><dt>Erro</dt><dd>${binding.error.toExponential(1)}</dd></div>
  `;
  ui.matrixList.innerHTML = binding.chain.map((entry, index) => `
    <details ${index < 2 ? 'open' : ''}>
      <summary><span>${escapeHtml(entry.name)}</span><code>${entry.worldPosition.join(' · ')}</code></summary>
      <dl>
        <div><dt>local</dt><dd>${entry.localPosition.join(' · ')}</dd></div>
        <div><dt>quaternion</dt><dd>${entry.worldQuaternion.join(' · ')}</dd></div>
      </dl>
    </details>
  `).join('');
  ui.recipeOutput.textContent = JSON.stringify(recipe, null, 2);
}

async function inspectSkin(source) {
  const image = new Image();
  image.decoding = 'async';
  image.src = source;
  await image.decode();
  if (!validateSkinDimensions(image.naturalWidth, image.naturalHeight)) {
    throw new Error(`A skin deve ser quadrada e medir 64×64 ou 128×128; recebida ${image.naturalWidth}×${image.naturalHeight}.`);
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const inference = inferSkinModelFromRgba(pixels, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, inferredModel: inference.model };
}

const avatarScene = new AvatarScene({
  canvas: ui.canvas,
  stage: ui.stage,
  onFrame: renderSnapshot,
  onStatus({ state, message }) {
    ui.runtimeStatus.dataset.state = state;
    ui.runtimeStatusText.textContent = message;
  },
});

async function rebuild(overrides, successMessage = null) {
  if (rebuilding) return false;
  setBusy(true);
  try {
    const snapshot = await avatarScene.rebuild(overrides);
    renderSnapshot(snapshot);
    if (successMessage) showToast(successMessage);
    return true;
  } catch (error) {
    console.error(error);
    showToast(error instanceof Error ? error.message : 'Falha ao atualizar a cena.');
    return false;
  } finally {
    setBusy(false);
  }
}

function bindInteractions() {
  ui.skinImportButton.addEventListener('click', () => ui.skinInput.click());
  ui.skinInput.addEventListener('change', async () => {
    const file = ui.skinInput.files?.[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    const previous = {
      url: customSkinUrl,
      preview: ui.skinPreview.src,
      name: ui.skinName.textContent,
      meta: ui.skinMeta.textContent,
      help: ui.skinHelp.textContent,
      model: ui.modelSelect.value,
    };
    try {
      const metadata = await inspectSkin(nextUrl);
      customSkinUrl = nextUrl;
      ui.skinPreview.src = nextUrl;
      ui.skinName.textContent = file.name.replace(/\.png$/i, '').replaceAll('_', ' ');
      ui.skinMeta.textContent = `${metadata.width} × ${metadata.height} · ${metadata.inferredModel}`;
      ui.skinHelp.textContent = 'Perfil inferido pela área reservada dos braços; confirme manualmente quando necessário.';
      ui.modelSelect.value = metadata.inferredModel;
      const accepted = await rebuild({
        skinSource: nextUrl,
        skinMetadata: {
          label: file.name,
          reference: file.name,
          width: metadata.width,
          height: metadata.height,
          model: metadata.inferredModel,
        },
        model: metadata.inferredModel,
      }, 'Skin importada para a cena local.');
      if (!accepted) {
        URL.revokeObjectURL(nextUrl);
        customSkinUrl = previous.url;
        ui.skinPreview.src = previous.preview;
        ui.skinName.textContent = previous.name;
        ui.skinMeta.textContent = previous.meta;
        ui.skinHelp.textContent = previous.help;
        ui.modelSelect.value = previous.model;
      } else if (previous.url) {
        URL.revokeObjectURL(previous.url);
      }
    } catch (error) {
      URL.revokeObjectURL(nextUrl);
      showToast(error instanceof Error ? error.message : 'PNG de skin inválido.');
    } finally {
      ui.skinInput.value = '';
    }
  });

  ui.modelSelect.addEventListener('change', () => rebuild({ model: ui.modelSelect.value }, 'Rig do avatar atualizado.'));
  ui.cosmeticSelect.addEventListener('change', () => rebuild({ cosmetic: ui.cosmeticSelect.value }));
  for (const button of ui.materialButtons) {
    button.addEventListener('click', async () => {
      setPressed(ui.materialButtons, button.dataset.material, 'material');
      await rebuild({ material: button.dataset.material });
    });
  }
  for (const button of ui.perspectiveButtons) {
    button.addEventListener('click', () => {
      setPressed(ui.perspectiveButtons, button.dataset.perspective, 'perspective');
      avatarScene.setPerspective(button.dataset.perspective);
      renderSnapshot(avatarScene.snapshot());
    });
  }
  for (const button of ui.actionButtons) {
    button.addEventListener('click', () => {
      setPressed(ui.actionButtons, button.dataset.action, 'action');
      avatarScene.setAction(button.dataset.action);
      renderSnapshot(avatarScene.snapshot());
    });
  }
  ui.outerLayers.addEventListener('change', () => avatarScene.setOuterLayers(ui.outerLayers.checked));
  for (const [element, key] of [[ui.grid, 'grid'], [ui.pivots, 'pivots'], [ui.skeleton, 'skeleton'], [ui.wireframe, 'wireframe']]) {
    element.addEventListener('change', () => avatarScene.setDebug({ [key]: element.checked }));
  }
  ui.fitButton.addEventListener('click', () => {
    if (avatarScene.recipe.presentation.perspective === 'first') avatarScene.setFirstPersonCamera();
    else avatarScene.fitCamera();
  });
  ui.resetButton.addEventListener('click', () => avatarScene.setPerspective(avatarScene.recipe.presentation.perspective));
  ui.playButton.addEventListener('click', () => {
    avatarScene.togglePlayback();
    renderSnapshot(avatarScene.snapshot());
  });
  ui.timeline.addEventListener('input', () => {
    avatarScene.pause();
    avatarScene.setTime(ui.timeline.value);
    renderSnapshot(avatarScene.snapshot());
  });
  ui.speedSelect.addEventListener('change', () => avatarScene.setPlaybackSpeed(ui.speedSelect.value));
  ui.copyTraceButton.addEventListener('click', async () => {
    if (!currentSnapshot) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(currentSnapshot, null, 2));
      showToast('Scene trace copiado.');
    } catch {
      showToast('O navegador não permitiu copiar o scene trace.');
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.code === 'Space') {
      event.preventDefault();
      ui.playButton.click();
    } else if (event.key.toLowerCase() === 'f') ui.fitButton.click();
    else if (event.key.toLowerCase() === 'r') ui.resetButton.click();
    else if (event.key === 'ArrowRight') avatarScene.setTime(avatarScene.recipe.presentation.time + 0.02);
    else if (event.key === 'ArrowLeft') avatarScene.setTime(avatarScene.recipe.presentation.time - 0.02);
  });
}

const captureApi = {
  version: 1,
  ready: false,
  error: null,
  views: AVATAR_CAPTURE_VIEWS.map(({ id, label }) => ({ id, label })),
  models: Object.values(AVATAR_MODELS).map(({ id, label }) => ({ id, label })),
  actions: Object.values(AVATAR_ACTIONS).map(({ id, label, duration }) => ({ id, label, duration })),
  configure: (options) => avatarScene.configureCapture(options),
  setTime: (time) => {
    avatarScene.setTime(time);
    return avatarScene.snapshot();
  },
  setAction: (action) => {
    avatarScene.setAction(action);
    return avatarScene.snapshot();
  },
  setView: (viewId) => avatarScene.setCaptureView(viewId),
  capture: (viewId) => avatarScene.capture(viewId),
  snapshot: () => avatarScene.snapshot(),
  render: () => avatarScene.render(),
};
window.__ASPERGILLUM_AVATAR_CAPTURE__ = captureApi;

bindInteractions();
avatarScene.initialize().then((snapshot) => {
  ui.loading.hidden = true;
  ui.error.hidden = true;
  ui.cosmeticSelect.innerHTML = avatarScene.manifest.cosmetics.map(({ id, label }) => (
    `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`
  )).join('');
  ui.cosmeticSelect.value = 'classic';
  renderSnapshot(snapshot);
  captureApi.ready = true;
}).catch((error) => {
  console.error(error);
  ui.loading.hidden = true;
  ui.error.hidden = false;
  ui.errorMessage.textContent = error instanceof Error ? error.message : String(error);
  ui.runtimeStatus.dataset.state = 'error';
  ui.runtimeStatusText.textContent = 'Falha no runtime local';
  captureApi.error = error instanceof Error ? error.message : String(error);
});

window.addEventListener('beforeunload', () => {
  if (customSkinUrl) URL.revokeObjectURL(customSkinUrl);
  avatarScene.dispose();
});
