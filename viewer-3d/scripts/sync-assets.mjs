import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const projectDirectory = path.resolve(viewerDirectory, '..');
const resourceDirectory = path.join(projectDirectory, 'packs', 'resource');
const modelDirectory = path.join(resourceDirectory, 'models');
const textureDirectory = path.join(resourceDirectory, 'textures');
const outputDirectory = path.join(viewerDirectory, 'public', 'asset-library');
const runtimeDirectory = path.join(outputDirectory, 'pack');

const toPosix = (value) => value.split(path.sep).join('/');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyRuntimeDirectory(relativeDirectory) {
  const sourceDirectory = path.join(resourceDirectory, relativeDirectory);
  if (!await exists(sourceDirectory)) return [];

  const files = await walk(sourceDirectory);
  const copied = [];

  for (const sourceFile of files) {
    const relativeFile = path.relative(resourceDirectory, sourceFile);
    const outputFile = path.join(runtimeDirectory, relativeFile);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await cp(sourceFile, outputFile);
    copied.push(toPosix(relativeFile));
  }

  return copied.sort((left, right) => left.localeCompare(right));
}

async function copyRuntimeFile(relativeFile) {
  const sourceFile = path.join(resourceDirectory, relativeFile);
  if (!await exists(sourceFile)) return null;

  const outputFile = path.join(runtimeDirectory, relativeFile);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await cp(sourceFile, outputFile);
  return toPosix(relativeFile);
}

function countCubes(bones = []) {
  return bones.reduce((total, bone) => total + (bone.cubes?.length ?? 0), 0);
}

function countLocators(bones = []) {
  return bones.reduce((total, bone) => total + Object.keys(bone.locators ?? {}).length, 0);
}

function analyzeUvSafety(bones = []) {
  const summary = {
    boxUvCubes: 0,
    perFaceUvCubes: 0,
    unsafeSubtexelBoxUvCubes: 0,
    missingOrCollapsedFaces: 0,
  };
  const faceNames = ['north', 'east', 'south', 'west', 'up', 'down'];

  for (const bone of bones) {
    for (const cube of bone.cubes ?? []) {
      if (Array.isArray(cube.uv)) {
        summary.boxUvCubes += 1;
        if ((cube.size ?? []).some((dimension) => dimension < 1)) {
          summary.unsafeSubtexelBoxUvCubes += 1;
        }
        continue;
      }

      summary.perFaceUvCubes += 1;
      for (const faceName of faceNames) {
        const face = cube.uv?.[faceName];
        if (!face || !Array.isArray(face.uv_size) || face.uv_size.some((dimension) => dimension < 1)) {
          summary.missingOrCollapsedFaces += 1;
        }
      }
    }
  }

  return summary;
}

function displayName(identifier, source) {
  if (identifier.includes('aspersorium')) return 'Caldeirinha';
  if (identifier.includes('aspergillum')) return 'Aspersório';
  return path.basename(source, '.geo.json').replaceAll('.', ' ');
}

function textureCandidates(source) {
  const sourceDirectory = path.dirname(source);
  const baseName = path.basename(source, '.geo.json');
  const normalizedBaseName = baseName.replace(/\.rotations$/, '');
  const modelFamily = sourceDirectory.split(path.sep).at(-1);

  return [
    path.join(modelFamily, `${normalizedBaseName}.png`),
    path.join(modelFamily, `${baseName}.png`),
    path.join('entity', `${normalizedBaseName}.png`),
    path.join('blocks', `${normalizedBaseName}.png`),
  ];
}

async function findTexture(source, textureFiles) {
  const relativeTextures = new Set(textureFiles.map((file) => path.relative(textureDirectory, file)));
  for (const candidate of textureCandidates(source)) {
    if (relativeTextures.has(candidate)) return toPosix(path.join('textures', candidate));
  }
  return null;
}

function summarizeGeometry(geometry, index, formatVersion) {
  const description = geometry.description ?? {};
  const bones = geometry.bones ?? [];
  return {
    index,
    identifier: description.identifier ?? `geometry_${index}`,
    formatVersion,
    textureWidth: description.texture_width ?? 64,
    textureHeight: description.texture_height ?? 64,
    visibleBounds: {
      width: description.visible_bounds_width ?? null,
      height: description.visible_bounds_height ?? null,
      offset: description.visible_bounds_offset ?? null,
    },
    boneCount: bones.length,
    cubeCount: countCubes(bones),
    locatorCount: countLocators(bones),
    boneNames: bones.map((bone) => bone.name),
    uvSafety: analyzeUvSafety(bones),
  };
}

async function main() {
  const modelFiles = (await walk(modelDirectory))
    .filter((file) => file.endsWith('.geo.json'))
    .sort((left, right) => left.localeCompare(right));
  const textureFiles = (await walk(textureDirectory)).filter((file) => file.endsWith('.png'));

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, 'models'), { recursive: true });
  await mkdir(path.join(outputDirectory, 'textures'), { recursive: true });
  await mkdir(runtimeDirectory, { recursive: true });

  const models = [];

  for (const modelFile of modelFiles) {
    const relativeSource = toPosix(path.relative(modelDirectory, modelFile));
    const sourceData = JSON.parse(await readFile(modelFile, 'utf8'));
    const geometries = sourceData['minecraft:geometry'] ?? [];
    const texture = await findTexture(relativeSource, textureFiles);
    const relativeOutput = path.join(outputDirectory, 'models', relativeSource);

    await mkdir(path.dirname(relativeOutput), { recursive: true });
    await cp(modelFile, relativeOutput);

    models.push({
      id: toPosix(relativeSource.replaceAll('/', '__').replace('.geo.json', '')),
      label: displayName(geometries[0]?.description?.identifier ?? relativeSource, relativeSource),
      source: toPosix(path.join('models', relativeSource)),
      sourceLabel: toPosix(path.join('packs', 'resource', 'models', relativeSource)),
      type: 'Bedrock Geometry',
      texture,
      geometries: geometries.map((geometry, index) => summarizeGeometry(
        geometry,
        index,
        sourceData.format_version ?? 'unknown',
      )),
    });
  }

  for (const textureFile of textureFiles) {
    const relativeTexture = path.relative(textureDirectory, textureFile);
    const outputFile = path.join(outputDirectory, 'textures', relativeTexture);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await cp(textureFile, outputFile);
  }

  const runtimeFiles = {
    attachables: await copyRuntimeDirectory('attachables'),
    renderControllers: await copyRuntimeDirectory('render_controllers'),
    animations: await copyRuntimeDirectory('animations'),
    animationControllers: await copyRuntimeDirectory('animation_controllers'),
    particles: await copyRuntimeDirectory('particles'),
    materials: await copyRuntimeDirectory('materials'),
    textures: await copyRuntimeDirectory('textures'),
    manifest: await copyRuntimeFile('manifest.json'),
    blocks: await copyRuntimeFile('blocks.json'),
  };

  const textureSets = runtimeFiles.textures.filter((file) => file.endsWith('.texture_set.json'));

  const manifest = {
    version: 1,
    source: 'packs/resource',
    models,
    textureCount: textureFiles.length,
    runtime: {
      ...runtimeFiles,
      textureSets,
    },
  };

  await writeFile(
    path.join(outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(`Viewer assets synced: ${models.length} model files, ${textureFiles.length} textures.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
