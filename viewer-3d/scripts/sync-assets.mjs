import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjects } from '../../tools/addon-manager/projects.mjs';
import {
  extractBedrockGeometries,
  modelIdFromSource,
  normalizeTextureStem,
} from '../src/shared/bedrock-document.js';
import {
  cosmeticLabel,
  cosmeticTextureSuffix,
  sortCosmeticsForMatrix,
} from '../src/shared/cosmetic-contract.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const managerRoot = path.resolve(viewerDirectory, '..');
const outputDirectory = path.join(viewerDirectory, 'public', 'asset-library');
const projectsOutputDirectory = path.join(outputDirectory, 'projects');
const toPosix = (value) => value.split(path.sep).join('/');

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  if (!await exists(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath));
    else files.push(absolutePath);
  }
  return files;
}

async function readJsonIfPresent(filePath, fallback = null) {
  if (!await exists(filePath)) return fallback;
  return JSON.parse(await readFile(filePath, 'utf8'));
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
    intentionallyOmittedFaces: 0,
    invalidOrCollapsedFaces: 0,
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
        if (!face) {
          summary.intentionallyOmittedFaces += 1;
          continue;
        }
        if (!Array.isArray(face.uv_size) || face.uv_size.some((dimension) => (
          !Number.isFinite(Number(dimension)) || Math.abs(Number(dimension)) < 1
        ))) {
          summary.invalidOrCollapsedFaces += 1;
          summary.missingOrCollapsedFaces += 1;
        }
      }
    }
  }
  return summary;
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

function fallbackDisplayName(identifier, source) {
  if (identifier.includes('sacristan_table')) return 'Mesa do sacristão';
  if (identifier.includes('aspersorium')) return 'Caldeirinha';
  if (identifier.includes('aspergillum')) return 'Aspersório';
  return path.basename(source).replace(/\.geo\.json$/i, '').replace(/\.json$/i, '').replaceAll('_', ' ');
}

function normalizeSlot(slot, geometry = null) {
  const value = String(slot ?? '').toLowerCase();
  if (value.includes('head')) return 'head';
  if (value.includes('chest') || value.includes('body')) return 'chest';
  if (value.includes('hand')) return 'hand';
  const boneNames = new Set((geometry?.boneNames ?? []).map((name) => name.toLowerCase()));
  if (boneNames.has('aspergillum_bound') || boneNames.has('rightitem') || boneNames.has('bone')) return 'hand';
  return 'asset';
}

function summarizeAttachable(relativePath, document) {
  const description = document?.['minecraft:attachable']?.description;
  if (!description) return null;
  const geometryIds = [...new Set(Object.values(description.geometry ?? {}).filter((value) => typeof value === 'string'))];
  const textureStems = [...new Set(Object.values(description.textures ?? {})
    .filter((value) => typeof value === 'string' && !value.includes('glint'))
    .map(normalizeTextureStem))];
  const itemIds = Object.keys(description.item ?? {});
  if (!itemIds.length && description.identifier) itemIds.push(description.identifier.replace(/\.player$/i, ''));
  return {
    path: relativePath,
    identifier: description.identifier ?? null,
    playerVariant: /\.player(?:\.json)?$/i.test(description.identifier ?? '') || /\.player\.json$/i.test(relativePath),
    itemIds,
    geometryIds,
    textureStems,
    materials: description.materials ?? {},
    geometryAliases: description.geometry ?? {},
    textureAliases: description.textures ?? {},
    animationAliases: description.animations ?? {},
    renderControllers: description.render_controllers ?? [],
  };
}

function preferredAttachable(paths, slot) {
  const wearable = slot === 'head' || slot === 'chest';
  return [...paths].sort((left, right) => {
    const leftScore = left.playerVariant === wearable ? 0 : 1;
    const rightScore = right.playerVariant === wearable ? 0 : 1;
    return leftScore - rightScore || left.path.length - right.path.length || left.path.localeCompare(right.path);
  })[0] ?? null;
}

