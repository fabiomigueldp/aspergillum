import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBedrockGeometry as buildSharedBedrockGeometry } from './shared/bedrock-geometry.js';
import './styles.css';

const WATER_BONES = ['water_low', 'water_mid', 'water_high', 'water_full'];
const WATER_LABELS = {
  empty: 'Vazio',
  low: '¼',
  mid: '½',
  high: '¾',
  full: 'Cheio',
};

const state = {
  library: [],
  currentModel: null,
  currentGeometry: null,
  currentRoot: null,
  presentationRoot: null,
  boneGroups: new Map(),
  boneRecords: [],
  meshRecords: [],
  pivotRecords: [],
  locatorRecords: [],
  materials: new Set(),
  textureCache: new Map(),
  selectedBone: null,
  waterLevel: 'full',
  docked: false,
  showGrid: true,
  showAxes: false,
  wireframe: false,
  loadToken: 0,
  toastTimer: null,
};

const ui = {
  canvas: document.querySelector('#viewport-canvas'),
  viewportStage: document.querySelector('#viewport-stage'),
  library: document.querySelector('#library-list'),
  modelCount: document.querySelector('#model-count'),
  syncStatus: document.querySelector('#sync-status'),
  selectionReadout: document.querySelector('#selection-readout'),
  inspectorTitle: document.querySelector('#inspector-title'),
  inspectorContent: document.querySelector('#inspector-content'),
  importButton: document.querySelector('#import-button'),
  fileInput: document.querySelector('#file-input'),
  clearSelectionButton: document.querySelector('#clear-selection-button'),
  fitButton: document.querySelector('#fit-button'),
  resetButton: document.querySelector('#reset-button'),
  gridButton: document.querySelector('#grid-button'),
  axesButton: document.querySelector('#axes-button'),
  wireframeButton: document.querySelector('#wireframe-button'),
  toast: document.querySelector('#toast'),
};

const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x172124);

const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 1000);
camera.position.set(2.8, 2.05, 3.8);

const controls = new OrbitControls(camera, ui.canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = true;
controls.enableZoom = true;
controls.zoomToCursor = true;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI - 0.08;
controls.target.set(0, 0.45, 0);

const ambientLight = new THREE.HemisphereLight(0xa9d7d3, 0x1e2525, 2.1);
const keyLight = new THREE.DirectionalLight(0xd4f2ea, 3.7);
keyLight.position.set(4.2, 6.5, 5.5);
const fillLight = new THREE.DirectionalLight(0x6d9fe8, 1.15);
fillLight.position.set(-4, 2.4, -3.5);
scene.add(ambientLight, keyLight, fillLight);

const grid = new THREE.GridHelper(8, 16, 0x456062, 0x2a3a3d);
grid.material.transparent = true;
grid.material.opacity = 0.62;
scene.add(grid);

const axes = new THREE.AxesHelper(1.35);
axes.visible = state.showAxes;
scene.add(axes);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();
let gltfLoader = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function assetUrl(relativePath) {
  return new URL(`./asset-library/${relativePath}`, document.baseURI).href;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace('.', ',');
}

function formatVector(vector, digits = 2) {
  return `[${vector.map((value) => formatNumber(value, digits)).join(' · ')}]`;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add('is-visible');
  state.toastTimer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2800);
}

function setToolbarState(button, active) {
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', String(active));
}

function getTextureKey(relativePath) {
  return relativePath ?? '__none__';
}

async function loadTexture(relativePath) {
  if (!relativePath) return null;
  const key = getTextureKey(relativePath);
  if (state.textureCache.has(key)) return state.textureCache.get(key);

  const promise = textureLoader.loadAsync(assetUrl(relativePath))
    .then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestMipmapLinearFilter;
      texture.anisotropy = 1;
      texture.needsUpdate = true;
      return texture;
    })
    .catch(() => null);

  state.textureCache.set(key, promise);
  return promise;
}

