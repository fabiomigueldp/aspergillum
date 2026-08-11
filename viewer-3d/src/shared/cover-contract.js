import { getCaptureView } from './capture-contract.js';

export const COVER_RENDERER_VERSION = 1;

export const COVER_PRESETS = Object.freeze({
  sacristy: Object.freeze({
    id: 'sacristy',
    subject: 'docked',
    lighting: 'cinematic',
    framing: Object.freeze({
      distanceScale: 0.9,
      targetOffset: Object.freeze([0, 0.03, 0]),
      direction: Object.freeze([1, 1.08, 1]),
      up: Object.freeze([0, 1, 0]),
    }),
  }),
});

export const DEFAULT_COVER_CONFIG = Object.freeze({
  title: 'ASPERGILLUM',
  preset: 'sacristy',
  cosmetic: 'classic',
  material: 'pbr',
  water: 'full',
  view: 'front-right',
});

const ALLOWED_MATERIALS = new Set(['pbr', 'classic']);
const ALLOWED_WATER_LEVELS = new Set(['low', 'mid', 'high', 'full']);

function normalizeTitle(value) {
  const title = String(value ?? DEFAULT_COVER_CONFIG.title)
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR');
  if (!title || title.length > 24) {
    throw new Error('O título da capa deve conter entre 1 e 24 caracteres.');
  }
  if (!/^[\p{L}\p{N} .'-]+$/u.test(title)) {
    throw new Error('O título da capa contém caracteres não permitidos.');
  }
  return title;
}

function normalizeCosmetic(value) {
  const cosmetic = String(value ?? DEFAULT_COVER_CONFIG.cosmetic).trim();
  if (!/^[a-z0-9_]+$/.test(cosmetic)) {
    throw new Error('O acabamento deve usar somente letras minúsculas, números e underscore.');
  }
  return cosmetic;
}

export function normalizeCoverConfig(input = {}) {
  const presetId = String(input.preset ?? DEFAULT_COVER_CONFIG.preset);
  const preset = COVER_PRESETS[presetId];
  if (!preset) throw new Error(`Preset de capa desconhecido: ${presetId}`);

  const material = String(input.material ?? DEFAULT_COVER_CONFIG.material);
  if (!ALLOWED_MATERIALS.has(material)) {
    throw new Error('O material da capa deve ser pbr ou classic.');
  }

  const water = String(input.water ?? DEFAULT_COVER_CONFIG.water);
  if (!ALLOWED_WATER_LEVELS.has(water)) {
    throw new Error('A capa exige água visível: low, mid, high ou full.');
  }

  const view = String(input.view ?? DEFAULT_COVER_CONFIG.view);
  const captureView = getCaptureView(view);
  if (!captureView) throw new Error(`Vista de capa desconhecida: ${view}`);
  const usesPresetCamera = view === DEFAULT_COVER_CONFIG.view;

  return Object.freeze({
    title: normalizeTitle(input.title),
    preset: preset.id,
    subject: preset.subject,
    lighting: preset.lighting,
    framing: Object.freeze({
      distanceScale: preset.framing.distanceScale,
      targetOffset: Object.freeze([...preset.framing.targetOffset]),
      direction: Object.freeze([
        ...(usesPresetCamera ? preset.framing.direction : captureView.direction),
      ]),
      up: Object.freeze([
        ...(usesPresetCamera ? preset.framing.up : captureView.up),
      ]),
    }),
    cosmetic: normalizeCosmetic(input.cosmetic),
    material,
    water,
    view,
  });
}

export function createCoverSearchParams(configInput = {}) {
  const config = normalizeCoverConfig(configInput);
  return new URLSearchParams({
    title: config.title,
    preset: config.preset,
    cosmetic: config.cosmetic,
    material: config.material,
    water: config.water,
    view: config.view,
  });
}
