import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  bedrockAnimationPosition,
  bedrockAnimationRotation,
  bedrockGeometryRotation,
  buildBedrockGeometry as buildSharedBedrockGeometry,
} from '../shared/bedrock-geometry.js';
import { extractBedrockGeometries } from '../shared/bedrock-document.js';
import {
  CAPTURE_SUBJECTS,
  CAPTURE_VIEWS,
  getCaptureSubject,
  getCaptureView,
} from '../shared/capture-contract.js';
import {
  cosmeticLabel,
  resolveCosmetic,
} from '../shared/cosmetic-contract.js';
import {
  getSelectedProject,
  onSelectedProjectChange,
  projectAssetUrl,
} from '../shared/project-context.js';

const SCALE = 1 / 16;
const WATER_BONES = ['water_low', 'water_mid', 'water_high', 'water_full'];
const WATER_LABELS = {
  empty: 'Vazio',
  low: '¼',
  mid: '½',
  high: '¾',
  full: 'Cheio',
};
const LIGHTING_PRESETS = Object.freeze({
  neutral: Object.freeze({
    exposure: 0.96,
    environmentIntensity: 0.34,
    hemisphere: Object.freeze({ sky: 0xf0f4ef, ground: 0x202525, intensity: 1.55 }),
    key: Object.freeze({ color: 0xffffff, intensity: 2.65, position: [4.5, 6.2, 5.2] }),
    fill: Object.freeze({ color: 0xe8eef0, intensity: 0.72, position: [-4.5, 2.8, -3.8] }),
    rim: Object.freeze({ color: 0xf2ffff, intensity: 0.38, position: [0, 3.5, -5.5] }),
    water: Object.freeze({ color: 0x5fd9e6, intensity: 0, distance: 3.4, position: [0, 0.3, 0.35] }),
  }),
  inventory: Object.freeze({
    exposure: 1.28,
    environmentIntensity: 0.5,
    hemisphere: Object.freeze({ sky: 0xf5f7ef, ground: 0x35413e, intensity: 1.9 }),
    key: Object.freeze({ color: 0xfff8e9, intensity: 3.15, position: [4.8, 6.6, 5.5] }),
    fill: Object.freeze({ color: 0xe4f1f2, intensity: 1.18, position: [-4.5, 3.4, 1.8] }),
    rim: Object.freeze({ color: 0xffffff, intensity: 0.66, position: [0.8, 4.2, -5.2] }),
    water: Object.freeze({ color: 0x5fd9e6, intensity: 0, distance: 3.4, position: [0, 0.3, 0.35] }),
  }),
  cinematic: Object.freeze({
    exposure: 1.08,
    environmentIntensity: 0.2,
    hemisphere: Object.freeze({ sky: 0xe7e0cf, ground: 0x101a17, intensity: 0.82 }),
    key: Object.freeze({ color: 0xffd2a0, intensity: 3.35, position: [-4.2, 7.4, 5.6] }),
    fill: Object.freeze({ color: 0x9fcbd0, intensity: 0.58, position: [4.8, 2.6, 3.4] }),
    rim: Object.freeze({ color: 0xffe2b5, intensity: 1.12, position: [2.4, 4.2, -5.8] }),
    water: Object.freeze({ color: 0x42d7e8, intensity: 0.72, distance: 2.8, position: [0, 0.28, 0.38] }),
  }),
});

const state = {
  project: null,
  manifest: null,
  runtime: {
    attachables: new Map(),
    renderControllers: new Map(),
    animations: new Map(),
    animationControllers: new Map(),
    textureSets: new Map(),
  },
  modelCache: new Map(),
  textureCache: new Map(),
  derivedTextureCache: new Map(),
  currentModel: null,
  currentGeometry: null,
  currentGeometryIndex: 0,
  currentRenderPath: null,
  sceneModel: null,
  boneGroups: new Map(),
  waterBoneGroups: new Map(),
  waterOverlayGeometry: null,
  boneRecords: [],
  meshRecords: [],
  pivotRecords: [],
  locatorRecords: [],
  materials: new Set(),
  selectedBone: null,
  perspective: 'first',
  materialMode: 'pbr',
  cosmeticId: 'classic',
  action: 'idle',
  timeline: 0,
  timelineLength: 0.82,
  waterLevel: 'full',
  waterVisible: true,
  docked: false,
  showGrid: true,
  showAxes: false,
  showPivots: false,
  wireframe: false,
  captureNeutralPose: false,
  lightingPreset: 'neutral',
  loadToken: 0,
  toastTimer: null,
};

const ui = {
  canvas: document.querySelector('#viewport-canvas'),
  viewportStage: document.querySelector('#viewport-stage'),
  assetSelect: document.querySelector('#asset-select'),
  geometrySelect: document.querySelector('#geometry-select'),
  cosmeticSelect: document.querySelector('#cosmetic-select'),
  cosmeticNote: document.querySelector('#cosmetic-note'),
  perspectiveButtons: [...document.querySelectorAll('[data-perspective]')],
  materialButtons: [...document.querySelectorAll('[data-material]')],
  actionButtons: [...document.querySelectorAll('[data-action]')],
  waterButtons: [...document.querySelectorAll('[data-water]')],
  timeline: document.querySelector('#timeline'),
  timelineReadout: document.querySelector('#timeline-readout'),
  timelineNote: document.querySelector('#timeline-note'),
  waterReadout: document.querySelector('#water-readout'),
  waterGroup: document.querySelector('#water-group'),
  materialNote: document.querySelector('#material-note'),
  dockedToggle: document.querySelector('#docked-toggle'),
  waterToggle: document.querySelector('#water-toggle'),
  fitButton: document.querySelector('#fit-button'),
  resetButton: document.querySelector('#reset-button'),
  cameraFitButton: document.querySelector('#camera-fit-button'),
  cameraResetButton: document.querySelector('#camera-reset-button'),
  gridButton: document.querySelector('#grid-button'),
  axesButton: document.querySelector('#axes-button'),
  pivotsButton: document.querySelector('#pivots-button'),
  wireframeButton: document.querySelector('#wireframe-button'),
  runtimeStatus: document.querySelector('#runtime-status'),
  traceAttachable: document.querySelector('#trace-attachable'),
  traceController: document.querySelector('#trace-controller'),
  traceGeometry: document.querySelector('#trace-geometry'),
  parityScore: document.querySelector('#parity-score'),
  inspectorContent: document.querySelector('#inspector-content'),
  loadingState: document.querySelector('#loading-state'),
  toast: document.querySelector('#toast'),
};

const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.96;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x162326);
const environmentGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
scene.environment = environmentGenerator.fromScene(roomEnvironment).texture;
scene.environmentIntensity = 0.34;
roomEnvironment.dispose();
environmentGenerator.dispose();

const camera = new THREE.PerspectiveCamera(31, 1, 0.005, 1000);
camera.position.set(2.6, 1.9, 3.7);

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
controls.target.set(0, 0.48, 0);

// A terceira pessoa precisa de um ponto de observação ligeiramente mais alto
// para manter o modelo inteiro legível sem alterar a pose aprovada do pack.
const THIRD_PERSON_CAMERA_LIFT = 0.12;

