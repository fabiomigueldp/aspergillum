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

export function sortCosmeticsForMatrix(cosmetics, metalFinishes, gripFinishes) {
  const metalOrder = new Map(metalFinishes.map((id, index) => [id, index]));
  const gripOrder = new Map(gripFinishes.map((id, index) => [id, index]));
  return [...cosmetics].sort((left, right) => {
    const metalDifference = (metalOrder.get(left.metal) ?? Number.MAX_SAFE_INTEGER)
      - (metalOrder.get(right.metal) ?? Number.MAX_SAFE_INTEGER);
    if (metalDifference !== 0) return metalDifference;
    return (gripOrder.get(left.grip) ?? Number.MAX_SAFE_INTEGER)
      - (gripOrder.get(right.grip) ?? Number.MAX_SAFE_INTEGER);
  });
}

export function cosmeticTextureSuffix(cosmetic) {
  return cosmetic.id === 'classic' ? '' : `_${cosmetic.id}`;
}
