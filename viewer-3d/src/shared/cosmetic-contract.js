const METAL_LABELS = Object.freeze({
  silver: 'Prata clássica',
  antique: 'Prata envelhecida',
  gilded: 'Dourado festivo',
  bronze: 'Bronze cerimonial',
});

const GRIP_LABELS = Object.freeze({
  chestnut: 'Couro castanho',
  oxblood: 'Couro vinho',
  black: 'Couro preto',
  ivory: 'Marfim vegetal',
});

export function metalFinishLabel(finishId) {
  return METAL_LABELS[finishId] ?? String(finishId).replaceAll('_', ' ');
}

export function gripFinishLabel(finishId) {
  return GRIP_LABELS[finishId] ?? String(finishId).replaceAll('_', ' ');
}

export function cosmeticLabel(cosmetic) {
  return `${metalFinishLabel(cosmetic.metal)} · ${gripFinishLabel(cosmetic.grip)}`;
}

export function resolveCosmetic(cosmetics, cosmeticId = 'classic') {
  const cosmetic = cosmetics?.find((candidate) => candidate.id === cosmeticId);
  if (!cosmetic) throw new Error(`Acabamento desconhecido: ${cosmeticId}`);
  return cosmetic;
}

export function resolveCosmetics(cosmetics, cosmeticIds) {
  if (!Array.isArray(cosmetics) || cosmetics.length === 0) {
    throw new Error('O catálogo visual não contém acabamentos.');
  }
  if (!cosmeticIds?.length) return [resolveCosmetic(cosmetics, 'classic')];
  return cosmeticIds.map((cosmeticId) => resolveCosmetic(cosmetics, cosmeticId));
}

export function cosmeticTextureSuffix(cosmetic) {
  return cosmetic.id === 'classic' ? '' : `_${cosmetic.id}`;
}