function buildBedrockGeometry(geometryData, geometrySummary, textures) {
  const palette = {
    default: new THREE.MeshStandardMaterial({
      map: textures.default,
      color: textures.default ? 0xffffff : 0xbfcfca,
      roughness: 0.7,
      metalness: 0.08,
      side: THREE.FrontSide,
    }),
    water: new THREE.MeshStandardMaterial({
      map: textures.water,
      color: textures.water ? 0xffffff : 0x4cb9c3,
      roughness: 0.25,
      metalness: 0,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
  const built = buildSharedBedrockGeometry(geometryData, geometrySummary, palette);
  built.materials.forEach((material) => state.materials.add(material));
  return built;
}

function disposeObject(object) {
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function clearCurrentScene() {
  if (state.presentationRoot) {
    scene.remove(state.presentationRoot);
    disposeObject(state.presentationRoot);
  }
  state.currentRoot = null;
  state.presentationRoot = null;
  state.currentGeometry = null;
  state.boneGroups = new Map();
  state.boneRecords = [];
  state.meshRecords = [];
  state.pivotRecords = [];
  state.locatorRecords = [];
  state.materials = new Set();
  state.selectedBone = null;
}

function applyModelCenter(root) {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return { center: new THREE.Vector3(), bounds };
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.updateWorldMatrix(true, true);
  return {
    center,
    bounds: new THREE.Box3().setFromObject(root),
  };
}

function applyVisibility() {
  for (const waterBone of WATER_BONES) {
    const group = state.boneGroups.get(waterBone);
    if (group) group.visible = state.waterLevel === waterBone.replace('water_', '');
  }
  const dockedGroup = state.boneGroups.get('resting_aspergillum');
  if (dockedGroup) dockedGroup.visible = state.docked;
  for (const { marker } of state.pivotRecords) marker.visible = state.showAxes;
  for (const { marker } of state.locatorRecords) marker.visible = true;
}

function applyWireframe() {
  for (const material of state.materials) material.wireframe = state.wireframe;
}

function applySelectionVisuals() {
  for (const { mesh, boneName } of state.meshRecords) {
    const selected = boneName === state.selectedBone;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!('emissive' in material)) continue;
      material.emissive.setHex(selected ? 0x48d5c0 : 0x000000);
      material.emissiveIntensity = selected ? 0.26 : 0;
    }
  }
  for (const { marker, boneName } of state.pivotRecords) {
    marker.material.color.setHex(boneName === state.selectedBone ? 0xf4cf79 : 0x74d9c3);
  }
}

function getCurrentBounds() {
  return state.presentationRoot
    ? new THREE.Box3().setFromObject(state.presentationRoot)
    : new THREE.Box3();
}

function fitCamera() {
  const bounds = getCurrentBounds();
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3());
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.12);
  const distance = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.36;
  const direction = new THREE.Vector3(0.76, 0.56, 1).normalize();

  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(0.01, radius / 100);
  camera.far = Math.max(50, radius * 80);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance = radius * 0.2;
  controls.maxDistance = radius * 24;
  controls.update();

  const floorY = bounds.min.y - 0.025;
  grid.position.y = floorY;
  axes.position.copy(center);
  axes.position.y = floorY;
}

function resetCamera() {
  fitCamera();
  showToast('Câmera enquadrada na geometria ativa.');
}

function setSelection(boneName) {
  state.selectedBone = state.selectedBone === boneName ? null : boneName;
  applySelectionVisuals();
  updateSelectionReadout();
  renderInspector();
}

function getSelectedBoneRecord() {
  return state.boneRecords.find(({ bone }) => bone.name === state.selectedBone) ?? null;
}

function renderBoneList() {
  if (!state.boneRecords.length) {
    return '<p class="muted-copy">Esta cena não expõe bones Bedrock.</p>';
  }
  return `<div class="bone-list">${state.boneRecords.map(({ bone }) => `
    <button class="bone-row${state.selectedBone === bone.name ? ' is-selected' : ''}" type="button" data-bone="${escapeHtml(bone.name)}">
      <span class="bone-name">${escapeHtml(bone.name)}</span>
      <span class="bone-tag">${bone.cubes?.length ?? 0} cubos</span>
    </button>`).join('')}</div>`;
}