function textureExists(textureStem, textureSet) {
  const relative = normalizeTextureStem(textureStem).replace(/^textures\//, '');
  return textureSet.has(`${relative}.png`) ? `textures/${relative}.png` : null;
}

function textureCandidates(relativeSource) {
  const sourceDirectory = path.posix.dirname(relativeSource);
  const baseName = path.posix.basename(relativeSource).replace(/\.geo\.json$/i, '').replace(/\.json$/i, '');
  const family = sourceDirectory.split('/').at(-1);
  return [
    `${family}/${baseName}.png`,
    `entity/${baseName}.png`,
    `blocks/${baseName}.png`,
  ];
}

function findTexture(relativeSource, textureSet) {
  return textureCandidates(relativeSource)
    .map((candidate) => textureSet.has(candidate) ? `textures/${candidate}` : null)
    .find(Boolean) ?? null;
}

function summarizeCosmetic(cosmetic) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  return {
    ...cosmetic,
    label: cosmeticLabel(cosmetic),
    textures: {
      entity__aspergillum: `textures/entity/aspergillum${suffix}`,
      blocks__aspersorium: `textures/blocks/aspersorium${suffix}`,
      'blocks__aspersorium.rotations': `textures/blocks/aspersorium${suffix}`,
      blocks__sacristan_table: `textures/blocks/sacristan_table${suffix}`,
      'blocks__sacristan_table.rotations': `textures/blocks/sacristan_table${suffix}`,
    },
  };
}

async function loadCosmetics(projectRoot) {
  const catalog = await readJsonIfPresent(path.join(projectRoot, 'assets-src', 'customization', 'catalog.json'));
  if (!catalog?.cosmetics || !catalog?.metalFinishes || !catalog?.gripFinishes) {
    return [{ id: 'default', label: 'Textura do pack', textures: {} }];
  }
  return sortCosmeticsForMatrix(catalog.cosmetics, catalog.metalFinishes, catalog.gripFinishes)
    .map(summarizeCosmetic);
}

