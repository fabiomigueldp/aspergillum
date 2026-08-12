import fs from "node:fs";
import path from "node:path";
import { sha256File, writeJsonAtomic } from "../release/artifact-core.mjs";
import { readMcaddonManifests } from "../lib/zip.mjs";
import { naturalCompare, normalizeVersion, sameVersion } from "./identity.mjs";

const cacheSchemaVersion = 2;

function defaultProject(projectRoot) {
  return {
    id: "aspergillum",
    displayName: "Aspergillum",
    artifactPrefix: "Aspergillum",
    projectRoot: path.resolve(projectRoot),
    aliases: ["aspergillum"],
    publicIdentity: null,
  };
}

function findFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => naturalCompare(left.name, right.name))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? findFiles(absolute, predicate) : predicate(absolute) ? [absolute] : [];
    });
}

function readJsonOptional(filePath) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : undefined;
  } catch {
    return undefined;
  }
}

function loadDiagnosticMetadata(projectRoot) {
  const metadata = new Map();
  const diagnosticRoot = path.join(projectRoot, "dist", "diagnostics");
  if (!fs.existsSync(diagnosticRoot)) return metadata;
  for (const familyEntry of fs.readdirSync(diagnosticRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== ".staging")) {
    const family = familyEntry.name;
    const familyPath = path.join(diagnosticRoot, family);
    const summaries = fs.readdirSync(familyPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(familyPath, entry.name));
    for (const filePath of summaries) {
      const value = readJsonOptional(filePath);
      if (value?.label && value?.artifact) metadata.set(value.label, { family, base: value.baseline ?? null, title: value.title ?? null });
      if (Array.isArray(value?.variants)) {
        for (const variant of value.variants) {
          if (variant?.label) metadata.set(variant.label, { family, base: value.baseline ?? null, title: variant.title ?? null });
        }
      }
    }
  }
  return metadata;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function artifactLabel(filePath, project) {
  const expression = new RegExp(`^${escapeRegExp(project.artifactPrefix)}-(.+)\\.mcaddon$`, "i");
  const match = path.basename(filePath).match(expression);
  if (!match) throw new Error(`Nome de artefato não reconhecido para ${project.displayName}: ${filePath}`);
  return match[1];
}

function inspectGenericArtifact({ projectRoot, project, artifactPath, label, metadata }) {
  const packs = readMcaddonManifests(artifactPath);
  const behaviorVersion = normalizeVersion(packs.behavior.manifest.header?.version, `${packs.behavior.root}/manifest.json`);
  const resourceVersion = normalizeVersion(packs.resource.manifest.header?.version, `${packs.resource.root}/manifest.json`);
  if (!sameVersion(behaviorVersion, resourceVersion)) throw new Error(`BP/RP usam versões diferentes em ${artifactPath}`);
  const behaviorUuid = packs.behavior.manifest.header?.uuid;
  const resourceUuid = packs.resource.manifest.header?.uuid;
  if (typeof behaviorUuid !== "string" || typeof resourceUuid !== "string") throw new Error(`UUID ausente em ${artifactPath}`);
  const resourceDependency = (packs.behavior.manifest.dependencies ?? []).find((dependency) => dependency.uuid?.toLowerCase() === resourceUuid.toLowerCase());
  if (!resourceDependency || !sameVersion(normalizeVersion(resourceDependency.version, "dependência do Resource Pack"), resourceVersion)) {
    throw new Error(`Dependência BP→RP inconsistente em ${artifactPath}`);
  }
  const diagnostic = metadata.get(label);
  return {
    schemaVersion: 2,
    addonId: project.id,
    label,
    bedrockVersion: behaviorVersion,
    channel: diagnostic ? "diagnostic" : "official",
    family: diagnostic?.family ?? (diagnostic ? "diagnostic" : "release"),
    base: diagnostic?.base ?? null,
    title: diagnostic?.title ?? null,
    behaviorUuid: behaviorUuid.toLowerCase(),
    resourceUuid: resourceUuid.toLowerCase(),
    behavior: { uuid: behaviorUuid.toLowerCase(), version: behaviorVersion, name: packs.behavior.manifest.header?.name ?? null, root: packs.behavior.root },
    resource: { uuid: resourceUuid.toLowerCase(), version: resourceVersion, name: packs.resource.manifest.header?.name ?? null, root: packs.resource.root },
    sha256: sha256File(artifactPath),
    bytes: fs.statSync(artifactPath).size,
    sourceCommit: null,
    sourceDirty: null,
    artifact: path.relative(projectRoot, artifactPath).split(path.sep).join("/"),
  };
}

function normalizeDescriptor(projectRoot, project, artifactPath, descriptor, metadata) {
  if (descriptor.addonId != null && (typeof descriptor.addonId !== "string" || descriptor.addonId.toLowerCase() !== project.id)) {
    throw new Error(`O descritor ${artifactPath}.artifact.json pertence a ${descriptor.addonId}, não a ${project.id}.`);
  }
  if (typeof descriptor.label !== "string" || !descriptor.label.trim()) throw new Error(`Descritor sem rótulo válido: ${artifactPath}`);
  const diagnostic = metadata.get(descriptor.label);
  const behaviorUuid = descriptor.behavior?.uuid ?? descriptor.behaviorUuid;
  const resourceUuid = descriptor.resource?.uuid ?? descriptor.resourceUuid;
  if (typeof behaviorUuid !== "string" || typeof resourceUuid !== "string") throw new Error(`Descritor sem UUIDs: ${artifactPath}`);
  const behaviorVersion = normalizeVersion(descriptor.behavior?.version ?? descriptor.bedrockVersion, `${artifactPath}/behavior.version`);
  const resourceVersion = normalizeVersion(descriptor.resource?.version ?? descriptor.bedrockVersion, `${artifactPath}/resource.version`);
  if (!sameVersion(behaviorVersion, resourceVersion)) throw new Error(`Descritor BP/RP divergente: ${artifactPath}`);
  if (typeof descriptor.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(descriptor.sha256)) throw new Error(`SHA-256 inválido no descritor: ${artifactPath}`);
  return {
    ...descriptor,
    schemaVersion: 2,
    sourceSchemaVersion: descriptor.sourceSchemaVersion ?? descriptor.schemaVersion ?? null,
    addonId: project.id,
    displayName: project.displayName,
    label: descriptor.label.trim(),
    bedrockVersion: [...behaviorVersion],
    channel: diagnostic ? "diagnostic" : (descriptor.channel ?? "official"),
    family: diagnostic?.family ?? descriptor.family ?? (descriptor.channel === "diagnostic" ? "diagnostic" : "release"),
    base: diagnostic?.base ?? descriptor.base ?? null,
    title: diagnostic?.title ?? descriptor.title ?? null,
    behaviorUuid: behaviorUuid.toLowerCase(),
    resourceUuid: resourceUuid.toLowerCase(),
    behavior: { ...descriptor.behavior, uuid: behaviorUuid.toLowerCase(), version: [...behaviorVersion] },
    resource: { ...descriptor.resource, uuid: resourceUuid.toLowerCase(), version: [...resourceVersion] },
    artifact: path.relative(projectRoot, artifactPath).split(path.sep).join("/"),
    artifactPath,
    projectRoot,
  };
}

function loadCache(cachePath) {
  const value = readJsonOptional(cachePath);
  return value?.schemaVersion === cacheSchemaVersion && value.entries && typeof value.entries === "object"
    ? value
    : { schemaVersion: cacheSchemaVersion, entries: {} };
}

export function loadArtifactCatalog({ projectRoot, stateRoot = projectRoot, project, refresh = false } = {}) {
  if (!projectRoot) throw new Error("projectRoot é obrigatório.");
  const resolvedProject = project ?? defaultProject(projectRoot);
  const releases = path.join(projectRoot, "dist", "releases");
  const artifactPaths = findFiles(releases, (file) => file.toLowerCase().endsWith(".mcaddon"));
  const cachePath = path.join(stateRoot, "out", "addon-manager", "catalog-cache", `${resolvedProject.id}.json`);
  const previous = refresh ? { schemaVersion: cacheSchemaVersion, entries: {} } : loadCache(cachePath);
  const next = { schemaVersion: cacheSchemaVersion, addonId: resolvedProject.id, projectRoot: path.resolve(projectRoot), entries: {} };
  const diagnosticMetadata = loadDiagnosticMetadata(projectRoot);
  const descriptors = [];

  for (const artifactPath of artifactPaths) {
    const relative = path.relative(projectRoot, artifactPath).split(path.sep).join("/");
    const stat = fs.statSync(artifactPath);
    const signature = `${stat.size}:${stat.mtimeMs}`;
    const adjacent = readJsonOptional(`${artifactPath}.artifact.json`);
    let descriptor;
    if (adjacent && [1, 2].includes(adjacent.schemaVersion) && adjacent.bytes === stat.size) {
      if (refresh) {
        const actualSha256 = sha256File(artifactPath);
        if (typeof adjacent.sha256 !== "string" || adjacent.sha256.toLowerCase() !== actualSha256) {
          throw new Error(`Descritor publicado não corresponde ao artefato: ${artifactPath}`);
        }
      }
      descriptor = adjacent;
    } else if (!refresh && previous.entries[relative]?.signature === signature) {
      descriptor = previous.entries[relative].descriptor;
    } else {
      const label = artifactLabel(artifactPath, resolvedProject);
      descriptor = inspectGenericArtifact({ projectRoot, project: resolvedProject, artifactPath, label, metadata: diagnosticMetadata });
    }
    descriptor = normalizeDescriptor(projectRoot, resolvedProject, artifactPath, descriptor, diagnosticMetadata);
    next.entries[relative] = { signature, descriptor: { ...descriptor, artifactPath: undefined, projectRoot: undefined } };
    descriptors.push(descriptor);
  }

  const byLabel = new Map();
  for (const descriptor of descriptors.sort((left, right) => naturalCompare(left.label, right.label))) {
    const existing = byLabel.get(descriptor.label);
    if (existing && existing.sha256 !== descriptor.sha256) {
      throw new Error(`Mais de um artefato diferente usa ${resolvedProject.id}/${descriptor.label}: ${existing.artifact} e ${descriptor.artifact}`);
    }
    if (!existing || descriptor.artifact.length < existing.artifact.length) byLabel.set(descriptor.label, descriptor);
  }
  writeJsonAtomic(cachePath, next);
  return [...byLabel.values()].sort((left, right) => naturalCompare(left.label, right.label));
}

export function findArtifact(catalog, label) {
  const descriptor = catalog.find((entry) => entry.label === label);
  if (!descriptor) throw new Error(`Artefato ${label} não encontrado. Execute 'npm run addon -- list' para ver os disponíveis.`);
  return descriptor;
}

export function verifyArtifact(descriptor) {
  if (!fs.existsSync(descriptor.artifactPath)) throw new Error(`Artefato ausente: ${descriptor.artifactPath}`);
  const actual = sha256File(descriptor.artifactPath);
  if (actual !== descriptor.sha256.toLowerCase()) {
    throw new Error(`SHA-256 divergente para ${descriptor.addonId}/${descriptor.label}: catálogo ${descriptor.sha256}, arquivo ${actual}.`);
  }
  const sidecarPath = `${descriptor.artifactPath}.sha256`;
  if (fs.existsSync(sidecarPath)) {
    const expected = fs.readFileSync(sidecarPath, "utf8").match(/\b[0-9a-f]{64}\b/i)?.[0]?.toLowerCase();
    if (!expected) throw new Error(`Arquivo SHA-256 inválido: ${sidecarPath}`);
    if (expected !== actual) throw new Error(`SHA-256 publicado não corresponde ao artefato ${descriptor.addonId}/${descriptor.label}.`);
  }
  return actual;
}

export function catalogIdentityMaps(catalog, project = undefined) {
  const behaviorIds = new Set();
  const resourceIds = new Set();
  const pairs = new Map();
  if (project?.publicIdentity) {
    behaviorIds.add(project.publicIdentity.behaviorUuid.toLowerCase());
    resourceIds.add(project.publicIdentity.resourceUuid.toLowerCase());
  }
  for (const descriptor of catalog) {
    behaviorIds.add(descriptor.behavior.uuid.toLowerCase());
    resourceIds.add(descriptor.resource.uuid.toLowerCase());
    const key = `${descriptor.behavior.uuid.toLowerCase()}@${descriptor.behavior.version.join(".")}|${descriptor.resource.uuid.toLowerCase()}@${descriptor.resource.version.join(".")}`;
    const labels = pairs.get(key) ?? [];
    labels.push(descriptor.label);
    pairs.set(key, labels);
  }
  return { behaviorIds, resourceIds, pairs };
}

export { artifactLabel, cacheSchemaVersion, normalizeDescriptor };
