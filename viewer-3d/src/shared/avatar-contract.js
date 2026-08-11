export const DEFAULT_AVATAR_PRESET = Object.freeze({
  id: 'batina-preta-com-pelerine',
  label: 'Batina preta com pelerine',
  skin: 'avatar-library/batina_preta_com_pelerine.png',
  source: 'C:/Users/fabio/Projects/skins/colecoes/vestes_clericais/batina_preta_com_pelerine.png',
  sha256: 'b2ad2e38d47616f9f5b245d212786cfc64a15097845fc63c9127d97cbc11ae2b',
  width: 128,
  height: 128,
  model: 'wide',
});

// Grip aprovado por observação física no Bedrock desde a calibração 1.0.9.
// O compositor usa este referencial sem alterar a geometria distribuída.
export const ASPERGILLUM_EMPIRICAL_GRIP = Object.freeze([-6, 24, 1]);

export const AVATAR_MODELS = Object.freeze({
  wide: Object.freeze({
    id: 'wide',
    label: 'Clássico · braços 4 px',
    armWidth: 4,
    rightArmPivot: [-5, 22, 0],
    rightItemPivot: [-6, 15, 1],
  }),
  slim: Object.freeze({
    id: 'slim',
    label: 'Slim · braços 3 px',
    armWidth: 3,
    rightArmPivot: [-5, 21.5, 0],
    rightItemPivot: [-6, 14.5, 1],
  }),
});

export const AVATAR_ACTIONS = Object.freeze({
  idle: Object.freeze({ id: 'idle', label: 'Segurando', duration: 0 }),
  load: Object.freeze({ id: 'load', label: 'Carregando', duration: 1.1 }),
  sprinkle: Object.freeze({ id: 'sprinkle', label: 'Aspersão', duration: 0.9 }),
});

export const AVATAR_PERSPECTIVES = Object.freeze({
  third: Object.freeze({ id: 'third', label: '3ª pessoa' }),
  first: Object.freeze({ id: 'first', label: '1ª pessoa' }),
});

export const AVATAR_CAPTURE_VIEWS = Object.freeze([
  Object.freeze({ id: 'front', label: 'Frente', direction: [0, 0.15, 1], up: [0, 1, 0] }),
  Object.freeze({ id: 'front-right', label: 'Frente · direita', direction: [1, 0.35, 1], up: [0, 1, 0] }),
  Object.freeze({ id: 'right', label: 'Direita', direction: [1, 0.15, 0], up: [0, 1, 0] }),
  Object.freeze({ id: 'back', label: 'Trás', direction: [0, 0.15, -1], up: [0, 1, 0] }),
  Object.freeze({ id: 'left', label: 'Esquerda', direction: [-1, 0.15, 0], up: [0, 1, 0] }),
  Object.freeze({
    id: 'grip',
    label: 'Detalhe · empunhadura',
    direction: [1, 0.2, 1],
    up: [0, 1, 0],
    focus: 'grip',
  }),
  Object.freeze({
    id: 'head',
    label: 'Detalhe · cabeça do aspersório',
    direction: [1, 0.35, 1],
    up: [0, 1, 0],
    focus: 'sprinkler-head',
  }),
  Object.freeze({
    id: 'first-person',
    label: '1ª pessoa',
    direction: [0, 0, 1],
    up: [0, 1, 0],
    perspective: 'first',
  }),
]);

export const AVATAR_BINDING_CHAIN = Object.freeze([
  'root',
  'waist',
  'body',
  'rightArm',
  'rightItem',
  'aspergillum_bound',
  'aspergillum_presentation',
  'aspergillum_action',
]);

