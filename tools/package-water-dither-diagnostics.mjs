import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import archiver from "archiver";
import { PNG } from "pngjs";
import { diagnosticUuid } from "./package-render-diagnostics.mjs";

const root = path.resolve(import.meta.dirname, "..");
const releases = path.join(root, "dist", "releases");
const diagnosticRoot = path.join(root, "dist", "diagnostics", "water-dither-1.1.8");
const stagingRoot = path.join(diagnosticRoot, ".staging");
const creatorToolsCli = path.join(root, "node_modules", "@minecraft", "creator-tools", "cli", "index.mjs");
const archiveDate = new Date("2000-01-01T00:00:00.000Z");
const renderMethod = "alpha_test_single_sided_to_opaque";
const waterBoneNames = ["water_low", "water_mid", "water_high", "water_full"];
const maskSize = 16;
const legacyTextureSize = 32;
const geometryAtlasSize = 256;

const variants = [
  {
    id: "a",
    label: "1.1.8a",
    version: [1, 1, 11],
    title: "Água dither 75%",
    coverageNumerator: 12,
    badgeColor: [39, 107, 132, 255],
  },
  {
    id: "b",
    label: "1.1.8b",
    version: [1, 1, 12],
    title: "Água dither 81%",
    coverageNumerator: 13,
    badgeColor: [42, 122, 146, 255],
  },
  {
    id: "c",
    label: "1.1.8c",
    version: [1, 1, 13],
    title: "Água dither 88%",
    coverageNumerator: 14,
    badgeColor: [51, 139, 156, 255],
  },
  {
    id: "d",
    label: "1.1.8d",
    version: [1, 1, 14],
    title: "Água dither 81% — UV corrigido",
    coverageNumerator: 13,
    textureSize: geometryAtlasSize,
    uvOffset: [8, 8],
    alignMaskToUv: true,
    expectedSampleSize: [maskSize, maskSize],
    badgeColor: [45, 123, 164, 255],
  },
].map((variant) => ({
  ...variant,
  textureSize: variant.textureSize ?? legacyTextureSize,
  uvOffset: variant.uvOffset ?? [0, 0],
  expectedSampleSize: variant.expectedSampleSize ?? [2, 2],
  coverage: variant.coverageNumerator / 16,
  visiblePixels: maskSize * maskSize * variant.coverageNumerator / 16,
}));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function spatialHash(x, y, seed = 0) {
  let value = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + 0x7f4a7c15, 0xc2b2ae35) ^ seed;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
}

function toroidalDistanceSquared(left, right, size) {
  const rawX = Math.abs(left.x - right.x);
  const rawY = Math.abs(left.y - right.y);
  const dx = Math.min(rawX, size - rawX);
  const dy = Math.min(rawY, size - rawY);
  return dx * dx + dy * dy;
}

function buildDispersedHoleOrder(size = maskSize) {
  if (size % 2 !== 0) throw new Error("The dispersed water mask requires an even size");
  const cellSize = 2;
  const cellsPerAxis = size / cellSize;
  const candidates = Array.from({ length: cellsPerAxis * cellsPerAxis }, (_, index) => ({
    x: index % cellsPerAxis,
    y: Math.floor(index / cellsPerAxis),
  }));
  const selectedCells = [];
  const selectedKeys = new Set();
  while (selectedCells.length < candidates.length) {
    let best;
    let bestDistance = -1;
    let bestTie = -1;
    for (const candidate of candidates) {
      const key = `${candidate.x},${candidate.y}`;
      if (selectedKeys.has(key)) continue;
      const distance = selectedCells.length === 0
        ? Number.POSITIVE_INFINITY
        : Math.min(...selectedCells.map((point) => toroidalDistanceSquared(candidate, point, cellsPerAxis)));
      const tie = spatialHash(candidate.x, candidate.y, 0x118b);
      if (distance > bestDistance || (distance === bestDistance && tie > bestTie)) {
        best = candidate;
        bestDistance = distance;
        bestTie = tie;
      }
    }
    selectedCells.push(best);
    selectedKeys.add(`${best.x},${best.y}`);
  }
  return selectedCells.map((cell) => {
    const jitterIndex = Math.floor(spatialHash(cell.x, cell.y, 0xd17e) * 4);
    return {
      x: cell.x * cellSize + jitterIndex % cellSize,
      y: cell.y * cellSize + Math.floor(jitterIndex / cellSize),
    };
  });
}

const dispersedHoleOrder = buildDispersedHoleOrder();

