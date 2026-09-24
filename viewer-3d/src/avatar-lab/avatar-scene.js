import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OBB } from 'three/addons/math/OBB.js';
import {
  AVATAR_ACTIONS,
  ASPERGILLUM_EMPIRICAL_GRIP,
  DEFAULT_AVATAR_PRESET,
  OUTER_LAYER_BONES,
  createPlayerGeometry,
  getAvatarCaptureView,
  getAvatarModel,
  normalizeAvatarRecipe,
  resolveBoundGripComposition,
} from '../shared/avatar-contract.js';
import {
  evaluateAvatarPose,
  sampleAnimationChannel,
} from '../shared/avatar-motion.js';
import {
  BEDROCK_GEOMETRY_BASIS,
  BEDROCK_UNIT_SCALE,
  bedrockAnimationPosition,
  bedrockAnimationRotation,
  bedrockGeometryRotation,
  buildBedrockGeometry,
  findBoneGroup,
  resetBedrockPose,
  setPivotVisibility,
} from '../shared/bedrock-geometry.js';
import { findBedrockGeometry } from '../shared/bedrock-document.js';
import {
  applyEquipmentVisualBasis,
  authoredPlayerBoneRotation,
  equipmentAnchor,
  equipmentMode,
  graftEquipmentBones,
  graftSnapshot,
} from '../shared/avatar-equipment.js';
import {
  getSelectedProject,
  projectAssetUrl,
} from '../shared/project-context.js';

const PLAYER_SCALE = 0.9375;
const BINDING_EXPRESSION = 'q.item_slot_to_bone_name(context.item_slot)';
const DEFAULT_BACKGROUND = 0x121a1c;
const FIRST_PERSON_VISIBLE_BONES = new Set(['rightarm', 'rightsleeve']);
const GRIP_CENTER_TOLERANCE = 0.05;