export const OUTER_LAYER_BONES = Object.freeze([
  'hat',
  'jacket',
  'leftSleeve',
  'rightSleeve',
  'leftPants',
  'rightPants',
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Expands the canonical Minecraft skin box layout into explicit Bedrock faces.
 *
 * The Avatar Lab treats +Z as the character's visual front, matching the
 * player convention used by skin tooling and by our equipment composition.
 * Generic Bedrock Box UVs place the first longitudinal panel on `north` (-Z),
 * so feeding a skin's compact [u, v] directly to the shared geometry builder
 * would put the face and the entire garment on the character's back.
 * Explicit faces keep the generic Bedrock adapter correct for pack geometry
 * while mapping every player surface (front/back and left/right) deliberately.
 */
export function createMinecraftSkinUv(baseUv, size) {
  const [u, v] = baseUv;
  const [width, height, depth] = size;
  return {
    east: { uv: [u + width + depth, v + depth], uv_size: [depth, height] },
    west: { uv: [u, v + depth], uv_size: [depth, height] },
    up: { uv: [u + depth, v], uv_size: [width, depth] },
    down: { uv: [u + width + depth, v + depth], uv_size: [width, -depth] },
    south: { uv: [u + depth, v + depth], uv_size: [width, height] },
    north: { uv: [u + width + (depth * 2), v + depth], uv_size: [width, height] },
  };
}

function skinCube(origin, size, uv, extras = {}) {
  return {
    origin,
    size,
    uv: createMinecraftSkinUv(uv, size),
    ...extras,
  };
}

function armBones(model) {
  const slim = model === 'slim';
  const armWidth = slim ? 3 : 4;
  const pivotY = slim ? 21.5 : 22;
  const originY = slim ? 11.5 : 12;
  const rightOriginX = slim ? -7 : -8;
  const itemY = slim ? 14.5 : 15;

  return [
    {
      name: 'leftArm',
      parent: 'body',
      pivot: [5, pivotY, 0],
      cubes: [skinCube([4, originY, -2], [armWidth, 12, 4], [32, 48])],
    },
    {
      name: 'leftSleeve',
      parent: 'leftArm',
      pivot: [5, pivotY, 0],
      cubes: [skinCube([4, originY, -2], [armWidth, 12, 4], [48, 48], { inflate: 0.25 })],
    },
    { name: 'leftItem', parent: 'leftArm', pivot: [6, itemY, 1] },
    {
      name: 'rightArm',
      parent: 'body',
      pivot: [-5, pivotY, 0],
      cubes: [skinCube([rightOriginX, originY, -2], [armWidth, 12, 4], [40, 16])],
    },
    {
      name: 'rightSleeve',
      parent: 'rightArm',
      pivot: [-5, pivotY, 0],
      cubes: [skinCube(
        [rightOriginX, originY, -2],
        [armWidth, 12, 4],
        [40, 32],
        { inflate: 0.25 },
      )],
    },
    {
      name: 'rightItem',
      parent: 'rightArm',
      pivot: [-6, itemY, 1],
      locators: { lead_hold: [-6, itemY, 1] },
    },
  ];
}

/**
 * Minimal standard Bedrock player rig used by the development renderer.
 * UV coordinates intentionally remain in the canonical 64×64 coordinate space;
 * HD 128×128 skins use the same normalized layout at twice the pixel density.
 */
export function createPlayerGeometry(model = 'wide') {
  if (!AVATAR_MODELS[model]) throw new Error(`Modelo de avatar desconhecido: ${model}`);

  return {
    description: {
      identifier: `geometry.aspergillum.avatar.${model}`,
      texture_width: 64,
      texture_height: 64,
      visible_bounds_width: 1,
      visible_bounds_height: 2,
      visible_bounds_offset: [0, 1, 0],
    },
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      { name: 'waist', parent: 'root', pivot: [0, 12, 0] },
      {
        name: 'body',
        parent: 'waist',
        pivot: [0, 24, 0],
        cubes: [skinCube([-4, 12, -2], [8, 12, 4], [16, 16])],
      },
      {
        name: 'head',
        parent: 'body',
        pivot: [0, 24, 0],
        cubes: [skinCube([-4, 24, -4], [8, 8, 8], [0, 0])],
      },
      {
        name: 'hat',
        parent: 'head',
        pivot: [0, 24, 0],
        cubes: [skinCube([-4, 24, -4], [8, 8, 8], [32, 0], { inflate: 0.5 })],
      },
      ...armBones(model),
      {
        name: 'leftLeg',
        parent: 'root',
        pivot: [1.9, 12, 0],
        cubes: [skinCube([-0.1, 0, -2], [4, 12, 4], [16, 48])],
      },
      {
        name: 'leftPants',
        parent: 'leftLeg',
        pivot: [1.9, 12, 0],
        cubes: [skinCube([-0.1, 0, -2], [4, 12, 4], [0, 48], { inflate: 0.25 })],
      },
      {
        name: 'rightLeg',
        parent: 'root',
        pivot: [-1.9, 12, 0],
        cubes: [skinCube([-3.9, 0, -2], [4, 12, 4], [0, 16])],
      },
      {
        name: 'rightPants',
        parent: 'rightLeg',
        pivot: [-1.9, 12, 0],
        cubes: [skinCube([-3.9, 0, -2], [4, 12, 4], [0, 32], { inflate: 0.25 })],
      },
      {
        name: 'jacket',
        parent: 'body',
        pivot: [0, 24, 0],
        cubes: [skinCube([-4, 12, -2], [8, 12, 4], [16, 32], { inflate: 0.25 })],
      },
    ],
  };
}

export function getAvatarModel(model) {
  return AVATAR_MODELS[model] ?? null;
}

export function getAvatarAction(action) {
  return AVATAR_ACTIONS[action] ?? null;
}

export function getAvatarCaptureView(viewId) {
  return AVATAR_CAPTURE_VIEWS.find(({ id }) => id === viewId) ?? null;
}

export function resolveAvatarCaptureViews(viewIds) {
  if (!viewIds?.length) return AVATAR_CAPTURE_VIEWS.slice(0, 5).map(clone);
  return viewIds.map((viewId) => {
    const view = getAvatarCaptureView(viewId);
    if (!view) throw new Error(`Vista de avatar desconhecida: ${viewId}`);
    return clone(view);
  });
}

export function validateSkinDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height)) return false;
  if (width !== height) return false;
  return width === 64 || width === 128;
}

