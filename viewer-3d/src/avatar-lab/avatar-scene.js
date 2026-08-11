import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AVATAR_ACTIONS,
  ASPERGILLUM_EMPIRICAL_GRIP,
  DEFAULT_AVATAR_PRESET,
  OUTER_LAYER_BONES,
  createPlayerGeometry,
  getAvatarCaptureView,
  getAvatarModel,
  normalizeAvatarRecipe,
} from '../shared/avatar-contract.js';
import {
  evaluateAvatarPose,
  sampleAnimationChannel,
} from '../shared/avatar-motion.js';
import {
  BEDROCK_UNIT_SCALE,
  buildBedrockGeometry,
  findBoneGroup,
  resetBedrockPose,
  setPivotVisibility,
} from '../shared/bedrock-geometry.js';
import { resolveCosmetic } from '../shared/cosmetic-contract.js';

const PLAYER_SCALE = 0.9375;
const ITEM_MODEL_ID = 'entity__aspergillum';
const BINDING_EXPRESSION = 'q.item_slot_to_bone_name(context.item_slot)';
const DEFAULT_BACKGROUND = 0x121a1c;
const FIRST_PERSON_VISIBLE_BONES = new Set(['rightarm', 'rightsleeve']);

function assetUrl(relativePath) {
  return new URL(`./asset-library/${relativePath}`, document.baseURI).href;
}

function pageAssetUrl(relativePath) {
  return new URL(`./${relativePath}`, document.baseURI).href;
}