function renderInspector() {
  const model = state.currentModel;
  if (!model || !state.currentGeometry) {
    ui.inspectorTitle.textContent = state.selectedBone ?? 'Sem seleção';
    ui.inspectorContent.innerHTML = `<div class="inspector-empty">
      <span class="empty-glyph" aria-hidden="true">◌</span>
      <strong>Escolha um modelo</strong>
      <p>Os dados de geometria, textura, bones e locators aparecem aqui.</p>
    </div>`;
    return;
  }

  const geometry = state.currentGeometry.summary;
  const selectedBone = getSelectedBoneRecord();
  const bounds = getCurrentBounds();
  const dimensions = bounds.isEmpty() ? [0, 0, 0] : bounds.getSize(new THREE.Vector3()).toArray();
  const hasWater = WATER_BONES.some((boneName) => state.boneGroups.has(boneName));
  const hasDocked = state.boneGroups.has('resting_aspergillum');

  ui.inspectorTitle.textContent = selectedBone?.bone.name ?? model.label;
  ui.inspectorContent.innerHTML = `
    <section class="inspector-section">
      <h3>Geometria</h3>
      <div class="stat-list">
        <div class="stat-row"><span>Identificador</span><strong title="${escapeHtml(geometry.identifier)}">${escapeHtml(geometry.identifier)}</strong></div>
        <div class="stat-row"><span>Formato</span><strong>${escapeHtml(geometry.formatVersion)}</strong></div>
        <div class="stat-row"><span>Bones</span><strong>${geometry.boneCount}</strong></div>
        <div class="stat-row"><span>Cubos</span><strong>${geometry.cubeCount}</strong></div>
        <div class="stat-row"><span>Locators</span><strong>${geometry.locatorCount}</strong></div>
        <div class="stat-row"><span>Textura</span><strong>${model.texture ? '64 × 64 / PNG' : 'Cor de diagnóstico'}</strong></div>
        <div class="stat-row"><span>UV Bedrock-safe</span><strong>${geometry.uvSafety?.unsafeSubtexelBoxUvCubes || geometry.uvSafety?.invalidOrCollapsedFaces ? 'não' : 'sim'}</strong></div>
        <div class="stat-row"><span>Faces omitidas</span><strong>${geometry.uvSafety?.intentionallyOmittedFaces ?? 0}</strong></div>
      </div>
    </section>

    ${model.geometries.length > 1 ? `<section class="inspector-section">
      <h3>Variação da fonte</h3>
      <div class="variant-control">
        <label for="variant-select">Geometry</label>
        <select class="select-control" id="variant-select">
          ${model.geometries.map((variant) => `<option value="${variant.index}"${variant.index === state.currentGeometry.index ? ' selected' : ''}>${escapeHtml(variant.identifier)}</option>`).join('')}
        </select>
      </div>
    </section>` : ''}

    ${hasWater ? `<section class="inspector-section">
      <h3>Estado visual da caldeirinha</h3>
      <div class="water-control">
        <label>Nível de água</label>
        <div class="segmented-control" role="group" aria-label="Nível de água">
          ${Object.entries(WATER_LABELS).map(([level, label]) => `<button class="segment-button${state.waterLevel === level ? ' is-active' : ''}" type="button" data-water="${level}" aria-pressed="${state.waterLevel === level}">${label}</button>`).join('')}
        </div>
        ${hasDocked ? `<button class="button button-subtle docked-toggle" id="docked-toggle" type="button" aria-pressed="${state.docked}">${state.docked ? 'Ocultar aspersório acomodado' : 'Mostrar aspersório acomodado'}</button>` : ''}
      </div>
    </section>` : ''}

    <section class="inspector-section">
      <h3>Dimensões enquadradas</h3>
      <div class="dimension-list">
        <div class="dimension-row"><span class="dimension-label">Largura</span><span class="dimension-value">${formatNumber(dimensions[0])} blocos</span></div>
        <div class="dimension-row"><span class="dimension-label">Altura</span><span class="dimension-value">${formatNumber(dimensions[1])} blocos</span></div>
        <div class="dimension-row"><span class="dimension-label">Profundidade</span><span class="dimension-value">${formatNumber(dimensions[2])} blocos</span></div>
      </div>
    </section>

    <section class="inspector-section">
      <h3>Bones</h3>
      ${renderBoneList()}
    </section>

    ${selectedBone ? `<section class="inspector-section">
      <h3>Bone selecionado</h3>
      <div class="stat-list">
        <div class="stat-row"><span>Nome</span><strong title="${escapeHtml(selectedBone.bone.name)}">${escapeHtml(selectedBone.bone.name)}</strong></div>
        <div class="stat-row"><span>Parent</span><strong>${escapeHtml(selectedBone.bone.parent ?? '—')}</strong></div>
        <div class="stat-row"><span>Pivot</span><strong>${formatVector(selectedBone.pivot, 2)}</strong></div>
        <div class="stat-row"><span>Rotação</span><strong>${formatVector(selectedBone.bone.rotation ?? [0, 0, 0], 1)}°</strong></div>
        <div class="stat-row"><span>Locators</span><strong>${Object.keys(selectedBone.bone.locators ?? {}).length}</strong></div>
      </div>
    </section>` : ''}

    <section class="inspector-section source-section">
      <h3>Fonte</h3>
      <p class="source-path">${escapeHtml(model.sourceLabel ?? 'Arquivo importado localmente')}</p>
    </section>`;

  ui.inspectorContent.querySelectorAll('[data-bone]').forEach((button) => {
    button.addEventListener('click', () => setSelection(button.dataset.bone));
  });
  ui.inspectorContent.querySelector('#variant-select')?.addEventListener('change', async (event) => {
    await loadModel(model, Number(event.target.value));
  });
  ui.inspectorContent.querySelectorAll('[data-water]').forEach((button) => {
    button.addEventListener('click', () => {
      state.waterLevel = button.dataset.water;
      applyVisibility();
      renderInspector();
      showToast(`Água: ${WATER_LABELS[state.waterLevel]}.`);
    });
  });
  ui.inspectorContent.querySelector('#docked-toggle')?.addEventListener('click', () => {
    state.docked = !state.docked;
    applyVisibility();
    renderInspector();
  });
}

