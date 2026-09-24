const GEOMETRY_KEY = 'minecraft:geometry';

function asFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function legacyGeometry(identifier, value = {}) {
  const description = value.description ?? {};
  return {
    ...value,
    description: {
      ...description,
      identifier: description.identifier ?? identifier,
      texture_width: asFiniteNumber(
        description.texture_width ?? value.texture_width ?? value.texturewidth,
        64,
      ),
      texture_height: asFiniteNumber(
        description.texture_height ?? value.texture_height ?? value.textureheight,
        64,
      ),
      visible_bounds_width: description.visible_bounds_width ?? value.visible_bounds_width,
      visible_bounds_height: description.visible_bounds_height ?? value.visible_bounds_height,
      visible_bounds_offset: description.visible_bounds_offset ?? value.visible_bounds_offset,
    },
  };
}

/**
 * Returns Bedrock geometries from both the modern minecraft:geometry array and
 * the pre-1.12 top-level `geometry.*` representation. Keeping this at the
 * document boundary lets every renderer consume the same normalized shape.
 */
export function extractBedrockGeometries(document) {
  if (!document || typeof document !== 'object') return [];
  if (Array.isArray(document[GEOMETRY_KEY])) {
    return document[GEOMETRY_KEY].filter((geometry) => (
      geometry && typeof geometry === 'object' && Array.isArray(geometry.bones)
    ));
  }

  return Object.entries(document)
    .filter(([identifier, value]) => (
      identifier.startsWith('geometry.')
      && value
      && typeof value === 'object'
      && Array.isArray(value.bones)
    ))
    .map(([identifier, value]) => legacyGeometry(identifier, value));
}

export function bedrockGeometryIdentifier(geometry, index = 0) {
  return geometry?.description?.identifier ?? `geometry_${index}`;
}

export function findBedrockGeometry(document, identifier, fallbackIndex = 0) {
  const geometries = extractBedrockGeometries(document);
  if (!geometries.length) return null;
  if (identifier) {
    const match = geometries.find((geometry, index) => (
      bedrockGeometryIdentifier(geometry, index) === identifier
    ));
    if (match) return match;
  }
  return geometries[fallbackIndex] ?? geometries[0];
}

export function modelIdFromSource(source) {
  return String(source ?? '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\.geo\.json$/i, '')
    .replace(/\.json$/i, '')
    .replaceAll('/', '__');
}

export function normalizeTextureStem(value) {
  return String(value ?? '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\.texture_set\.json$/i, '')
    .replace(/\.png$/i, '');
}
