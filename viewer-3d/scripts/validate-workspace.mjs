import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { extractBedrockGeometries } from '../src/shared/bedrock-document.js';
import { buildBedrockGeometry } from '../src/shared/bedrock-geometry.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const libraryDirectory = path.join(viewerDirectory, 'public', 'asset-library');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    assert(value && !seen.has(value), `${label} duplicado ou vazio: ${value}`);
    seen.add(value);
  }
}

function assertFiniteBounds(geometry, summary, label) {
  const material = new THREE.MeshBasicMaterial();
  const built = buildBedrockGeometry(
    geometry,
    summary,
    { default: material },
    { includePivots: false, includeLocators: false },
  );
  built.root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(built.root, true);
  const values = [...bounds.min.toArray(), ...bounds.max.toArray()];
  assert(values.every(Number.isFinite), `${label} produziu bounds não finitos.`);
  for (const { group } of built.boneRecords) {
    assert(group.matrixWorld.elements.every(Number.isFinite), `${label} produziu matriz não finita.`);
  }
  built.root.traverse((node) => node.geometry?.dispose());
  material.dispose();
}

async function validateProject(projectSummary) {
  const projectDirectory = path.join(libraryDirectory, 'projects', projectSummary.id);
  const manifest = await readJson(path.join(projectDirectory, 'manifest.json'));
  assert(manifest.version === 4, `${projectSummary.id}: manifesto deve usar schema 4.`);
  assert(manifest.project?.id === projectSummary.id, `${projectSummary.id}: identidade divergente.`);
  unique(manifest.models.map(({ id }) => id), `${projectSummary.id}: model id`);
  unique(manifest.equipment.map(({ id }) => id), `${projectSummary.id}: equipment id`);

  const modelById = new Map(manifest.models.map((model) => [model.id, model]));
  const geometryIds = new Set();
  for (const model of manifest.models) {
    const sourcePath = path.join(projectDirectory, model.source);
    await access(sourcePath);
    const document = await readJson(sourcePath);
    const geometries = extractBedrockGeometries(document);
    assert(geometries.length === model.geometries.length, `${projectSummary.id}/${model.id}: contagem de geometrias divergente.`);
    for (const summary of model.geometries) {
      assert(!geometryIds.has(summary.identifier), `${projectSummary.id}: geometry id duplicado: ${summary.identifier}`);
      geometryIds.add(summary.identifier);
      const geometry = geometries[summary.index];
      assert(geometry?.description?.identifier === summary.identifier, `${projectSummary.id}/${model.id}: geometria não corresponde ao resumo.`);
      assertFiniteBounds(geometry, summary, `${projectSummary.id}/${summary.identifier}`);
    }
    if (model.texture) await access(path.join(projectDirectory, model.texture));
  }

  for (const equipment of manifest.equipment) {
    assert(equipment.resolved, `${projectSummary.id}/${equipment.id}: equipamento não resolvido.`);
    const model = modelById.get(equipment.modelId);
    assert(model, `${projectSummary.id}/${equipment.id}: modelId ausente.`);
    assert(model.geometries.some(({ identifier }) => identifier === equipment.geometryId), `${projectSummary.id}/${equipment.id}: geometryId ausente.`);
    assert(['head', 'chest', 'hand', 'asset'].includes(equipment.slot), `${projectSummary.id}/${equipment.id}: slot inválido.`);
    if (equipment.texture) await access(path.join(projectDirectory, equipment.texture));
    if (equipment.attachable?.path) {
      await access(path.join(projectDirectory, 'pack', equipment.attachable.path));
    }
  }

  assert(projectSummary.modelCount === manifest.models.length, `${projectSummary.id}: modelCount divergente.`);
  assert(projectSummary.equipmentCount === manifest.equipment.length, `${projectSummary.id}: equipmentCount divergente.`);
  return `${manifest.project.displayName}: ${manifest.models.length} modelos, ${manifest.equipment.length} equipamentos`;
}

const workspace = await readJson(path.join(libraryDirectory, 'workspace.json'));
assert(workspace.version === 1, 'workspace.json deve usar schema 1.');
assert(workspace.projects.length > 0, 'O workspace não possui projetos.');
unique(workspace.projects.map(({ id }) => id), 'addon id');
assert(workspace.projects.some(({ id }) => id === workspace.defaultProjectId), 'defaultProjectId não existe.');
const summaries = [];
for (const project of workspace.projects) summaries.push(await validateProject(project));
process.stdout.write(`Viewer workspace validado: ${summaries.join('; ')}.\n`);
