import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";
import { PNG } from "pngjs";
import { createMcaddon, publishArtifact } from "./release/artifact-core.mjs";
import { requireReleaseRegistration } from "./release/release-registry.mjs";

const root = path.resolve(import.meta.dirname, "..");
const label = "1.1.9c";
const version = [1, 1, 17];
const releases = path.join(root, "dist", "releases");
const diagnosticRoot = path.join(root, "dist", "diagnostics", "entity-water-1.1.9");
const stagingRoot = path.join(diagnosticRoot, ".staging");
const stage = path.join(stagingRoot, label);
const sourceRoot = path.join(root, "assets-src", "diagnostics", label);
const creatorToolsCli = path.join(root, "node_modules", "@minecraft", "creator-tools", "cli", "index.mjs");
const UUID_NAMESPACE = "5adae868-2995-5995-921b-4102770d0da4";
const waterBones = new Set(["water_low", "water_mid", "water_high", "water_full"]);
requireReleaseRegistration(label, version, "diagnostic");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function uuidBytes(uuid) {
  const compact = uuid.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(compact)) throw new Error(`Invalid UUID namespace: ${uuid}`);
  return Buffer.from(compact, "hex");
}

function diagnosticUuid(name) {
  const digest = crypto
    .createHash("sha1")
    .update(uuidBytes(UUID_NAMESPACE))
    .update(Buffer.from(name, "utf8"))
    .digest()
    .subarray(0, 16);
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function materialInstanceGroups(blockDefinition) {
  const block = blockDefinition["minecraft:block"];
  if (!block) throw new Error("Aspersorium block definition is missing minecraft:block");
  return [
    block.components?.["minecraft:material_instances"],
    ...(block.permutations ?? []).map((permutation) => permutation.components?.["minecraft:material_instances"]),
  ].filter(Boolean);
}

function removeWaterVisibility(geometryComponent) {
  const visibility = geometryComponent?.bone_visibility;
  if (!visibility) return;
  for (const name of waterBones) delete visibility[name];
}

function makeAspersoriumOpaque(blockDefinition) {
  const output = structuredClone(blockDefinition);
  const block = output["minecraft:block"];
  if (!block) throw new Error("Aspersorium block definition is missing minecraft:block");
  for (const instances of materialInstanceGroups(output)) {
    delete instances.water;
    for (const instance of Object.values(instances)) instance.render_method = "opaque";
  }
  removeWaterVisibility(block.components?.["minecraft:geometry"]);
  for (const permutation of block.permutations ?? []) {
    removeWaterVisibility(permutation.components?.["minecraft:geometry"]);
  }
  block.components["minecraft:tick"] = {
    interval_range: [80, 120],
    looping: true,
  };
  return output;
}

function removeBlockWaterBones(geometryDefinition) {
  const output = structuredClone(geometryDefinition);
  const geometries = output["minecraft:geometry"] ?? [];
  if (geometries.length === 0) throw new Error("Aspersorium geometry contains no definitions");
  for (const geometry of geometries) {
    const before = geometry.bones?.length ?? 0;
    geometry.bones = (geometry.bones ?? []).filter((bone) => !waterBones.has(bone.name));
    const removed = before - geometry.bones.length;
    if (removed !== 0 && removed !== waterBones.size) {
      throw new Error(`${geometry.description?.identifier ?? "unknown"} did not contain all four water bones`);
    }
  }
  return output;
}

function updateManifestVersions(manifest) {
  manifest.header.version = [...version];
  for (const module of manifest.modules ?? []) module.version = [...version];
}

function customizeManifests(stageRoot) {
  const behaviorPath = path.join(stageRoot, "packs", "behavior", "manifest.json");
  const resourcePath = path.join(stageRoot, "packs", "resource", "manifest.json");
  const behavior = readJson(behaviorPath);
  const resource = readJson(resourcePath);
  const ids = {
    behaviorHeader: diagnosticUuid(`${label}:behavior:header`),
    behaviorData: diagnosticUuid(`${label}:behavior:data`),
    behaviorScript: diagnosticUuid(`${label}:behavior:script`),
    resourceHeader: diagnosticUuid(`${label}:resource:header`),
    resourceModule: diagnosticUuid(`${label}:resource:module`),
  };

  behavior.header.name = "Aspergillum 1.1.9c — Água translúcida por entidade";
  behavior.header.description = "Diagnóstico corrigido: entidade visual mínima e compatível com o schema 1.26.40.";
  behavior.header.uuid = ids.behaviorHeader;
  updateManifestVersions(behavior);
  const dataModule = behavior.modules.find((module) => module.type === "data");
  const scriptModule = behavior.modules.find((module) => module.type === "script");
  if (!dataModule || !scriptModule) throw new Error("Behavior manifest requires data and script modules");
  dataModule.uuid = ids.behaviorData;
  scriptModule.uuid = ids.behaviorScript;
  const resourceDependency = behavior.dependencies.find((dependency) => dependency.uuid);
  if (!resourceDependency) throw new Error("Behavior manifest requires a Resource Pack dependency");
  resourceDependency.uuid = ids.resourceHeader;
  resourceDependency.version = [...version];

  resource.header.name = "Aspergillum 1.1.9c — Água translúcida por entidade";
  resource.header.description = "Diagnóstico corrigido: superfície translúcida em passe próprio, sem materiais mistos no bloco.";
  resource.header.uuid = ids.resourceHeader;
  updateManifestVersions(resource);
  const resourceModule = resource.modules.find((module) => module.type === "resources");
  if (!resourceModule) throw new Error("Resource manifest requires a resources module");
  resourceModule.uuid = ids.resourceModule;

  writeJson(behaviorPath, behavior);
  writeJson(resourcePath, resource);
  return ids;
}

function copyEntityResources(stageRoot) {
  const behaviorPack = path.join(stageRoot, "packs", "behavior");
  const resourcePack = path.join(stageRoot, "packs", "resource");
  fs.mkdirSync(path.join(behaviorPack, "entities"), { recursive: true });
  fs.copyFileSync(
    path.join(sourceRoot, "behavior", "aspersorium_water_visual.entity.json"),
    path.join(behaviorPack, "entities", "aspersorium_water_visual.entity.json"),
  );
  const copies = [
    ["aspersorium_water_visual.entity.json", "entity", "aspersorium_water_visual.entity.json"],
    ["aspersorium_water_visual.geo.json", path.join("models", "entity"), "aspersorium_water_visual.geo.json"],
    ["aspersorium_water_visual.render_controllers.json", "render_controllers", "aspersorium_water_visual.render_controllers.json"],
  ];
  for (const [sourceName, directory, targetName] of copies) {
    const targetDirectory = path.join(resourcePack, directory);
    fs.mkdirSync(targetDirectory, { recursive: true });
    fs.copyFileSync(path.join(sourceRoot, "resource", sourceName), path.join(targetDirectory, targetName));
  }
  const textureDirectory = path.join(resourcePack, "textures", "entity");
  fs.mkdirSync(textureDirectory, { recursive: true });
  fs.copyFileSync(
    path.join(resourcePack, "textures", "blocks", "holy_water.png"),
    path.join(textureDirectory, "aspersorium_water_visual.png"),
  );
}

async function compileDiagnosticScript(stageRoot) {
  const outfile = path.join(stageRoot, "packs", "behavior", "scripts", "main.js");
  await esbuild({
    entryPoints: [path.join(root, "src", "bootstrap", "main.ts")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    external: ["@minecraft/server", "@minecraft/server-ui"],
    target: "es2022",
    outfile,
  });
  const script = fs.readFileSync(outfile, "utf8");
  if (!script.includes("aspergillum:aspersorium_water_visual")) {
    throw new Error("Diagnostic script does not contain the water visual lifecycle");
  }
}

function paintPixel(image, x, y, color) {
  const offset = (image.width * y + x) * 4;
  for (let channel = 0; channel < 4; channel += 1) image.data[offset + channel] = color[channel];
}

function badgePackIcon(iconPath) {
  if (!fs.existsSync(iconPath)) return;
  const image = PNG.sync.read(fs.readFileSync(iconPath));
  const color = [38, 154, 191, 255];
  const border = Math.max(6, Math.floor(image.width * 0.035));
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (x < border || y < border || x >= image.width - border || y >= image.height - border) {
        paintPixel(image, x, y, color);
      }
    }
  }
  const badgeSize = Math.floor(image.width * 0.25);
  const startX = image.width - badgeSize - border * 2;
  const startY = image.height - badgeSize - border * 2;
  for (let y = startY; y < startY + badgeSize; y += 1) {
    for (let x = startX; x < startX + badgeSize; x += 1) paintPixel(image, x, y, [19, 30, 36, 255]);
  }
  const inset = Math.floor(badgeSize * 0.2);
  for (let y = startY + inset; y < startY + badgeSize - inset; y += 1) {
    for (let x = startX + inset; x < startX + badgeSize - inset; x += 1) {
      const nx = (x - (startX + badgeSize / 2)) / (badgeSize * 0.3);
      const ny = (y - (startY + badgeSize * 0.58)) / (badgeSize * 0.38);
      if (nx * nx + ny * ny <= 1 && y >= startY + badgeSize * 0.32) paintPixel(image, x, y, color);
    }
  }
  fs.writeFileSync(iconPath, PNG.sync.write(image, { colorType: 6 }));
}

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(absolute) : [absolute];
    });
}