async function copyRuntimeDirectory(resourceDirectory, runtimeDirectory, relativeDirectory) {
  const sourceDirectory = path.join(resourceDirectory, relativeDirectory);
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

async function copyRuntimeFile(resourceDirectory, runtimeDirectory, relativeFile) {
  const sourceFile = path.join(resourceDirectory, relativeFile);
  if (!await exists(sourceFile)) return null;
  const outputFile = path.join(runtimeDirectory, relativeFile);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await cp(sourceFile, outputFile);
  return toPosix(relativeFile);
}

function equipmentFromCatalog(items, models, attachables, textureSet) {
  return items.map((item) => {
    const paths = attachables.filter((attachable) => attachable.itemIds.includes(item.id));
    const slot = normalizeSlot(item.slot);
    const preferred = preferredAttachable(paths, slot);
    const geometryId = preferred?.geometryIds[0] ?? paths.flatMap(({ geometryIds }) => geometryIds)[0] ?? null;
    const model = models.find(({ geometries }) => geometries.some(({ identifier }) => identifier === geometryId)) ?? null;
    const texture = preferred?.textureStems.map((stem) => textureExists(stem, textureSet)).find(Boolean)
      ?? model?.texture
      ?? null;
    const icon = [...textureSet].find((candidate) => (
      path.posix.basename(candidate, '.png') === item.icon
      && /^(?:items?|ui)\//.test(candidate)
    ));
    return {
      id: item.id,
      localId: item.localId ?? item.id.split(':').at(-1),
      label: item.name ?? item.localId ?? item.id,
      kind: item.kind ?? 'asset',
      slot,
      sourceSlot: item.slot ?? null,
      modelId: model?.id ?? null,
      geometryId,
      texture,
      icon: icon ? `textures/${icon}` : null,
      attachable: preferred,
      attachableVariants: paths,
      resolved: Boolean(model && preferred),
    };
  });
}

function inferEquipment(models, attachables, textureSet) {
  const itemIds = [...new Set(attachables.flatMap(({ itemIds }) => itemIds))];
  return itemIds.map((itemId) => {
    const paths = attachables.filter((attachable) => attachable.itemIds.includes(itemId));
    const geometryId = paths.flatMap(({ geometryIds }) => geometryIds)[0] ?? null;
    const model = models.find(({ geometries }) => geometries.some(({ identifier }) => identifier === geometryId)) ?? null;
    const slot = normalizeSlot(null, model?.geometries.find(({ identifier }) => identifier === geometryId));
    const preferred = preferredAttachable(paths, slot);
    const texture = preferred?.textureStems.map((stem) => textureExists(stem, textureSet)).find(Boolean)
      ?? model?.texture
      ?? null;
    return {
      id: itemId,
      localId: itemId.split(':').at(-1),
      label: model?.label ?? itemId,
      kind: 'asset',
      slot,
      sourceSlot: null,
      modelId: model?.id ?? null,
      geometryId,
      texture,
      icon: null,
      attachable: preferred,
      attachableVariants: paths,
      resolved: Boolean(model && preferred),
    };
  });
}

async function syncProject(project) {
  const resourceDirectory = path.join(project.projectRoot, 'packs', 'resource');
  const modelDirectory = path.join(resourceDirectory, 'models');
  const textureDirectory = path.join(resourceDirectory, 'textures');
  if (!await exists(resourceDirectory)) throw new Error(`Resource Pack ausente em ${project.projectRoot}`);

  const projectOutput = path.join(projectsOutputDirectory, project.id);
  const runtimeDirectory = path.join(projectOutput, 'pack');
  await mkdir(path.join(projectOutput, 'models'), { recursive: true });
  await mkdir(path.join(projectOutput, 'textures'), { recursive: true });
  await mkdir(runtimeDirectory, { recursive: true });

  const runtimeFiles = {
    attachables: await copyRuntimeDirectory(resourceDirectory, runtimeDirectory, 'attachables'),
    renderControllers: await copyRuntimeDirectory(resourceDirectory, runtimeDirectory, 'render_controllers'),
    animations: await copyRuntimeDirectory(resourceDirectory, runtimeDirectory, 'animations'),
    animationControllers: await copyRuntimeDirectory(resourceDirectory, runtimeDirectory, 'animation_controllers'),
    particles: await copyRuntimeDirectory(resourceDirectory, runtimeDirectory, 'particles'),
    materials: await copyRuntimeDirectory(resourceDirectory, runtimeDirectory, 'materials'),
    textures: await copyRuntimeDirectory(resourceDirectory, runtimeDirectory, 'textures'),
    manifest: await copyRuntimeFile(resourceDirectory, runtimeDirectory, 'manifest.json'),
    blocks: await copyRuntimeFile(resourceDirectory, runtimeDirectory, 'blocks.json'),
  };
  runtimeFiles.textureSets = runtimeFiles.textures.filter((file) => file.endsWith('.texture_set.json'));

  const textureFiles = (await walk(textureDirectory)).filter((file) => file.toLowerCase().endsWith('.png'));
  const textureSet = new Set(textureFiles.map((file) => toPosix(path.relative(textureDirectory, file))));
  for (const textureFile of textureFiles) {
    const relativeTexture = path.relative(textureDirectory, textureFile);
    const outputFile = path.join(projectOutput, 'textures', relativeTexture);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await cp(textureFile, outputFile);
  }

  const attachables = [];
  for (const relativePath of runtimeFiles.attachables) {
    const document = JSON.parse(await readFile(path.join(resourceDirectory, relativePath), 'utf8'));
    const summary = summarizeAttachable(relativePath, document);
    if (summary) attachables.push(summary);
  }

  const models = [];
  const sourceFiles = (await walk(modelDirectory))
    .filter((file) => file.toLowerCase().endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));
  for (const modelFile of sourceFiles) {
    const sourceData = JSON.parse(await readFile(modelFile, 'utf8'));
    const geometries = extractBedrockGeometries(sourceData);
    if (!geometries.length) continue;
    const relativeSource = toPosix(path.relative(modelDirectory, modelFile));
    const summaries = geometries.map((geometry, index) => summarizeGeometry(
      geometry,
      index,
      sourceData.format_version ?? 'unknown',
    ));
    const renderPaths = attachables.filter((attachable) => attachable.geometryIds.some((identifier) => (
      summaries.some((geometry) => geometry.identifier === identifier)
    )));
    const preferredPath = preferredAttachable(renderPaths, normalizeSlot(null, summaries[0]));
    const texture = preferredPath?.textureStems.map((stem) => textureExists(stem, textureSet)).find(Boolean)
      ?? findTexture(relativeSource, textureSet);
    const outputFile = path.join(projectOutput, 'models', relativeSource);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await cp(modelFile, outputFile);
    models.push({
      id: modelIdFromSource(relativeSource),
      label: fallbackDisplayName(summaries[0]?.identifier ?? relativeSource, relativeSource),
      source: toPosix(path.join('models', relativeSource)),
      sourceLabel: toPosix(path.join('packs', 'resource', 'models', relativeSource)),
      type: 'Bedrock Geometry',
      category: 'uncategorized',
      texture,
      renderPaths,
      geometries: summaries,
    });
  }

  const itemCatalog = await readJsonIfPresent(path.join(project.projectRoot, 'assets-src', 'catalog', 'items.json'));
  const catalogItems = Array.isArray(itemCatalog?.items) ? itemCatalog.items : [];
  const equipment = catalogItems.length
    ? equipmentFromCatalog(catalogItems, models, attachables, textureSet)
    : inferEquipment(models, attachables, textureSet);
  for (const model of models) {
    const linked = equipment.filter(({ modelId }) => modelId === model.id);
    if (linked.length) {
      model.label = linked[0].label;
      model.category = linked[0].kind;
      model.slot = linked[0].slot;
      model.itemIds = linked.map(({ id }) => id);
    }
  }

  const cosmetics = await loadCosmetics(project.projectRoot);
  const compositions = project.id === 'aspergillum' ? {
    blocks__aspersorium: [{ role: 'water', modelId: 'entity__aspersorium_water_visual' }],
    'blocks__aspersorium.rotations': [{ role: 'water', modelId: 'entity__aspersorium_water_visual' }],
  } : {};
  const advancedAvatarProfile = equipment.some(({ geometryId }) => geometryId === 'geometry.aspergillum.held')
    ? 'aspergillum-held-v1'
    : null;
  const manifest = {
    version: 4,
    project: {
      id: project.id,
      displayName: project.displayName,
      currentLabel: project.currentLabel,
    },
    source: 'packs/resource',
    models: models.sort((left, right) => left.label.localeCompare(right.label, 'pt-BR')),
    equipment: equipment.sort((left, right) => left.label.localeCompare(right.label, 'pt-BR')),
    cosmetics,
    compositions,
    textureCount: textureFiles.length,
    runtime: runtimeFiles,
    capabilities: {
      attachables: attachables.length > 0,
      animations: runtimeFiles.animations.length > 0,
      animationControllers: runtimeFiles.animationControllers.length > 0,
      cosmetics: cosmetics.length > 1,
      equipment: equipment.some(({ resolved }) => resolved),
      pbr: runtimeFiles.textureSets.length > 0,
      avatar: equipment.some(({ slot }) => ['head', 'chest', 'hand'].includes(slot)),
      advancedAvatarProfile,
    },
  };
  await writeFile(path.join(projectOutput, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {
    id: project.id,
    displayName: project.displayName,
    currentLabel: project.currentLabel,
    manifest: `projects/${project.id}/manifest.json`,
    modelCount: manifest.models.length,
    equipmentCount: manifest.equipment.length,
    textureCount: manifest.textureCount,
    capabilities: manifest.capabilities,
  };
}

async function main() {
  const projects = loadProjects({
    managerRoot,
    skipMissing: true,
    onMissing: ({ id, projectRoot }) => console.warn(`Projeto registrado indisponível, ignorado no viewer: ${id} (${projectRoot})`),
  });
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(projectsOutputDirectory, { recursive: true });
  const summaries = [];
  for (const project of projects) summaries.push(await syncProject(project));
  const workspace = {
    version: 1,
    generatedAt: new Date().toISOString(),
    defaultProjectId: projects[0].id,
    projects: summaries,
  };
  await writeFile(path.join(outputDirectory, 'workspace.json'), `${JSON.stringify(workspace, null, 2)}\n`, 'utf8');
  console.log(`Viewer workspace synced: ${summaries.map((project) => (
    `${project.displayName} (${project.modelCount} modelos, ${project.equipmentCount} equipamentos)`
  )).join('; ')}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