function assetUrl(relativePath, projectId) {
  return projectAssetUrl(relativePath, projectId);
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

function worldObb(mesh) {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return new OBB().fromBox3(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
}

function boxDistance(left, right) {
  const gaps = [
    Math.max(0, left.min.x - right.max.x, right.min.x - left.max.x),
    Math.max(0, left.min.y - right.max.y, right.min.y - left.max.y),
    Math.max(0, left.min.z - right.max.z, right.min.z - left.max.z),
  ];
  return Math.hypot(...gaps);
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
    this.project = null;
    this.manifest = null;
    this.equipment = null;
    this.profile = null;
    this.equipmentGrafts = [];
    this.itemModel = null;
    this.itemGeometry = null;
    this.itemSummary = null;
    this.attachable = null;
    this.animations = new Map();
    this.playerBuilt = null;
    this.itemBuilt = null;
    this.equipmentGrafts = [];
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
    this.resizeFrame = 0;
    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        if (this.stage.isConnected) this.resize();
      });
    });
    this.resizeObserver.observe(stage);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting !== false;
    }, { threshold: 0.01 });
    this.intersectionObserver.observe(stage);
    this.animate = this.animate.bind(this);
    this.frameRequest = requestAnimationFrame(this.animate);
  }

  async initialize() {
    await this.loadProject();
    return this.snapshot();
  }

  async loadProject({ equipmentId = null } = {}) {
    this.onStatus({ state: 'loading', message: 'Resolvendo projeto e runtime local' });
    this.project = await getSelectedProject();
    this.manifest = await this.fetchJson('manifest.json');
    this.profile = this.manifest.capabilities?.advancedAvatarProfile ?? null;
    this.animations.clear();
    this.textureCache.clear();
    this.derivedTextureCache.clear();
    await Promise.all((this.manifest.runtime?.animations ?? []).map(async (relativePath) => {
      const file = await this.fetchJson(`pack/${relativePath}`);
      for (const [id, animation] of Object.entries(file.animations ?? {})) this.animations.set(id, animation);
    }));

    const preferred = equipmentId
      ?? (this.profile === 'aspergillum-held-v1'
        ? this.manifest.equipment.find(({ id }) => id === 'aspergillum:aspergillum')?.id
          ?? this.manifest.equipment.find(({ geometryId }) => geometryId === 'geometry.aspergillum.held')?.id
        : this.manifest.equipment.find(({ resolved }) => resolved)?.id);
    if (!preferred) throw new Error(`${this.project.displayName} não possui equipamento resolvido para o Avatar Lab.`);
    await this.loadEquipment(preferred);
    await this.rebuild({
      project: this.project.id,
      equipmentId: this.equipment.id,
      item: this.equipment.id,
      slot: this.equipment.sourceSlot ?? this.equipment.slot,
      targetBone: equipmentAnchor(null, this.equipment.slot).targetName,
      binding: this.profile === 'aspergillum-held-v1' ? BINDING_EXPRESSION : 'merge_by_bone',
      profile: this.profile ?? 'bedrock-attachable-v1',
      cosmetic: this.manifest.cosmetics.find(({ id }) => id === 'classic')?.id
        ?? this.manifest.cosmetics[0]?.id
        ?? 'default',
      material: this.manifest.capabilities?.pbr ? this.recipe.presentation.material : 'classic',
      action: 'idle',
    });
    this.onStatus({
      state: 'ready',
      message: `${this.project.displayName} · ${this.equipment.label} resolvido`,
    });
    return this.snapshot();
  }

  async loadEquipment(equipmentId) {
    const equipment = this.manifest.equipment?.find(({ id, localId }) => (
      id === equipmentId || localId === equipmentId
    ));
    if (!equipment?.resolved) throw new Error(`Equipamento não resolvido no catálogo: ${equipmentId}`);
    const model = this.manifest.models.find(({ id }) => id === equipment.modelId);
    if (!model) throw new Error(`Modelo ausente para ${equipment.label}: ${equipment.modelId}`);
    const summary = model.geometries.find(({ identifier }) => identifier === equipment.geometryId)
      ?? model.geometries[0];
    const modelFile = await this.fetchJson(model.source);
    const geometry = findBedrockGeometry(modelFile, summary?.identifier, summary?.index ?? 0);
    if (!summary || !geometry) throw new Error(`Geometria ausente para ${equipment.label}.`);
    const attachablePath = equipment.attachable?.path;
    this.equipment = equipment;
    this.itemModel = model;
    this.itemSummary = summary;
    this.itemGeometry = geometry;
    this.attachable = attachablePath ? await this.fetchJson(`pack/${attachablePath}`) : null;

    if (this.profile === 'aspergillum-held-v1') {
      const binding = geometry.bones?.find(({ name }) => name === 'aspergillum_bound')?.binding;
      if (binding !== BINDING_EXPRESSION) {
        throw new Error(`Binding incompatível no pack: ${binding ?? 'ausente'}`);
      }
    }
    return equipment;
  }

  async fetchJson(relativePath) {
    const response = await fetch(assetUrl(relativePath, this.project?.id));
    if (!response.ok) throw new Error(`Falha ao carregar ${relativePath}: ${response.status}`);
    return response.json();
  }

  async loadTexture(source, color = false) {
    if (!source) return null;
    const url = source.startsWith('data:') || source.startsWith('blob:') || source.startsWith('http')
      ? source
      : assetUrl(source, this.project?.id);
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
    const cosmetic = this.manifest.cosmetics.find(({ id }) => id === this.recipe.presentation.cosmetic)
      ?? this.manifest.cosmetics[0];
    const stem = cosmetic?.textures?.[this.itemModel.id]
      ?? stripTextureExtension(this.equipment?.texture ?? this.itemModel.texture);
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
    material.userData = { colorPath, normalPath, mersPath, cosmetic: cosmetic?.id ?? 'default' };
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
    if (overrides.equipmentId && overrides.equipmentId !== this.equipment?.id) {
      await this.loadEquipment(overrides.equipmentId);
      if (token !== this.loadToken) return this.snapshot();
      overrides = {
        ...overrides,
        item: this.equipment.id,
        slot: this.equipment.sourceSlot ?? this.equipment.slot,
        targetBone: equipmentAnchor(null, this.equipment.slot).targetName,
        binding: this.profile === 'aspergillum-held-v1' ? BINDING_EXPRESSION : 'merge_by_bone',
        profile: this.profile ?? 'bedrock-attachable-v1',
      };
    }
    if (overrides.skinSource) this.skinSource = overrides.skinSource;
    if (overrides.skinMetadata) this.skinMetadata = { ...this.skinMetadata, ...overrides.skinMetadata };
    const skinReference = this.skinMetadata.reference
      ?? this.skinMetadata.skin
      ?? this.skinMetadata.label
      ?? DEFAULT_AVATAR_PRESET.skin;
    this.recipe = normalizeAvatarRecipe({
      ...this.recipe.avatar,
      ...this.recipe.equipment,
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
    }, { default: skinMaterial }, {
      includePivots: true,
      includeLocators: true,
      // The local player rig deliberately exposes the skin front on +Z.
      coordinateBasis: BEDROCK_GEOMETRY_BASIS.LEGACY_VIEWER,
    });
    const model = getAvatarModel(this.recipe.avatar.model);
    const advancedProfile = this.profile === 'aspergillum-held-v1';
    this.itemBuilt = buildBedrockGeometry(
      this.itemGeometry,
      this.itemSummary,
      { default: itemMaterial },
      {
        externalParentPivot: advancedProfile ? ASPERGILLUM_EMPIRICAL_GRIP : [0, 0, 0],
        includePivots: true,
        includeLocators: true,
        // Preserve the approved Aspergillum calibration while all generic pack
        // geometry enters through the standards-correct Bedrock adapter.
        coordinateBasis: advancedProfile
          ? BEDROCK_GEOMETRY_BASIS.LEGACY_VIEWER
          : BEDROCK_GEOMETRY_BASIS.BEDROCK,
      },
    );
    if (advancedProfile) {
      const rightItem = findBoneGroup(this.playerBuilt, 'rightItem');
      if (!rightItem) throw new Error('O rig do avatar não contém o osso rightItem.');
      rightItem.add(this.itemBuilt.root);
      this.equipmentGrafts = [];
    } else {
      this.playerBuilt.root.add(this.itemBuilt.root);
      this.equipmentGrafts = graftEquipmentBones(this.playerBuilt, this.itemBuilt);
      applyEquipmentVisualBasis(this.itemBuilt, this.equipmentGrafts);
    }

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
    const chain = this.profile === 'aspergillum-held-v1'
      ? ['rightArm', 'rightItem', 'aspergillum_bound', 'aspergillum_presentation', 'aspergillum_action']
      : [
        equipmentAnchor(this.playerBuilt, this.equipment?.slot).targetName,
        ...this.equipmentGrafts.map(({ boneName }) => boneName),
      ];
    const points = chain.map((name) => (
      findBoneGroup(this.playerBuilt, name) ?? findBoneGroup(this.itemBuilt, name)
    )?.getWorldPosition(new THREE.Vector3())).filter(Boolean);
    this.bindingLine.geometry.setFromPoints(points);
    this.debugLines.visible = this.showSkeleton;
    this.bindingLine.visible = this.showSkeleton;
  }

  applyAnimation(built, animation, time, perspective = this.recipe.presentation.perspective) {
    if (!animation?.bones) return;
    const length = Number(animation.animation_length) || 0.82;
    for (const [boneName, channels] of Object.entries(animation.bones)) {
      const group = findBoneGroup(built, boneName);
      if (!group) continue;
      if (channels.position) {
        const value = bedrockAnimationPosition(
          sampleAnimationChannel(channels.position, time, length),
        );
        group.position.add(new THREE.Vector3(...value).multiplyScalar(BEDROCK_UNIT_SCALE));
      }
      if (channels.rotation) {
        const value = bedrockAnimationRotation(
          sampleAnimationChannel(channels.rotation, time, length),
          perspective,
        );
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

  applyAttachableAnimation(animation, time) {
    if (!animation?.bones) return;
    for (const [boneName, channels] of Object.entries(animation.bones)) {
      const playerTarget = findBoneGroup(this.playerBuilt, boneName);
      const itemTarget = findBoneGroup(this.itemBuilt, boneName);
      const target = playerTarget ?? itemTarget;
      if (!target) continue;
      const built = playerTarget ? this.playerBuilt : this.itemBuilt;
      this.applyAnimation(built, { ...animation, bones: { [boneName]: channels } }, time);
    }
  }

  applyPose() {
    if (!this.playerBuilt || !this.itemBuilt) return;
    const advancedProfile = this.profile === 'aspergillum-held-v1';
    resetBedrockPose(this.playerBuilt.boneRecords);
    resetBedrockPose(this.itemBuilt.boneRecords);
    if (advancedProfile && this.recipe.presentation.perspective === 'first') {
      for (const { bone, group } of this.itemBuilt.boneRecords) {
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
    const pose = evaluateAvatarPose({
      action: advancedProfile ? this.recipe.presentation.action : 'idle',
      time: this.recipe.presentation.time,
      perspective: this.recipe.presentation.perspective,
    });
    if (!advancedProfile && this.recipe.presentation.perspective === 'third') {
      const authoredArm = this.equipment?.slot === 'hand'
        ? authoredPlayerBoneRotation(this.itemBuilt, 'rightArm')
        : null;
      pose.bones.rightArm = { rotation: authoredArm ?? [0, 0, 0] };
    }
    for (const [boneName, channels] of Object.entries(pose.bones)) {
      const group = findBoneGroup(this.playerBuilt, boneName);
      if (!group) continue;
      if (channels.position) {
        const position = bedrockAnimationPosition(channels.position);
        group.position.add(new THREE.Vector3(...position).multiplyScalar(BEDROCK_UNIT_SCALE));
      }
      const rotation = bedrockAnimationRotation(
        channels.rotation,
        this.recipe.presentation.perspective,
      );
      group.rotation.x += THREE.MathUtils.degToRad(rotation[0]);
      group.rotation.y += THREE.MathUtils.degToRad(rotation[1]);
      group.rotation.z += THREE.MathUtils.degToRad(rotation[2]);
    }

    const aliases = this.attachable?.['minecraft:attachable']?.description?.animations ?? {};
    const perspectiveSuffix = this.recipe.presentation.perspective === 'first' ? 'first_person' : 'third_person';
    const holdAnimation = this.animations.get(
      aliases[`hold_${perspectiveSuffix}`] ?? aliases[`wield_${perspectiveSuffix}`],
    );
    if (advancedProfile) this.applyAnimation(this.itemBuilt, holdAnimation, 0);
    else this.applyAttachableAnimation(holdAnimation, 0);

    if (advancedProfile) {
      // O perfil calibrado do Aspergillum preserva a costura aprovada entre
      // rightItem e o pivô do cabo; nenhum outro add-on herda esta compensação.
      const holdPosition = sampleAnimationChannel(
        holdAnimation?.bones?.aspergillum_presentation?.position,
        0,
        Number(holdAnimation?.animation_length) || 0,
      );
      const resolvedHoldPosition = bedrockAnimationPosition(holdPosition);
      const { retainedPresentationOffset, compositionCalibration } = resolveBoundGripComposition(
        resolvedHoldPosition,
      );
      const boundGroup = findBoneGroup(this.itemBuilt, 'aspergillum_bound');
      boundGroup.position.add(
        new THREE.Vector3(...compositionCalibration).multiplyScalar(BEDROCK_UNIT_SCALE),
      );
      boundGroup.userData.compositionCalibration = compositionCalibration;
      boundGroup.userData.retainedPresentationOffset = retainedPresentationOffset;

      if (this.recipe.presentation.action === 'sprinkle') {
        this.applyAnimation(
          this.itemBuilt,
          this.animations.get(aliases[`sprinkle_${perspectiveSuffix}`]),
          Math.min(this.recipe.presentation.time, 0.82),
        );
      }
    }

    const firstPerson = this.recipe.presentation.perspective === 'first';
    for (const { mesh, boneName } of this.playerBuilt.meshRecords) {
      const isOuter = OUTER_LAYER_BONES.some((name) => name.toLowerCase() === boneName.toLowerCase());
      mesh.visible = (!firstPerson || FIRST_PERSON_VISIBLE_BONES.has(boneName.toLowerCase()))
        && (!isOuter || this.recipe.avatar.outerLayers);
    }
    const hideWearableInFirstPerson = firstPerson && equipmentMode(this.equipment?.slot) === 'wearable';
    for (const { mesh } of this.itemBuilt.meshRecords) mesh.visible = !hideWearableInFirstPerson;
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
    if (this.profile !== 'aspergillum-held-v1' && action !== 'idle') return;
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
    this.camera.fov = 70.25;
    this.camera.up.set(0, 1, 0);
    const eye = 27.41 * BEDROCK_UNIT_SCALE * PLAYER_SCALE;
    this.camera.position.set(0, eye, 0);
    this.controls.target.set(0, eye, 10 * BEDROCK_UNIT_SCALE * PLAYER_SCALE);
    this.camera.near = 0.01;
    this.camera.far = 50;
    this.camera.lookAt(this.controls.target);
    this.camera.updateProjectionMatrix();
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

  getGripAnchorBounds(sizeInBedrockUnits = 8) {
    const rightItem = findBoneGroup(this.playerBuilt, 'rightItem');
    if (!rightItem) return new THREE.Box3();
    const center = rightItem.getWorldPosition(new THREE.Vector3());
    const size = Math.max(1, Number(sizeInBedrockUnits) || 8) * BEDROCK_UNIT_SCALE * PLAYER_SCALE;
    return new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(size, size, size));
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

  configureCaptureMarkers(view) {
    const allPivots = [
      ...(this.playerBuilt?.pivotRecords ?? []),
      ...(this.itemBuilt?.pivotRecords ?? []),
    ];
    const allLocators = [
      ...(this.playerBuilt?.locatorRecords ?? []),
      ...(this.itemBuilt?.locatorRecords ?? []),
    ];
    for (const { marker } of allPivots) {
      marker.visible = this.showPivots;
      marker.scale.setScalar(1);
      marker.renderOrder = 100;
      marker.material.color.setHex(0x74d9c3);
    }
    for (const { marker } of allLocators) marker.visible = this.showPivots;
    if (!this.showPivots || view.focus !== 'grip-anchor') return;

    for (const { marker } of allPivots) marker.visible = false;
    for (const { marker } of allLocators) marker.visible = false;
    const handPivot = this.playerBuilt.pivotRecords.find(({ boneName }) => (
      boneName.toLowerCase() === 'rightitem'
    ));
    const gripPivot = this.itemBuilt.pivotRecords.find(({ boneName }) => (
      boneName.toLowerCase() === 'aspergillum_presentation'
    ));
    if (gripPivot) {
      gripPivot.marker.visible = true;
      gripPivot.marker.scale.setScalar(1.55);
      gripPivot.marker.renderOrder = 101;
      gripPivot.marker.material.color.setHex(0xf1c46f);
    }
    if (handPivot) {
      handPivot.marker.visible = true;
      handPivot.marker.renderOrder = 102;
    }
  }

  setCaptureView(viewId) {
    const view = getAvatarCaptureView(viewId);
    if (!view) throw new Error(`Vista de avatar desconhecida: ${viewId}`);
    if (view.perspective === 'first') {
      this.setPerspective('first');
      return this.cameraSnapshot(view);
    }
    if (this.recipe.presentation.perspective !== 'third') this.setPerspective('third', { fit: false });
    let bounds = null;
    if (view.focus === 'equipment') {
      bounds = this.getVisibleBounds(this.itemBuilt.meshRecords);
    } else if (this.profile !== 'aspergillum-held-v1') {
      bounds = this.getVisibleBounds();
    } else if (view.focus === 'grip-anchor') {
      bounds = this.getGripAnchorBounds(view.focusSize);
    } else if (view.focus === 'sprinkler-head') {
      const records = this.itemBuilt.meshRecords.filter(({ boneName }) => boneName === 'sprinkler_head');
      bounds = this.getVisibleBounds(records);
    }
    this.camera.fov = view.focus === 'grip-anchor' ? 22 : view.focus ? 27 : 32;
    this.camera.up.set(...view.up);
    this.frameBounds(bounds ?? this.getVisibleBounds(), view.direction, view.focus ? 1.12 : 1.15);
    this.configureCaptureMarkers(view);
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

  collisionSnapshot() {
    if (this.profile !== 'aspergillum-held-v1') {
      return {
        applicable: false,
        headClear: true,
        gripEngaged: true,
        gripCentered: true,
        gripCenterOffset: [0, 0, 0],
        gripCenterError: 0,
        intersections: [],
      };
    }
    if (this.recipe.presentation.perspective === 'first') {
      return { applicable: false, headClear: true, gripEngaged: true, intersections: [] };
    }
    const itemHead = this.itemBuilt.meshRecords.filter(({ mesh, boneName }) => (
      boneName === 'sprinkler_head' && isVisible(mesh)
    ));
    const avatarHead = this.playerBuilt.meshRecords.filter(({ mesh, boneName }) => (
      ['head', 'hat'].includes(boneName.toLowerCase()) && isVisible(mesh)
    ));
    const handle = this.itemBuilt.meshRecords.filter(({ mesh, boneName }) => (
      boneName === 'handle' && isVisible(mesh)
    ));
    const hand = this.playerBuilt.meshRecords.filter(({ mesh, boneName }) => (
      ['rightarm', 'rightsleeve'].includes(boneName.toLowerCase()) && isVisible(mesh)
    ));
    const rightItemGroup = findBoneGroup(this.playerBuilt, 'rightItem');
    const presentationGroup = findBoneGroup(this.itemBuilt, 'aspergillum_presentation');
    const intersections = [];
    let minimumHeadClearance = Number.POSITIVE_INFINITY;
    for (const itemRecord of itemHead) {
      const itemBox = new THREE.Box3().setFromObject(itemRecord.mesh, true);
      const itemObb = worldObb(itemRecord.mesh);
      for (const avatarRecord of avatarHead) {
        const avatarBox = new THREE.Box3().setFromObject(avatarRecord.mesh, true);
        minimumHeadClearance = Math.min(minimumHeadClearance, boxDistance(itemBox, avatarBox));
        if (itemObb.intersectsOBB(worldObb(avatarRecord.mesh))) {
          intersections.push(`${itemRecord.boneName}:${avatarRecord.boneName}`);
        }
      }
    }
    const unitScale = BEDROCK_UNIT_SCALE * PLAYER_SCALE;
    const handAnchor = rightItemGroup?.getWorldPosition(new THREE.Vector3()) ?? null;
    const gripCenter = presentationGroup?.getWorldPosition(new THREE.Vector3()) ?? null;
    const gripCenterOffset = rightItemGroup && gripCenter
      ? rightItemGroup.worldToLocal(gripCenter.clone()).toArray().map(
        (value) => value / BEDROCK_UNIT_SCALE,
      )
      : [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
    const gripCenterError = Math.hypot(...gripCenterOffset);
    const gripCentered = gripCenterError <= GRIP_CENTER_TOLERANCE;
    const handContainsGripCenter = Boolean(gripCenter && hand.some(({ mesh }) => (
      worldObb(mesh).containsPoint(gripCenter)
    )));
    const handleContainsHandAnchor = Boolean(handAnchor && handle.some(({ mesh }) => (
      worldObb(mesh).containsPoint(handAnchor)
    )));
    const gripEngaged = gripCentered && handContainsGripCenter && handleContainsHandAnchor;
    return {
      applicable: true,
      headClear: intersections.length === 0,
      gripEngaged,
      gripCentered,
      gripCenterOffset: formatVector(gripCenterOffset),
      gripCenterError: Number.isFinite(gripCenterError)
        ? Number(gripCenterError.toFixed(4))
        : null,
      gripCenterTolerance: GRIP_CENTER_TOLERANCE,
      handContainsGripCenter,
      handleContainsHandAnchor,
      minimumHeadClearance: Number.isFinite(minimumHeadClearance)
        ? Number((minimumHeadClearance / unitScale).toFixed(4))
        : null,
      intersections,
    };
  }

  genericSnapshot() {
    this.scene.updateMatrixWorld(true);
    const anchor = equipmentAnchor(this.playerBuilt, this.equipment?.slot);
    const chain = [
      this.matrixSnapshot(this.playerBuilt, anchor.targetName),
      ...this.equipmentGrafts.map(({ boneName }) => this.matrixSnapshot(this.itemBuilt, boneName)),
    ].filter(Boolean);
    const mode = equipmentMode(this.equipment?.slot);
    const exact = Boolean(this.equipment?.resolved)
      && (mode !== 'wearable' || this.equipmentGrafts.length > 0);
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
        project: this.project?.id ?? null,
        projectLabel: this.project?.displayName ?? null,
        profile: this.profile ?? 'bedrock-attachable-v1',
        mode,
        equipment: this.equipment?.id ?? null,
        equipmentLabel: this.equipment?.label ?? null,
        geometry: this.itemSummary.identifier,
        formatVersion: this.itemSummary.formatVersion,
        binding: 'merge_by_bone',
        attachable: this.attachable?.['minecraft:attachable']?.description?.identifier ?? null,
        attachablePath: this.equipment?.attachable?.path ?? null,
        animationCount: this.animations.size,
        grafts: graftSnapshot(this.equipmentGrafts),
      },
      binding: {
        targetBone: anchor.targetName,
        targetPivot: anchor.pivot,
        empiricalGrip: null,
        authoredPresentationOffset: [0, 0, 0],
        resolvedPresentationOffset: [0, 0, 0],
        retainedPresentationOffset: [0, 0, 0],
        compositionCalibration: [0, 0, 0],
        boundPivot: anchor.pivot,
        expectedLocalOffset: [0, 0, 0],
        actualLocalOffset: [0, 0, 0],
        localOffsetError: 0,
        presentationOffset: [0, 0, 0],
        presentationOffsetError: 0,
        contactError: 0,
        error: exact ? 0 : 1,
        exact,
        chain,
      },
      collision: this.collisionSnapshot(),
      playback: { playing: this.playing, speed: this.speed },
      camera: this.cameraSnapshot(),
    };
  }

  snapshot() {
    if (!this.playerBuilt || !this.itemBuilt) return null;
    if (this.profile !== 'aspergillum-held-v1') return this.genericSnapshot();
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
    const resolvedHoldPosition = bedrockAnimationPosition(holdPosition);
    const retainedPresentationOffset = boundGroup?.userData?.retainedPresentationOffset ?? [0, 0, 0];
    const compositionCalibration = boundGroup?.userData?.compositionCalibration ?? [0, 0, 0];
    const boundRecord = this.itemBuilt.boneRecords.find(({ bone }) => (
      bone.name.toLowerCase() === 'aspergillum_bound'
    ));
    const expectedOffset = boundRecord.basePosition.clone().add(
      new THREE.Vector3(...compositionCalibration).multiplyScalar(BEDROCK_UNIT_SCALE),
    ).toArray();
    const actualOffset = boundGroup?.position.toArray() ?? [0, 0, 0];
    const localOffsetError = Math.sqrt(expectedOffset.reduce(
      (sum, value, index) => sum + ((value - actualOffset[index]) ** 2),
      0,
    ));
    let presentationOffset = [0, 0, 0];
    let presentationOffsetError = Number.POSITIVE_INFINITY;
    if (rightItemGroup && presentationGroup) {
      const localPresentation = rightItemGroup.worldToLocal(
        presentationGroup.getWorldPosition(new THREE.Vector3()),
      );
      presentationOffset = localPresentation.toArray().map((value) => value / BEDROCK_UNIT_SCALE);
      presentationOffsetError = Math.hypot(...presentationOffset.map(
        (value, index) => value - retainedPresentationOffset[index],
      ));
    }
    const contactError = Math.hypot(...presentationOffset);
    const error = Math.max(localOffsetError, presentationOffsetError * BEDROCK_UNIT_SCALE);
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
        project: this.project?.id ?? 'aspergillum',
        projectLabel: this.project?.displayName ?? 'Aspergillum',
        profile: 'aspergillum-held-v1',
        mode: 'bound-held',
        equipment: this.equipment?.id ?? 'aspergillum:aspergillum',
        equipmentLabel: this.equipment?.label ?? 'Aspersório',
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
        resolvedPresentationOffset: resolvedHoldPosition,
        retainedPresentationOffset,
        compositionCalibration,
        boundPivot: [0, 0, 0],
        expectedLocalOffset: formatVector(expectedOffset),
        actualLocalOffset: formatVector(actualOffset),
        localOffsetError: Number(localOffsetError.toFixed(8)),
        presentationOffset: formatVector(presentationOffset),
        presentationOffsetError: Number(presentationOffsetError.toFixed(8)),
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
      collision: this.collisionSnapshot(),
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
      equipmentId: options.equipment ?? options.equipmentId ?? this.equipment?.id,
      action: options.action ?? 'idle',
      time: Number(options.time) || 0,
      perspective: options.perspective ?? 'third',
      material: options.material ?? (this.manifest.capabilities?.pbr ? 'pbr' : 'classic'),
      cosmetic: options.cosmetic
        ?? this.manifest.cosmetics.find(({ id }) => id === 'classic')?.id
        ?? this.manifest.cosmetics[0]?.id
        ?? 'default',
      outerLayers: options.outerLayers !== false,
      skinSource: options.skinSource ?? this.skinSource,
      skinMetadata: options.skinMetadata ?? this.skinMetadata,
    });
    this.setDebug({
      grid: Boolean(options.grid),
      pivots: Boolean(options.pivots),
      skeleton: false,
      wireframe: Boolean(options.wireframe),
    });
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
    cancelAnimationFrame(this.resizeFrame);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.controls.dispose();
    this.removeAvatar();
    this.renderer.dispose();
  }
}
