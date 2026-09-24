import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { resolveCaptureViews } from '../src/shared/capture-contract.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const projectDirectory = path.resolve(viewerDirectory, '..');
const viewerPackage = JSON.parse(await readFile(path.join(viewerDirectory, 'package.json'), 'utf8'));

const HELP = `
Captura modelos ou equipamentos de qualquer add-on registrado no workspace 3D.

Uso:
  npm run capture:assets -- [opções]

Opções:
  --addon <id>           projeto do workspace (padrão: aspergillum)
  --equipment <id,...>   item/localId, ou all (padrão: primeiro resolvido)
  --model <id,...>       id de modelo/geometria, ou all
  --views <id,...>       vistas (padrão: front,front-right,right,back,left)
  --material <modo>      classic ou pbr (padrão: capacidade do projeto)
  --cosmetic <id>        acabamento do manifesto (padrão: primeiro disponível)
  --size <px>            resolução 256..2048 (padrão: 640)
  --columns <n>          colunas por prancha, 1..6 (padrão: 3)
  --output <pasta>       destino (padrão: out/asset-captures/<addon>/<timestamp>)
  --grid                  inclui grade diagnóstica
  --wireframe             renderiza wireframe
  --transparent           usa fundo transparente
  --help                  mostra esta ajuda

Vistas:
  front, front-right, right, back-right, back, left, front-left, top, bottom
`;