const ambientLight = new THREE.HemisphereLight(0xf0f4ef, 0x202525, 1.55);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.65);
keyLight.position.set(4.5, 6.2, 5.2);
const fillLight = new THREE.DirectionalLight(0xe8eef0, 0.72);
fillLight.position.set(-4.5, 2.8, -3.8);
const rimLight = new THREE.DirectionalLight(0xf2ffff, 0.38);
rimLight.position.set(0, 3.5, -5.5);
const waterLight = new THREE.PointLight(0x5fd9e6, 0, 3.4, 2);
waterLight.position.set(0, 0.3, 0.35);
scene.add(ambientLight, keyLight, fillLight, rimLight, waterLight);

const grid = new THREE.GridHelper(8, 16, 0x557274, 0x2d4245);
grid.material.transparent = true;
grid.material.opacity = 0.58;
scene.add(grid);

const axes = new THREE.AxesHelper(1.25);
axes.visible = false;
scene.add(axes);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function assetUrl(relativePath) {
  return projectAssetUrl(relativePath, state.project?.id);
}

function runtimeAssetPath(relativePath) {
  return relativePath ? `pack/${relativePath}` : null;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace('.', ',');
}

function formatVector(vector, digits = 2) {
  return `[${vector.map((value) => formatNumber(value, digits)).join(' · ')}]`;
}

function applyDirectionalLight(light, definition) {
  light.color.setHex(definition.color);
  light.intensity = definition.intensity;
  light.position.set(...definition.position);
}

function applyLightingPreset(presetId = 'neutral') {
  const preset = LIGHTING_PRESETS[presetId];
  if (!preset) throw new Error(`Preset de iluminação desconhecido: ${presetId}`);

  state.lightingPreset = presetId;
  renderer.toneMappingExposure = preset.exposure;
  scene.environmentIntensity = preset.environmentIntensity;
  ambientLight.color.setHex(preset.hemisphere.sky);
  ambientLight.groundColor.setHex(preset.hemisphere.ground);
  ambientLight.intensity = preset.hemisphere.intensity;
  applyDirectionalLight(keyLight, preset.key);
  applyDirectionalLight(fillLight, preset.fill);
  applyDirectionalLight(rimLight, preset.rim);
  waterLight.color.setHex(preset.water.color);
  waterLight.intensity = preset.water.intensity;
  waterLight.distance = preset.water.distance;
  waterLight.position.set(...preset.water.position);
}

function setSceneBackground(background, transparent = false) {
  if (transparent) {
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    return;
  }

  scene.background = new THREE.Color(background ?? 0x162326);
  renderer.setClearAlpha(1);
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add('is-visible');
  state.toastTimer = setTimeout(() => ui.toast.classList.remove('is-visible'), 3000);
}

function setPressed(button, active) {
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', String(active));
}

async function fetchJson(relativePath) {
  const response = await fetch(assetUrl(relativePath));
  if (!response.ok) throw new Error(`Falha ao carregar ${relativePath}: ${response.status}`);
  return response.json();
}

async function loadRuntimeJson(relativePath) {
  if (!relativePath) return null;
  try {
    return await fetchJson(runtimeAssetPath(relativePath));
  } catch {
    return null;
  }
}

function normalizePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\/+/, '');
}

function stripTextureExtension(value) {
  return normalizePath(value)
    .replace(/\.texture_set\.json$/i, '')
    .replace(/\.png$/i, '');
}

function texturePath(stem, fallbackDirectory = '') {
  const normalized = stripTextureExtension(stem);
  if (!normalized) return null;
  if (normalized.startsWith('textures/')) return `${normalized}.png`;
  return `${fallbackDirectory ? `${fallbackDirectory}/` : 'textures/'}${normalized}.png`;
}

function resolveTextureField(baseStem, field) {
  if (!field) return null;
  const normalized = normalizePath(field);
  if (normalized.startsWith('textures/')) return texturePath(normalized);
  const baseDirectory = stripTextureExtension(baseStem).split('/').slice(0, -1).join('/');
  return texturePath(normalized, baseDirectory);
}