function renderLibrary() {
  ui.modelCount.textContent = String(state.library.length);
  if (!state.library.length) {
    ui.library.innerHTML = `<div class="inspector-empty"><strong>Nenhum modelo encontrado</strong><p>Execute <code>npm run sync-assets</code> no viewer.</p></div>`;
    return;
  }

  ui.library.innerHTML = state.library.map((model) => {
    const isActive = state.currentModel?.id === model.id;
    const geometryCount = model.geometries?.length ?? 0;
    const thumb = model.kind === 'gltf' ? '◇' : model.label === 'Aspersório' ? '✦' : '◈';
    return `<button class="library-item${isActive ? ' is-active' : ''}" type="button" role="option" aria-selected="${isActive}" data-model="${escapeHtml(model.id)}">
      <span class="model-thumb" aria-hidden="true">${thumb}</span>
      <span class="model-copy">
        <strong>${escapeHtml(model.label)}</strong>
        <span>${geometryCount ? `${geometryCount} ${geometryCount === 1 ? 'geometria' : 'geometrias'}` : 'Cena 3D'}</span>
        <span class="model-tag">${model.kind === 'gltf' ? 'Importado' : 'Bedrock Geometry'}</span>
      </span>
    </button>`;
  }).join('');

  ui.library.querySelectorAll('[data-model]').forEach((button) => {
    button.addEventListener('click', () => {
      const model = state.library.find((entry) => entry.id === button.dataset.model);
      if (model) loadModel(model, 0);
    });
  });
}

async function fetchGeometry(model, index) {
  const response = await fetch(assetUrl(model.source));
  if (!response.ok) throw new Error(`Não foi possível ler ${model.source}.`);
  const sourceData = await response.json();
  const geometries = sourceData['minecraft:geometry'] ?? [];
  const geometryData = geometries[index];
  if (!geometryData) throw new Error(`Geometry ${index} não encontrada em ${model.source}.`);
  return { sourceData, geometryData, summary: model.geometries[index] };
}

