import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './styles.css';

const SCALE = 1 / 16;
const WATER_BONES = ['water_low', 'water_mid', 'water_high', 'water_full'];
const WATER_LABELS = {
  empty: 'Vazio',
  low: '¼',
  mid: '½',
  high: '¾',
  full: 'Cheio',
};

const state = {
  manifest: null,
  runtime: {
    attachable: null,
    renderController: null,
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
  boneRecords: [],
  meshRecords: [],
  pivotRecords: [],
  locatorRecords: [],
  materials: new Set(),
  selectedBone: null,
  perspective: 'first',
  materialMode: 'pbr',
  action: 'idle',
  timeline: 0,
  timelineLength: 0.82,
  waterLevel: 'full',
  waterVisible: true,
  docked: false,
  showGrid: true,
  showPivots: false,
  wireframe: false,
  loadToken: 0,
  toastTimer: null,
};

const ui = {
  canvas: document.querySelector('#viewport-canvas'),
  viewportStage: document.querySelector('#viewport-stage'),
  assetSelect: document.querySelector('#asset-select'),
  geometrySelect: document.querySelector('#geometry-select'),
  perspectiveButtons: [...document.querySelectorAll('[data-perspective]')],
  materialButtons: [...document.querySelectorAll('[data-material]')],
  actionButtons: [...document.querySelectorAll('[data-action]')],
  waterButtons: [...document.querySelectorAll('[data-water]')],
  timeline: document.querySelector('#timeline'),
  timelineReadout: document.querySelector('#timeline-readout'),
  timelineNote: document.querySelector('#timeline-note'),
  waterReadout: document.querySelector('#water-readout'),
  materialNote: document.querySelector('#material-note'),
  dockedToggle: document.querySelector('#docked-toggle'),
  waterToggle: document.querySelector('#water-toggle'),
  gridToggle: document.querySelector('#grid-toggle'),
  pivotsToggle: document.querySelector('#pivots-toggle'),
  wireframeToggle: document.querySelector('#wireframe-toggle'),
  fitButton: document.querySelector('#fit-button'),
  resetButton: document.querySelector('#reset-button'),
  cameraFitButton: document.querySelector('#camera-fit-button'),
  cameraResetButton: document.querySelector('#camera-reset-button'),
  runtimeStatus: document.querySelector('#runtime-status'),
  viewportTitle: document.querySelector('#viewport-title'),
  viewportSubtitle: document.querySelector('#viewport-subtitle'),
  pipelineChip: document.querySelector('#pipeline-chip'),
  perspectiveChip: document.querySelector('#perspective-chip'),
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
  alpha: false,
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
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI - 0.08;
controls.target.set(0, 0.48, 0);

const ambientLight = new THREE.HemisphereLight(0xf0f4ef, 0x202525, 1.55);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.65);
keyLight.position.set(4.5, 6.2, 5.2);
const fillLight = new THREE.DirectionalLight(0xe8eef0, 0.72);
fillLight.position.set(-4.5, 2.8, -3.8);
const rimLight = new THREE.DirectionalLight(0xf2ffff, 0.38);
rimLight.position.set(0, 3.5, -5.5);
scene.add(ambientLight, keyLight, fillLight, rimLight);

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
  return new URL(`./asset-library/${relativePath}`, document.baseURI).href;
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

function getFaceRect(uvDefinition, faceName, size) {
  const [sx, sy, sz] = size;
  const defaultUv = Array.isArray(uvDefinition) ? uvDefinition : [0, 0];
  const defaultRects = {
    east: [defaultUv[0], defaultUv[1] + sz, sz, sy],
    west: [defaultUv[0] + sz + sx, defaultUv[1] + sz, sz, sy],
    up: [defaultUv[0] + sz, defaultUv[1], sx, sz],
    down: [defaultUv[0] + sz + sx, defaultUv[1], sx, sz],
    north: [defaultUv[0] + sz, defaultUv[1] + sz, sx, sy],
    south: [defaultUv[0] + sz + sx + sz, defaultUv[1] + sz, sx, sy],
  };

  if (!uvDefinition || Array.isArray(uvDefinition)) {
    return { rect: defaultRects[faceName], materialInstance: 'default' };
  }

  const faceDefinition = uvDefinition[faceName] ?? {};
  const faceUv = faceDefinition.uv ?? defaultUv;
  const faceSize = faceDefinition.uv_size ?? defaultRects[faceName].slice(2);
  return {
    rect: [faceUv[0], faceUv[1], faceSize[0], faceSize[1]],
    materialInstance: faceDefinition.material_instance ?? 'default',
  };
}

function writeFaceUvs(attribute, offset, rect, textureWidth, textureHeight) {
  const [u, v, width, height] = rect;
  let u0 = u / textureWidth;
  let u1 = (u + width) / textureWidth;
  let v0 = 1 - (v + height) / textureHeight;
  let v1 = 1 - v / textureHeight;

  if (u1 < u0) [u0, u1] = [u1, u0];
  if (v1 < v0) [v0, v1] = [v1, v0];

  attribute.setXY(offset, u0, v0);
  attribute.setXY(offset + 1, u1, v0);
  attribute.setXY(offset + 2, u1, v1);
  attribute.setXY(offset + 3, u0, v1);
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
      const value = sampleChannel(channels.position, time, length);
      group.position.add(new THREE.Vector3(...value).multiplyScalar(SCALE));
    }
    if (channels.rotation) {
      const value = sampleChannel(channels.rotation, time, length);
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

  const path = state.currentRenderPath;
  if (path?.attachable) {
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

function createCubeMesh(cube, bone, geometrySummary, palette) {
  const size = cube.size ?? [1, 1, 1];
  const origin = cube.origin ?? [0, 0, 0];
  const inflate = Number(cube.inflate) || 0;
  const inflatedSize = size.map((value) => value + inflate * 2);
  const inflatedOrigin = origin.map((value) => value - inflate);
  const pivot = cube.pivot ?? bone.pivot ?? [0, 0, 0];
  const center = inflatedOrigin.map((value, index) => value + inflatedSize[index] / 2);
  const cubeGroup = new THREE.Group();
  cubeGroup.name = `cube:${bone.name}`;
  cubeGroup.userData = { type: 'cube-transform', boneName: bone.name };
  cubeGroup.position.set(
    (pivot[0] - bone.pivot[0]) * SCALE,
    (pivot[1] - bone.pivot[1]) * SCALE,
    (pivot[2] - bone.pivot[2]) * SCALE,
  );
  if (cube.rotation) {
    cubeGroup.rotation.set(
      THREE.MathUtils.degToRad(cube.rotation[0] ?? 0),
      THREE.MathUtils.degToRad(cube.rotation[1] ?? 0),
      THREE.MathUtils.degToRad(cube.rotation[2] ?? 0),
    );
  }

  const boxGeometry = new THREE.BoxGeometry(
    inflatedSize[0] * SCALE,
    inflatedSize[1] * SCALE,
    inflatedSize[2] * SCALE,
  );
  if (cube.mirror) boxGeometry.scale(-1, 1, 1);

  const faceNames = ['east', 'west', 'up', 'down', 'north', 'south'];
  const uvAttribute = boxGeometry.getAttribute('uv');
  boxGeometry.clearGroups();
  const materials = [...new Set([
    palette.default,
    palette.water,
    ...Object.values(palette.named ?? {}),
  ])];
  const materialIndex = new Map(materials.map((material, index) => [material, index]));

  for (let index = 0; index < faceNames.length; index += 1) {
    const faceName = faceNames[index];
    const face = getFaceRect(cube.uv, faceName, size);
    writeFaceUvs(uvAttribute, index * 4, face.rect, geometrySummary.textureWidth, geometrySummary.textureHeight);
    const material = face.materialInstance === 'water'
      ? palette.water
      : palette.named?.[face.materialInstance] ?? palette.default;
    boxGeometry.addGroup(index * 6, 6, materialIndex.get(material) ?? 0);
  }
  uvAttribute.needsUpdate = true;

  const mesh = new THREE.Mesh(boxGeometry, materials);
  mesh.name = `${bone.name} / cube ${bone.cubes.indexOf(cube) + 1}`;
  mesh.position.set(
    (center[0] - pivot[0]) * SCALE,
    (center[1] - pivot[1]) * SCALE,
    (center[2] - pivot[2]) * SCALE,
  );
  mesh.userData = {
    type: 'cube',
    boneName: bone.name,
    cube,
  };
  cubeGroup.add(mesh);

  return { cubeGroup, mesh, materials };
}

function buildBedrockGeometry(geometryData, geometrySummary, palette) {
  const root = new THREE.Group();
  root.name = geometrySummary.identifier;
  root.userData = { type: 'model', identifier: geometrySummary.identifier };
  const bones = geometryData.bones ?? [];
  const children = new Map();

  for (const bone of bones) {
    const parentName = bone.parent ?? null;
    if (!children.has(parentName)) children.set(parentName, []);
    children.get(parentName).push(bone);
  }

  const boneGroups = new Map();
  const boneRecords = [];
  const meshRecords = [];
  const pivotRecords = [];
  const locatorRecords = [];

  function addBone(bone, parentGroup, parentPivot) {
    const pivot = bone.pivot ?? [0, 0, 0];
    const group = new THREE.Group();
    group.name = `bone:${bone.name}`;
    group.userData = { type: 'bone', boneName: bone.name };
    group.position.set(
      (pivot[0] - parentPivot[0]) * SCALE,
      (pivot[1] - parentPivot[1]) * SCALE,
      (pivot[2] - parentPivot[2]) * SCALE,
    );
    group.rotation.set(
      THREE.MathUtils.degToRad(bone.rotation?.[0] ?? 0),
      THREE.MathUtils.degToRad(bone.rotation?.[1] ?? 0),
      THREE.MathUtils.degToRad(bone.rotation?.[2] ?? 0),
    );
    group.userData.basePosition = group.position.clone();
    group.userData.baseRotation = group.rotation.clone();
    group.userData.baseScale = group.scale.clone();
    group.visible = !bone.neverRender;
    parentGroup.add(group);
    boneGroups.set(bone.name, group);

    const pivotMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x74d9c3, transparent: true, opacity: 0.88 }),
    );
    pivotMarker.name = `pivot:${bone.name}`;
    pivotMarker.userData = { type: 'pivot', boneName: bone.name };
    group.add(pivotMarker);
    pivotRecords.push({ marker: pivotMarker, boneName: bone.name });

    for (const cube of bone.cubes ?? []) {
      const cubeResult = createCubeMesh(cube, bone, geometrySummary, palette);
      group.add(cubeResult.cubeGroup);
      meshRecords.push({ mesh: cubeResult.mesh, boneName: bone.name });
      cubeResult.materials.forEach((material) => state.materials.add(material));
    }

    for (const [locatorName, locator] of Object.entries(bone.locators ?? {})) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xf1c46f }),
      );
      marker.name = `locator:${locatorName}`;
      marker.position.set(
        (locator[0] - pivot[0]) * SCALE,
        (locator[1] - pivot[1]) * SCALE,
        (locator[2] - pivot[2]) * SCALE,
      );
      marker.userData = { type: 'locator', boneName: bone.name, locatorName };
      group.add(marker);
      locatorRecords.push({ marker, boneName: bone.name, locatorName, position: locator });
    }

    boneRecords.push({
      bone,
      group,
      pivot: [...pivot],
      basePosition: group.position.clone(),
      baseRotation: group.rotation.clone(),
      baseScale: group.scale.clone(),
    });

    for (const child of children.get(bone.name) ?? []) addBone(child, group, pivot);
  }

  for (const rootBone of children.get(null) ?? []) addBone(rootBone, root, [0, 0, 0]);
  for (const bone of bones) {
    if (!boneGroups.has(bone.name)) addBone(bone, root, [0, 0, 0]);
  }

  return { root, boneGroups, boneRecords, meshRecords, pivotRecords, locatorRecords };
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
  for (const waterBone of WATER_BONES) {
    const group = state.boneGroups.get(waterBone);
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

  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(0.005, radius / 120);
  camera.far = Math.max(50, radius * 80);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
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
  ui.perspectiveButtons.forEach((button) => setPressed(button, button.dataset.perspective === state.perspective));
  ui.materialButtons.forEach((button) => setPressed(button, button.dataset.material === state.materialMode));
  ui.actionButtons.forEach((button) => setPressed(button, button.dataset.action === state.action));
  ui.waterButtons.forEach((button) => setPressed(button, button.dataset.water === state.waterLevel));
  ui.waterReadout.textContent = WATER_LABELS[state.waterLevel];
  ui.timeline.max = String(state.timelineLength);
  ui.timeline.value = String(Math.min(state.timeline, state.timelineLength));
  const canAnimate = Boolean(state.currentRenderPath?.attachable);
  ui.perspectiveButtons.forEach((button) => { button.disabled = !canAnimate; });
  ui.actionButtons.forEach((button) => { button.disabled = !canAnimate; });
  ui.timeline.disabled = !canAnimate;
  ui.timelineNote.textContent = canAnimate
    ? state.action === 'sprinkle'
      ? 'Aspersão ativa: o tempo controla a animação do pack.'
      : 'Arraste para iniciar a prévia da aspersão.'
    : 'Esta geometria não possui animação de attachable.';
  ui.gridToggle.checked = state.showGrid;
  ui.pivotsToggle.checked = state.showPivots;
  ui.wireframeToggle.checked = state.wireframe;
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
  const sourceName = model.source.split('/').at(-1).replace('.geo.json', '');
  return `${model.label} · ${sourceName}`;
}

