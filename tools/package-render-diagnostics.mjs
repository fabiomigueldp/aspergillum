import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import { createMcaddon, publishArtifact } from "./release/artifact-core.mjs";
import { assertDiagnosticVariants } from "./release/release-registry.mjs";

const root = path.resolve(import.meta.dirname, "..");
const releases = path.join(root, "dist", "releases");
const diagnosticRoot = path.join(root, "dist", "diagnostics", "render-pipeline-1.1.7");
const stagingRoot = path.join(diagnosticRoot, ".staging");
const creatorToolsCli = path.join(root, "node_modules", "@minecraft", "creator-tools", "cli", "index.mjs");
const canonicalModelPath = path.join(root, "assets-src", "models", "aspergillum.model.json");
const UUID_NAMESPACE = "a72be6bc-6bd7-53ca-bc24-33ad095cf132";
const HEAD_STAGE_NAMES = [
  "lower_head_ring",
  "lower_head_dome",
  "perforated_head",
  "upper_head_dome",
  "upper_head_ring",
  "top_finial",
];
const LATERAL_FACES = ["north", "east", "south", "west"];
const CAP_THICKNESS = 0.01;

const variants = [
  {
    id: "a",
    label: "1.1.7a",
    version: [1, 1, 7],
    title: "Diagnóstico A — totalmente opaco",
    materialProfile: "opaque",
    geometryProfile: "baseline-1.1.6",
    badgeColor: [123, 60, 40, 255],
  },
  {
    id: "b",
    label: "1.1.7b",
    version: [1, 1, 8],
    title: "Diagnóstico B — estrutura opaca e água blend",
    materialProfile: "split",
    geometryProfile: "baseline-1.1.6",
    badgeColor: [41, 84, 125, 255],
  },
  {
    id: "c",
    label: "1.1.7c",
    version: [1, 1, 9],
    title: "Diagnóstico C — blend e topologia exterior",
    materialProfile: "blend",
    geometryProfile: "exterior-shell",
    badgeColor: [42, 103, 76, 255],
  },
];
assertDiagnosticVariants("render-pipeline-1.1.7", variants);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function approximatelyEqual(left, right, tolerance = 0.000001) {
  return Math.abs(left - right) <= tolerance;
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

function buildCapBars(lower, upper, seamIndex) {
  const lowerTop = lower.origin[1] + lower.size[1];
  if (!approximatelyEqual(lowerTop, upper.origin[1])) {
    throw new Error(`Head stages ${lower.name}/${upper.name} do not meet at one horizontal seam`);
  }
  if (!approximatelyEqual(lower.size[0], lower.size[2]) || !approximatelyEqual(upper.size[0], upper.size[2])) {
    throw new Error(`Head stages ${lower.name}/${upper.name} must remain square`);
  }

  const lowerCenter = [lower.origin[0] + lower.size[0] / 2, lower.origin[2] + lower.size[2] / 2];
  const upperCenter = [upper.origin[0] + upper.size[0] / 2, upper.origin[2] + upper.size[2] / 2];
  if (!approximatelyEqual(lowerCenter[0], upperCenter[0]) || !approximatelyEqual(lowerCenter[1], upperCenter[1])) {
    throw new Error(`Head stages ${lower.name}/${upper.name} must remain concentric`);
  }
  if (approximatelyEqual(lower.size[0], upper.size[0])) {
    throw new Error(`Head stages ${lower.name}/${upper.name} require a visible width transition`);
  }

  const lowerIsOuter = lower.size[0] > upper.size[0];
  const outer = lowerIsOuter ? lower : upper;
  const inner = lowerIsOuter ? upper : lower;
  const face = lowerIsOuter ? "up" : "down";
  const planeY = round(lowerTop);
  const originY = face === "up" ? round(planeY - CAP_THICKNESS) : planeY;
  const outerMinX = outer.origin[0];
  const outerMinZ = outer.origin[2];
  const outerMaxX = outer.origin[0] + outer.size[0];
  const outerMaxZ = outer.origin[2] + outer.size[2];
  const innerMinX = inner.origin[0];
  const innerMinZ = inner.origin[2];
  const innerMaxX = inner.origin[0] + inner.size[0];
  const innerMaxZ = inner.origin[2] + inner.size[2];
  const prefix = `diagnostic_seam_${seamIndex + 1}_${face}`;

  const bars = [
    {
      name: `${prefix}_north`,
      origin: [outerMinX, originY, outerMinZ],
      size: [outerMaxX - outerMinX, CAP_THICKNESS, innerMinZ - outerMinZ],
    },
    {
      name: `${prefix}_south`,
      origin: [outerMinX, originY, innerMaxZ],
      size: [outerMaxX - outerMinX, CAP_THICKNESS, outerMaxZ - innerMaxZ],
    },
    {
      name: `${prefix}_west`,
      origin: [outerMinX, originY, innerMinZ],
      size: [innerMinX - outerMinX, CAP_THICKNESS, innerMaxZ - innerMinZ],
    },
    {
      name: `${prefix}_east`,
      origin: [innerMaxX, originY, innerMinZ],
      size: [outerMaxX - innerMaxX, CAP_THICKNESS, innerMaxZ - innerMinZ],
    },
  ];

  return bars.map((bar) => {
    if (bar.size.some((dimension) => dimension <= 0)) {
      throw new Error(`Diagnostic cap ${bar.name} has a non-positive dimension`);
    }
    return {
      ...bar,
      origin: bar.origin.map(round),
      size: bar.size.map(round),
      surface: outer.surface,
      faces: [face],
    };
  });
}

function buildExteriorShellModel(source) {
  const output = structuredClone(source);
  const bones = output["minecraft:geometry"]?.[0]?.bones ?? [];
  const head = bones.find((bone) => bone.name === "sprinkler_head");
  if (!head) throw new Error("Canonical model is missing sprinkler_head");
  const stageMap = new Map((head.cubes ?? []).map((cube) => [cube.name, cube]));
  const stages = HEAD_STAGE_NAMES.map((name) => {
    const cube = stageMap.get(name);
    if (!cube) throw new Error(`Canonical model is missing ${name}`);
    return structuredClone(cube);
  });
  if ((head.cubes ?? []).length !== HEAD_STAGE_NAMES.length) {
    throw new Error("Exterior-shell diagnostic requires the six-volume 1.1.6 head as its baseline");
  }

  const walls = stages.map((cube, index) => ({
    ...cube,
    faces: [
      ...LATERAL_FACES,
      ...(index === 0 ? ["down"] : []),
      ...(index === stages.length - 1 ? ["up"] : []),
    ],
  }));
  const caps = stages.slice(0, -1).flatMap((lower, index) => buildCapBars(lower, stages[index + 1], index));
  head.cubes = [...walls, ...caps];
  if (head.cubes.length !== 26 || caps.length !== 20) {
    throw new Error(`Exterior-shell diagnostic expected 26 head cubes and 20 cap bars, got ${head.cubes.length}/${caps.length}`);
  }
  return output;
}

function materialInstanceGroups(blockDefinition) {
  const block = blockDefinition["minecraft:block"];
  if (!block) throw new Error("Aspersorium block definition is missing minecraft:block");
  return [
    block.components?.["minecraft:material_instances"],
    ...(block.permutations ?? []).map((permutation) => permutation.components?.["minecraft:material_instances"]),
  ].filter(Boolean);
}

function applyMaterialProfile(blockDefinition, profile) {
  if (!["opaque", "split", "blend"].includes(profile)) throw new Error(`Unknown material profile: ${profile}`);
  for (const instances of materialInstanceGroups(blockDefinition)) {
    for (const [key, instance] of Object.entries(instances)) {
      instance.render_method = profile === "split"
        ? key === "water" ? "blend" : "opaque"
        : profile;
    }
  }
  return blockDefinition;
}

function materialMethods(blockDefinition) {
  return materialInstanceGroups(blockDefinition).map((instances) => Object.fromEntries(
    Object.entries(instances).map(([key, instance]) => [key, instance.render_method]),
  ));
}

function updateManifestVersions(manifest, version) {
  manifest.header.version = [...version];
  for (const module of manifest.modules ?? []) module.version = [...version];
}

function customizeManifests(stage, variant) {
  const behaviorPath = path.join(stage, "packs", "behavior", "manifest.json");
  const resourcePath = path.join(stage, "packs", "resource", "manifest.json");
  const behavior = readJson(behaviorPath);
  const resource = readJson(resourcePath);
  const ids = {
    behaviorHeader: diagnosticUuid(`${variant.label}:behavior:header`),
    behaviorData: diagnosticUuid(`${variant.label}:behavior:data`),
    behaviorScript: diagnosticUuid(`${variant.label}:behavior:script`),
    resourceHeader: diagnosticUuid(`${variant.label}:resource:header`),
    resourceModule: diagnosticUuid(`${variant.label}:resource:module`),
  };

  behavior.header.name = `Aspergillum ${variant.label} — ${variant.title}`;
  behavior.header.description = "Pacote diagnóstico isolado. Ative somente uma variante 1.1.7 por mundo.";
  behavior.header.uuid = ids.behaviorHeader;
  updateManifestVersions(behavior, variant.version);
  const dataModule = behavior.modules.find((module) => module.type === "data");
  const scriptModule = behavior.modules.find((module) => module.type === "script");
  if (!dataModule || !scriptModule) throw new Error("Behavior manifest requires data and script modules");
  dataModule.uuid = ids.behaviorData;
  scriptModule.uuid = ids.behaviorScript;
  const resourceDependency = behavior.dependencies.find((dependency) => dependency.uuid);
  if (!resourceDependency) throw new Error("Behavior manifest requires a Resource Pack dependency");
  resourceDependency.uuid = ids.resourceHeader;
  resourceDependency.version = [...variant.version];

  resource.header.name = `Aspergillum ${variant.label} — ${variant.title}`;
  resource.header.description = "Pacote diagnóstico isolado. Ative somente uma variante 1.1.7 por mundo.";
  resource.header.uuid = ids.resourceHeader;
  updateManifestVersions(resource, variant.version);
  const resourceModule = resource.modules.find((module) => module.type === "resources");
  if (!resourceModule) throw new Error("Resource manifest requires a resources module");
  resourceModule.uuid = ids.resourceModule;

  writeJson(behaviorPath, behavior);
  writeJson(resourcePath, resource);
  return ids;
}

const LETTERS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
};

function paintPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (image.width * y + x) * 4;
  for (let channel = 0; channel < 4; channel += 1) image.data[offset + channel] = color[channel];
}

function badgePackIcon(iconPath, letter, color) {
  if (!fs.existsSync(iconPath)) return;
  const image = PNG.sync.read(fs.readFileSync(iconPath));
  const border = Math.max(6, Math.floor(image.width * 0.035));
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (x < border || y < border || x >= image.width - border || y >= image.height - border) {
        paintPixel(image, x, y, color);
      }
    }
  }
  const glyph = LETTERS[letter];
  const scale = Math.max(6, Math.floor(image.width / 18));
  const badgeWidth = scale * 7;
  const badgeHeight = scale * 9;
  const badgeX = image.width - badgeWidth - border * 2;
  const badgeY = image.height - badgeHeight - border * 2;
  for (let y = badgeY; y < badgeY + badgeHeight; y += 1) {
    for (let x = badgeX; x < badgeX + badgeWidth; x += 1) paintPixel(image, x, y, [24, 24, 24, 255]);
  }
  for (let row = 0; row < glyph.length; row += 1) {
    for (let column = 0; column < glyph[row].length; column += 1) {
      if (glyph[row][column] !== "1") continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          paintPixel(image, badgeX + scale + column * scale + dx, badgeY + scale + row * scale + dy, color);
        }
      }
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