async function loadGltfModel(model) {
  if (!gltfLoader) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    gltfLoader = new GLTFLoader();
  }
  const gltf = await gltfLoader.loadAsync(model.objectUrl);
  return {
    root: gltf.scene,
    summary: {
      index: 0,
      identifier: model.label,
      formatVersion: 'glTF',
      textureWidth: 0,
      textureHeight: 0,
      boneCount: 0,
      cubeCount: 0,
      locatorCount: 0,
      boneNames: [],
    },
    boneGroups: new Map(),
    boneRecords: [],
    meshRecords: [],
    pivotRecords: [],
    locatorRecords: [],
  };
}

async function loadModel(model, geometryIndex = 0) {
  const token = ++state.loadToken;
  ui.syncStatus.textContent = `Abrindo ${model.label}…`;

  try {
    const loaded = model.kind === 'gltf'
      ? await loadGltfModel(model)
      : model.kind === 'imported-bedrock'
        ? {
          sourceData: model.sourceData,
          geometryData: model.sourceData['minecraft:geometry'][geometryIndex],
          summary: model.geometries[geometryIndex],
        }
        : await fetchGeometry(model, geometryIndex);
    if (token !== state.loadToken) return;

    clearCurrentScene();
    state.currentModel = model;
    if (model.kind === 'gltf') {
      state.currentGeometry = { index: 0, data: null, summary: loaded.summary };
      state.currentRoot = loaded.root;
      state.presentationRoot = new THREE.Group();
      state.presentationRoot.add(loaded.root);
      state.boneGroups = loaded.boneGroups;
      state.boneRecords = loaded.boneRecords;
      state.meshRecords = loaded.meshRecords;
      state.pivotRecords = loaded.pivotRecords;
      state.locatorRecords = loaded.locatorRecords;
    } else {
      const defaultTexture = await loadTexture(model.texture);
      const waterTexture = await loadTexture('textures/blocks/holy_water.png');
      const built = buildBedrockGeometry(loaded.geometryData, loaded.summary, {
        default: defaultTexture,
        water: waterTexture,
      });
      state.currentGeometry = { index: geometryIndex, data: loaded.geometryData, summary: loaded.summary };
      state.currentRoot = built.root;
      state.presentationRoot = new THREE.Group();
      state.presentationRoot.add(built.root);
      state.boneGroups = built.boneGroups;
      state.boneRecords = built.boneRecords;
      state.meshRecords = built.meshRecords;
      state.pivotRecords = built.pivotRecords;
      state.locatorRecords = built.locatorRecords;
      applyVisibility();
      applyWireframe();
    }

    scene.add(state.presentationRoot);
    applyModelCenter(state.currentRoot);
    applyVisibility();
    applyWireframe();
    applySelectionVisuals();
    fitCamera();
    ui.selectionReadout.textContent = 'Nenhum bone selecionado';
    ui.syncStatus.textContent = `${state.library.length} arquivos locais`;
    renderLibrary();
    renderInspector();
  } catch (error) {
    if (token !== state.loadToken) return;
    ui.syncStatus.textContent = 'Falha ao abrir modelo';
    ui.inspectorContent.innerHTML = `<div class="inspector-empty">
      <span class="empty-glyph" aria-hidden="true">!</span>
      <strong>Não foi possível abrir</strong>
      <p>${escapeHtml(error.message)}</p>
    </div>`;
    showToast(error.message);
  }
}

function updateSelectionReadout() {
  ui.selectionReadout.textContent = state.selectedBone
    ? `Bone: ${state.selectedBone}`
    : 'Nenhum bone selecionado';
}

function handleCanvasClick(event) {
  if (!state.meshRecords.length) return;
  const rect = ui.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = state.meshRecords.map(({ mesh }) => mesh);
  const intersections = raycaster.intersectObjects(meshes, false);
  const hit = intersections[0]?.object;
  if (!hit?.userData?.boneName) return;
  setSelection(hit.userData.boneName);
  updateSelectionReadout();
}

