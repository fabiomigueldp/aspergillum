import fs from "node:fs";
import path from "node:path";
import { extractZip } from "../lib/zip.mjs";
import { verifyArtifact } from "./catalog.mjs";
import { normalizeVersion, sameVersion } from "./identity.mjs";

function assertInside(parent, candidate, description) {
  const resolvedParent = path.resolve(parent);
  const resolvedCandidate = path.resolve(candidate);
  if (resolvedCandidate !== resolvedParent && !resolvedCandidate.startsWith(`${resolvedParent}${path.sep}`)) {
    throw new Error(`Caminho fora de ${description}: ${resolvedCandidate}`);
  }
  return resolvedCandidate;
}

function validateCachedPack(directory, expected, kind) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
    const version = normalizeVersion(manifest.header?.version, `${kind} cache`);
    return manifest.header?.uuid === expected.uuid && sameVersion(version, expected.version);
  } catch {
    return false;
  }
}

function validCache(directory, descriptor) {
  if (!fs.existsSync(path.join(directory, "cache.json"))) return false;
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(path.join(directory, "cache.json"), "utf8"));
  } catch {
    return false;
  }
  return metadata.sha256 === descriptor.sha256
    && validateCachedPack(path.join(directory, "behavior"), descriptor.behavior, "behavior")
    && validateCachedPack(path.join(directory, "resource"), descriptor.resource, "resource");
}

export function prepareArtifactCache({ projectRoot, descriptor }) {
  verifyArtifact(descriptor);
  const cacheRoot = path.join(projectRoot, "out", "addon-manager", "cache");
  const target = assertInside(cacheRoot, path.join(cacheRoot, descriptor.sha256), "cache do addon-manager");
  fs.mkdirSync(cacheRoot, { recursive: true });
  if (validCache(target, descriptor)) {
    return { root: target, behavior: path.join(target, "behavior"), resource: path.join(target, "resource"), reused: true };
  }
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });

  const temporary = assertInside(cacheRoot, path.join(cacheRoot, `.stage-${descriptor.sha256}-${process.pid}`), "cache do addon-manager");
  if (fs.existsSync(temporary)) fs.rmSync(temporary, { recursive: true, force: true });
  const archiveRoot = path.join(temporary, "archive");
  try {
    fs.mkdirSync(archiveRoot, { recursive: true });
    extractZip(descriptor.artifactPath, archiveRoot);
    const sourceBehavior = assertInside(archiveRoot, path.join(archiveRoot, descriptor.behavior.root), "artefato extraído");
    const sourceResource = assertInside(archiveRoot, path.join(archiveRoot, descriptor.resource.root), "artefato extraído");
    if (!validateCachedPack(sourceBehavior, descriptor.behavior, "behavior")) throw new Error("Behavior Pack extraído não corresponde ao descritor.");
    if (!validateCachedPack(sourceResource, descriptor.resource, "resource")) throw new Error("Resource Pack extraído não corresponde ao descritor.");
    fs.renameSync(sourceBehavior, path.join(temporary, "behavior"));
    fs.renameSync(sourceResource, path.join(temporary, "resource"));
    fs.rmSync(archiveRoot, { recursive: true, force: true });
    fs.writeFileSync(path.join(temporary, "cache.json"), `${JSON.stringify({ schemaVersion: 1, label: descriptor.label, sha256: descriptor.sha256 }, null, 2)}\n`, "utf8");
    if (validCache(target, descriptor)) {
      fs.rmSync(temporary, { recursive: true, force: true });
      return { root: target, behavior: path.join(target, "behavior"), resource: path.join(target, "resource"), reused: true };
    }
    try {
      fs.renameSync(temporary, target);
    } catch (error) {
      if (validCache(target, descriptor)) {
        fs.rmSync(temporary, { recursive: true, force: true });
        return { root: target, behavior: path.join(target, "behavior"), resource: path.join(target, "resource"), reused: true };
      }
      throw error;
    }
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
  return { root: target, behavior: path.join(target, "behavior"), resource: path.join(target, "resource"), reused: false };
}

export { assertInside, validCache };
