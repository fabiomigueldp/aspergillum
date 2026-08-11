import fs from "node:fs";
import path from "node:path";
import { inspectArtifact, sha256File, writeJsonAtomic } from "../release/artifact-core.mjs";
import { naturalCompare } from "./identity.mjs";

const cacheSchemaVersion = 1;

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
      if (value?.label && value?.artifact) {
        metadata.set(value.label, { family, base: value.baseline ?? null, title: value.title ?? null });
      }
      if (Array.isArray(value?.variants)) {
        for (const variant of value.variants) {
          if (variant?.label) metadata.set(variant.label, { family, base: value.baseline ?? null, title: variant.title ?? null });
        }
      }
    }
  }
  return metadata;
}

function artifactLabel(filePath) {
  const match = path.basename(filePath).match(/^Aspergillum-(.+)\.mcaddon$/i);
  if (!match) throw new Error(`Nome de artefato não reconhecido: ${filePath}`);
  return match[1];
}

function normalizeDescriptor(projectRoot, artifactPath, descriptor, metadata) {
  const diagnostic = metadata.get(descriptor.label);
  return {
    ...descriptor,
    family: diagnostic?.family ?? descriptor.family,
    base: diagnostic?.base ?? descriptor.base ?? null,
    title: diagnostic?.title ?? descriptor.title ?? null,
    artifact: path.relative(projectRoot, artifactPath).split(path.sep).join("/"),
    artifactPath,
  };
}

function loadCache(cachePath) {
  const value = readJsonOptional(cachePath);
  return value?.schemaVersion === cacheSchemaVersion && value.entries && typeof value.entries === "object"
    ? value
    : { schemaVersion: cacheSchemaVersion, entries: {} };
}

export function loadArtifactCatalog({ projectRoot, refresh = false } = {}) {
  if (!projectRoot) throw new Error("projectRoot é obrigatório.");
  const releases = path.join(projectRoot, "dist", "releases");
  const artifactPaths = findFiles(releases, (file) => file.toLowerCase().endsWith(".mcaddon"));
  const cachePath = path.join(projectRoot, "out", "addon-manager", "catalog-cache.json");
  const previous = refresh ? { schemaVersion: cacheSchemaVersion, entries: {} } : loadCache(cachePath);
  const next = { schemaVersion: cacheSchemaVersion, entries: {} };
  const diagnosticMetadata = loadDiagnosticMetadata(projectRoot);
  const descriptors = [];

  for (const artifactPath of artifactPaths) {
    const relative = path.relative(projectRoot, artifactPath).split(path.sep).join("/");
    const stat = fs.statSync(artifactPath);
    const signature = `${stat.size}:${stat.mtimeMs}`;
    const adjacent = readJsonOptional(`${artifactPath}.artifact.json`);
    let descriptor;
    if (!refresh && adjacent?.schemaVersion === 1 && adjacent.bytes === stat.size) {
      descriptor = adjacent;
    } else if (!refresh && previous.entries[relative]?.signature === signature) {
      descriptor = previous.entries[relative].descriptor;
    } else {
      const label = artifactLabel(artifactPath);
      const diagnostic = diagnosticMetadata.get(label);
      descriptor = inspectArtifact({
        projectRoot,
        artifactPath,
        label,
        channel: diagnostic ? "diagnostic" : undefined,
        family: diagnostic?.family,
        base: diagnostic?.base,
      });
    }
    descriptor = normalizeDescriptor(projectRoot, artifactPath, descriptor, diagnosticMetadata);
    next.entries[relative] = { signature, descriptor: { ...descriptor, artifactPath: undefined } };
    descriptors.push(descriptor);
  }

  const byLabel = new Map();
  for (const descriptor of descriptors.sort((left, right) => naturalCompare(left.label, right.label))) {
    const existing = byLabel.get(descriptor.label);
    if (existing && existing.sha256 !== descriptor.sha256) {
      throw new Error(`Mais de um artefato diferente usa o rótulo ${descriptor.label}: ${existing.artifact} e ${descriptor.artifact}`);
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
  if (actual !== descriptor.sha256) {
    throw new Error(`SHA-256 divergente para ${descriptor.label}: catálogo ${descriptor.sha256}, arquivo ${actual}.`);
  }
  const sidecarPath = `${descriptor.artifactPath}.sha256`;
  if (fs.existsSync(sidecarPath)) {
    const expected = fs.readFileSync(sidecarPath, "utf8").match(/\b[0-9a-f]{64}\b/i)?.[0]?.toLowerCase();
    if (!expected) throw new Error(`Arquivo SHA-256 inválido: ${sidecarPath}`);
    if (expected !== actual) throw new Error(`SHA-256 publicado não corresponde ao artefato ${descriptor.label}.`);
  }
  return actual;
}

export function catalogIdentityMaps(catalog) {
  const behaviorIds = new Set();
  const resourceIds = new Set();
  const pairs = new Map();
  for (const descriptor of catalog) {
    behaviorIds.add(descriptor.behaviorUuid);
    resourceIds.add(descriptor.resourceUuid);
    const key = `${descriptor.behaviorUuid.toLowerCase()}@${descriptor.bedrockVersion.join(".")}|${descriptor.resourceUuid.toLowerCase()}@${descriptor.bedrockVersion.join(".")}`;
    const labels = pairs.get(key) ?? [];
    labels.push(descriptor.label);
    pairs.set(key, labels);
  }
  return { behaviorIds, resourceIds, pairs };
}