function populateAssetSelect() {
  ui.assetSelect.innerHTML = state.manifest.models.map((model, index) => (
    `<option value="${index}">${escapeHtml(describeModel(model))}</option>`
  )).join('');
}

function populateGeometrySelect(model) {
  ui.geometrySelect.innerHTML = (model?.geometries ?? []).map((geometry, index) => (
    `<option value="${index}">${escapeHtml(geometry.identifier)} · ${geometry.cubeCount} cubos</option>`
  )).join('');
  ui.geometrySelect.value = String(state.currentGeometryIndex);
}

function getPreferredModelIndex() {
  const index = state.manifest.models.findIndex((model) => model.source.includes('models/entity/aspergillum.geo.json'));
  return index >= 0 ? index : 0;
}

function findRuntimePath(model, geometrySummary) {
  const isAttachableGeometry = geometrySummary?.identifier === 'geometry.aspergillum.held'
    || model?.source.includes('models/entity/aspergillum.geo.json');
  const attachableDescription = state.runtime.attachable?.['minecraft:attachable']?.description;
  const controllerId = attachableDescription?.render_controllers?.[0] ?? null;
  const controller = controllerId ? state.runtime.renderController?.render_controllers?.[controllerId] : null;

  if (!isAttachableGeometry || !attachableDescription || !controller) {
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

  const geometryReference = controller.geometry;
  const geometryId = typeof geometryReference === 'string' && geometryReference.startsWith('Geometry.')
    ? attachableDescription.geometry?.[geometryReference.slice('Geometry.'.length)]
    : geometryReference;
  const textureReference = controller.textures?.[0];
  const textureStem = typeof textureReference === 'string' && textureReference.startsWith('Texture.')
    ? attachableDescription.textures?.[textureReference.slice('Texture.'.length)]
    : textureReference;
  const materialReference = controller.materials?.[0]?.['*'] ?? controller.materials?.[0]?.default;
  const materialId = typeof materialReference === 'string' && materialReference.startsWith('Material.')
    ? attachableDescription.materials?.[materialReference.slice('Material.'.length)]
    : materialReference;

  return {
    attachable: true,
    attachableId: attachableDescription.identifier,
    controllerId,
    geometryId,
    materialId: materialId ?? 'entity',
    textureStem: stripTextureExtension(textureStem),
    animationIds: {
      holdFirstPerson: attachableDescription.animations?.hold_first_person,
      holdThirdPerson: attachableDescription.animations?.hold_third_person,
      sprinkleFirstPerson: attachableDescription.animations?.sprinkle_first_person,
      sprinkleThirdPerson: attachableDescription.animations?.sprinkle_third_person,
      actionController: attachableDescription.animations?.action_controller,
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
  const stem = renderPath.textureStem || stripTextureExtension(model.texture ?? '');
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

function getSelectedModel() {
  return state.manifest.models[Number(ui.assetSelect.value)] ?? state.manifest.models[0];
}

function updateRuntimeTrace() {
  const path = state.currentRenderPath;
  ui.traceAttachable.textContent = path?.attachableId ?? 'direct geometry';
  ui.traceController.textContent = path?.controllerId ?? '—';
  ui.traceGeometry.textContent = path?.geometryId ?? state.currentGeometry?.identifier ?? '—';
}

function updateTopline() {
  const geometry = state.currentGeometry;
  const path = state.currentRenderPath;
  const materialName = state.materialMode === 'pbr' ? 'PBR / VV' : 'Clássico';
  const perspectiveName = state.perspective === 'first' ? '1ª pessoa' : '3ª pessoa';
  ui.viewportTitle.textContent = geometry?.identifier ?? 'Sem geometria';
  ui.viewportSubtitle.textContent = path?.attachable
    ? `${path.attachableId} · ${state.action === 'sprinkle' ? 'sprinkle' : 'hold'} · ${perspectiveName}`
    : `${state.currentModel?.label ?? 'Modelo'} · geometria direta`;
  ui.pipelineChip.textContent = materialName;
  ui.perspectiveChip.textContent = perspectiveName;
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
    row('UV Bedrock-safe', geometry.uvSafety?.unsafeSubtexelBoxUvCubes || geometry.uvSafety?.missingOrCollapsedFaces ? 'não' : 'per-face inteiro'),
  ];

  const runtimeRows = [
    row('Attachable', path.attachableId ?? 'não aplicável', path.attachable ? 'ok' : ''),
    row('Render controller', path.controllerId ?? 'não aplicável', path.controllerId ? 'ok' : ''),
    row('Material', path.materialId ?? '—'),
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
    status('UV inteiro / sem colapso', !(geometry.uvSafety?.unsafeSubtexelBoxUvCubes || geometry.uvSafety?.missingOrCollapsedFaces)),
    status('Pivôs / hierarquia', true),
    status('MERS R/G/B', state.materialMode === 'pbr' && Boolean(textureSet?.mers)),
    status('Attachable + controller', path.attachable),
    status('Animações do pack', path.attachable && state.runtime.animations.size > 0),
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
  updateTopline();
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
    const geometryData = sourceData['minecraft:geometry']?.[index] ?? sourceData['minecraft:geometry']?.[0];
    const renderPath = findRuntimePath(model, geometrySummary);
    const palette = await createMaterialPalette(renderPath, model);
    if (token !== state.loadToken) return;
    state.materials = new Set();
    const built = buildBedrockGeometry(geometryData, geometrySummary, palette);
    const sceneModel = new THREE.Group();
    sceneModel.name = `runtime:${geometrySummary.identifier}`;
    sceneModel.userData = {
      textureSet: palette.textureSet,
      formatVersion: sourceData.format_version ?? 'unknown',
    };
    sceneModel.add(built.root);
    applyModelCenter(built.root);
    removeCurrentSceneModel();
    scene.add(sceneModel);
    state.sceneModel = sceneModel;
    state.currentGeometry = geometrySummary;
    state.currentRenderPath = renderPath;
    state.boneGroups = built.boneGroups;
    state.boneRecords = built.boneRecords;
    state.meshRecords = built.meshRecords;
    state.pivotRecords = built.pivotRecords;
    state.locatorRecords = built.locatorRecords;
    state.timelineLength = renderPath.animationIds
      ? getAnimationLength(state.runtime.animations.get(
        state.perspective === 'first' ? renderPath.animationIds.sprinkleFirstPerson : renderPath.animationIds.sprinkleThirdPerson,
      ))
      : 0.82;
    state.timeline = Math.min(state.timeline, state.timelineLength);
    applyPose();
    applyVisibility();
    fitCamera();
    updateTopline();
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
  const manifest = await fetchJson('manifest.json');
  state.manifest = manifest;

  const runtimeFiles = manifest.runtime ?? {};
  const [attachable, renderController, animationFiles, controllerFiles, textureSetFiles] = await Promise.all([
    loadRuntimeJson(runtimeFiles.attachables?.find((file) => file.endsWith('aspergillum.attachable.json'))),
    loadRuntimeJson(runtimeFiles.renderControllers?.find((file) => file.endsWith('aspergillum.render_controllers.json'))),
    Promise.all((runtimeFiles.animations ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
    Promise.all((runtimeFiles.animationControllers ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
    Promise.all((runtimeFiles.textureSets ?? []).map(async (file) => [file, await loadRuntimeJson(file)])),
  ]);

  state.runtime.attachable = attachable;
  state.runtime.renderController = renderController;
  for (const [, data] of animationFiles) {
    for (const [identifier, animation] of Object.entries(data?.animations ?? {})) state.runtime.animations.set(identifier, animation);
  }
  for (const [, data] of controllerFiles) {
    for (const [identifier, controller] of Object.entries(data?.animation_controllers ?? {})) state.runtime.animationControllers.set(identifier, controller);
  }
  for (const [file, data] of textureSetFiles) {
    if (data) state.runtime.textureSets.set(stripTextureExtension(file), data);
  }

  populateAssetSelect();
  const preferredIndex = getPreferredModelIndex();
  ui.assetSelect.value = String(preferredIndex);
  populateGeometrySelect(state.manifest.models[preferredIndex]);
  updateControls();
  await loadCurrentModel();
  showToast('Runtime Bedrock local montado a partir do Resource Pack.');
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
    state.timelineLength = getAnimationLength(state.runtime.animations.get(animationId));
  }
  applyCurrentState();
}

function onMaterialChange(button) {
  state.materialMode = button.dataset.material;
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

function wireInteractions() {
  ui.assetSelect.addEventListener('change', onAssetChange);
  ui.geometrySelect.addEventListener('change', () => loadCurrentModel());
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
  ui.gridToggle.addEventListener('change', () => {
    state.showGrid = ui.gridToggle.checked;
    grid.visible = state.showGrid;
  });
  ui.pivotsToggle.addEventListener('change', () => {
    state.showPivots = ui.pivotsToggle.checked;
    applyCurrentState();
  });
  ui.wireframeToggle.addEventListener('change', () => {
    state.wireframe = ui.wireframeToggle.checked;
    applyCurrentState();
  });
  ui.fitButton.addEventListener('click', () => fitCamera(true));
  ui.cameraFitButton.addEventListener('click', () => fitCamera(true));
  ui.resetButton.addEventListener('click', resetCamera);
  ui.cameraResetButton.addEventListener('click', resetCamera);
  ui.canvas.addEventListener('click', selectFromCanvas);

  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.key.toLowerCase() === 'f') fitCamera(true);
    if (event.key.toLowerCase() === 'r') resetCamera();
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
  controls.update();
  renderer.render(scene, camera);
}

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(ui.viewportStage);
wireInteractions();
resizeRenderer();
animate();

loadRuntime().catch((error) => {
  console.error(error);
  setLoading(false);
  ui.runtimeStatus.textContent = 'Falha ao carregar catálogo';
  showToast(error instanceof Error ? error.message : 'Não foi possível carregar o catálogo local.');
});