async function packageStage(stageRoot) {
  const outputPath = path.join(releases, `Aspergillum-${label}.mcaddon`);
  await createMcaddon({
    outputPath,
    behaviorPath: path.join(stageRoot, "packs", "behavior"),
    resourcePath: path.join(stageRoot, "packs", "resource"),
    behaviorRoot: `Aspergillum_${label}_BP`,
    resourceRoot: `Aspergillum_${label}_RP`,
    replace: process.argv.includes("--replace"),
  });
  const descriptor = publishArtifact({ projectRoot: root, artifactPath: outputPath, label, channel: "diagnostic", family: "entity-water-1.1.9", base: "1.1.7" });
  return { outputPath, bytes: descriptor.bytes, sha256: descriptor.sha256, descriptor };
}

function findFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return collectFiles(directory).filter(predicate);
}

function validateWaterVisualEntityDefinition(entityDefinition) {
  const entity = entityDefinition["minecraft:entity"];
  const description = entity?.description;
  if (description?.identifier !== "aspergillum:aspersorium_water_visual") {
    throw new Error("Water visual behavior entity has an unexpected identifier");
  }
  if (description.is_spawnable !== false) {
    throw new Error("Water visual must remain unavailable as a spawn egg");
  }
  if (description.is_summonable !== true) {
    throw new Error("Water visual must be summonable so Dimension.spawnEntity can instantiate it");
  }
  const components = entity.components ?? {};
  const allowedComponents = new Set([
    "minecraft:persistent",
    "minecraft:cannot_be_attacked",
    "minecraft:physics",
    "minecraft:collision_box",
  ]);
  const unexpected = Object.keys(components).filter((name) => !allowedComponents.has(name));
  if (unexpected.length > 0) {
    throw new Error(`Water visual contains nonessential or unsupported components: ${unexpected.join(", ")}`);
  }
  for (const name of allowedComponents) {
    if (!(name in components)) throw new Error(`Water visual is missing required component ${name}`);
  }
  if ("minecraft:pushable" in components) {
    throw new Error("Legacy minecraft:pushable is not parsed by entity formats >= 1.26.10");
  }
  if (
    components["minecraft:physics"].has_gravity !== false
    || components["minecraft:physics"].has_collision !== false
  ) {
    throw new Error("Water visual physics must disable gravity and collision");
  }
  if (
    components["minecraft:collision_box"].width !== 0
    || components["minecraft:collision_box"].height !== 0
  ) {
    throw new Error("Water visual collision box must remain zero-sized");
  }
}