async function packageStage(stage, variant) {
  const outputPath = path.join(releases, `Aspergillum-${variant.label}.mcaddon`);
  await createMcaddon({
    outputPath,
    behaviorPath: path.join(stage, "packs", "behavior"),
    resourcePath: path.join(stage, "packs", "resource"),
    behaviorRoot: `Aspergillum_${variant.label}_BP`,
    resourceRoot: `Aspergillum_${variant.label}_RP`,
    replace: process.argv.includes("--replace"),
  });
  const descriptor = publishArtifact({ projectRoot: root, artifactPath: outputPath, label: variant.label, channel: "diagnostic", family: "render-pipeline-1.1.7", base: "1.1.6" });
  return { outputPath, bytes: descriptor.bytes, sha256: descriptor.sha256, descriptor };
}

function findFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return collectFiles(directory).filter(predicate);
}

function validateWithCreatorTools(addonPath, variant) {
  const reportDirectory = path.join(root, "dist", "validation", variant.label);
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
  if (csvFiles.length === 0) throw new Error(`Creator Tools did not produce a CSV report for ${variant.label}`);
  const reportLines = csvFiles.flatMap((file) => fs.readFileSync(file, "utf8").split(/\r?\n/));
  const failures = reportLines.filter((line) => /,"?(?:Error|Failure)"?,/i.test(line));
  const warnings = reportLines.filter((line) => /,"?Warning"?,/i.test(line));
  if ((result.status ?? 1) !== 0 || failures.length > 0) {
    throw new Error(`Creator Tools rejected ${variant.label}:\n${failures.join("\n")}\n${log}`);
  }
  return {
    reportDirectory: path.relative(root, reportDirectory).split(path.sep).join("/"),
    warnings: warnings.map((line) => line.trim()).filter(Boolean),
  };
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function changedPackFiles(stage) {
  const changed = [];
  for (const kind of ["behavior", "resource"]) {
    const base = path.join(root, "packs", kind);
    const candidate = path.join(stage, "packs", kind);
    const relativeFiles = new Set([
      ...collectFiles(base).map((file) => path.relative(base, file)),
      ...collectFiles(candidate).map((file) => path.relative(candidate, file)),
    ]);
    for (const relative of [...relativeFiles].sort()) {
      const baseFile = path.join(base, relative);
      const candidateFile = path.join(candidate, relative);
      if (!fs.existsSync(baseFile) || !fs.existsSync(candidateFile) || hashFile(baseFile) !== hashFile(candidateFile)) {
        changed.push(`${kind}/${relative.split(path.sep).join("/")}`);
      }
    }
  }
  return changed;
}

function inspectHead(stage) {
  const geometry = readJson(path.join(stage, "packs", "resource", "models", "entity", "aspergillum.geo.json"));
  const head = geometry["minecraft:geometry"]?.[0]?.bones?.find((bone) => bone.name === "sprinkler_head");
  if (!head) throw new Error("Generated diagnostic geometry is missing sprinkler_head");
  const cubes = head.cubes ?? [];
  return {
    cubeCount: cubes.length,
    horizontalFaceCount: cubes.reduce((total, cube) => total + Number(Boolean(cube.uv?.up)) + Number(Boolean(cube.uv?.down)), 0),
    lateralFaceCount: cubes.reduce(
      (total, cube) => total + LATERAL_FACES.reduce((subtotal, face) => subtotal + Number(Boolean(cube.uv?.[face])), 0),
      0,
    ),
  };
}

function generateExteriorShellStage(stage) {
  const diagnosticSource = path.join(stage, "diagnostic-sources", "aspergillum-exterior-shell.model.json");
  writeJson(diagnosticSource, buildExteriorShellModel(readJson(canonicalModelPath)));
  const result = spawnSync(process.execPath, [path.join(root, "tools", "generate-assets.mjs")], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ASPERGILLUM_GENERATED_ROOT: stage,
      ASPERGILLUM_MODEL_SOURCE: diagnosticSource,
    },
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Exterior-shell asset generation failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
}

async function buildVariant(variant) {
  const stage = path.join(stagingRoot, variant.label);
  fs.mkdirSync(stage, { recursive: true });
  fs.cpSync(path.join(root, "packs"), path.join(stage, "packs"), { recursive: true });
  if (variant.geometryProfile === "exterior-shell") generateExteriorShellStage(stage);

  const blockPath = path.join(stage, "packs", "behavior", "blocks", "aspersorium.block.json");
  const block = applyMaterialProfile(readJson(blockPath), variant.materialProfile);
  writeJson(blockPath, block);
  const ids = customizeManifests(stage, variant);
  badgePackIcon(path.join(stage, "packs", "behavior", "pack_icon.png"), variant.id.toUpperCase(), variant.badgeColor);
  badgePackIcon(path.join(stage, "packs", "resource", "pack_icon.png"), variant.id.toUpperCase(), variant.badgeColor);

  const head = inspectHead(stage);
  const expectedHeadCubes = variant.geometryProfile === "exterior-shell" ? 26 : 6;
  if (head.cubeCount !== expectedHeadCubes) {
    throw new Error(`${variant.label} expected ${expectedHeadCubes} head cubes, got ${head.cubeCount}`);
  }
  const baseScript = path.join(root, "packs", "behavior", "scripts", "main.js");
  const stagedScript = path.join(stage, "packs", "behavior", "scripts", "main.js");
  if (hashFile(baseScript) !== hashFile(stagedScript)) throw new Error(`${variant.label} changed the gameplay script`);
  const waterTexture = path.join(stage, "packs", "resource", "textures", "blocks", "holy_water.png");
  const baseWaterTexture = path.join(root, "packs", "resource", "textures", "blocks", "holy_water.png");
  if (hashFile(waterTexture) !== hashFile(baseWaterTexture)) throw new Error(`${variant.label} changed the holy-water texture`);

  const artifact = await packageStage(stage, variant);
  const creatorTools = validateWithCreatorTools(artifact.outputPath, variant);
  const summary = {
    label: variant.label,
    numericVersion: variant.version,
    title: variant.title,
    artifact: path.relative(root, artifact.outputPath).split(path.sep).join("/"),
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    materialProfile: variant.materialProfile,
    materialMethods: materialMethods(block),
    geometryProfile: variant.geometryProfile,
    head,
    uuids: ids,
    gameplayScriptSha256: hashFile(stagedScript),
    holyWaterTextureSha256: hashFile(waterTexture),
    changedFilesFromBaseline: changedPackFiles(stage),
    creatorTools,
  };
  writeJson(path.join(diagnosticRoot, `${variant.label}.json`), summary);
  console.log(`Created ${summary.artifact} (${summary.bytes} bytes, ${creatorTools.warnings.length} Creator Tools warnings)`);
  console.log(`SHA-256 ${summary.sha256}`);
  return summary;
}

async function main() {
  if (!fs.existsSync(path.join(root, "packs", "behavior", "scripts", "main.js"))) {
    throw new Error("Build the baseline packs before packaging diagnostics (npm run build)");
  }
  fs.mkdirSync(diagnosticRoot, { recursive: true });
  if (!stagingRoot.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe staging directory: ${stagingRoot}`);
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  const summaries = [];
  for (const variant of variants) summaries.push(await buildVariant(variant));
  const allUuids = summaries.flatMap((summary) => Object.values(summary.uuids));
  if (new Set(allUuids).size !== allUuids.length) throw new Error("Diagnostic UUIDs are not globally unique");
  if (new Set(summaries.map((summary) => summary.gameplayScriptSha256)).size !== 1) {
    throw new Error("Diagnostic packages do not share one gameplay script");
  }
  if (new Set(summaries.map((summary) => summary.holyWaterTextureSha256)).size !== 1) {
    throw new Error("Diagnostic packages do not share one holy-water texture");
  }
  writeJson(path.join(diagnosticRoot, "manifest.json"), {
    diagnosticFamily: "Aspergillum render-pipeline matrix 1.1.7",
    baseline: "1.1.6",
    generatedAt: new Date().toISOString(),
    activationRule: "Use one diagnostic pair per world; public item and block identifiers intentionally remain unchanged.",
    variants: summaries,
  });
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  console.log(`Diagnostic manifest: ${path.relative(root, path.join(diagnosticRoot, "manifest.json"))}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) await main();

export {
  applyMaterialProfile,
  buildExteriorShellModel,
  diagnosticUuid,
  materialMethods,
  variants,
};
