export function normalizeVersion(value, source = "versão") {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isInteger)) {
    throw new Error(`Versão inválida em ${source}: ${JSON.stringify(value)}`);
  }
  return [...value];
}

export function versionText(version) {
  return version?.join(".") ?? "—";
}

export function sameVersion(left, right) {
  return Boolean(left && right && left.length === right.length && left.every((value, index) => value === right[index]));
}

export function packKey(pack) {
  if (!pack?.uuid || !pack?.version) return undefined;
  return `${pack.uuid.toLowerCase()}@${versionText(pack.version)}`;
}

export function pairKey(pair) {
  const behavior = packKey(pair?.behavior);
  const resource = packKey(pair?.resource);
  return behavior && resource ? `${behavior}|${resource}` : undefined;
}

export function descriptorPair(descriptor) {
  return {
    behavior: { uuid: descriptor.behavior.uuid, version: [...descriptor.behavior.version] },
    resource: { uuid: descriptor.resource.uuid, version: [...descriptor.resource.version] },
  };
}

export function pairMatchesDescriptor(pair, descriptor) {
  return pairKey(pair) === pairKey(descriptorPair(descriptor));
}

export function pairMatches(left, right) {
  const leftKey = pairKey(left);
  return Boolean(leftKey && leftKey === pairKey(right));
}

export function naturalCompare(left, right) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}
