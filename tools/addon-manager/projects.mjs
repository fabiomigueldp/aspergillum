import fs from "node:fs";
import path from "node:path";

const registrySchemaVersion = 1;
const projectSchemaVersion = 1;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-bedrock-addon$/i, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assertIdentifier(value, description) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(value)) throw new Error(`${description} inválido: ${JSON.stringify(value)}`);
  return value;
}

function assertDirectoryName(value, description) {
  const windowsDevice = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  if (
    typeof value !== "string"
    || !/^[a-z0-9][a-z0-9._-]*$/i.test(value)
    || value.endsWith(".")
    || windowsDevice.test(value)
    || path.basename(value) !== value
  ) {
    throw new Error(`${description} precisa ser um nome de diretório simples: ${JSON.stringify(value)}`);
  }
  return value;
}

function titleFromId(id) {
  return id.split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function normalizePublicIdentity(value) {
  if (value == null) return null;
  const behaviorUuid = value.behaviorUuid;
  const resourceUuid = value.resourceUuid;
  if (typeof behaviorUuid !== "string" || typeof resourceUuid !== "string") {
    throw new Error("addonManager.publicIdentity exige behaviorUuid e resourceUuid.");
  }
  return { behaviorUuid: behaviorUuid.toLowerCase(), resourceUuid: resourceUuid.toLowerCase() };
}

export function projectRegistryPath(managerRoot) {
  return path.join(managerRoot, "out", "addon-manager-projects.json");
}

export function loadProject(projectRoot, { idOverride } = {}) {
  const resolvedRoot = path.resolve(projectRoot);
  const packagePath = path.join(resolvedRoot, "package.json");
  if (!fs.existsSync(packagePath)) throw new Error(`package.json não encontrado no projeto: ${resolvedRoot}`);
  const metadata = readJson(packagePath);
  const configured = metadata.addonManager ?? {};
  if (configured.schemaVersion != null && configured.schemaVersion !== projectSchemaVersion) {
    throw new Error(`Schema addonManager desconhecido em ${packagePath}: ${configured.schemaVersion}`);
  }
  const id = assertIdentifier(slug(idOverride ?? configured.id ?? metadata.name), "ID do add-on");
  const displayName = configured.displayName ?? titleFromId(id);
  if (typeof displayName !== "string" || !displayName.trim()) throw new Error(`Nome de exibição inválido em ${packagePath}`);
  const artifactPrefix = configured.artifactPrefix ?? displayName.replaceAll(" ", "");
  if (typeof artifactPrefix !== "string" || !artifactPrefix.trim() || /[\\/]/.test(artifactPrefix)) {
    throw new Error(`Prefixo de artefato inválido em ${packagePath}`);
  }
  const sharedDirectory = assertDirectoryName(configured.sharedDirectory ?? `pack.${id}`, "Diretório Shared");
  const worldDirectory = assertDirectoryName(configured.worldDirectory ?? `${id}.managed`, "Diretório local do mundo");
  if (configured.aliases != null && !Array.isArray(configured.aliases)) throw new Error(`addonManager.aliases precisa ser uma lista em ${packagePath}`);
  const aliases = [...new Set([id, displayName, artifactPrefix, ...(configured.aliases ?? [])]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase()))];
  const currentLabel = configured.currentLabel ?? metadata.aspergillum?.releaseLabel ?? metadata.version;
  if (typeof currentLabel !== "string" || !currentLabel.trim()) throw new Error(`Versão atual ausente em ${packagePath}`);
  return {
    schemaVersion: projectSchemaVersion,
    id,
    displayName,
    artifactPrefix,
    sharedDirectory,
    worldDirectory,
    aliases,
    publicIdentity: normalizePublicIdentity(configured.publicIdentity),
    currentLabel: currentLabel.trim(),
    projectRoot: resolvedRoot,
    packagePath,
  };
}

function readRegistry(managerRoot) {
  const filePath = projectRegistryPath(managerRoot);
  const legacyPath = path.join(managerRoot, "out", "addon-manager", "projects.json");
  const sourcePath = fs.existsSync(filePath) ? filePath : legacyPath;
  if (!fs.existsSync(sourcePath)) return { schemaVersion: registrySchemaVersion, projects: [] };
  const value = readJson(sourcePath);
  if (value.schemaVersion !== registrySchemaVersion || !Array.isArray(value.projects)) {
    throw new Error(`Registro de projetos inválido: ${sourcePath}`);
  }
  return value;
}

function registryEntry(project) {
  return { id: project.id, projectRoot: project.projectRoot };
}

export function loadProjects({ managerRoot, skipMissing = false, onMissing }) {
  const resolvedManagerRoot = path.resolve(managerRoot);
  const primary = loadProject(resolvedManagerRoot);
  const entries = readRegistry(resolvedManagerRoot).projects;
  const projects = [primary];
  for (const entry of entries) {
    if (!entry || typeof entry.projectRoot !== "string") throw new Error("Entrada inválida no registro de projetos.");
    if (skipMissing && !fs.existsSync(path.join(path.resolve(entry.projectRoot), "package.json"))) {
      onMissing?.(entry);
      continue;
    }
    const external = loadProject(entry.projectRoot, { idOverride: entry.id });
    if (path.resolve(external.projectRoot) === resolvedManagerRoot) continue;
    projects.push(external);
  }
  assertProjectDefinitions(projects);
  return projects;
}