function parseList(value) {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} exige um valor.`);
  return value;
}

function parseArgs(args) {
  const options = {
    addon: 'aspergillum',
    selectionType: 'equipment',
    requested: null,
    views: resolveCaptureViews(['front', 'front-right', 'right', 'back', 'left']),
    material: null,
    cosmetic: null,
    size: 640,
    columns: 3,
    output: null,
    grid: false,
    wireframe: false,
    transparent: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--grid') options.grid = true;
    else if (argument === '--wireframe') options.wireframe = true;
    else if (argument === '--transparent') options.transparent = true;
    else if (argument === '--addon') {
      options.addon = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--equipment' || argument === '--model') {
      if (options.requested) throw new Error('Use somente --equipment ou --model por execução.');
      options.selectionType = argument === '--model' ? 'model' : 'equipment';
      options.requested = parseList(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--views') {
      options.views = resolveCaptureViews(parseList(readValue(args, index, argument)));
      index += 1;
    } else if (argument === '--material') {
      options.material = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--cosmetic') {
      options.cosmetic = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--size') {
      options.size = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--columns') {
      options.columns = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--output') {
      options.output = path.resolve(projectDirectory, readValue(args, index, argument));
      index += 1;
    } else {
      throw new Error(`Opção desconhecida: ${argument}`);
    }
  }

  if (options.material && !['classic', 'pbr'].includes(options.material)) {
    throw new Error('--material deve ser classic ou pbr.');
  }
  if (!Number.isInteger(options.size) || options.size < 256 || options.size > 2048) {
    throw new Error('--size deve ser um inteiro entre 256 e 2048.');
  }
  if (!Number.isInteger(options.columns) || options.columns < 1 || options.columns > 6) {
    throw new Error('--columns deve ser um inteiro entre 1 e 6.');
  }
  if (!options.output) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    options.output = path.join(projectDirectory, 'out', 'asset-captures', options.addon, stamp);
  }
  return options;
}

function slug(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-zA-Z0-9._-]+/gu, '-').replace(/^-+|-+$/gu, '').toLowerCase();
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function resolveSelections(manifest, options) {
  const catalog = options.selectionType === 'model'
    ? manifest.models.map((model) => ({
      id: model.id,
      localId: model.geometries?.[0]?.identifier,
      label: model.label,
      modelId: model.id,
      kind: model.category,
    }))
    : manifest.equipment.filter(({ resolved }) => resolved);
  if (!catalog.length) throw new Error(`${manifest.project.displayName} não possui ${options.selectionType} resolvido.`);
  if (!options.requested) return [catalog[0]];
  if (options.requested.length === 1 && options.requested[0] === 'all') return catalog;
  return options.requested.map((requested) => {
    const entry = catalog.find(({ id, localId, geometryId }) => (
      id === requested || localId === requested || geometryId === requested
    ));
    if (!entry) throw new Error(`${options.selectionType} não encontrado: ${requested}`);
    return entry;
  });
}

async function createContactSheet(context, captures, metadata) {
  const displaySize = Math.min(metadata.size, 560);
  const gap = 12;
  const padding = 24;
  const captionHeight = 40;
  const rows = Math.ceil(captures.length / metadata.columns);
  const width = padding * 2 + metadata.columns * displaySize + (metadata.columns - 1) * gap;
  const height = padding * 2 + 82 + rows * (displaySize + captionHeight) + (rows - 1) * gap;
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  const tiles = await Promise.all(captures.map(async ({ absolutePath, label }) => {
    const bytes = await readFile(absolutePath);
    return `<figure><img src="data:image/png;base64,${bytes.toString('base64')}" alt="${escapeHtml(label)}"><figcaption>${escapeHtml(label)}</figcaption></figure>`;
  }));
  await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#0c1315;color:#e8efec;font-family:Inter,"Segoe UI",sans-serif}.sheet{width:${width}px;min-height:${height}px;padding:${padding}px;background:#111b1d}header{height:68px;display:flex;justify-content:space-between;gap:20px}h1{margin:0 0 5px;font-size:23px;font-weight:650}p{margin:0;color:#92a7a2;font-size:12px}.badge{align-self:flex-start;padding:6px 8px;border:1px solid #405b56;color:#a6d3c7;font:650 9px/1 monospace;letter-spacing:.08em}main{display:grid;grid-template-columns:repeat(${metadata.columns},${displaySize}px);gap:${gap}px}figure{margin:0;overflow:hidden;border:1px solid #2b403d;background:#162224}img{display:block;width:${displaySize}px;height:${displaySize}px;object-fit:cover}figcaption{height:${captionHeight}px;padding:12px;color:#c9d6d2;font-size:11px}
  </style></head><body><section class="sheet"><header><div><h1>${escapeHtml(metadata.title)}</h1><p>${escapeHtml(metadata.subtitle)}</p></div><span class="badge">ASSET TRACE</span></header><main>${tiles.join('')}</main></section></body></html>`);
  await page.locator('.sheet').screenshot({ path: metadata.output });
  await page.close();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  const workspace = JSON.parse(await readFile(
    path.join(viewerDirectory, 'public', 'asset-library', 'workspace.json'),
    'utf8',
  ));
  const workspaceProject = workspace.projects.find(({ id }) => id === options.addon);
  if (!workspaceProject) {
    throw new Error(`Add-on desconhecido: ${options.addon}. Disponíveis: ${workspace.projects.map(({ id }) => id).join(', ')}.`);
  }
  const assetRoot = path.join(viewerDirectory, 'public', 'asset-library', 'projects', options.addon);
  const manifest = JSON.parse(await readFile(path.join(assetRoot, 'manifest.json'), 'utf8'));
  const selections = resolveSelections(manifest, options);
  options.material ??= workspaceProject.capabilities?.pbr ? 'pbr' : 'classic';
  options.cosmetic ??= manifest.cosmetics.find(({ id }) => id === 'classic')?.id
    ?? manifest.cosmetics[0]?.id
    ?? 'default';
  await mkdir(options.output, { recursive: true });

  const server = await createServer({
    root: viewerDirectory,
    configFile: path.join(viewerDirectory, 'vite.config.js'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Servidor de captura sem porta TCP.');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.setViewportSize({ width: options.size, height: options.size });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(
      `http://127.0.0.1:${address.port}/bedrock-renderer.html?addon=${encodeURIComponent(options.addon)}`,
      { waitUntil: 'networkidle' },
    );
    await page.waitForFunction(() => Boolean(window.__BEDROCK_CAPTURE__?.ready || window.__BEDROCK_CAPTURE__?.error));
    const runtimeError = await page.evaluate(() => window.__BEDROCK_CAPTURE__.error);
    if (runtimeError) throw new Error(`Falha no Bedrock Renderer: ${runtimeError}`);

    const assets = [];
    for (const selection of selections) {
      process.stdout.write(`Capturando ${workspaceProject.displayName} · ${selection.label}...\n`);
      const resolved = await page.evaluate((configuration) => window.__BEDROCK_CAPTURE__.configure(configuration), {
        model: selection.id,
        pose: 'neutral',
        material: options.material,
        cosmetic: options.cosmetic,
        grid: options.grid,
        wireframe: options.wireframe,
        transparent: options.transparent,
      });
      const directory = path.join(options.output, slug(selection.id));
      await mkdir(directory, { recursive: true });
      const captures = [];
      for (const view of options.views) {
        const result = await page.evaluate((viewId) => window.__BEDROCK_CAPTURE__.capture(viewId), view.id);
        const absolutePath = path.join(directory, `${view.id}.png`);
        const prefix = 'data:image/png;base64,';
        if (!result.dataUrl.startsWith(prefix)) throw new Error(`Canvas inválido em ${selection.id}/${view.id}.`);
        await writeFile(absolutePath, Buffer.from(result.dataUrl.slice(prefix.length), 'base64'));
        captures.push({
          id: view.id,
          label: view.label,
          absolutePath,
          path: path.relative(options.output, absolutePath).split(path.sep).join('/'),
          camera: result.camera,
          target: result.target,
        });
      }
      const contactSheet = path.join(directory, 'contact-sheet.png');
      await createContactSheet(context, captures, {
        size: options.size,
        columns: options.columns,
        title: selection.label,
        subtitle: `${workspaceProject.displayName} ${workspaceProject.currentLabel} · ${resolved.geometry} · ${options.material.toUpperCase()}`,
        output: contactSheet,
      });
      assets.push({
        id: selection.id,
        label: selection.label,
        kind: selection.kind ?? null,
        modelId: resolved.model,
        geometry: resolved.geometry,
        captures: captures.map(({ absolutePath, ...capture }) => capture),
        contactSheet: path.relative(options.output, contactSheet).split(path.sep).join('/'),
      });
    }
    if (pageErrors.length) throw new Error(`Erros no browser:\n${pageErrors.join('\n')}`);

    await writeFile(path.join(options.output, 'capture-manifest.json'), `${JSON.stringify({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      tool: { name: viewerPackage.name, version: viewerPackage.version, captureApiVersion: 4 },
      project: manifest.project,
      options: {
        selectionType: options.selectionType,
        requested: options.requested,
        views: options.views.map(({ id }) => id),
        material: options.material,
        cosmetic: options.cosmetic,
        grid: options.grid,
        wireframe: options.wireframe,
        transparent: options.transparent,
        size: options.size,
      },
      assets,
      limitation: 'Preview diagnóstica em Three.js; o renderer do Minecraft Bedrock continua sendo a autoridade visual final.',
    }, null, 2)}\n`, 'utf8');
    process.stdout.write(`Capturas de assets geradas em ${options.output}\n`);
  } finally {
    await browser?.close();
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