function validateWithCreatorTools(addonPath) {
  const reportDirectory = path.join(root, "dist", "validation", label);
  if (!reportDirectory.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe report directory: ${reportDirectory}`);
  fs.rmSync(reportDirectory, { recursive: true, force: true });
  fs.mkdirSync(reportDirectory, { recursive: true });
  const result = spawnSync(
    process.execPath,
    [creatorToolsCli, "--input-file", addonPath, "--output-folder", reportDirectory, "--offline", "--yes", "validate"],
    { cwd: root, encoding: "utf8" },
  );
  const log = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  fs.writeFileSync(path.join(reportDirectory, "creator-tools.log"), log, "utf8");
  if (result.error) throw result.error;
  const csvFiles = findFiles(reportDirectory, (file) => file.toLowerCase().endsWith(".csv"));
  if (csvFiles.length === 0) throw new Error("Creator Tools did not produce a CSV report");
  const reportLines = csvFiles.flatMap((file) => fs.readFileSync(file, "utf8").split(/\r?\n/));
  const failures = reportLines.filter((line) => /,"?(?:Error|Failure)"?,/i.test(line));
  const warnings = reportLines.filter((line) => /,"?Warning"?,/i.test(line));
  const diagnosticWarnings = warnings.filter((line) => /aspersorium_water_visual|water_visual_level/i.test(line));
  if ((result.status ?? 1) !== 0 || failures.length > 0) {
    throw new Error(`Creator Tools rejected ${label}:\n${failures.join("\n")}\n${log}`);
  }
  if (diagnosticWarnings.length > 0) {
    throw new Error(`Creator Tools reported diagnostic-specific warnings for ${label}:\n${diagnosticWarnings.join("\n")}`);
  }
  return {
    reportDirectory: path.relative(root, reportDirectory).split(path.sep).join("/"),
    warnings: warnings.map((line) => line.trim()).filter(Boolean),
  };
}

function inspectStage(stageRoot) {
  const block = readJson(path.join(stageRoot, "packs", "behavior", "blocks", "aspersorium.block.json"));
  const groups = materialInstanceGroups(block);
  if (groups.some((instances) => "water" in instances)) throw new Error("Block still declares a water material instance");
  if (groups.some((instances) => Object.values(instances).some((instance) => instance.render_method !== "opaque"))) {
    throw new Error("Aspersorium block is not uniformly opaque");
  }
  const tick = block["minecraft:block"].components["minecraft:tick"];
  if (JSON.stringify(tick) !== JSON.stringify({ interval_range: [80, 120], looping: true })) {
    throw new Error("Aspersorium self-healing tick has an unexpected configuration");
  }
  let geometryCount = 0;
  for (const file of ["aspersorium.geo.json", "aspersorium.rotations.geo.json"]) {
    const definition = readJson(path.join(stageRoot, "packs", "resource", "models", "blocks", file));
    for (const geometry of definition["minecraft:geometry"] ?? []) {
      geometryCount += 1;
      if ((geometry.bones ?? []).some((bone) => waterBones.has(bone.name))) {
        throw new Error(`${geometry.description?.identifier} still contains block water bones`);
      }
    }
  }
  const entity = readJson(path.join(stageRoot, "packs", "behavior", "entities", "aspersorium_water_visual.entity.json"));
  validateWaterVisualEntityDefinition(entity);
  const property = entity["minecraft:entity"].description.properties["aspergillum:water_visual_level"];
  if (property.client_sync !== true || JSON.stringify(property.range) !== "[1,4]") {
    throw new Error("Water visual property is not client-synchronized over levels 1..4");
  }
  const client = readJson(path.join(stageRoot, "packs", "resource", "entity", "aspersorium_water_visual.entity.json"));
  if (client["minecraft:client_entity"].description.materials.default !== "entity_alphablend") {
    throw new Error("Water visual does not use the built-in entity_alphablend material");
  }
  return { geometryCount, materialGroupCount: groups.length, tickInterval: [80, 120] };
}

async function buildDiagnostic() {
  if (!stagingRoot.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe staging directory: ${stagingRoot}`);
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  fs.cpSync(path.join(root, "packs"), path.join(stage, "packs"), { recursive: true });

  const blockPath = path.join(stage, "packs", "behavior", "blocks", "aspersorium.block.json");
  writeJson(blockPath, makeAspersoriumOpaque(readJson(blockPath)));
  for (const file of ["aspersorium.geo.json", "aspersorium.rotations.geo.json"]) {
    const geometryPath = path.join(stage, "packs", "resource", "models", "blocks", file);
    writeJson(geometryPath, removeBlockWaterBones(readJson(geometryPath)));
  }
  copyEntityResources(stage);
  await compileDiagnosticScript(stage);
  const uuids = customizeManifests(stage);
  badgePackIcon(path.join(stage, "packs", "behavior", "pack_icon.png"));
  badgePackIcon(path.join(stage, "packs", "resource", "pack_icon.png"));
  const inspection = inspectStage(stage);
  const artifact = await packageStage(stage);
  const creatorTools = validateWithCreatorTools(artifact.outputPath);
  fs.mkdirSync(diagnosticRoot, { recursive: true });
  const summary = {
    label,
    numericVersion: version,
    baseline: "1.1.7",
    architecture: "opaque aspersorium block plus persistent entity_alphablend water visual",
    artifact: path.relative(root, artifact.outputPath).split(path.sep).join("/"),
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    entity: "aspergillum:aspersorium_water_visual",
    clientMaterial: "entity_alphablend",
    gameplayAuthority: "aspergillum block states water_base + water_offset",
    reconciliation: {
      immediate: ["block place", "block state change", "block break", "entity load"],
      selfHealingBlockTick: [80, 120],
      duplicatePolicy: "keep the lexicographically first entity id and remove the rest",
    },
    inspection,
    uuids,
    creatorTools,
  };
  writeJson(path.join(diagnosticRoot, `${label}.json`), summary);
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  console.log(`Created ${summary.artifact} (${summary.bytes} bytes, ${creatorTools.warnings.length} Creator Tools warnings)`);
  console.log(`SHA-256 ${summary.sha256}`);
  return summary;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) await buildDiagnostic();

export {
  buildDiagnostic,
  diagnosticUuid,
  inspectStage,
  makeAspersoriumOpaque,
  removeBlockWaterBones,
  validateWaterVisualEntityDefinition,
  version,
};