function assertProjectDefinitions(projects) {
  const ids = new Set();
  const displayNames = new Set();
  const sharedDirectories = new Set();
  const worldDirectories = new Set();
  const publicUuids = new Map();
  for (const project of projects) {
    if (ids.has(project.id)) throw new Error(`ID de add-on registrado mais de uma vez: ${project.id}`);
    if (displayNames.has(project.displayName.toLowerCase())) throw new Error(`Nome de add-on registrado mais de uma vez: ${project.displayName}`);
    if (sharedDirectories.has(project.sharedDirectory.toLowerCase())) throw new Error(`Diretório Shared reutilizado: ${project.sharedDirectory}`);
    if (worldDirectories.has(project.worldDirectory.toLowerCase())) throw new Error(`Diretório local reutilizado: ${project.worldDirectory}`);
    ids.add(project.id);
    displayNames.add(project.displayName.toLowerCase());
    sharedDirectories.add(project.sharedDirectory.toLowerCase());
    worldDirectories.add(project.worldDirectory.toLowerCase());
    for (const uuid of Object.values(project.publicIdentity ?? {})) {
      const owner = publicUuids.get(uuid);
      if (owner && owner !== project.id) throw new Error(`UUID público ${uuid} pertence simultaneamente a ${owner} e ${project.id}.`);
      publicUuids.set(uuid, project.id);
    }
  }
  return true;
}

export function registerProject({ managerRoot, projectRoot, idOverride }) {
  const resolvedManagerRoot = path.resolve(managerRoot);
  const project = loadProject(projectRoot, { idOverride });
  if (project.projectRoot === resolvedManagerRoot) return { project, changed: false };
  const registry = readRegistry(resolvedManagerRoot);
  const retained = registry.projects.filter((entry) => entry.id !== project.id && path.resolve(entry.projectRoot) !== project.projectRoot);
  const candidateEntries = [...retained, registryEntry(project)];
  const candidateProjects = [loadProject(resolvedManagerRoot), ...candidateEntries.map((entry) => loadProject(entry.projectRoot, { idOverride: entry.id }))];
  assertProjectDefinitions(candidateProjects);
  const next = {
    schemaVersion: registrySchemaVersion,
    projects: candidateEntries.sort((left, right) => left.id.localeCompare(right.id, "en")),
  };
  const before = JSON.stringify(registry.projects);
  writeJsonAtomic(projectRegistryPath(resolvedManagerRoot), next);
  return { project, changed: before !== JSON.stringify(next.projects) };
}

export function unregisterProject({ managerRoot, id }) {
  const resolvedManagerRoot = path.resolve(managerRoot);
  const primary = loadProject(resolvedManagerRoot);
  if (id.toLowerCase() === primary.id) throw new Error(`O projeto principal ${primary.id} não pode ser removido do registro local.`);
  const registry = readRegistry(resolvedManagerRoot);
  const projects = registry.projects.filter((entry) => entry.id.toLowerCase() !== id.toLowerCase());
  if (projects.length === registry.projects.length) throw new Error(`Add-on não registrado: ${id}`);
  writeJsonAtomic(projectRegistryPath(resolvedManagerRoot), { schemaVersion: registrySchemaVersion, projects });
  return true;
}

export function resolveProject(projects, requested, defaultId = projects[0]?.id) {
  const query = (requested ?? defaultId)?.toLowerCase();
  const matches = projects.filter((project) => projectMatches(project, query));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`Add-on não registrado: ${requested ?? defaultId}. Use 'addon projects' para listar os disponíveis.`);
  throw new Error(`Seleção ambígua de add-on: ${requested}`);
}

export function projectMatches(project, requested) {
  if (typeof requested !== "string" || !requested.trim()) return false;
  const query = requested.trim().toLowerCase();
  return project.id === query
    || project.displayName.toLowerCase() === query
    || project.aliases.includes(query);
}

export function assertProjectCatalogIsolation(entries) {
  const owners = new Map();
  for (const { project, catalog } of entries) {
    const ids = new Set();
    if (project.publicIdentity) {
      ids.add(project.publicIdentity.behaviorUuid);
      ids.add(project.publicIdentity.resourceUuid);
    }
    for (const artifact of catalog) {
      ids.add(artifact.behavior.uuid.toLowerCase());
      ids.add(artifact.resource.uuid.toLowerCase());
    }
    for (const uuid of ids) {
      const owner = owners.get(uuid);
      if (owner && owner !== project.id) throw new Error(`UUID ${uuid} pertence simultaneamente a ${owner} e ${project.id}.`);
      owners.set(uuid, project.id);
    }
  }
}

export function serializeProject(project) {
  return {
    id: project.id,
    displayName: project.displayName,
    currentLabel: project.currentLabel,
    projectRoot: project.projectRoot,
    sharedDirectory: project.sharedDirectory,
    worldDirectory: project.worldDirectory,
    publicIdentity: project.publicIdentity,
  };
}

export { projectSchemaVersion, registrySchemaVersion };