function buildCoverageMask(coverage) {
  const visiblePixels = Math.round(maskSize * maskSize * coverage);
  const transparentPixels = maskSize * maskSize - visiblePixels;
  const holes = new Set(dispersedHoleOrder.slice(0, transparentPixels).map(({ x, y }) => `${x},${y}`));
  return Array.from({ length: maskSize }, (_, y) => Array.from(
    { length: maskSize },
    (_, x) => !holes.has(`${x},${y}`),
  ));
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function waterColor(x, y, period = legacyTextureSize) {
  const wave = Math.sin((x + y) * 0.7) * 9 + (spatialHash(x, y, 31) - 0.5) * 10;
  const highlight = y === (x * 3 + 5) % period ? 34 : 0;
  return [
    clampByte(56 + wave + highlight * 0.55),
    clampByte(151 + wave + highlight * 0.85),
    clampByte(190 + wave + highlight),
  ];
}

function buildWaterTexture(coverage, options = {}) {
  const outputTextureSize = options.textureSize ?? legacyTextureSize;
  const uvOffset = options.uvOffset ?? [0, 0];
  const alignMaskToUv = options.alignMaskToUv ?? false;
  const mask = buildCoverageMask(coverage);
  const image = new PNG({ width: outputTextureSize, height: outputTextureSize, colorType: 6 });
  for (let y = 0; y < outputTextureSize; y += 1) {
    for (let x = 0; x < outputTextureSize; x += 1) {
      const offset = (y * outputTextureSize + x) * 4;
      const maskX = alignMaskToUv ? positiveModulo(x - uvOffset[0], maskSize) : x % maskSize;
      const maskY = alignMaskToUv ? positiveModulo(y - uvOffset[1], maskSize) : y % maskSize;
      const colorX = alignMaskToUv ? maskX : x;
      const colorY = alignMaskToUv ? maskY : y;
      const [red, green, blue] = waterColor(colorX, colorY, alignMaskToUv ? maskSize : legacyTextureSize);
      image.data[offset] = red;
      image.data[offset + 1] = green;
      image.data[offset + 2] = blue;
      image.data[offset + 3] = mask[maskY][maskX] ? 255 : 0;
    }
  }
  return { image, mask };
}

function effectiveSampledTexels(uvSize, materialTextureSize, declaredGeometryTextureSize) {
  return [0, 1].map((axis) => uvSize[axis] * materialTextureSize[axis] / declaredGeometryTextureSize[axis]);
}

function materialInstanceGroups(blockDefinition) {
  const block = blockDefinition["minecraft:block"];
  if (!block) throw new Error("Aspersorium block definition is missing minecraft:block");
  return [
    block.components?.["minecraft:material_instances"],
    ...(block.permutations ?? []).map((permutation) => permutation.components?.["minecraft:material_instances"]),
  ].filter(Boolean);
}

function applyUniformAlphaTest(blockDefinition) {
  for (const instances of materialInstanceGroups(blockDefinition)) {
    for (const instance of Object.values(instances)) instance.render_method = renderMethod;
  }
  return blockDefinition;
}

function materialMethods(blockDefinition) {
  return materialInstanceGroups(blockDefinition).map((instances) => Object.fromEntries(
    Object.entries(instances).map(([key, instance]) => [key, instance.render_method]),
  ));
}

function simplifyWaterGeometry(geometryDefinition, options = {}) {
  const uvOffset = options.uvOffset ?? [0, 0];
  const output = structuredClone(geometryDefinition);
  const geometries = output["minecraft:geometry"] ?? [];
  if (geometries.length === 0) throw new Error("Aspersorium geometry file contains no geometries");
  for (const geometry of geometries) {
    const bones = geometry.bones ?? [];
    for (const boneName of waterBoneNames) {
      const bone = bones.find((candidate) => candidate.name === boneName);
      if (!bone || bone.cubes?.length !== 1) {
        throw new Error(`${geometry.description?.identifier ?? "unknown geometry"} requires one cube in ${boneName}`);
      }
      const cube = bone.cubes[0];
      const up = cube.uv?.up;
      if (!up || up.material_instance !== "water") {
        throw new Error(`${geometry.description?.identifier ?? "unknown geometry"}/${boneName} lacks its canonical water top`);
      }
      cube.uv = {
        up: {
          uv: [...uvOffset],
          uv_size: [maskSize, maskSize],
          material_instance: "water",
        },
      };
    }
  }
  return output;
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
  behavior.header.description = "Diagnóstico isolado de água alpha-test. Ative somente uma variante 1.1.8 por mundo.";
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
  resource.header.description = "Diagnóstico isolado de água alpha-test. Ative somente uma variante 1.1.8 por mundo.";
  resource.header.uuid = ids.resourceHeader;
  updateManifestVersions(resource, variant.version);
  const resourceModule = resource.modules.find((module) => module.type === "resources");
  if (!resourceModule) throw new Error("Resource manifest requires a resources module");
  resourceModule.uuid = ids.resourceModule;

  writeJson(behaviorPath, behavior);
  writeJson(resourcePath, resource);
  return ids;
}

const letters = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
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
  const glyph = letters[letter];
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

function appendPack(archive, source, destination) {
  for (const file of collectFiles(source)) {
    const relative = path.relative(source, file).split(path.sep).join("/");
    archive.append(fs.readFileSync(file), {
      name: `${destination}/${relative}`,
      date: archiveDate,
      mode: 0o644,
    });
  }
}

async function packageStage(stage, variant) {
  fs.mkdirSync(releases, { recursive: true });
  const outputPath = path.join(releases, `Aspergillum-${variant.label}.mcaddon`);
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", reject);
    archive.on("error", reject);
    archive.pipe(output);
    appendPack(archive, path.join(stage, "packs", "behavior"), `Aspergillum_${variant.label}_BP`);
    appendPack(archive, path.join(stage, "packs", "resource"), `Aspergillum_${variant.label}_RP`);
    archive.finalize();
  });
  const bytes = fs.readFileSync(outputPath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  fs.writeFileSync(`${outputPath}.sha256`, `${sha256}  ${path.basename(outputPath)}\n`, "utf8");
  return { outputPath, bytes: bytes.length, sha256 };
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

function rewriteWaterGeometry(stage, variant) {
  const relativePaths = [
    path.join("models", "blocks", "aspersorium.geo.json"),
    path.join("models", "blocks", "aspersorium.rotations.geo.json"),
  ];
  for (const relativePath of relativePaths) {
    const filePath = path.join(stage, "packs", "resource", relativePath);
    writeJson(filePath, simplifyWaterGeometry(readJson(filePath), { uvOffset: variant.uvOffset }));
  }
}

function inspectWaterGeometry(stage, variant, waterTexturePath) {
  const files = ["aspersorium.geo.json", "aspersorium.rotations.geo.json"];
  const waterTexture = PNG.sync.read(fs.readFileSync(waterTexturePath));
  const materialTextureSize = [waterTexture.width, waterTexture.height];
  let geometryCount = 0;
  let waterSurfaceCount = 0;
  const sampledSizes = new Set();
  for (const file of files) {
    const definition = readJson(path.join(stage, "packs", "resource", "models", "blocks", file));
    for (const geometry of definition["minecraft:geometry"] ?? []) {
      geometryCount += 1;
      const declaredTextureSize = [geometry.description?.texture_width, geometry.description?.texture_height];
      if (!declaredTextureSize.every((dimension) => Number.isInteger(dimension) && dimension > 0)) {
        throw new Error(`${geometry.description?.identifier} has an invalid declared texture atlas`);
      }
      if (declaredTextureSize[0] !== geometryAtlasSize || declaredTextureSize[1] !== geometryAtlasSize) {
        throw new Error(`${geometry.description?.identifier} no longer uses the canonical 256x256 atlas`);
      }
      for (const name of waterBoneNames) {
        const bone = geometry.bones?.find((candidate) => candidate.name === name);
        const faces = Object.keys(bone?.cubes?.[0]?.uv ?? {});
        if (faces.length !== 1 || faces[0] !== "up") {
          throw new Error(`${geometry.description?.identifier}/${name} is not a top-only surface`);
        }
        const uvSize = bone.cubes[0].uv.up.uv_size;
        if (uvSize[0] !== maskSize || uvSize[1] !== maskSize) {
          throw new Error(`${geometry.description?.identifier}/${name} does not use the ${maskSize}x${maskSize} mask`);
        }
        const uv = bone.cubes[0].uv.up.uv;
        if (uv[0] !== variant.uvOffset[0] || uv[1] !== variant.uvOffset[1]) {
          throw new Error(`${geometry.description?.identifier}/${name} has an unexpected UV origin`);
        }
        const sampledTexels = effectiveSampledTexels(uvSize, materialTextureSize, declaredTextureSize);
        sampledSizes.add(sampledTexels.join("x"));
        if (sampledTexels[0] !== variant.expectedSampleSize[0] || sampledTexels[1] !== variant.expectedSampleSize[1]) {
          throw new Error(
            `${geometry.description?.identifier}/${name} samples ${sampledTexels.join("x")} physical texels; `
            + `expected ${variant.expectedSampleSize.join("x")}`,
          );
        }
        waterSurfaceCount += 1;
      }
    }
  }
  if (sampledSizes.size !== 1) throw new Error(`Water geometries disagree on effective sampling: ${[...sampledSizes].join(", ")}`);
  return {
    geometryCount,
    waterSurfaceCount,
    facesPerSurface: 1,
    uv: [...variant.uvOffset],
    uvSize: [maskSize, maskSize],
    declaredGeometryTextureSize: [geometryAtlasSize, geometryAtlasSize],
    materialTextureSize,
    effectiveSampledTexels: [...variant.expectedSampleSize],
  };
}

async function buildVariant(variant) {
  const stage = path.join(stagingRoot, variant.label);
  fs.mkdirSync(stage, { recursive: true });
  fs.cpSync(path.join(root, "packs"), path.join(stage, "packs"), { recursive: true });

  const blockPath = path.join(stage, "packs", "behavior", "blocks", "aspersorium.block.json");
  const block = applyUniformAlphaTest(readJson(blockPath));
  writeJson(blockPath, block);
  rewriteWaterGeometry(stage, variant);
  const { image, mask } = buildWaterTexture(variant.coverage, variant);
  const waterTexturePath = path.join(stage, "packs", "resource", "textures", "blocks", "holy_water.png");
  fs.writeFileSync(waterTexturePath, PNG.sync.write(image, { colorType: 6 }));

  const ids = customizeManifests(stage, variant);
  badgePackIcon(path.join(stage, "packs", "behavior", "pack_icon.png"), variant.id.toUpperCase(), variant.badgeColor);
  badgePackIcon(path.join(stage, "packs", "resource", "pack_icon.png"), variant.id.toUpperCase(), variant.badgeColor);

  const methods = materialMethods(block);
  if (methods.some((group) => Object.values(group).some((method) => method !== renderMethod))) {
    throw new Error(`${variant.label} contains a non-uniform material render method`);
  }
  const visiblePixels = mask.flat().filter(Boolean).length;
  if (visiblePixels !== variant.visiblePixels) {
    throw new Error(`${variant.label} expected ${variant.visiblePixels} visible mask pixels, got ${visiblePixels}`);
  }
  const waterGeometry = inspectWaterGeometry(stage, variant, waterTexturePath);
  const baseScript = path.join(root, "packs", "behavior", "scripts", "main.js");
  const stagedScript = path.join(stage, "packs", "behavior", "scripts", "main.js");
  if (hashFile(baseScript) !== hashFile(stagedScript)) throw new Error(`${variant.label} changed the gameplay script`);

  const artifact = await packageStage(stage, variant);
  const creatorTools = validateWithCreatorTools(artifact.outputPath, variant);
  const summary = {
    label: variant.label,
    numericVersion: variant.version,
    title: variant.title,
    artifact: path.relative(root, artifact.outputPath).split(path.sep).join("/"),
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    renderMethod,
    coverage: variant.coverage,
    mask: {
      size: [maskSize, maskSize],
      visiblePixels,
      transparentPixels: maskSize * maskSize - visiblePixels,
      binaryAlpha: true,
      family: "nested jittered 2x2 stratified dispersion",
    },
    materialMethods: methods,
    waterGeometry,
    uuids: ids,
    gameplayScriptSha256: hashFile(stagedScript),
    holyWaterTextureSha256: hashFile(waterTexturePath),
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
  writeJson(path.join(diagnosticRoot, "manifest.json"), {
    diagnosticFamily: "Aspergillum alpha-test water matrix 1.1.8",
    baseline: "1.1.7",
    generatedAt: new Date().toISOString(),
    activationRule: "Use one diagnostic pair per new test world; public item and block identifiers intentionally remain unchanged.",
    diagnosticDesign: "A/B/C compare coverage under the original incorrect 32x32 material mapping; D repeats B at 81.25% with a 256x256 material texture and verified 16x16 physical sampling.",
    variants: summaries,
  });
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  console.log(`Diagnostic manifest: ${path.relative(root, path.join(diagnosticRoot, "manifest.json"))}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) await main();

export {
  applyUniformAlphaTest,
  buildCoverageMask,
  buildDispersedHoleOrder,
  buildWaterTexture,
  effectiveSampledTexels,
  materialMethods,
  renderMethod,
  simplifyWaterGeometry,
  variants,
};