export function inferSkinModelFromRgba(data, width, height) {
  if (!validateSkinDimensions(width, height)) {
    throw new Error(`Dimensão de skin não suportada: ${width}×${height}`);
  }
  if (!data || data.length < width * height * 4) {
    throw new Error('Buffer RGBA incompleto para inferência de skin.');
  }
  const scale = width / 64;
  const slimRegions = [[50, 16, 2, 4], [54, 20, 2, 12], [42, 48, 2, 4], [46, 52, 2, 12]];
  const transparent = slimRegions.every(([x, y, regionWidth, regionHeight]) => {
    for (let py = y * scale; py < (y + regionHeight) * scale; py += 1) {
      for (let px = x * scale; px < (x + regionWidth) * scale; px += 1) {
        if (data[((py * width) + px) * 4 + 3] !== 0) return false;
      }
    }
    return true;
  });
  return {
    model: transparent ? 'slim' : 'wide',
    method: 'reserved-arm-alpha',
    authoritative: false,
  };
}

export function normalizeAvatarRecipe(recipe = {}) {
  const model = recipe.model === 'slim' ? 'slim' : 'wide';
  const action = AVATAR_ACTIONS[recipe.action] ? recipe.action : 'idle';
  const perspective = AVATAR_PERSPECTIVES[recipe.perspective] ? recipe.perspective : 'third';
  const duration = AVATAR_ACTIONS[action].duration;
  const rawTime = Number(recipe.time);
  const time = Number.isFinite(rawTime) && rawTime >= 0
    ? (duration > 0 ? Math.min(rawTime, duration) : 0)
    : 0;

  return {
    schemaVersion: 1,
    avatar: {
      preset: recipe.preset ?? DEFAULT_AVATAR_PRESET.id,
      skin: recipe.skin ?? DEFAULT_AVATAR_PRESET.skin,
      model,
      outerLayers: recipe.outerLayers !== false,
    },
    equipment: {
      item: 'aspergillum:aspergillum',
      slot: 'slot.weapon.mainhand',
      targetBone: 'rightItem',
      binding: 'q.item_slot_to_bone_name(context.item_slot)',
    },
    presentation: {
      perspective,
      action,
      time,
      duration,
      material: recipe.material === 'classic' ? 'classic' : 'pbr',
      cosmetic: recipe.cosmetic ?? 'classic',
    },
  };
}
