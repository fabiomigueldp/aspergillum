import fs from "node:fs";
import path from "node:path";
import { catalogIdentityMaps } from "./catalog.mjs";
import { normalizeVersion, pairKey } from "./identity.mjs";

export const PACK_KINDS = {
  behavior: {
    directory: "behavior_packs",
    reference: "world_behavior_packs.json",
    history: "world_behavior_pack_history.json",
  },
  resource: {
    directory: "resource_packs",
    reference: "world_resource_packs.json",
    history: "world_resource_pack_history.json",
  },
};

export function readJsonOptional(filePath, fallback) {
  if (!fs.existsSync(filePath)) return structuredClone(fallback);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isAspergillumText(value) {
  return typeof value === "string" && value.toLowerCase().includes("aspergillum");
}

function manifestKind(manifest) {
  const types = new Set((manifest.modules ?? []).map((module) => module.type));
  if (types.has("resources")) return "resource";
  if (types.has("data") || types.has("script")) return "behavior";
  return undefined;
}

function readPackCandidate(directory, expectedKind, knownIds) {
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) return undefined;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifestKind(manifest) !== expectedKind) return undefined;
    const uuid = manifest.header?.uuid;
    const version = normalizeVersion(manifest.header?.version, manifestPath);
    if (!knownIds.has(uuid) && !isAspergillumText(manifest.header?.name) && !isAspergillumText(manifest.header?.description)) return undefined;
    return { kind: expectedKind, uuid, version, name: manifest.header?.name ?? null, path: directory, manifestPath };
  } catch (error) {
    return { kind: expectedKind, path: directory, error: error instanceof Error ? error.message : String(error) };
  }
}

function scanPackRoot(root, kind, knownIds) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readPackCandidate(path.join(root, entry.name), kind, knownIds))
    .filter(Boolean);
}

function readWorldName(worldPath) {
  const filePath = path.join(worldPath, "levelname.txt");
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "<sem nome>";
}

function readHistory(worldPath, kind) {
  const filePath = path.join(worldPath, PACK_KINDS[kind].history);
  const value = readJsonOptional(filePath, { packs: [] });
  if (!Array.isArray(value?.packs)) throw new Error(`Formato inesperado: ${filePath}`);
  return { filePath, value, entries: value.packs };
}

function readReferences(worldPath, kind) {
  const filePath = path.join(worldPath, PACK_KINDS[kind].reference);
  const value = readJsonOptional(filePath, []);
  if (!Array.isArray(value)) throw new Error(`Formato inesperado: ${filePath}`);
  return { filePath, value };
}

function pairSummary(behavior, resource, pairLabels) {
  const validBehavior = behavior.filter((entry) => !entry.error);
  const validResource = resource.filter((entry) => !entry.error);
  const packs = { behavior: validBehavior, resource: validResource };
  const errors = [...behavior, ...resource].filter((entry) => entry.error).map((entry) => entry.error);
  if (errors.length > 0) return { state: "conflict", issues: errors, packs };
  if (validBehavior.length === 0 && validResource.length === 0) return { state: "none", pair: undefined, labels: [], packs };
  if (validBehavior.length !== 1 || validResource.length !== 1) {
    const state = validBehavior.length > 1 || validResource.length > 1 ? "multiple" : "partial";
    return { state, issues: [`Par Aspergillum ${state === "partial" ? "incompleto" : "duplicado"}: BP=${validBehavior.length}, RP=${validResource.length}.`], packs };
  }
  const pair = { behavior: validBehavior[0], resource: validResource[0] };
  const labels = pairLabels.get(pairKey(pair)) ?? [];
  return { state: labels.length ? "known" : "unknown", pair, labels, packs };
}

function historyOwnedIds(history, baseIds) {
  const ids = new Set(baseIds);
  for (const entry of history.entries) if (isAspergillumText(entry.name)) ids.add(entry.uuid);
  return ids;
}

function inspectWorld({ worldPath, folder, profile, bedrockRoot, identityMaps }) {
  const histories = {
    behavior: readHistory(worldPath, "behavior"),
    resource: readHistory(worldPath, "resource"),
  };
  const ownedIds = {
    behavior: historyOwnedIds(histories.behavior, identityMaps.behaviorIds),
    resource: historyOwnedIds(histories.resource, identityMaps.resourceIds),
  };
  const localCandidates = {};
  for (const kind of Object.keys(PACK_KINDS)) {
    const root = path.join(worldPath, PACK_KINDS[kind].directory);
    localCandidates[kind] = scanPackRoot(root, kind, ownedIds[kind]);
    for (const candidate of localCandidates[kind]) if (candidate.uuid) ownedIds[kind].add(candidate.uuid);
  }
  const references = {
    behavior: readReferences(worldPath, "behavior"),
    resource: readReferences(worldPath, "resource"),
  };
  const activeCandidates = {};
  const referenceErrors = [];
  for (const kind of Object.keys(PACK_KINDS)) {
    activeCandidates[kind] = references[kind].value.flatMap((entry) => {
      if (!ownedIds[kind].has(entry.pack_id)) return [];
      try {
        return [{ kind, uuid: entry.pack_id, version: normalizeVersion(entry.version, references[kind].filePath) }];
      } catch (error) {
        referenceErrors.push(error instanceof Error ? error.message : String(error));
        return [];
      }
    });
  }
  const active = pairSummary(activeCandidates.behavior, activeCandidates.resource, identityMaps.pairs);
  if (referenceErrors.length > 0) active.issues = [...(active.issues ?? []), ...referenceErrors];
  const local = pairSummary(localCandidates.behavior, localCandidates.resource, identityMaps.pairs);
  let state = "none";
  const issues = [...(active.issues ?? []), ...(local.issues ?? [])];
  if (issues.length > 0 || ["partial", "multiple", "conflict"].includes(active.state) || ["partial", "multiple", "conflict"].includes(local.state)) {
    state = "conflict";
  } else if (active.state === "none" && local.state === "none") {
    state = "none";
  } else if (active.state === "none" || (local.state !== "none" && pairKey(active.pair) !== pairKey(local.pair))) {
    state = "conflict";
    issues.push("Referências ativas e packs locais não representam o mesmo par.");
  } else {
    state = active.state === "known" ? "managed" : "unknown";
  }
  return {
    id: `${profile.id}/${folder}`,
    folder,
    name: readWorldName(worldPath),
    path: worldPath,
    relativePath: path.relative(bedrockRoot, worldPath).split(path.sep).join("\\"),
    profile,
    histories,
    references,
    ownedIds,
    localCandidates,
    active,
    local,
    state,
    issues,
  };
}