async function loadTexture(relativePath, colorTexture = false) {
  if (!relativePath) return null;
  const key = `${relativePath}:${colorTexture ? 'color' : 'data'}`;
  if (state.textureCache.has(key)) return state.textureCache.get(key);

  const promise = textureLoader.loadAsync(assetUrl(relativePath))
    .then((texture) => {
      texture.colorSpace = colorTexture ? THREE.SRGBColorSpace : THREE.NoColorSpace;
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

function createMersChannelTexture(sourceTexture, channelName, channelIndex) {
  if (!sourceTexture?.image?.width || !sourceTexture?.image?.height) return null;
  const cacheKey = `${sourceTexture.uuid}:${channelName}`;
  if (state.derivedTextureCache.has(cacheKey)) return state.derivedTextureCache.get(cacheKey);

  const { width, height } = sourceTexture.image;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(sourceTexture.image, 0, 0, width, height);
  const sourcePixels = context.getImageData(0, 0, width, height).data;
  const channelPixels = new Uint8Array(sourcePixels.length);

  for (let index = 0; index < sourcePixels.length; index += 4) {
    const value = sourcePixels[index + channelIndex];
    channelPixels[index] = value;
    channelPixels[index + 1] = value;
    channelPixels[index + 2] = value;
    channelPixels[index + 3] = 255;
  }

  const channelTexture = new THREE.DataTexture(
    channelPixels,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  channelTexture.colorSpace = THREE.NoColorSpace;
  channelTexture.flipY = sourceTexture.flipY;
  channelTexture.magFilter = THREE.NearestFilter;
  channelTexture.minFilter = THREE.NearestMipmapLinearFilter;
  channelTexture.generateMipmaps = true;
  channelTexture.anisotropy = 1;
  channelTexture.needsUpdate = true;
  state.derivedTextureCache.set(cacheKey, channelTexture);
  return channelTexture;
}

function createMersChannelTextures(mersTexture) {
  return {
    metalness: createMersChannelTexture(mersTexture, 'metalness', 0),
    emissive: createMersChannelTexture(mersTexture, 'emissive', 1),
    roughness: createMersChannelTexture(mersTexture, 'roughness', 2),
  };
}

function createBedrockMaterial({ color, normal, mersChannels, water = false }) {
  if (water) {
    return new THREE.MeshStandardMaterial({
      map: color,
      color: color ? 0xffffff : 0x4ebbc5,
      roughness: 0.18,
      metalness: 0,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  const material = new THREE.MeshStandardMaterial({
    map: color,
    normalMap: normal ?? null,
    normalScale: new THREE.Vector2(1, 1),
    metalnessMap: mersChannels?.metalness ?? null,
    roughnessMap: mersChannels?.roughness ?? null,
    emissiveMap: mersChannels?.emissive ?? null,
    emissive: mersChannels?.emissive ? 0xffffff : 0x000000,
    emissiveIntensity: mersChannels?.emissive ? 1 : 0,
    color: color ? 0xffffff : 0xc4d1cb,
    roughness: mersChannels ? 1 : 0.72,
    metalness: mersChannels ? 1 : 0.08,
    alphaTest: 0.01,
    side: THREE.FrontSide,
  });

  return material;
}

async function loadTextureSet(baseStem) {
  const normalizedStem = stripTextureExtension(baseStem);
  const setPath = `${normalizedStem}.texture_set.json`;
  const definition = state.runtime.textureSets.get(normalizedStem)
    ?? await loadRuntimeJson(setPath);
  const textureSet = definition?.['minecraft:texture_set'] ?? null;

  if (!textureSet) {
    const colorPath = texturePath(normalizedStem);
    return {
      definition: null,
      colorPath,
      normalPath: null,
      mersPath: null,
      color: await loadTexture(colorPath, true),
      normal: null,
      mers: null,
    };
  }

  const colorPath = resolveTextureField(normalizedStem, textureSet.color) ?? texturePath(normalizedStem);
  const normalPath = resolveTextureField(normalizedStem, textureSet.normal);
  const mersPath = resolveTextureField(normalizedStem, textureSet.metalness_emissive_roughness);
  const [color, normal, mers] = await Promise.all([
    loadTexture(colorPath, true),
    loadTexture(normalPath),
    loadTexture(mersPath),
  ]);

  return {
    definition: textureSet,
    colorPath,
    normalPath,
    mersPath,
    color,
    normal,
    mers,
  };
}

function getAnimationLength(animation) {
  return Number(animation?.animation_length) > 0 ? Number(animation.animation_length) : 0.82;
}

function vectorFromValue(value, fallback = [0, 0, 0]) {
  if (Array.isArray(value)) {
    return [0, 1, 2].map((index) => Number(value[index]) || 0);
  }
  if (value && typeof value === 'object') {
    return vectorFromValue(value.post ?? value.pre ?? fallback, fallback);
  }
  return [...fallback];
}

function sampleChannel(channel, time, length) {
  if (Array.isArray(channel)) return vectorFromValue(channel);
  if (!channel || typeof channel !== 'object') return [0, 0, 0];

  const keyframes = Object.entries(channel)
    .map(([key, value]) => ({ time: Number(key), value }))
    .filter(({ time }) => Number.isFinite(time))
    .sort((left, right) => left.time - right.time);

  if (!keyframes.length) return vectorFromValue(channel);
  if (keyframes.length === 1) return vectorFromValue(keyframes[0].value);

  const wrappedTime = length > 0 ? ((time % length) + length) % length : time;
  if (wrappedTime <= keyframes[0].time) return vectorFromValue(keyframes[0].value);
  if (wrappedTime >= keyframes.at(-1).time) return vectorFromValue(keyframes.at(-1).value);

  let nextIndex = keyframes.findIndex(({ time: keyTime }) => keyTime >= wrappedTime);
  if (nextIndex < 1) nextIndex = 1;
  const previous = keyframes[nextIndex - 1];
  const next = keyframes[nextIndex];
  const span = Math.max(next.time - previous.time, Number.EPSILON);
  const rawProgress = THREE.MathUtils.clamp((wrappedTime - previous.time) / span, 0, 1);
  const mode = previous.value?.lerp_mode ?? next.value?.lerp_mode;
  const from = vectorFromValue(previous.value);
  const to = vectorFromValue(next.value);
  if (mode === 'step') return from;
  if (mode === 'catmullrom') {
    const before = vectorFromValue(keyframes[Math.max(0, nextIndex - 2)].value);
    const after = vectorFromValue(keyframes[Math.min(keyframes.length - 1, nextIndex + 1)].value);
    const t = rawProgress;
    const t2 = t * t;
    const t3 = t2 * t;
    return from.map((value, index) => 0.5 * (
      (2 * value)
      + (-before[index] + to[index]) * t
      + (2 * before[index] - 5 * value + 4 * to[index] - after[index]) * t2
      + (-before[index] + 3 * value - 3 * to[index] + after[index]) * t3
    ));
  }
  return from.map((value, index) => THREE.MathUtils.lerp(value, to[index], rawProgress));
}

function applyAnimation(animation, time) {
  if (!animation?.bones) return;
  const length = getAnimationLength(animation);

  for (const [boneName, channels] of Object.entries(animation.bones)) {
    const group = state.boneGroups.get(boneName);
    if (!group) continue;

    if (channels.position) {
      const value = bedrockAnimationPosition(sampleChannel(channels.position, time, length));
      group.position.add(new THREE.Vector3(...value).multiplyScalar(SCALE));
    }
    if (channels.rotation) {
      const value = bedrockAnimationRotation(
        sampleChannel(channels.rotation, time, length),
        state.perspective,
      );
      group.rotation.x += THREE.MathUtils.degToRad(value[0]);
      group.rotation.y += THREE.MathUtils.degToRad(value[1]);
      group.rotation.z += THREE.MathUtils.degToRad(value[2]);
    }
    if (channels.scale) {
      const value = sampleChannel(channels.scale, time, length);
      group.scale.multiply(new THREE.Vector3(...value));
    }
  }
}

function resetPose() {
  for (const record of state.boneRecords) {
    record.group.position.copy(record.basePosition);
    record.group.rotation.copy(record.baseRotation);
    record.group.scale.copy(record.baseScale);
  }
}

function applyPose() {
  if (!state.currentGeometry) return;
  resetPose();

  if (state.perspective === 'first') {
    for (const { bone, group } of state.boneRecords) {
      if (!bone.rotation) continue;
      const rotation = bedrockGeometryRotation(bone.rotation, 'first');
      group.rotation.set(
        THREE.MathUtils.degToRad(rotation[0]),
        THREE.MathUtils.degToRad(rotation[1]),
        THREE.MathUtils.degToRad(rotation[2]),
        group.rotation.order,
      );
    }
  }

  const path = state.currentRenderPath;
  if (path?.attachable && !state.captureNeutralPose) {
    const holdId = state.perspective === 'first'
      ? path.animationIds.holdFirstPerson
      : path.animationIds.holdThirdPerson;
    const holdAnimation = state.runtime.animations.get(holdId);
    applyAnimation(holdAnimation, 0);

    if (state.action === 'sprinkle') {
      const actionId = state.perspective === 'first'
        ? path.animationIds.sprinkleFirstPerson
        : path.animationIds.sprinkleThirdPerson;
      const actionAnimation = state.runtime.animations.get(actionId);
      applyAnimation(actionAnimation, state.timeline);
    }
  }

  applyVisibility();
}

function buildBedrockGeometry(geometryData, geometrySummary, palette) {
  const built = buildSharedBedrockGeometry(geometryData, geometrySummary, palette);
  built.materials.forEach((material) => state.materials.add(material));
  return built;
}

function disposeObject(object) {
  if (!object) return;
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function applyVisibility() {
  grid.visible = state.showGrid;
  axes.visible = state.showAxes;
  for (const waterBone of WATER_BONES) {
    const group = state.waterBoneGroups.get(waterBone) ?? state.boneGroups.get(waterBone);
    if (group) group.visible = state.waterVisible && state.waterLevel === waterBone.replace('water_', '');
  }
  const dockedGroup = state.boneGroups.get('resting_aspergillum');
  if (dockedGroup) dockedGroup.visible = state.docked;

  for (const { marker } of state.pivotRecords) marker.visible = state.showPivots;
  for (const { marker } of state.locatorRecords) marker.visible = state.showPivots;
  for (const material of state.materials) material.wireframe = state.wireframe;
}

function applyModelCenter(root) {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return bounds;
  root.position.sub(bounds.getCenter(new THREE.Vector3()));
  root.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(root);
}

function getCurrentBounds() {
  return state.sceneModel ? new THREE.Box3().setFromObject(state.sceneModel) : new THREE.Box3();
}

function fitCamera(showMessage = false) {
  const bounds = getCurrentBounds();
  if (bounds.isEmpty()) return;

  const center = bounds.getCenter(new THREE.Vector3());
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.12);
  const distance = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.35;
  const direction = new THREE.Vector3(0.78, 0.57, 1).normalize();
  const viewTarget = center.clone();

  if (state.perspective === 'third') {
    viewTarget.y += THIRD_PERSON_CAMERA_LIFT;
  }

  camera.position.copy(viewTarget).addScaledVector(direction, distance);
  camera.near = Math.max(0.005, radius / 120);
  camera.far = Math.max(50, radius * 80);
  camera.updateProjectionMatrix();
  controls.target.copy(viewTarget);
  controls.minDistance = radius * 0.18;
  controls.maxDistance = radius * 28;
  controls.update();

  const floorY = bounds.min.y - 0.025;
  grid.position.y = floorY;
  axes.position.copy(center);
  axes.position.y = floorY;

  if (showMessage) showToast('Câmera enquadrada no resultado do render path.');
}

function resetCamera() {
  fitCamera();
  showToast('Câmera resetada.');
}

function setLoading(loading) {
  ui.loadingState.classList.toggle('is-hidden', !loading);
}

function updateTimelineReadout() {
  ui.timelineReadout.textContent = `${formatNumber(state.timeline, 2)} s`;
}

function updateControls() {
  const hasWater = state.waterBoneGroups.size > 0
    || WATER_BONES.some((boneName) => state.boneGroups.has(boneName));
  const hasDocked = state.boneGroups.has('resting_aspergillum');
  const currentCosmetic = getCurrentCosmetic();
  ui.perspectiveButtons.forEach((button) => setPressed(button, button.dataset.perspective === state.perspective));
  ui.materialButtons.forEach((button) => setPressed(button, button.dataset.material === state.materialMode));
  ui.actionButtons.forEach((button) => setPressed(button, button.dataset.action === state.action));
  ui.waterButtons.forEach((button) => {
    setPressed(button, button.dataset.water === state.waterLevel);
    button.disabled = !hasWater;
  });
  ui.waterReadout.textContent = WATER_LABELS[state.waterLevel];
  ui.waterGroup.classList.toggle('is-disabled', !hasWater);
  ui.waterToggle.disabled = !hasWater;
  ui.dockedToggle.disabled = !hasDocked;
  ui.cosmeticSelect.value = currentCosmetic.id;
  ui.cosmeticSelect.disabled = (state.manifest?.cosmetics?.length ?? 0) < 2;
  ui.cosmeticNote.textContent = displayCosmetic(currentCosmetic);
  ui.timeline.max = String(state.timelineLength);
  ui.timeline.value = String(Math.min(state.timeline, state.timelineLength));
  const hasAttachable = Boolean(state.currentRenderPath?.attachable);
  const hasAction = Boolean(
    state.currentRenderPath?.animationIds?.sprinkleFirstPerson
    || state.currentRenderPath?.animationIds?.sprinkleThirdPerson,
  );
  ui.perspectiveButtons.forEach((button) => { button.disabled = !hasAttachable; });
  ui.actionButtons.forEach((button) => {
    button.disabled = !hasAttachable || (button.dataset.action === 'sprinkle' && !hasAction);
  });
  ui.timeline.disabled = !hasAction;
  const idleButton = ui.actionButtons.find((button) => button.dataset.action === 'idle');
  const actionButton = ui.actionButtons.find((button) => button.dataset.action === 'sprinkle');
  if (idleButton) idleButton.textContent = state.manifest?.capabilities?.advancedAvatarProfile ? 'Segurando' : 'Pose base';
  if (actionButton) actionButton.textContent = state.manifest?.capabilities?.advancedAvatarProfile ? 'Aspersão' : 'Ação do pack';
  if (!hasAction && state.action === 'sprinkle') state.action = 'idle';
  ui.timelineNote.textContent = hasAction
    ? state.action === 'sprinkle'
      ? 'Ação ativa: o tempo controla a animação declarada no pack.'
      : 'Selecione a ação para examinar sua curva no tempo.'
    : 'Esta geometria não possui animação de attachable.';
  setPressed(ui.gridButton, state.showGrid);
  setPressed(ui.axesButton, state.showAxes);
  setPressed(ui.pivotsButton, state.showPivots);
  setPressed(ui.wireframeButton, state.wireframe);
  ui.dockedToggle.checked = state.docked;
  ui.waterToggle.checked = state.waterVisible;
  updateTimelineReadout();
}

function findModelGeometry(model, index) {
  return model?.geometries?.[index] ?? model?.geometries?.[0] ?? null;
}

function findGeometrySource(model, geometrySummary) {
  return model?.source ?? geometrySummary?.source ?? null;
}

function describeModel(model) {
  const sourceName = model.source.split('/').at(-1).replace(/\.geo\.json$|\.json$/i, '');
  return `${model.label} · ${sourceName}`;
}

function populateAssetSelect() {
  ui.assetSelect.innerHTML = state.manifest.models.map((model, index) => (
    `<option value="${index}">${escapeHtml(describeModel(model))}</option>`
  )).join('');
}

function populateCosmeticSelect() {
  ui.cosmeticSelect.innerHTML = state.manifest.cosmetics.map((cosmetic) => (
    `<option value="${escapeHtml(cosmetic.id)}">${escapeHtml(cosmetic.label ?? cosmeticLabel(cosmetic))}</option>`
  )).join('');
  ui.cosmeticSelect.value = state.cosmeticId;
}

function populateGeometrySelect(model) {
  ui.geometrySelect.innerHTML = (model?.geometries ?? []).map((geometry, index) => (
    `<option value="${index}">${escapeHtml(geometry.identifier)} · ${geometry.cubeCount} cubos</option>`
  )).join('');
  ui.geometrySelect.value = String(state.currentGeometryIndex);
}

function getPreferredModelIndex() {
  const advanced = state.manifest.capabilities?.advancedAvatarProfile;
  const preferredModelId = advanced
    ? state.manifest.equipment?.find(({ geometryId }) => geometryId === 'geometry.aspergillum.held')?.modelId
    : state.manifest.equipment?.find(({ resolved }) => resolved)?.modelId;
  const index = state.manifest.models.findIndex((model) => model.id === preferredModelId);
  return index >= 0 ? index : 0;
}

function findRuntimePath(model, geometrySummary) {
  const equipment = state.manifest.equipment?.find((candidate) => (
    candidate.modelId === model?.id && candidate.geometryId === geometrySummary?.identifier
  ));
  const candidates = equipment?.attachableVariants?.length
    ? equipment.attachableVariants
    : model?.renderPaths ?? [];
  const summary = candidates.find(({ path }) => path === equipment?.attachable?.path)
    ?? candidates.find(({ playerVariant }) => playerVariant === ['head', 'chest'].includes(equipment?.slot ?? model?.slot))
    ?? candidates[0]
    ?? null;
  const attachableDocument = summary ? state.runtime.attachables.get(summary.path) : null;
  const attachableDescription = attachableDocument?.['minecraft:attachable']?.description;

  if (!attachableDescription) {
    const textureStem = stripTextureExtension(model?.texture ?? '');
    return {
      attachable: false,
      attachableId: null,
      controllerId: null,
      geometryId: geometrySummary?.identifier ?? null,
      materialId: 'entity',
      textureStem,
      animationIds: {},
    };
  }

  const controllerId = attachableDescription.render_controllers?.[0] ?? null;
  const controller = controllerId ? state.runtime.renderControllers.get(controllerId) : null;
  const geometryReference = controller?.geometry ?? 'Geometry.default';
  const geometryId = typeof geometryReference === 'string' && geometryReference.startsWith('Geometry.')
    ? attachableDescription.geometry?.[geometryReference.slice('Geometry.'.length)]
    : geometryReference;
  const textureReference = controller?.textures?.[0] ?? 'Texture.default';
  const textureStem = typeof textureReference === 'string' && textureReference.startsWith('Texture.')
    ? attachableDescription.textures?.[textureReference.slice('Texture.'.length)]
    : textureReference;
  const materialReference = controller?.materials?.[0]?.['*']
    ?? controller?.materials?.[0]?.default
    ?? 'Material.default';
  const materialId = typeof materialReference === 'string' && materialReference.startsWith('Material.')
    ? attachableDescription.materials?.[materialReference.slice('Material.'.length)]
    : materialReference;

  return {
    attachable: true,
    attachablePath: summary.path,
    attachableId: attachableDescription.identifier,
    controllerId,
    geometryId,
    materialId: materialId ?? 'entity',
    textureStem: stripTextureExtension(textureStem),
    animationIds: {
      holdFirstPerson: attachableDescription.animations?.hold_first_person
        ?? attachableDescription.animations?.wield_first_person,
      holdThirdPerson: attachableDescription.animations?.hold_third_person
        ?? attachableDescription.animations?.wield_third_person,
      sprinkleFirstPerson: attachableDescription.animations?.sprinkle_first_person,
      sprinkleThirdPerson: attachableDescription.animations?.sprinkle_third_person,
      actionController: attachableDescription.animations?.action_controller,
      declared: Object.values(attachableDescription.animations ?? {}),
    },
  };
}

async function loadModelData(model) {
  if (state.modelCache.has(model.source)) return state.modelCache.get(model.source);
  const data = await fetchJson(model.source);
  state.modelCache.set(model.source, data);
  return data;
}

async function createMaterialPalette(renderPath, model) {
  const cosmetic = resolveCosmetic(state.manifest.cosmetics, state.cosmeticId);
  const stem = cosmetic.textures?.[model.id]
    || renderPath.textureStem
    || stripTextureExtension(model.texture ?? '');
  const textureSet = await loadTextureSet(stem);
  const water = await loadTexture('textures/blocks/holy_water.png', true);
  const mersChannels = state.materialMode === 'pbr' && textureSet.mers
    ? createMersChannelTextures(textureSet.mers)
    : null;
  const defaultMaterial = createBedrockMaterial({
    color: textureSet.color,
    normal: state.materialMode === 'pbr' ? textureSet.normal : null,
    mersChannels,
  });
  const waterMaterial = createBedrockMaterial({ color: water, water: true });

  return {
    default: defaultMaterial,
    water: waterMaterial,
    named: {},
    textureSet,
    sourceStem: stem,
  };
}

async function createOverlayMaterialPalette(model, role) {
  const colorPath = model.texture;
  const color = await loadTexture(colorPath, true);
  const material = createBedrockMaterial({ color, water: role === 'water' });
  return {
    default: material,
    water: material,
    named: {},
    textureSet: {
      definition: null,
      colorPath,
      normalPath: null,
      mersPath: null,
      color,
      normal: null,
      mers: null,
    },
    sourceStem: stripTextureExtension(colorPath),
  };
}

function getSelectedModel() {
  return state.manifest.models[Number(ui.assetSelect.value)] ?? state.manifest.models[0];
}

function getCurrentCosmetic() {
  return resolveCosmetic(state.manifest.cosmetics, state.cosmeticId);
}

function displayCosmetic(cosmetic) {
  return cosmetic?.label ?? cosmeticLabel(cosmetic);
}

function getModelCompositions(model) {
  return state.manifest.compositions?.[model.id] ?? [];
}

function updateRuntimeTrace() {
  const path = state.currentRenderPath;
  ui.traceAttachable.textContent = path?.attachableId ?? 'direct geometry';
  ui.traceController.textContent = path?.controllerId ?? '—';
  ui.traceGeometry.textContent = path?.geometryId ?? state.currentGeometry?.identifier ?? '—';
}

function updateRuntimeUi() {
  const path = state.currentRenderPath;
  ui.materialNote.textContent = state.materialMode === 'pbr'
    ? 'IBL neutro + MERS direto: R metal, G emissivo, B roughness.'
    : 'Somente color map; equivalente ao caminho clássico do material.';
  ui.runtimeStatus.textContent = path?.attachable ? 'Render path local ativo' : 'Geometria local ativa';
  ui.parityScore.textContent = 'PACK';
  updateRuntimeTrace();
}

function row(label, value, className = '') {
  return `<div class="inspector-row"><span>${escapeHtml(label)}</span><strong class="${className}">${escapeHtml(value)}</strong></div>`;
}

function status(value, available) {
  return row(value, available ? 'ativo' : 'ausente', available ? 'ok' : 'warn');
}

function renderInspector() {
  const geometry = state.currentGeometry;
  const model = state.currentModel;
  const path = state.currentRenderPath;
  const textureSet = state.sceneModel?.userData?.textureSet;
  const cosmetic = getCurrentCosmetic();
  if (!geometry || !model || !path) {
    ui.inspectorContent.innerHTML = '<div class="inspector-empty"><span class="empty-glyph" aria-hidden="true">◌</span><strong>Aguardando runtime</strong><p>A cadeia resolvida e os mapas ativos aparecerão aqui.</p></div>';
    return;
  }

  const selected = state.boneRecords.find((record) => record.bone.name === state.selectedBone);
  const formatVersion = state.sceneModel?.userData?.formatVersion ?? '—';
  const geometryRows = [
    row('Identifier', geometry.identifier),
    row('Formato', formatVersion),
    row('Bones', String(geometry.boneCount)),
    row('Cubos', String(geometry.cubeCount)),
    row('Locators', String(geometry.locatorCount)),
    row('Textura', `${geometry.textureWidth} × ${geometry.textureHeight}`),
    row('UV Bedrock-safe', geometry.uvSafety?.unsafeSubtexelBoxUvCubes || geometry.uvSafety?.invalidOrCollapsedFaces ? 'não' : 'per-face inteiro'),
    row('Faces omitidas', geometry.uvSafety?.intentionallyOmittedFaces ?? 0),
  ];

  const runtimeRows = [
    row('Attachable', path.attachableId ?? 'não aplicável', path.attachable ? 'ok' : ''),
    row('Render controller', path.controllerId ?? 'não aplicável', path.controllerId ? 'ok' : ''),
    row('Material', path.materialId ?? '—'),
    row('Acabamento', displayCosmetic(cosmetic)),
    row('Perspectiva', state.perspective === 'first' ? 'context.is_first_person = 1' : 'context.is_first_person = 0'),
    row('Estado', state.action === 'sprinkle' ? 'controller → sprinkle' : 'controller → idle'),
    row('Pose', state.action === 'sprinkle' ? `${formatNumber(state.timeline, 2)} s` : 'hold'),
  ];

  const textureRows = [
    status('Color', Boolean(textureSet?.color)),
    status('Normal', state.materialMode === 'pbr' && Boolean(textureSet?.normal)),
    status('MERS', state.materialMode === 'pbr' && Boolean(textureSet?.mers)),
    row('Color source', textureSet?.colorPath ?? '—'),
    row('Normal source', textureSet?.normalPath ?? '—'),
    row('MERS source', textureSet?.mersPath ?? '—'),
  ];

  const parityRows = [
    status('Geometria Bedrock', true),
    status('UV inteiro / sem colapso', !(geometry.uvSafety?.unsafeSubtexelBoxUvCubes || geometry.uvSafety?.invalidOrCollapsedFaces)),
    status('Pivôs / hierarquia', true),
    status('MERS R/G/B', state.materialMode === 'pbr' && Boolean(textureSet?.mers)),
    status('Attachable + controller', path.attachable),
    status('Animações do pack', path.attachable && state.runtime.animations.size > 0),
    status('Água composta por entidade', Boolean(state.waterOverlayGeometry)),
    status('Shader Minecraft proprietário', false),
  ];

  const selectedSection = selected
    ? `<section class="inspector-section"><h3 class="inspector-section-title">Bone selecionado</h3><div class="inspector-list">${row('Nome', selected.bone.name)}${row('Pivot', formatVector(selected.pivot))}${row('Cubos', String(selected.bone.cubes?.length ?? 0))}${row('Locators', String(Object.keys(selected.bone.locators ?? {}).length))}</div></section>`
    : '';

  ui.inspectorContent.innerHTML = `
    ${selectedSection}
    <section class="inspector-section"><h3 class="inspector-section-title">Render path resolvido</h3><div class="inspector-list">${runtimeRows.join('')}</div></section>
    <section class="inspector-section"><h3 class="inspector-section-title">Material e mapas</h3><div class="inspector-list">${textureRows.join('')}</div></section>
    <section class="inspector-section"><h3 class="inspector-section-title">Geometria</h3><div class="inspector-list">${geometryRows.join('')}</div></section>
    <section class="inspector-section"><h3 class="inspector-section-title">Cobertura de compatibilidade</h3><div class="inspector-list">${parityRows.join('')}</div></section>
    <section class="inspector-section"><h3 class="inspector-section-title">Fonte</h3><div class="inspector-list">${row('Modelo', model.source)}${row('Pack', 'packs/resource')}</div></section>
  `;
}

function removeCurrentSceneModel() {
  if (!state.sceneModel) return;
  scene.remove(state.sceneModel);
  disposeObject(state.sceneModel);
  state.sceneModel = null;
}

function updateSelectedBone() {
  for (const { marker, boneName } of state.pivotRecords) {
    marker.material.color.setHex(boneName === state.selectedBone ? 0xf1c46f : 0x74d9c3);
  }
  renderInspector();
}

function applyCurrentState() {
  applyPose();
  updateControls();
  updateRuntimeUi();
  renderInspector();
}

async function loadCurrentModel() {
  const token = ++state.loadToken;
  const model = getSelectedModel();
  const index = Number(ui.geometrySelect.value) || 0;
  const geometrySummary = findModelGeometry(model, index);
  if (!model || !geometrySummary) return;

  setLoading(true);
  state.currentModel = model;
  state.currentGeometryIndex = index;
  state.selectedBone = null;

  try {
    const sourceData = await loadModelData(model);
    if (token !== state.loadToken) return;
    const geometries = extractBedrockGeometries(sourceData);
    const geometryData = geometries[index] ?? geometries[0];
    if (!geometryData) throw new Error(`Geometria Bedrock ausente em ${model.source}.`);
    const renderPath = findRuntimePath(model, geometrySummary);
    const palette = await createMaterialPalette(renderPath, model);
    if (token !== state.loadToken) return;
    state.materials = new Set();
    const built = buildBedrockGeometry(geometryData, geometrySummary, palette);
    const compositionResults = [];
    for (const composition of getModelCompositions(model)) {
      const overlayModel = state.manifest.models.find((candidate) => candidate.id === composition.modelId);
      if (!overlayModel) throw new Error(`Modelo de composição ausente: ${composition.modelId}`);
      const overlaySource = await loadModelData(overlayModel);
      const overlaySummary = overlayModel.geometries?.[0];
      const overlayGeometry = extractBedrockGeometries(overlaySource)[0];
      if (!overlaySummary || !overlayGeometry) {
        throw new Error(`Geometria de composição ausente: ${composition.modelId}`);
      }
      const overlayPalette = await createOverlayMaterialPalette(overlayModel, composition.role);
      if (token !== state.loadToken) return;
      compositionResults.push({
        ...composition,
        geometry: overlaySummary,
        built: buildBedrockGeometry(overlayGeometry, overlaySummary, overlayPalette),
      });
    }
    const sceneModel = new THREE.Group();
    sceneModel.name = `runtime:${geometrySummary.identifier}`;
    sceneModel.userData = {
      textureSet: palette.textureSet,
      formatVersion: sourceData.format_version ?? 'unknown',
    };
    sceneModel.add(built.root);
    for (const composition of compositionResults) sceneModel.add(composition.built.root);
    applyModelCenter(sceneModel);
    removeCurrentSceneModel();
    scene.add(sceneModel);
    state.sceneModel = sceneModel;
    state.currentGeometry = geometrySummary;
    state.currentRenderPath = renderPath;
    state.boneGroups = built.boneGroups;
    const waterComposition = compositionResults.find(({ role }) => role === 'water');
    state.waterBoneGroups = waterComposition?.built.boneGroups ?? new Map();
    state.waterOverlayGeometry = waterComposition?.geometry.identifier ?? null;
    state.boneRecords = [
      ...built.boneRecords,
      ...compositionResults.flatMap(({ built: overlay }) => overlay.boneRecords),
    ];
    state.meshRecords = [
      ...built.meshRecords,
      ...compositionResults.flatMap(({ built: overlay }) => overlay.meshRecords),
    ];
    state.pivotRecords = [
      ...built.pivotRecords,
      ...compositionResults.flatMap(({ built: overlay }) => overlay.pivotRecords),
    ];
    state.locatorRecords = [
      ...built.locatorRecords,
      ...compositionResults.flatMap(({ built: overlay }) => overlay.locatorRecords),
    ];
    const actionAnimationId = state.perspective === 'first'
      ? renderPath.animationIds?.sprinkleFirstPerson
      : renderPath.animationIds?.sprinkleThirdPerson;
    state.timelineLength = actionAnimationId
      ? getAnimationLength(state.runtime.animations.get(actionAnimationId))
      : 0;
    state.timeline = Math.min(state.timeline, state.timelineLength);
    applyPose();
    applyVisibility();
    fitCamera();
    updateRuntimeUi();
    updateControls();
    renderInspector();
    setLoading(false);
  } catch (error) {
    console.error(error);
    setLoading(false);
    ui.runtimeStatus.textContent = 'Falha no runtime local';
    showToast(error instanceof Error ? error.message : 'Falha ao montar o renderer Bedrock.');
  }
}

async function loadRuntime() {
  state.project = await getSelectedProject();
  const manifest = await fetchJson('manifest.json');
  state.manifest = manifest;
  state.modelCache.clear();
  state.textureCache.clear();
  state.runtime.attachables.clear();
  state.runtime.renderControllers.clear();
  state.runtime.animations.clear();
  state.runtime.animationControllers.clear();
  state.runtime.textureSets.clear();

  const runtimeFiles = manifest.runtime ?? {};
  const [attachableFiles, renderControllerFiles, animationFiles, controllerFiles, textureSetFiles] = await Promise.all([
    Promise.all((runtimeFiles.attachables ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
    Promise.all((runtimeFiles.renderControllers ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
    Promise.all((runtimeFiles.animations ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
    Promise.all((runtimeFiles.animationControllers ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
    Promise.all((runtimeFiles.textureSets ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
  ]);

  for (const [file, data] of attachableFiles) {
    if (data) state.runtime.attachables.set(file, data);
  }
  for (const [, data] of renderControllerFiles) {
    for (const [identifier, controller] of Object.entries(data?.render_controllers ?? {})) {
      state.runtime.renderControllers.set(identifier, controller);
    }
  }
  for (const [, data] of animationFiles) {
    for (const [identifier, animation] of Object.entries(data?.animations ?? {})) state.runtime.animations.set(identifier, animation);
  }
  for (const [, data] of controllerFiles) {
    for (const [identifier, controller] of Object.entries(data?.animation_controllers ?? {})) state.runtime.animationControllers.set(identifier, controller);
  }
  for (const [file, data] of textureSetFiles) {
    if (data) state.runtime.textureSets.set(stripTextureExtension(file), data);
  }

  state.cosmeticId = manifest.cosmetics?.find(({ id }) => id === 'classic')?.id
    ?? manifest.cosmetics?.[0]?.id
    ?? 'default';
  if (!manifest.capabilities?.pbr) state.materialMode = 'classic';
  populateAssetSelect();
  populateCosmeticSelect();
  const preferredIndex = getPreferredModelIndex();
  ui.assetSelect.value = String(preferredIndex);
  populateGeometrySelect(state.manifest.models[preferredIndex]);
  updateControls();
  await loadCurrentModel();
  showToast(`${state.project.displayName}: runtime local montado a partir do Resource Pack.`);
}

function onAssetChange() {
  const model = getSelectedModel();
  state.currentGeometryIndex = 0;
  populateGeometrySelect(model);
  loadCurrentModel();
}

function onPerspectiveChange(button) {
  state.perspective = button.dataset.perspective;
  if (state.currentRenderPath?.animationIds) {
    const animationId = state.perspective === 'first'
      ? state.currentRenderPath.animationIds.sprinkleFirstPerson
      : state.currentRenderPath.animationIds.sprinkleThirdPerson;
    state.timelineLength = animationId ? getAnimationLength(state.runtime.animations.get(animationId)) : 0;
  }
  applyCurrentState();
  fitCamera();
}

function onMaterialChange(button) {
  state.materialMode = button.dataset.material;
  loadCurrentModel();
}

function onCosmeticChange() {
  state.cosmeticId = ui.cosmeticSelect.value;
  loadCurrentModel();
}

function onActionChange(button) {
  state.action = button.dataset.action;
  if (state.action === 'idle') state.timeline = 0;
  applyCurrentState();
}

function selectFromCanvas(event) {
  if (!state.meshRecords.length) return;
  const bounds = ui.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(state.meshRecords.map(({ mesh }) => mesh), false);
  const hit = intersections[0]?.object;
  state.selectedBone = hit?.userData?.boneName ?? null;
  updateSelectedBone();
}

function bindStablePanInteraction() {
  let activePanPointerId = null;

  const beginPan = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 2) return;
    activePanPointerId = event.pointerId;
    // Pan deve acompanhar o ponteiro imediatamente. A inércia continua
    // disponível para a órbita no botão esquerdo.
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

function wireInteractions() {
  ui.assetSelect.addEventListener('change', onAssetChange);
  ui.geometrySelect.addEventListener('change', () => loadCurrentModel());
  ui.cosmeticSelect.addEventListener('change', onCosmeticChange);
  ui.perspectiveButtons.forEach((button) => button.addEventListener('click', () => onPerspectiveChange(button)));
  ui.materialButtons.forEach((button) => button.addEventListener('click', () => onMaterialChange(button)));
  ui.actionButtons.forEach((button) => button.addEventListener('click', () => onActionChange(button)));
  ui.waterButtons.forEach((button) => button.addEventListener('click', () => {
    state.waterLevel = button.dataset.water;
    applyCurrentState();
  }));
  ui.timeline.addEventListener('input', () => {
    if (state.currentRenderPath?.attachable && state.action !== 'sprinkle') {
      state.action = 'sprinkle';
    }
    state.timeline = Number(ui.timeline.value) || 0;
    applyCurrentState();
  });
  ui.dockedToggle.addEventListener('change', () => {
    state.docked = ui.dockedToggle.checked;
    applyCurrentState();
  });
  ui.waterToggle.addEventListener('change', () => {
    state.waterVisible = ui.waterToggle.checked;
    applyCurrentState();
  });
  ui.gridButton.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    grid.visible = state.showGrid;
    setPressed(ui.gridButton, state.showGrid);
  });
  ui.axesButton.addEventListener('click', () => {
    state.showAxes = !state.showAxes;
    axes.visible = state.showAxes;
    setPressed(ui.axesButton, state.showAxes);
  });
  ui.pivotsButton.addEventListener('click', () => {
    state.showPivots = !state.showPivots;
    setPressed(ui.pivotsButton, state.showPivots);
    applyVisibility();
  });
  ui.wireframeButton.addEventListener('click', () => {
    state.wireframe = !state.wireframe;
    setPressed(ui.wireframeButton, state.wireframe);
    applyVisibility();
  });
  ui.fitButton.addEventListener('click', () => fitCamera(true));
  ui.cameraFitButton.addEventListener('click', () => fitCamera(true));
  ui.resetButton.addEventListener('click', resetCamera);
  ui.cameraResetButton.addEventListener('click', resetCamera);
  bindStablePanInteraction();
  ui.canvas.addEventListener('click', selectFromCanvas);

  window.addEventListener('keydown', (event) => {
    if (!ui.canvas.isConnected) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    const key = event.key.toLowerCase();
    if (key === 'f') fitCamera(true);
    if (key === 'r') resetCamera();
    if (key === 'g') ui.gridButton.click();
    if (key === 'a') ui.axesButton.click();
    if (key === 'p') ui.pivotsButton.click();
    if (key === 'w') ui.wireframeButton.click();
    if (event.key === 'Escape') {
      state.selectedBone = null;
      updateSelectedBone();
    }
  });
}

function resizeRenderer() {
  const width = Math.max(1, ui.viewportStage.clientWidth);
  const height = Math.max(1, ui.viewportStage.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  if (!ui.canvas.isConnected) return;
  if (controls.enabled) controls.update();
  renderer.render(scene, camera);
}

function renderCaptureFrame() {
  if (controls.enabled) controls.update();
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function isEffectivelyVisible(object) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function getCaptureBounds() {
  const bounds = new THREE.Box3();
  for (const { mesh } of state.meshRecords) {
    if (isEffectivelyVisible(mesh)) bounds.expandByObject(mesh, true);
  }
  return bounds;
}

function getCaptureDistance(bounds, target, direction, up) {
  const right = new THREE.Vector3().crossVectors(up, direction).normalize();
  const viewUp = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const tanHorizontal = tanVertical * camera.aspect;
  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }

  return Math.max(...corners.map((corner) => {
    const offset = corner.sub(target);
    const projectedDepth = offset.dot(direction);
    const horizontalDistance = Math.abs(offset.dot(right)) / tanHorizontal;
    const verticalDistance = Math.abs(offset.dot(viewUp)) / tanVertical;
    return projectedDepth + Math.max(horizontalDistance, verticalDistance) * 1.18;
  }), 0.25);
}

function setCaptureView(viewId, framing = {}) {
  const view = getCaptureView(viewId);
  if (!view) throw new Error(`Vista de captura desconhecida: ${viewId}`);

  const bounds = getCaptureBounds();
  if (bounds.isEmpty()) throw new Error('Nenhum modelo disponível para captura.');
  const target = bounds.getCenter(new THREE.Vector3());
  const directionValues = Array.isArray(framing.direction) ? framing.direction : view.direction;
  const upValues = Array.isArray(framing.up) ? framing.up : view.up;
  const direction = new THREE.Vector3(...directionValues).normalize();
  const up = new THREE.Vector3(...upValues).normalize();
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.12);
  const targetOffset = Array.isArray(framing.targetOffset) ? framing.targetOffset : [0, 0, 0];
  target.add(new THREE.Vector3(
    Number(targetOffset[0]) || 0,
    Number(targetOffset[1]) || 0,
    Number(targetOffset[2]) || 0,
  ).multiplyScalar(radius));
  const distanceScale = THREE.MathUtils.clamp(Number(framing.distanceScale) || 1, 0.72, 1.8);
  const distance = getCaptureDistance(bounds, target, direction, up) * distanceScale;

  camera.up.copy(up);
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.near = Math.max(0.005, radius / 120);
  camera.far = Math.max(50, radius * 80);
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  camera.lookAt(target);
  renderCaptureFrame();

  return {
    id: view.id,
    label: view.label,
    camera: camera.position.toArray(),
    target: target.toArray(),
    framing: {
      distanceScale,
      targetOffset: targetOffset.map((value) => Number(value) || 0),
      direction: directionValues.map((value) => Number(value) || 0),
      up: upValues.map((value) => Number(value) || 0),
    },
  };
}

function captureView(viewId, framing = {}) {
  const view = setCaptureView(viewId, framing);
  return {
    ...view,
    dataUrl: ui.canvas.toDataURL('image/png'),
  };
}

async function configureCapture(options = {}) {
  const requestedModel = options.modelId ?? options.model ?? null;
  const equipment = requestedModel
    ? state.manifest.equipment?.find(({ id, localId }) => id === requestedModel || localId === requestedModel)
    : null;
  const subject = requestedModel ? null : getCaptureSubject(options.subject ?? 'aspergillum');
  if (!requestedModel && !subject) throw new Error(`Assunto de captura desconhecido: ${options.subject}`);
  const modelId = equipment?.modelId ?? requestedModel ?? subject.modelId;
  const modelIndex = state.manifest.models.findIndex((model) => (
    model.id === modelId || model.geometries?.some(({ identifier }) => identifier === modelId)
  ));
  if (modelIndex < 0) throw new Error(`Modelo não encontrado no catálogo: ${modelId}`);
  const selectedModel = state.manifest.models[modelIndex];

  document.body.classList.add('capture-mode');
  controls.enabled = false;
  resizeRenderer();
  setSceneBackground(options.background, Boolean(options.transparent));
  applyLightingPreset(options.lighting ?? 'neutral');
  state.showGrid = Boolean(options.grid);
  state.showAxes = false;
  state.showPivots = false;
  state.wireframe = Boolean(options.wireframe);
  state.waterVisible = options.water !== 'empty';
  state.waterLevel = options.water ?? 'full';
  state.docked = subject?.docked ?? false;
  state.captureNeutralPose = options.pose
    ? options.pose === 'neutral'
    : requestedModel
      ? true
      : Boolean(subject?.neutralPose) && options.action !== 'sprinkle';
  state.perspective = options.pose === 'first' ? 'first' : 'third';
  state.action = options.action === 'sprinkle' ? 'sprinkle' : 'idle';
  state.timeline = Number(options.timeline) || 0;
  state.cosmeticId = resolveCosmetic(
    state.manifest.cosmetics,
    options.cosmetic ?? state.manifest.cosmetics.find(({ id }) => id === 'classic')?.id ?? state.manifest.cosmetics[0].id,
  ).id;

  if (options.material && options.material !== state.materialMode) {
    state.materialMode = options.material;
  }

  ui.assetSelect.value = String(modelIndex);
  state.currentGeometryIndex = 0;
  populateGeometrySelect(state.manifest.models[modelIndex]);
  await loadCurrentModel();
  resizeRenderer();
  applyVisibility();
  renderCaptureFrame();

  return {
    project: state.project.id,
    subject: subject?.id ?? null,
    model: selectedModel.id,
    label: equipment?.label ?? subject?.label ?? selectedModel.label,
    geometry: state.currentGeometry?.identifier ?? null,
    material: state.materialMode,
    water: state.waterLevel,
    docked: state.docked,
    cosmetic: state.cosmeticId,
    cosmeticLabel: displayCosmetic(getCurrentCosmetic()),
    waterOverlayGeometry: state.waterOverlayGeometry,
    lighting: state.lightingPreset,
    transparent: Boolean(options.transparent),
  };
}

const captureApi = {
  version: 4,
  ready: false,
  error: null,
  subjects: Object.values(CAPTURE_SUBJECTS).map(({ id, label }) => ({ id, label })),
  views: CAPTURE_VIEWS.map(({ id, label }) => ({ id, label })),
  project: () => state.manifest?.project ?? null,
  models: () => state.manifest?.models?.map(({ id, label, category, geometries }) => ({
    id,
    label,
    category,
    geometries: geometries.map(({ identifier }) => identifier),
  })) ?? [],
  equipment: () => state.manifest?.equipment?.map(({ id, label, kind, slot, modelId }) => ({
    id,
    label,
    kind,
    slot,
    modelId,
  })) ?? [],
  cosmetics: () => state.manifest?.cosmetics?.map(({ id, label, metal, grip, index }) => ({
    id,
    label,
    metal,
    grip,
    index,
  })) ?? [],
  configure: configureCapture,
  setView: setCaptureView,
  capture: captureView,
  render: renderCaptureFrame,
};

window.__ASPERGILLUM_CAPTURE__ = captureApi;
window.__BEDROCK_CAPTURE__ = captureApi;

let resizeFrame = 0;
const resizeObserver = new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (ui.viewportStage.isConnected) resizeRenderer();
  });
});
resizeObserver.observe(ui.viewportStage);
wireInteractions();
resizeRenderer();
animate();

onSelectedProjectChange(() => {
  captureApi.ready = false;
  captureApi.error = null;
  setLoading(true);
  removeCurrentSceneModel();
  loadRuntime().then(() => {
    captureApi.ready = true;
  }).catch((error) => {
    console.error(error);
    captureApi.error = error instanceof Error ? error.message : String(error);
    ui.runtimeStatus.textContent = 'Falha ao trocar de projeto';
    setLoading(false);
  });
});

loadRuntime().catch((error) => {
  console.error(error);
  setLoading(false);
  ui.runtimeStatus.textContent = 'Falha ao carregar catálogo';
  showToast(error instanceof Error ? error.message : 'Não foi possível carregar o catálogo local.');
  captureApi.error = error instanceof Error ? error.message : String(error);
}).then(() => {
  captureApi.ready = !captureApi.error;
});
