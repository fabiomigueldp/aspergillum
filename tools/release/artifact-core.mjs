import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import archiver from "archiver";
import { readMcaddonManifests } from "../lib/zip.mjs";
import { getReleaseRegistration, registry } from "./release-registry.mjs";

const archiveDate = new Date("2000-01-01T00:00:00.000Z");

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(absolute) : [absolute];
    });
}

function appendPack(archive, source, destination) {
  for (const file of collectFiles(source)) {
    const relative = path.relative(source, file).split(path.sep).join("/");
    archive.append(fs.readFileSync(file), { name: `${destination}/${relative}`, date: archiveDate, mode: 0o644 });
  }
}

export async function createMcaddon({ outputPath, behaviorPath, resourcePath, behaviorRoot = "Aspergillum_BP", resourceRoot = "Aspergillum_RP", replace = false }) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const stagedPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.stage`);
  try {
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(stagedPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      output.on("close", resolve);
      output.on("error", reject);
      archive.on("warning", reject);
      archive.on("error", reject);
      archive.pipe(output);
      appendPack(archive, behaviorPath, behaviorRoot);
      appendPack(archive, resourcePath, resourceRoot);
      void archive.finalize();
    });
    if (fs.existsSync(outputPath)) {
      const currentHash = sha256File(outputPath);
      const stagedHash = sha256File(stagedPath);
      if (currentHash === stagedHash) {
        fs.rmSync(stagedPath, { force: true });
        return outputPath;
      }
      if (!replace) {
        throw new Error(`O artefato ${path.basename(outputPath)} já existe com bytes diferentes (${currentHash} != ${stagedHash}). Eleve a versão ou use --replace conscientemente.`);
      }
      const previousPath = `${outputPath}.${process.pid}.previous`;
      fs.renameSync(outputPath, previousPath);
      try {
        fs.renameSync(stagedPath, outputPath);
        fs.rmSync(previousPath, { force: true });
      } catch (error) {
        if (!fs.existsSync(outputPath) && fs.existsSync(previousPath)) fs.renameSync(previousPath, outputPath);
        throw error;
      }
    } else {
      fs.renameSync(stagedPath, outputPath);
    }
  } finally {
    fs.rmSync(stagedPath, { force: true });
  }
  return outputPath;
}

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const descriptor = fs.openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
}

function normalizeVersion(value, source) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isInteger)) {
    throw new Error(`Versão inválida em ${source}: ${JSON.stringify(value)}`);
  }
  return value;
}

function sameVersion(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function addonMetadata(projectRoot) {
  const packagePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packagePath)) return { id: "aspergillum", displayName: "Aspergillum", publicIdentity: registry.publicIdentity };
  const metadata = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const configured = metadata.addonManager ?? {};
  return {
    id: configured.id ?? metadata.name?.replace(/-bedrock-addon$/i, "") ?? "aspergillum",
    displayName: configured.displayName ?? configured.id ?? "Aspergillum",
    publicIdentity: configured.publicIdentity ?? (configured.id === "aspergillum" ? registry.publicIdentity : null),
  };
}

export function gitProvenance(projectRoot) {
  const commit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projectRoot, encoding: "utf8", windowsHide: true });
  if (commit.status !== 0) return { sourceCommit: null, sourceDirty: null };
  const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: projectRoot, encoding: "utf8", windowsHide: true });
  return {
    sourceCommit: commit.stdout.trim(),
    sourceDirty: status.status === 0 ? status.stdout.trim().length > 0 : null,
  };
}

export function inspectArtifact({ projectRoot, artifactPath, label, channel, family, base, sourceCommit = null, sourceDirty = null, sha256 }) {
  const addon = addonMetadata(projectRoot);
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
  const official = behaviorUuid.toLowerCase() === addon.publicIdentity?.behaviorUuid?.toLowerCase()
    && resourceUuid.toLowerCase() === addon.publicIdentity?.resourceUuid?.toLowerCase();
  const registration = addon.id === "aspergillum" ? getReleaseRegistration(label) : undefined;
  const resolvedChannel = channel ?? registration?.channel ?? (official ? "official" : "diagnostic");
  return {
    schemaVersion: 2,
    addonId: addon.id,
    displayName: addon.displayName,
    label,
    bedrockVersion: [...behaviorVersion],
    channel: resolvedChannel,
    family: family ?? registration?.family ?? (resolvedChannel === "official" ? "release" : "diagnostic"),
    base: base ?? registration?.base ?? null,
    behaviorUuid,
    resourceUuid,
    behavior: {
      uuid: behaviorUuid,
      version: [...behaviorVersion],
      name: packs.behavior.manifest.header?.name ?? null,
      root: packs.behavior.root,
    },
    resource: {
      uuid: resourceUuid,
      version: [...resourceVersion],
      name: packs.resource.manifest.header?.name ?? null,
      root: packs.resource.root,
    },
    sha256: sha256 ?? sha256File(artifactPath),
    bytes: fs.statSync(artifactPath).size,
    sourceCommit,
    sourceDirty,
    artifact: path.relative(projectRoot, artifactPath).split(path.sep).join("/"),
  };
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

function findFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? findFiles(absolute, predicate) : predicate(absolute) ? [absolute] : [];
  });
}

export function updateArtifactCatalog(projectRoot) {
  const releases = path.join(projectRoot, "dist", "releases");
  const descriptors = findFiles(releases, (file) => file.endsWith(".mcaddon.artifact.json"))
    .map((file) => JSON.parse(fs.readFileSync(file, "utf8")))
    .filter((descriptor) => fs.existsSync(path.resolve(projectRoot, descriptor.artifact)))
    .sort((left, right) => left.label.localeCompare(right.label, "en", { numeric: true }));
  const catalog = { schemaVersion: 2, addonId: addonMetadata(projectRoot).id, generatedAt: new Date().toISOString(), artifacts: descriptors };
  writeJsonAtomic(path.join(releases, "catalog.json"), catalog);
  return catalog;
}

export function publishArtifact({ projectRoot, artifactPath, label, channel, family, base, provenance = gitProvenance(projectRoot) }) {
  const sha256 = sha256File(artifactPath);
  const descriptor = inspectArtifact({ projectRoot, artifactPath, label, channel, family, base, sha256, ...provenance });
  fs.writeFileSync(`${artifactPath}.sha256`, `${sha256}  ${path.basename(artifactPath)}\n`, "utf8");
  writeJsonAtomic(`${artifactPath}.artifact.json`, descriptor);
  updateArtifactCatalog(projectRoot);
  return descriptor;
}

export { addonMetadata, archiveDate, collectFiles, writeJsonAtomic };