function createImportedBedrockModel(file, sourceData) {
  const geometries = sourceData['minecraft:geometry'] ?? [];
  if (!geometries.length) throw new Error(`${file.name} não contém minecraft:geometry.`);
  const modelId = `imported:${file.name}:${Date.now()}`;
  return {
    id: modelId,
    label: file.name.replace(/\.geo\.json$|\.json$/i, ''),
    sourceLabel: `${file.name} · importado`,
    source: file.name,
    type: 'Bedrock Geometry',
    kind: 'imported-bedrock',
    texture: null,
    geometries: geometries.map((geometry, index) => {
      const description = geometry.description ?? {};
      const bones = geometry.bones ?? [];
      return {
        index,
        identifier: description.identifier ?? `geometry_${index}`,
        formatVersion: sourceData.format_version ?? 'unknown',
        textureWidth: description.texture_width ?? 64,
        textureHeight: description.texture_height ?? 64,
        boneCount: bones.length,
        cubeCount: bones.reduce((total, bone) => total + (bone.cubes?.length ?? 0), 0),
        locatorCount: bones.reduce((total, bone) => total + Object.keys(bone.locators ?? {}).length, 0),
        boneNames: bones.map((bone) => bone.name),
      };
    }),
    sourceData,
  };
}

async function importFile(file) {
  const extension = file.name.toLowerCase();
  if (extension.endsWith('.gltf') || extension.endsWith('.glb')) {
    const objectUrl = URL.createObjectURL(file);
    const model = {
      id: `imported:${file.name}:${Date.now()}`,
      label: file.name.replace(/\.gltf$|\.glb$/i, ''),
      sourceLabel: `${file.name} · importado`,
      source: file.name,
      kind: 'gltf',
      texture: null,
      geometries: [],
      objectUrl,
    };
    state.library.push(model);
    renderLibrary();
    await loadModel(model, 0);
    showToast(`${file.name} importado para a sessão.`);
    return;
  }

  const sourceData = JSON.parse(await file.text());
  const model = createImportedBedrockModel(file, sourceData);
  state.library.push(model);
  renderLibrary();
  await loadImportedBedrockModel(model, 0);
  showToast(`${file.name} importado para a sessão.`);
}

async function loadImportedBedrockModel(model, geometryIndex) {
  const token = ++state.loadToken;
  const geometryData = model.sourceData['minecraft:geometry'][geometryIndex];
  const summary = model.geometries[geometryIndex];
  clearCurrentScene();
  state.currentModel = model;
  const waterTexture = await loadTexture('textures/blocks/holy_water.png');
  if (token !== state.loadToken) return;
  const built = buildBedrockGeometry(geometryData, summary, { default: null, water: waterTexture });
  state.currentGeometry = { index: geometryIndex, data: geometryData, summary };
  state.currentRoot = built.root;
  state.presentationRoot = new THREE.Group();
  state.presentationRoot.add(built.root);
  state.boneGroups = built.boneGroups;
  state.boneRecords = built.boneRecords;
  state.meshRecords = built.meshRecords;
  state.pivotRecords = built.pivotRecords;
  state.locatorRecords = built.locatorRecords;
  scene.add(state.presentationRoot);
  applyModelCenter(state.currentRoot);
  applyVisibility();
  applyWireframe();
  applySelectionVisuals();
  fitCamera();
  ui.syncStatus.textContent = `${state.library.length} arquivos locais`;
  renderLibrary();
  renderInspector();
}

function bindStablePanInteraction() {
  let activePanPointerId = null;

  const beginPan = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 2) return;
    activePanPointerId = event.pointerId;
    controls.enableDamping = false;
    ui.canvas.classList.add('is-panning');
    event.preventDefault();
  };

  const endPan = (event) => {
    if (activePanPointerId === null || event.pointerId !== activePanPointerId) return;
    activePanPointerId = null;
    controls.enableDamping = true;
    ui.canvas.classList.remove('is-panning');
  };

  ui.canvas.addEventListener('pointerdown', beginPan);
  ui.canvas.addEventListener('pointerup', endPan);
  ui.canvas.addEventListener('pointercancel', endPan);
  ui.canvas.addEventListener('lostpointercapture', endPan);
  ui.canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    endPan({ pointerId: activePanPointerId });
  });
  ui.canvas.addEventListener('auxclick', (event) => {
    if (event.button === 2) event.preventDefault();
  });
  window.addEventListener('blur', () => {
    if (activePanPointerId === null) return;
    activePanPointerId = null;
    controls.enableDamping = true;
    ui.canvas.classList.remove('is-panning');
  });
}