function stripTextureExtension(value) {
  return String(value ?? '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\.texture_set\.json$/i, '')
    .replace(/\.png$/i, '');
}

function texturePath(stem, baseDirectory = 'textures') {
  const normalized = stripTextureExtension(stem);
  if (!normalized) return null;
  return `${normalized.startsWith('textures/') ? normalized : `${baseDirectory}/${normalized}`}.png`;
}

function textureSetPath(stem) {
  return `${stripTextureExtension(stem)}.texture_set.json`;
}

function baseDirectory(value) {
  const parts = stripTextureExtension(value).split('/');
  parts.pop();
  return parts.join('/');
}

function formatVector(vector, digits = 4) {
  return vector.map((value) => Number(value.toFixed(digits)));
}

function isVisible(object) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

export class AvatarScene {
  constructor({ canvas, stage, onFrame, onStatus } = {}) {
    this.canvas = canvas;
    this.stage = stage;
    this.onFrame = onFrame ?? (() => {});
    this.onStatus = onStatus ?? (() => {});
    this.recipe = normalizeAvatarRecipe();
    this.skinSource = pageAssetUrl(DEFAULT_AVATAR_PRESET.skin);
    this.skinMetadata = { ...DEFAULT_AVATAR_PRESET };
    this.manifest = null;
    this.itemModel = null;
    this.itemGeometry = null;
    this.itemSummary = null;
    this.attachable = null;
    this.animations = new Map();
    this.playerBuilt = null;
    this.itemBuilt = null;
    this.avatarRoot = null;
    this.debugLines = null;
    this.bindingLine = null;
    this.materials = new Set();
    this.textureCache = new Map();
    this.derivedTextureCache = new Map();
    this.playing = false;
    this.speed = 1;
    this.showGrid = true;
    this.showPivots = false;
    this.showSkeleton = false;
    this.wireframe = false;
    this.visible = true;
    this.controlsEnabled = true;
    this.lastFrame = performance.now();
    this.lastUiFrame = 0;
    this.loadToken = 0;
    this.error = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(DEFAULT_BACKGROUND);
    const environmentGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnvironment = new RoomEnvironment();
    this.scene.environment = environmentGenerator.fromScene(roomEnvironment).texture;
    this.scene.environmentIntensity = 0.32;
    roomEnvironment.dispose();
    environmentGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.005, 100);
    this.camera.position.set(2.75, 2.05, 4.25);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.enablePan = true;
    this.controls.zoomToCursor = true;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.25;
    this.controls.maxDistance = 12;
    this.controls.target.set(0, 1, 0);

    const hemisphere = new THREE.HemisphereLight(0xf2f3ed, 0x1a2321, 1.6);
    const key = new THREE.DirectionalLight(0xfff5e5, 3.1);
    key.position.set(4.6, 6.8, 5.2);
    const fill = new THREE.DirectionalLight(0xcfe3e8, 0.82);
    fill.position.set(-4.2, 3.1, 2.2);
    const rim = new THREE.DirectionalLight(0xe8c58c, 0.58);
    rim.position.set(1.8, 4.5, -5.5);
    this.scene.add(hemisphere, key, fill, rim);

    this.grid = new THREE.GridHelper(8, 32, 0x58716c, 0x2a3b3b);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.42;
    this.scene.add(this.grid);

    this.platform = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 64),
      new THREE.MeshStandardMaterial({
        color: 0x26312e,
        roughness: 0.94,
        metalness: 0,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.platform.rotation.x = -Math.PI / 2;
    this.platform.position.y = -0.002;
    this.scene.add(this.platform);

    this.textureLoader = new THREE.TextureLoader();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting !== false;
    }, { threshold: 0.01 });
    this.intersectionObserver.observe(stage);
    this.animate = this.animate.bind(this);
    this.frameRequest = requestAnimationFrame(this.animate);
  }

  async initialize() {
    this.onStatus({ state: 'loading', message: 'Resolvendo runtime local' });
    this.manifest = await this.fetchJson('manifest.json');
    this.itemModel = this.manifest.models.find(({ id }) => id === ITEM_MODEL_ID);
    if (!this.itemModel) throw new Error(`Modelo ausente no catálogo: ${ITEM_MODEL_ID}`);
    const modelFile = await this.fetchJson(this.itemModel.source);
    this.itemGeometry = modelFile['minecraft:geometry']?.[0];
    this.itemSummary = this.itemModel.geometries?.[0];
    if (!this.itemGeometry || !this.itemSummary) throw new Error('Geometria do aspersório não pôde ser resolvida.');

    const attachablePath = this.manifest.runtime.attachables
      .find((value) => value.endsWith('/aspergillum.attachable.json'));
    this.attachable = attachablePath ? await this.fetchJson(`pack/${attachablePath}`) : null;
    const binding = this.itemGeometry.bones?.find(({ name }) => name === 'aspergillum_bound')?.binding;
    if (binding !== BINDING_EXPRESSION) {
      throw new Error(`Binding incompatível no pack: ${binding ?? 'ausente'}`);
    }

    await Promise.all(this.manifest.runtime.animations.map(async (relativePath) => {
      const file = await this.fetchJson(`pack/${relativePath}`);
      for (const [id, animation] of Object.entries(file.animations ?? {})) this.animations.set(id, animation);
    }));

    await this.rebuild();
    this.onStatus({ state: 'ready', message: 'Runtime e binding resolvidos' });
    return this.snapshot();
  }

  async fetchJson(relativePath) {
    const response = await fetch(assetUrl(relativePath));
    if (!response.ok) throw new Error(`Falha ao carregar ${relativePath}: ${response.status}`);
    return response.json();
  }

  async loadTexture(source, color = false) {
    if (!source) return null;
    const url = source.startsWith('data:') || source.startsWith('blob:') || source.startsWith('http')
      ? source
      : assetUrl(source);
    const key = `${url}:${color ? 'color' : 'data'}`;
    if (!this.textureCache.has(key)) {
      this.textureCache.set(key, this.textureLoader.loadAsync(url).then((texture) => {
        texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestMipmapLinearFilter;
        texture.anisotropy = 1;
        texture.needsUpdate = true;
        return texture;
      }));
    }
    return this.textureCache.get(key);
  }

  createMersChannelTexture(sourceTexture, channelName, channelIndex) {
    if (!sourceTexture?.image?.width || !sourceTexture?.image?.height) return null;
    const cacheKey = `${sourceTexture.uuid}:${channelName}`;
    if (this.derivedTextureCache.has(cacheKey)) return this.derivedTextureCache.get(cacheKey);
    const { width, height } = sourceTexture.image;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(sourceTexture.image, 0, 0, width, height);
    const source = context.getImageData(0, 0, width, height).data;
    const output = new Uint8Array(source.length);
    for (let index = 0; index < source.length; index += 4) {
      const value = source[index + channelIndex];
      output[index] = value;
      output[index + 1] = value;
      output[index + 2] = value;
      output[index + 3] = 255;
    }
    const texture = new THREE.DataTexture(output, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = sourceTexture.flipY;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.derivedTextureCache.set(cacheKey, texture);
    return texture;
  }

  async createItemMaterial() {
    const cosmetic = resolveCosmetic(this.manifest.cosmetics, this.recipe.presentation.cosmetic);
    const stem = cosmetic.textures[ITEM_MODEL_ID] ?? stripTextureExtension(this.itemModel.texture);
    const set = await this.fetchJson(`pack/${textureSetPath(stem)}`).catch(() => null);
    const definition = set?.['minecraft:texture_set'];
    const directory = baseDirectory(stem);
    const colorPath = definition?.color ? texturePath(definition.color, directory) : texturePath(stem);
    const normalPath = definition?.normal ? texturePath(definition.normal, directory) : null;
    const mersPath = definition?.metalness_emissive_roughness
      ? texturePath(definition.metalness_emissive_roughness, directory)
      : null;
    const [color, normal, mers] = await Promise.all([
      this.loadTexture(`pack/${colorPath}`, true),
      this.recipe.presentation.material === 'pbr' && normalPath
        ? this.loadTexture(`pack/${normalPath}`)
        : null,
      this.recipe.presentation.material === 'pbr' && mersPath
        ? this.loadTexture(`pack/${mersPath}`)
        : null,
    ]);
    const channels = mers ? {
      metalness: this.createMersChannelTexture(mers, 'metalness', 0),
      emissive: this.createMersChannelTexture(mers, 'emissive', 1),
      roughness: this.createMersChannelTexture(mers, 'roughness', 2),
    } : null;
    const material = new THREE.MeshStandardMaterial({
      map: color,
      normalMap: normal,
      normalScale: new THREE.Vector2(1, 1),
      metalnessMap: channels?.metalness ?? null,
      roughnessMap: channels?.roughness ?? null,
      emissiveMap: channels?.emissive ?? null,
      emissive: channels?.emissive ? 0xffffff : 0x000000,
      emissiveIntensity: channels?.emissive ? 1 : 0,
      metalness: channels?.metalness ? 1 : 0.2,
      roughness: channels?.roughness ? 1 : 0.48,
    });
    material.userData = { colorPath, normalPath, mersPath, cosmetic: cosmetic.id };
    return material;
  }

  async createSkinMaterial() {
    const texture = await this.loadTexture(this.skinSource, true);
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0,
      transparent: true,
      alphaTest: 0.02,
      side: THREE.FrontSide,
    });
  }

  async rebuild(overrides = {}) {
    const token = ++this.loadToken;
    if (overrides.skinSource) this.skinSource = overrides.skinSource;
    if (overrides.skinMetadata) this.skinMetadata = { ...this.skinMetadata, ...overrides.skinMetadata };
    const skinReference = this.skinMetadata.reference
      ?? this.skinMetadata.skin
      ?? this.skinMetadata.label
      ?? DEFAULT_AVATAR_PRESET.skin;
    this.recipe = normalizeAvatarRecipe({
      ...this.recipe.avatar,
      ...this.recipe.presentation,
      ...overrides,
      skin: skinReference,
    });
    const [skinMaterial, itemMaterial] = await Promise.all([
      this.createSkinMaterial(),
      this.createItemMaterial(),
    ]);
    if (token !== this.loadToken) return this.snapshot();
    this.removeAvatar();
    this.materials = new Set([skinMaterial, itemMaterial]);

    const playerGeometry = createPlayerGeometry(this.recipe.avatar.model);
    this.playerBuilt = buildBedrockGeometry(playerGeometry, {
      identifier: playerGeometry.description.identifier,
      textureWidth: playerGeometry.description.texture_width,
      textureHeight: playerGeometry.description.texture_height,
    }, { default: skinMaterial }, { includePivots: true, includeLocators: true });
    const model = getAvatarModel(this.recipe.avatar.model);
    this.itemBuilt = buildBedrockGeometry(
      this.itemGeometry,
      this.itemSummary,
      { default: itemMaterial },
      {
        externalParentPivot: ASPERGILLUM_EMPIRICAL_GRIP,
        includePivots: true,
        includeLocators: true,
      },
    );
    const rightItem = findBoneGroup(this.playerBuilt, 'rightItem');
    if (!rightItem) throw new Error('O rig do avatar não contém o osso rightItem.');
    rightItem.add(this.itemBuilt.root);

    this.avatarRoot = this.playerBuilt.root;
    this.avatarRoot.name = 'avatar-scene-root';
    this.avatarRoot.scale.setScalar(PLAYER_SCALE);
    this.scene.add(this.avatarRoot);
    this.createDebugLines();
    this.applyPose();
    this.setPerspective(this.recipe.presentation.perspective, { fit: true });
    return this.snapshot();
  }

  removeAvatar() {
    if (!this.avatarRoot) return;
    this.scene.remove(this.avatarRoot);
    this.avatarRoot.traverse((node) => node.geometry?.dispose());
    for (const material of this.materials) material.dispose();
    this.avatarRoot = null;
    this.playerBuilt = null;
    this.itemBuilt = null;
    if (this.debugLines) this.scene.remove(this.debugLines);
    if (this.bindingLine) this.scene.remove(this.bindingLine);
    this.debugLines?.geometry.dispose();
    this.debugLines?.material.dispose();
    this.bindingLine?.geometry.dispose();
    this.bindingLine?.material.dispose();
    this.debugLines = null;
    this.bindingLine = null;
  }

  createDebugLines() {
    this.debugLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x7d9992, transparent: true, opacity: 0.68 }),
    );
    this.bindingLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xd1a85f, transparent: true, opacity: 0.95 }),
    );
    this.debugLines.frustumCulled = false;
    this.bindingLine.frustumCulled = false;
    this.scene.add(this.debugLines, this.bindingLine);
    this.updateDebugLines();
  }

  updateDebugLines() {
    if (!this.playerBuilt || !this.itemBuilt || !this.debugLines || !this.bindingLine) return;
    this.scene.updateMatrixWorld(true);
    const segments = [];
    for (const built of [this.playerBuilt, this.itemBuilt]) {
      for (const { group } of built.boneRecords) {
        if (!group.parent?.userData?.boneName) continue;
        segments.push(
          ...group.parent.getWorldPosition(new THREE.Vector3()).toArray(),
          ...group.getWorldPosition(new THREE.Vector3()).toArray(),
        );
      }
    }
    this.debugLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
    const chain = ['rightArm', 'rightItem', 'aspergillum_bound', 'aspergillum_presentation', 'aspergillum_action'];
    const points = chain.map((name) => (
      findBoneGroup(this.playerBuilt, name) ?? findBoneGroup(this.itemBuilt, name)
    )?.getWorldPosition(new THREE.Vector3())).filter(Boolean);
    this.bindingLine.geometry.setFromPoints(points);
    this.debugLines.visible = this.showSkeleton;
    this.bindingLine.visible = this.showSkeleton;
  }

  applyAnimation(built, animation, time) {
    if (!animation?.bones) return;
    const length = Number(animation.animation_length) || 0.82;
    for (const [boneName, channels] of Object.entries(animation.bones)) {
      const group = findBoneGroup(built, boneName);
      if (!group) continue;
      if (channels.position) {
        const value = sampleAnimationChannel(channels.position, time, length);
        group.position.add(new THREE.Vector3(...value).multiplyScalar(BEDROCK_UNIT_SCALE));
      }
      if (channels.rotation) {
        const value = sampleAnimationChannel(channels.rotation, time, length);
        group.rotation.x += THREE.MathUtils.degToRad(value[0]);
        group.rotation.y += THREE.MathUtils.degToRad(value[1]);
        group.rotation.z += THREE.MathUtils.degToRad(value[2]);
      }
      if (channels.scale) {
        const value = sampleAnimationChannel(channels.scale, time, length);
        group.scale.multiply(new THREE.Vector3(...value));
      }
    }
  }

  applyPose() {
    if (!this.playerBuilt || !this.itemBuilt) return;
    resetBedrockPose(this.playerBuilt.boneRecords);
    resetBedrockPose(this.itemBuilt.boneRecords);
    const pose = evaluateAvatarPose({
      action: this.recipe.presentation.action,
      time: this.recipe.presentation.time,
      perspective: this.recipe.presentation.perspective,
    });
    for (const [boneName, channels] of Object.entries(pose.bones)) {
      const group = findBoneGroup(this.playerBuilt, boneName);
      if (!group) continue;
      group.rotation.x += THREE.MathUtils.degToRad(channels.rotation[0]);
      group.rotation.y += THREE.MathUtils.degToRad(channels.rotation[1]);
      group.rotation.z += THREE.MathUtils.degToRad(channels.rotation[2]);
    }

    const aliases = this.attachable?.['minecraft:attachable']?.description?.animations ?? {};
    const perspectiveSuffix = this.recipe.presentation.perspective === 'first' ? 'first_person' : 'third_person';
    const holdAnimation = this.animations.get(aliases[`hold_${perspectiveSuffix}`]);
    this.applyAnimation(this.itemBuilt, holdAnimation, 0);

    // O binding nativo mantém os vértices no espaço de modelo do jogador. Para
    // compor dois scene graphs independentes no Three.js, normalizamos a
    // translação de apresentação contra o grip empírico já aprovado no jogo.
    // A rotação de apresentação permanece integral e o offset continua exposto
    // no scene trace, em vez de ser gravado no osso vinculado do pack.
    const holdPosition = sampleAnimationChannel(
      holdAnimation?.bones?.aspergillum_presentation?.position,
      0,
      Number(holdAnimation?.animation_length) || 0,
    );
    const boundGroup = findBoneGroup(this.itemBuilt, 'aspergillum_bound');
    boundGroup.position.add(new THREE.Vector3(...holdPosition).multiplyScalar(-BEDROCK_UNIT_SCALE));
    boundGroup.userData.compositionCalibration = holdPosition.map((value) => -value);
    if (this.recipe.presentation.action === 'sprinkle') {
      this.applyAnimation(
        this.itemBuilt,
        this.animations.get(aliases[`sprinkle_${perspectiveSuffix}`]),
        Math.min(this.recipe.presentation.time, 0.82),
      );
    }

    const firstPerson = this.recipe.presentation.perspective === 'first';
    for (const { mesh, boneName } of this.playerBuilt.meshRecords) {
      const isOuter = OUTER_LAYER_BONES.some((name) => name.toLowerCase() === boneName.toLowerCase());
      mesh.visible = (!firstPerson || FIRST_PERSON_VISIBLE_BONES.has(boneName.toLowerCase()))
        && (!isOuter || this.recipe.avatar.outerLayers);
    }
    for (const { mesh } of this.itemBuilt.meshRecords) mesh.visible = true;
    setPivotVisibility(
      [...this.playerBuilt.pivotRecords, ...this.itemBuilt.pivotRecords],
      this.showPivots,
    );
    for (const { marker } of [...this.playerBuilt.locatorRecords, ...this.itemBuilt.locatorRecords]) {
      marker.visible = this.showPivots;
    }
    for (const material of this.materials) material.wireframe = this.wireframe;
    this.grid.visible = this.showGrid && !firstPerson;
    this.platform.visible = !firstPerson;
    this.updateDebugLines();
  }

  setAction(action, { resetTime = true } = {}) {
    if (!AVATAR_ACTIONS[action]) return;
    this.recipe.presentation.action = action;
    this.recipe.presentation.duration = AVATAR_ACTIONS[action].duration;
    if (resetTime) this.recipe.presentation.time = 0;
    if (!AVATAR_ACTIONS[action].duration) this.playing = false;
    this.applyPose();
    this.render();
  }

  setTime(time) {
    const duration = this.recipe.presentation.duration;
    this.recipe.presentation.time = duration > 0
      ? Math.min(Math.max(0, Number(time) || 0), duration)
      : 0;
    this.applyPose();
    this.render();
  }

  setPerspective(perspective, { fit = true } = {}) {
    this.recipe.presentation.perspective = perspective === 'first' ? 'first' : 'third';
    this.applyPose();
    if (fit) {
      if (this.recipe.presentation.perspective === 'first') this.setFirstPersonCamera();
      else this.fitCamera();
    }
    this.render();
  }

  setFirstPersonCamera() {
    this.camera.fov = 50;
    this.camera.up.set(0, 1, 0);
    // A malha de primeira pessoa do Bedrock é um viewmodel separado. O Avatar
    // Lab preserva a pose FP real do attachable e enquadra somente braço + item
    // para examinar clipping, pele e contato, sem fingir a câmera proprietária.
    const records = [
      ...this.playerBuilt.meshRecords.filter(({ boneName }) => FIRST_PERSON_VISIBLE_BONES.has(boneName.toLowerCase())),
      ...this.itemBuilt.meshRecords,
    ];
    this.frameBounds(this.getVisibleBounds(records), [0.8, 0.22, -1.35], 1.24);
  }

  setDebug({ grid, pivots, skeleton, wireframe } = {}) {
    if (typeof grid === 'boolean') this.showGrid = grid;
    if (typeof pivots === 'boolean') this.showPivots = pivots;
    if (typeof skeleton === 'boolean') this.showSkeleton = skeleton;
    if (typeof wireframe === 'boolean') this.wireframe = wireframe;
    this.applyPose();
    this.render();
  }

  setOuterLayers(visible) {
    this.recipe.avatar.outerLayers = Boolean(visible);
    this.applyPose();
    this.render();
  }

  play() {
    if (!this.recipe.presentation.duration) return false;
    if (this.recipe.presentation.time >= this.recipe.presentation.duration) this.recipe.presentation.time = 0;
    this.playing = true;
    this.lastFrame = performance.now();
    return true;
  }

  pause() {
    this.playing = false;
  }

  togglePlayback() {
    if (this.playing) this.pause();
    else this.play();
    return this.playing;
  }

  setPlaybackSpeed(speed) {
    this.speed = Math.min(2, Math.max(0.25, Number(speed) || 1));
  }

  getVisibleBounds(records = null) {
    const bounds = new THREE.Box3();
    const source = records ?? [
      ...(this.playerBuilt?.meshRecords ?? []),
      ...(this.itemBuilt?.meshRecords ?? []),
    ];
    for (const { mesh } of source) {
      if (isVisible(mesh)) bounds.expandByObject(mesh, true);
    }
    return bounds;
  }

  frameBounds(bounds, direction = [1, 0.25, 1], distanceScale = 1.14) {
    if (bounds.isEmpty()) return;
    const target = bounds.getCenter(new THREE.Vector3());
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(0.1, sphere.radius);
    const viewDirection = new THREE.Vector3(...direction).normalize();
    const distance = (radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2))) * distanceScale;
    this.camera.position.copy(target).addScaledVector(viewDirection, distance);
    this.controls.target.copy(target);
    this.camera.near = Math.max(0.005, radius / 100);
    this.camera.far = Math.max(50, radius * 60);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  fitCamera() {
    this.camera.fov = 32;
    this.camera.up.set(0, 1, 0);
    this.frameBounds(this.getVisibleBounds(), [1.45, 0.38, 2.2], 1.2);
    this.render();
  }

  setCaptureView(viewId) {
    const view = getAvatarCaptureView(viewId);
    if (!view) throw new Error(`Vista de avatar desconhecida: ${viewId}`);
    if (view.perspective === 'first') {
      this.setPerspective('first');
      return this.cameraSnapshot(view);
    }
    if (this.recipe.presentation.perspective !== 'third') this.setPerspective('third', { fit: false });
    let records = null;
    if (view.focus === 'grip') {
      records = [
        ...this.playerBuilt.meshRecords.filter(({ boneName }) => ['rightArm', 'rightSleeve'].includes(boneName)),
        ...this.itemBuilt.meshRecords.filter(({ boneName }) => boneName === 'handle'),
      ];
    } else if (view.focus === 'sprinkler-head') {
      records = this.itemBuilt.meshRecords.filter(({ boneName }) => boneName === 'sprinkler_head');
    }
    this.camera.fov = view.focus ? 27 : 32;
    this.camera.up.set(...view.up);
    this.frameBounds(this.getVisibleBounds(records), view.direction, view.focus ? 1.38 : 1.15);
    this.render();
    return this.cameraSnapshot(view);
  }

  cameraSnapshot(view = {}) {
    return {
      id: view.id ?? null,
      label: view.label ?? null,
      camera: formatVector(this.camera.position.toArray()),
      target: formatVector(this.controls.target.toArray()),
      perspective: this.recipe.presentation.perspective,
    };
  }

  matrixSnapshot(built, name) {
    const group = findBoneGroup(built, name);
    if (!group) return null;
    group.updateWorldMatrix(true, false);
    return {
      name,
      localPosition: formatVector(group.position.toArray()),
      worldPosition: formatVector(group.getWorldPosition(new THREE.Vector3()).toArray()),
      worldQuaternion: formatVector(group.getWorldQuaternion(new THREE.Quaternion()).toArray()),
      worldScale: formatVector(group.getWorldScale(new THREE.Vector3()).toArray()),
      matrixWorld: formatVector(group.matrixWorld.toArray(), 6),
    };
  }

  snapshot() {
    if (!this.playerBuilt || !this.itemBuilt) return null;
    this.scene.updateMatrixWorld(true);
    const model = getAvatarModel(this.recipe.avatar.model);
    const bound = this.matrixSnapshot(this.itemBuilt, 'aspergillum_bound');
    const boundGroup = findBoneGroup(this.itemBuilt, 'aspergillum_bound');
    const rightItemGroup = findBoneGroup(this.playerBuilt, 'rightItem');
    const presentationGroup = findBoneGroup(this.itemBuilt, 'aspergillum_presentation');
    const aliases = this.attachable?.['minecraft:attachable']?.description?.animations ?? {};
    const perspectiveSuffix = this.recipe.presentation.perspective === 'first' ? 'first_person' : 'third_person';
    const holdAnimation = this.animations.get(aliases[`hold_${perspectiveSuffix}`]);
    const holdPosition = sampleAnimationChannel(
      holdAnimation?.bones?.aspergillum_presentation?.position,
      0,
      Number(holdAnimation?.animation_length) || 0,
    );
    const expectedOffset = ASPERGILLUM_EMPIRICAL_GRIP
      .map((value, index) => -(value + holdPosition[index]) * BEDROCK_UNIT_SCALE);
    const actualOffset = boundGroup?.position.toArray() ?? [0, 0, 0];
    const localOffsetError = Math.sqrt(expectedOffset.reduce(
      (sum, value, index) => sum + ((value - actualOffset[index]) ** 2),
      0,
    ));
    const contactError = rightItemGroup && presentationGroup
      ? rightItemGroup.getWorldPosition(new THREE.Vector3()).distanceTo(
        presentationGroup.getWorldPosition(new THREE.Vector3()),
      )
      : Number.POSITIVE_INFINITY;
    const error = Math.max(localOffsetError, contactError);
    return {
      recipe: JSON.parse(JSON.stringify(this.recipe)),
      skin: {
        ...this.skinMetadata,
        source: this.recipe.avatar.skin,
        runtimeSource: this.skinSource.startsWith('data:')
          ? 'inline-data'
          : this.skinSource.startsWith('blob:') ? 'local-blob' : 'local-url',
      },
      runtime: {
        geometry: this.itemSummary.identifier,
        formatVersion: this.itemSummary.formatVersion,
        binding: BINDING_EXPRESSION,
        attachable: this.attachable?.['minecraft:attachable']?.description?.identifier ?? null,
        animationCount: this.animations.size,
      },
      binding: {
        targetBone: 'rightItem',
        targetPivot: [...model.rightItemPivot],
        empiricalGrip: [...ASPERGILLUM_EMPIRICAL_GRIP],
        authoredPresentationOffset: holdPosition,
        compositionCalibration: holdPosition.map((value) => -value),
        boundPivot: [0, 0, 0],
        expectedLocalOffset: formatVector(expectedOffset),
        actualLocalOffset: formatVector(actualOffset),
        localOffsetError: Number(localOffsetError.toFixed(8)),
        contactError: Number(contactError.toFixed(8)),
        error: Number(error.toFixed(8)),
        exact: error < 1e-7,
        chain: [
          this.matrixSnapshot(this.playerBuilt, 'rightArm'),
          this.matrixSnapshot(this.playerBuilt, 'rightItem'),
          bound,
          this.matrixSnapshot(this.itemBuilt, 'aspergillum_presentation'),
          this.matrixSnapshot(this.itemBuilt, 'aspergillum_action'),
        ].filter(Boolean),
      },
      playback: {
        playing: this.playing,
        speed: this.speed,
      },
      camera: this.cameraSnapshot(),
    };
  }

  async configureCapture(options = {}) {
    this.pause();
    document.body.classList.add('capture-mode');
    this.controlsEnabled = false;
    this.controls.enabled = false;
    this.renderer.setPixelRatio(1);
    this.scene.background = options.transparent ? null : new THREE.Color(options.background ?? DEFAULT_BACKGROUND);
    this.renderer.setClearAlpha(options.transparent ? 0 : 1);
    await this.rebuild({
      model: options.model ?? 'wide',
      action: options.action ?? 'idle',
      time: Number(options.time) || 0,
      perspective: options.perspective ?? 'third',
      material: options.material ?? 'pbr',
      cosmetic: options.cosmetic ?? 'classic',
      outerLayers: options.outerLayers !== false,
      skinSource: options.skinSource ?? this.skinSource,
      skinMetadata: options.skinMetadata ?? this.skinMetadata,
    });
    this.setDebug({ grid: Boolean(options.grid), pivots: false, skeleton: false, wireframe: Boolean(options.wireframe) });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.resize();
    this.render(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    this.render(true);
    return this.snapshot();
  }

  async capture(viewId) {
    const view = this.setCaptureView(viewId);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    this.render(true);
    return { ...view, snapshot: this.snapshot(), dataUrl: this.canvas.toDataURL('image/png') };
  }

  resize() {
    const width = Math.max(1, this.stage.clientWidth);
    const height = Math.max(1, this.stage.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  render(force = false) {
    if (!this.visible && !force) return;
    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);
  }

  animate(now) {
    this.frameRequest = requestAnimationFrame(this.animate);
    const delta = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (this.playing && this.recipe.presentation.duration > 0) {
      const next = this.recipe.presentation.time + (delta * this.speed);
      if (next >= this.recipe.presentation.duration) {
        this.recipe.presentation.time = this.recipe.presentation.duration;
        this.playing = false;
      } else {
        this.recipe.presentation.time = next;
      }
      this.applyPose();
    }
    if (this.visible) {
      if (this.controlsEnabled) this.controls.update();
      if (this.playing || this.controlsEnabled) this.render();
    }
    if ((this.playing || now - this.lastUiFrame > 220) && this.playerBuilt) {
      this.lastUiFrame = now;
      this.onFrame(this.snapshot());
    }
  }

  dispose() {
    cancelAnimationFrame(this.frameRequest);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.controls.dispose();
    this.removeAvatar();
    this.renderer.dispose();
  }
}
