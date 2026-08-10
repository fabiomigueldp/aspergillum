import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  CAPTURE_SUBJECTS,
  resolveCaptureViews,
} from '../src/shared/capture-contract.js';
import {
  cosmeticLabel,
  resolveCosmetics,
  sortCosmeticsForMatrix,
} from '../src/shared/cosmetic-contract.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const projectDirectory = path.resolve(viewerDirectory, '..');
const packageInfo = JSON.parse(await readFile(path.join(projectDirectory, 'package.json'), 'utf8'));
const customizationCatalog = JSON.parse(await readFile(
  path.join(projectDirectory, 'assets-src', 'customization', 'catalog.json'),
  'utf8',
));
const matrixCosmetics = sortCosmeticsForMatrix(
  customizationCatalog.cosmetics,
  customizationCatalog.metalFinishes,
  customizationCatalog.gripFinishes,
);

const HELP = `
Captura vistas reproduzíveis dos modelos Bedrock e gera pranchas compostas.

Uso:
  npm run capture -- [opções]

Opções:
  --subject <id,...>  aspergillum, aspersorium, docked, table, table-docked ou all
  --views <id,...>    subconjunto/ordem de vistas (padrão: as 9 vistas)
  --output <pasta>    destino (padrão: ../out/model-captures/<timestamp>)
  --size <px>         resolução quadrada de cada PNG, 256..2048 (padrão: 640)
  --columns <n>       colunas da prancha, 1..6 (padrão: 3)
  --material <modo>   pbr ou classic (padrão: pbr)
  --cosmetic <id,...> acabamento(s) do catálogo ou all (padrão: classic)
  --water <nível>     empty, low, mid, high ou full (padrão: full)
  --pose <pose>       neutral, first ou third (padrão: neutral no aspersório)
  --action <estado>   idle ou sprinkle (padrão: idle)
  --timeline <s>      instante da animação de aspersão (padrão: 0)
  --grid               inclui a grade nas capturas
  --wireframe          renderiza os materiais em wireframe
  --help               mostra esta ajuda

Vistas disponíveis:
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
    subjects: Object.keys(CAPTURE_SUBJECTS),
    views: resolveCaptureViews(),
    output: null,
    size: 640,
    columns: 3,
    material: 'pbr',
    cosmeticIds: ['classic'],
    water: 'full',
    pose: null,
    action: 'idle',
    timeline: 0,
    grid: false,
    wireframe: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--grid') options.grid = true;
    else if (argument === '--wireframe') options.wireframe = true;
    else if (argument === '--subject') {
      const value = readValue(args, index, argument);
      options.subjects = value === 'all' ? Object.keys(CAPTURE_SUBJECTS) : parseList(value);
      index += 1;
    } else if (argument === '--views') {
      options.views = resolveCaptureViews(parseList(readValue(args, index, argument)));
      index += 1;
    } else if (argument === '--output') {
      options.output = path.resolve(projectDirectory, readValue(args, index, argument));
      index += 1;
    } else if (argument === '--size') {
      options.size = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--columns') {
      options.columns = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--material') {
      options.material = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--cosmetic') {
      const value = readValue(args, index, argument);
      options.cosmeticIds = value === 'all'
        ? matrixCosmetics.map(({ id }) => id)
        : parseList(value);
      index += 1;
    } else if (argument === '--water') {
      options.water = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--pose') {
      options.pose = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--action') {
      options.action = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--timeline') {
      options.timeline = Number(readValue(args, index, argument));
      index += 1;
    } else {
      throw new Error(`Opção desconhecida: ${argument}`);
    }
  }

  const unknownSubject = options.subjects.find((subject) => !CAPTURE_SUBJECTS[subject]);
  if (unknownSubject) throw new Error(`Assunto desconhecido: ${unknownSubject}`);
  if (!Number.isInteger(options.size) || options.size < 256 || options.size > 2048) {
    throw new Error('--size deve ser um inteiro entre 256 e 2048.');
  }
  if (!Number.isInteger(options.columns) || options.columns < 1 || options.columns > 6) {
    throw new Error('--columns deve ser um inteiro entre 1 e 6.');
  }
  if (!['pbr', 'classic'].includes(options.material)) throw new Error('--material deve ser pbr ou classic.');
  options.cosmetics = resolveCosmetics(customizationCatalog.cosmetics, options.cosmeticIds);
  if (!['empty', 'low', 'mid', 'high', 'full'].includes(options.water)) {
    throw new Error('--water deve ser empty, low, mid, high ou full.');
  }
  if (options.pose && !['neutral', 'first', 'third'].includes(options.pose)) {
    throw new Error('--pose deve ser neutral, first ou third.');
  }
  if (!['idle', 'sprinkle'].includes(options.action)) throw new Error('--action deve ser idle ou sprinkle.');
  if (!Number.isFinite(options.timeline) || options.timeline < 0) throw new Error('--timeline deve ser um número positivo.');

  if (!options.output) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    options.output = path.join(projectDirectory, 'out', 'model-captures', stamp);
  }
  return options;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function createContactSheet(context, captures, metadata) {
  const displaySize = metadata.displaySize;
  const gap = 14;
  const padding = 28;
  const labelHeight = 42;
  const width = padding * 2 + metadata.columns * displaySize + (metadata.columns - 1) * gap;
  const rows = Math.ceil(captures.length / metadata.columns);
  const height = padding * 2 + 102 + rows * (displaySize + labelHeight) + (rows - 1) * gap;
  const page = await context.newPage();
  await page.setViewportSize({ width, height });

  const tiles = await Promise.all(captures.map(async (capture) => {
    const image = (await readFile(capture.path)).toString('base64');
    return `
      <figure>
        <img src="data:image/png;base64,${image}" alt="${escapeHtml(capture.label)}">
        <figcaption>${escapeHtml(capture.label)}</figcaption>
      </figure>`;
  }));

  await page.setContent(`<!doctype html>
    <html lang="pt-BR">
      <head><meta charset="utf-8"><style>
        * { box-sizing: border-box; }
        html, body { margin: 0; background: #0b1113; color: #e7eeeb; font-family: Inter, "Segoe UI", sans-serif; }
        .sheet { width: ${width}px; min-height: ${height}px; padding: ${padding}px; background: linear-gradient(145deg, #111d20, #0b1214); }
        header { height: 88px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
        h1 { margin: 0 0 7px; font-size: 28px; font-weight: 650; letter-spacing: -0.02em; }
        p { margin: 0; color: #91aaa5; font-size: 14px; }
        .badge { padding: 8px 11px; border: 1px solid #38534f; border-radius: 999px; color: #a8d4c9; font: 600 11px/1 monospace; letter-spacing: .08em; text-transform: uppercase; }
        main { display: grid; grid-template-columns: repeat(${metadata.columns}, ${displaySize}px); gap: ${gap}px; }
        figure { margin: 0; overflow: hidden; border: 1px solid #2b4140; border-radius: 12px; background: #162326; box-shadow: 0 14px 34px rgba(0,0,0,.18); }
        img { display: block; width: ${displaySize}px; height: ${displaySize}px; object-fit: cover; }
        figcaption { height: ${labelHeight}px; padding: 13px 14px; color: #c7d6d2; font-size: 13px; line-height: 16px; }
      </style></head>
      <body><section class="sheet">
        <header><div><h1>${escapeHtml(metadata.title)}</h1><p>${escapeHtml(metadata.subtitle)}</p></div><span class="badge">Bedrock preview</span></header>
        <main>${tiles.join('')}</main>
      </section></body>
    </html>`);
  await page.locator('.sheet').screenshot({ path: metadata.output });
  await page.close();
}

async function captureSubject(page, context, subjectId, cosmetic, options) {
  const subject = CAPTURE_SUBJECTS[subjectId];
  const subjectDirectory = options.cosmetics.length > 1
    ? path.join(options.output, subjectId, cosmetic.id)
    : path.join(options.output, subjectId);
  await mkdir(subjectDirectory, { recursive: true });

  const configuration = await page.evaluate((captureOptions) => (
    window.__ASPERGILLUM_CAPTURE__.configure(captureOptions)
  ), {
    subject: subjectId,
    material: options.material,
    cosmetic: cosmetic.id,
    water: options.water,
    pose: options.pose,
    action: options.action,
    timeline: options.timeline,
    grid: options.grid,
    wireframe: options.wireframe,
  });

  const captures = [];
  for (const view of options.views) {
    const viewState = await page.evaluate((viewId) => (
      window.__ASPERGILLUM_CAPTURE__.capture(viewId)
    ), view.id);
    const output = path.join(subjectDirectory, `${view.id}.png`);
    const prefix = 'data:image/png;base64,';
    if (!viewState.dataUrl.startsWith(prefix)) throw new Error(`Canvas inválido na vista ${view.id}.`);
    await writeFile(output, Buffer.from(viewState.dataUrl.slice(prefix.length), 'base64'));
    captures.push({
      id: view.id,
      label: view.label,
      path: output,
      camera: viewState.camera,
      target: viewState.target,
    });
  }

  const contactSheet = path.join(subjectDirectory, 'contact-sheet.png');
  await createContactSheet(context, captures, {
    title: subject.label,
    subtitle: `${cosmeticLabel(cosmetic)} · ${options.material.toUpperCase()} · ${options.views.length} vistas · pack ${packageInfo.aspergillum.releaseLabel}`,
    columns: options.columns,
    displaySize: Math.min(options.size, 520),
    output: contactSheet,
  });

  return {
    ...configuration,
    cosmetic: {
      id: cosmetic.id,
      label: cosmeticLabel(cosmetic),
      metal: cosmetic.metal,
      grip: cosmetic.grip,
      index: cosmetic.index,
    },
    captures: captures.map((capture) => ({
      ...capture,
      path: path.relative(options.output, capture.path).split(path.sep).join('/'),
    })),
    contactSheet: path.relative(options.output, contactSheet).split(path.sep).join('/'),
    matrixCapture: captures.find(({ id }) => id === 'front-right') ?? captures[0],
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

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
    if (!address || typeof address === 'string') throw new Error('O servidor de captura não publicou uma porta TCP.');
    const url = `http://127.0.0.1:${address.port}/bedrock-renderer.html`;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.setViewportSize({ width: options.size, height: options.size });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const api = window.__ASPERGILLUM_CAPTURE__;
      return Boolean(api?.ready || api?.error);
    });
    const runtimeError = await page.evaluate(() => window.__ASPERGILLUM_CAPTURE__.error);
    if (runtimeError) throw new Error(`Falha no renderer: ${runtimeError}`);

    const subjects = [];
    for (const subjectId of options.subjects) {
      const variants = [];
      for (const cosmetic of options.cosmetics) {
        process.stdout.write(`Capturando ${CAPTURE_SUBJECTS[subjectId].label} · ${cosmeticLabel(cosmetic)}...\n`);
        variants.push(await captureSubject(page, context, subjectId, cosmetic, options));
      }

      let finishMatrix = null;
      if (variants.length > 1) {
        const matrixOutput = path.join(options.output, subjectId, 'finish-matrix.png');
        await createContactSheet(
          context,
          variants.map((variant) => ({
            ...variant.matrixCapture,
            label: variant.cosmetic.label,
          })),
          {
            title: `${CAPTURE_SUBJECTS[subjectId].label} · acabamentos`,
            subtitle: `${options.material.toUpperCase()} · vista ${variants[0].matrixCapture.label} · pack ${packageInfo.aspergillum.releaseLabel}`,
            columns: Math.min(4, options.columns),
            displaySize: Math.min(options.size, 420),
            output: matrixOutput,
          },
        );
        finishMatrix = path.relative(options.output, matrixOutput).split(path.sep).join('/');
      }

      for (const variant of variants) delete variant.matrixCapture;
      subjects.push({
        id: subjectId,
        label: CAPTURE_SUBJECTS[subjectId].label,
        finishMatrix,
        variants,
      });
    }
    if (pageErrors.length) throw new Error(`Erros no browser:\n${pageErrors.join('\n')}`);

    const manifest = {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      source: 'packs/resource',
      pack: {
        releaseLabel: packageInfo.aspergillum.releaseLabel,
        version: packageInfo.version,
      },
      options: {
        size: options.size,
        columns: options.columns,
        material: options.material,
        cosmetics: options.cosmetics.map(({ id }) => id),
        water: options.water,
        pose: options.pose ?? 'subject-default',
        action: options.action,
        timeline: options.timeline,
        grid: options.grid,
        wireframe: options.wireframe,
        views: options.views.map(({ id }) => id),
      },
      subjects,
      limitation: 'Preview Three.js para diagnóstico; não equivale ao renderer proprietário do Minecraft Bedrock.',
    };
    await writeFile(path.join(options.output, 'capture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    process.stdout.write(`Capturas geradas em ${options.output}\n`);
  } finally {
    await browser?.close();
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