function bindEvents() {
  ui.importButton.addEventListener('click', () => ui.fileInput.click());
  ui.fileInput.addEventListener('change', async () => {
    for (const file of ui.fileInput.files ?? []) {
      try {
        await importFile(file);
      } catch (error) {
        showToast(error.message);
      }
    }
    ui.fileInput.value = '';
  });

  ui.fitButton.addEventListener('click', fitCamera);
  ui.resetButton.addEventListener('click', resetCamera);
  ui.clearSelectionButton.addEventListener('click', () => {
    state.selectedBone = null;
    applySelectionVisuals();
    updateSelectionReadout();
    renderInspector();
  });

  ui.gridButton.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    grid.visible = state.showGrid;
    setToolbarState(ui.gridButton, state.showGrid);
  });
  ui.axesButton.addEventListener('click', () => {
    state.showAxes = !state.showAxes;
    axes.visible = state.showAxes;
    setToolbarState(ui.axesButton, state.showAxes);
    applyVisibility();
  });
  ui.wireframeButton.addEventListener('click', () => {
    state.wireframe = !state.wireframe;
    applyWireframe();
    setToolbarState(ui.wireframeButton, state.wireframe);
  });

  bindStablePanInteraction();

  let pointerDown = null;
  ui.canvas.addEventListener('pointerdown', (event) => {
    pointerDown = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      pointerId: event.pointerId,
    };
  });
  ui.canvas.addEventListener('pointerup', (event) => {
    if (!pointerDown || event.pointerId !== pointerDown.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    const shouldSelect = pointerDown.button === 0 && distance < 5;
    pointerDown = null;
    if (shouldSelect) handleCanvasClick(event);
  });
  ui.canvas.addEventListener('pointercancel', () => { pointerDown = null; });

  for (const eventName of ['dragenter', 'dragover']) {
    ui.viewportStage.addEventListener(eventName, (event) => {
      event.preventDefault();
      ui.viewportStage.classList.add('is-dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    ui.viewportStage.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName === 'drop') {
        ui.viewportStage.classList.remove('is-dragging');
        for (const file of event.dataTransfer.files ?? []) importFile(file).catch((error) => showToast(error.message));
      } else if (!ui.viewportStage.contains(event.relatedTarget)) {
        ui.viewportStage.classList.remove('is-dragging');
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === 'f') fitCamera();
    if (key === 'r') resetCamera();
    if (key === 'g') ui.gridButton.click();
    if (key === 'a') ui.axesButton.click();
    if (key === 'w') ui.wireframeButton.click();
    if (event.key === 'Escape') ui.clearSelectionButton.click();
  });

  const resizeObserver = new ResizeObserver(() => {
    const width = ui.viewportStage.clientWidth;
    const height = ui.viewportStage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(ui.viewportStage);
}

async function loadManifest() {
  try {
    const response = await fetch(assetUrl('manifest.json'));
    if (!response.ok) throw new Error('Catálogo ainda não sincronizado.');
    const manifest = await response.json();
    state.library = (manifest.models ?? []).sort((left, right) => {
      const priority = (model) => model.label === 'Aspersório' ? 0 : model.label === 'Caldeirinha' ? 1 : 2;
      return priority(left) - priority(right) || left.label.localeCompare(right.label);
    });
    ui.syncStatus.textContent = `${state.library.length} arquivos locais · ${manifest.textureCount ?? 0} texturas`;
    renderLibrary();
    await loadModel(state.library[0], 0);
  } catch (error) {
    ui.syncStatus.textContent = 'Catálogo ausente';
    ui.library.innerHTML = `<div class="inspector-empty">
      <span class="empty-glyph" aria-hidden="true">!</span>
      <strong>Catálogo não sincronizado</strong>
      <p>Na pasta <code>viewer-3d</code>, execute <code>npm run sync-assets</code> e recarregue a página.</p>
    </div>`;
    showToast(error.message);
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

bindEvents();
animate();
loadManifest();