function listProfiles(usersRoot) {
  if (!fs.existsSync(usersRoot)) throw new Error(`Dados Bedrock não encontrados: ${usersRoot}`);
  return fs.readdirSync(usersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "Shared")
    .map((entry) => {
      const comMojang = path.join(usersRoot, entry.name, "games", "com.mojang");
      return { id: entry.name, path: comMojang };
    })
    .filter((profile) => fs.existsSync(profile.path));
}

function inspectShared(usersRoot, identityMaps) {
  const pathRoot = path.join(usersRoot, "Shared", "games", "com.mojang");
  const candidates = {};
  const selected = {};
  for (const kind of Object.keys(PACK_KINDS)) {
    const packRoot = path.join(pathRoot, PACK_KINDS[kind].directory);
    candidates[kind] = scanPackRoot(packRoot, kind, kind === "behavior" ? identityMaps.behaviorIds : identityMaps.resourceIds);
    const canonical = candidates[kind].find((candidate) => path.basename(candidate.path).toLowerCase() === "pack.asper");
    if (canonical) selected[kind] = [canonical];
    else selected[kind] = candidates[kind];
  }
  const summary = pairSummary(selected.behavior, selected.resource, identityMaps.pairs);
  for (const kind of Object.keys(PACK_KINDS)) {
    const canonicalPath = path.join(pathRoot, PACK_KINDS[kind].directory, "pack.asper");
    if (fs.existsSync(canonicalPath) && !candidates[kind].some((candidate) => path.resolve(candidate.path) === path.resolve(canonicalPath))) {
      summary.state = "conflict";
      summary.issues = [...(summary.issues ?? []), `O caminho reservado de Shared contém outro pack: ${canonicalPath}`];
    }
  }
  return {
    path: pathRoot,
    candidates,
    ...summary,
    targetPaths: {
      behavior: selected.behavior.length === 1 ? selected.behavior[0].path : path.join(pathRoot, "behavior_packs", "pack.asper"),
      resource: selected.resource.length === 1 ? selected.resource[0].path : path.join(pathRoot, "resource_packs", "pack.asper"),
    },
  };
}

export function defaultBedrockRoot() {
  if (process.platform !== "win32") throw new Error("A descoberta automática do Minecraft Bedrock exige Windows; use --bedrock-root nos testes.");
  if (!process.env.APPDATA) throw new Error("APPDATA não está definido.");
  return path.join(process.env.APPDATA, "Minecraft Bedrock");
}

export function inspectBedrock({ bedrockRoot = defaultBedrockRoot(), catalog, profileId } = {}) {
  const resolvedRoot = path.resolve(bedrockRoot);
  const usersRoot = path.join(resolvedRoot, "Users");
  const identityMaps = catalogIdentityMaps(catalog);
  const profiles = listProfiles(usersRoot).filter((profile) => !profileId || profile.id === profileId);
  if (profileId && profiles.length === 0) throw new Error(`Perfil Bedrock não encontrado: ${profileId}`);
  const worlds = [];
  for (const profile of profiles) {
    const worldsRoot = path.join(profile.path, "minecraftWorlds");
    if (!fs.existsSync(worldsRoot)) continue;
    for (const entry of fs.readdirSync(worldsRoot, { withFileTypes: true }).filter((item) => item.isDirectory())) {
      const worldPath = path.join(worldsRoot, entry.name);
      worlds.push(inspectWorld({ worldPath, folder: entry.name, profile, bedrockRoot: resolvedRoot, identityMaps }));
    }
  }
  return {
    bedrockRoot: resolvedRoot,
    usersRoot,
    profiles,
    worlds,
    shared: inspectShared(usersRoot, identityMaps),
    identityMaps,
  };
}

export function resolveWorld(worlds, requested, profileId) {
  const matches = worlds.filter((world) => (!profileId || world.profile.id === profileId) && (world.name === requested || world.folder === requested));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`Mundo não encontrado: ${requested}`);
  throw new Error(`Mais de um mundo corresponde a ${requested}; informe --profile.`);
}

export function managedWorldPackPath(world, kind) {
  const candidates = world.localCandidates[kind].filter((candidate) => !candidate.error);
  if (candidates.length > 1) throw new Error(`${world.name}: mais de um ${kind} pack Aspergillum local.`);
  if (candidates[0]) return candidates[0].path;
  const target = path.join(world.path, PACK_KINDS[kind].directory, "aspergillum.managed");
  if (fs.existsSync(target)) throw new Error(`${world.name}: o caminho reservado contém outro ${kind} pack: ${target}`);
  return target;
}
