import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  cosmeticLabel,
  sortCosmeticsForMatrix,
} from '../src/shared/cosmetic-contract.js';
import {
  INVENTORY_ICON_CONFIG,
  INVENTORY_ICON_RENDERER_VERSION,
  inventoryIconFileName,
} from '../src/shared/inventory-icon-contract.js';
import {
  alphaBounds,
  renderInventoryIcon,
} from './lib/inventory-icon-image.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const projectDirectory = path.resolve(viewerDirectory, '..');
const customizationCatalogPath = path.join(
  projectDirectory,
  'assets-src',
  'customization',
  'catalog.json',
);
const authoritativeDirectory = path.join(projectDirectory, 'assets-src', 'inventory-icons');
const packDirectory = path.join(projectDirectory, 'packs', 'resource', 'textures', 'items');

const HELP = `
Renderiza ícones 32 × 32 a partir do modelo, texturas e materiais reais do aspersório.

Uso:
  npm run render:inventory-icons -- [opções]

Opções:
  --output <pasta>  destino da candidata (padrão: out/inventory-icon-renders/<timestamp>)
  --apply           promove os 16 PNGs para assets-src e aplica cópias byte-idênticas ao pack
  --help            mostra esta ajuda

Sem --apply, nenhuma fonte de produção nem arquivo do pack é alterado.
`;

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} exige um valor.`);
  return value;
}

function parseArgs(args) {
  const options = { output: null, apply: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--apply') options.apply = true;
    else if (argument === '--output') {
      options.output = path.resolve(projectDirectory, readValue(args, index, argument));
      index += 1;
    } else {
      throw new Error(`Opção desconhecida: ${argument}`);
    }
  }
  if (!options.output) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    options.output = path.join(projectDirectory, 'out', 'inventory-icon-renders', stamp);
  }
  if (options.output === projectDirectory || !options.output.startsWith(`${projectDirectory}${path.sep}`)) {
    throw new Error('A saída precisa permanecer dentro do workspace.');
  }
  return options;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function renderCosmetic(page, cosmetic, outputDirectory) {
  const configuration = await page.evaluate((captureOptions) => (
    window.__ASPERGILLUM_CAPTURE__.configure(captureOptions)
  ), {
    subject: INVENTORY_ICON_CONFIG.subject,
    material: INVENTORY_ICON_CONFIG.material,
    cosmetic: cosmetic.id,
    lighting: INVENTORY_ICON_CONFIG.lighting,
    transparent: INVENTORY_ICON_CONFIG.transparent,
    water: INVENTORY_ICON_CONFIG.water,
    pose: INVENTORY_ICON_CONFIG.pose,
    grid: false,
    wireframe: false,
  });

  await page.evaluate(async ({ view, framing }) => {
    window.__ASPERGILLUM_CAPTURE__.setView(view, framing);
    window.__ASPERGILLUM_CAPTURE__.render();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.__ASPERGILLUM_CAPTURE__.render();
  }, {
    view: INVENTORY_ICON_CONFIG.view,
    framing: INVENTORY_ICON_CONFIG.framing,
  });
  await page.waitForTimeout(120);
  const capture = await page.evaluate(({ view, framing }) => (
    window.__ASPERGILLUM_CAPTURE__.capture(view, framing)
  ), {
    view: INVENTORY_ICON_CONFIG.view,
    framing: INVENTORY_ICON_CONFIG.framing,
  });
  const prefix = 'data:image/png;base64,';
  if (!capture.dataUrl.startsWith(prefix)) throw new Error(`Canvas inválido para ${cosmetic.id}.`);

  const sourceBytes = Buffer.from(capture.dataUrl.slice(prefix.length), 'base64');
  const sourceImage = PNG.sync.read(sourceBytes);
  const sourceBounds = alphaBounds(sourceImage, INVENTORY_ICON_CONFIG.sourceAlphaThreshold);
  const sourceCoverage = sourceBounds
    ? sourceBounds.visiblePixels / (sourceImage.width * sourceImage.height)
    : 0;
  if (
    !sourceBounds
    || sourceBounds.height < sourceImage.height * 0.45
    || sourceCoverage < 0.008
  ) {
    throw new Error(
      `Captura transparente incompleta para ${cosmetic.id} `
      + `(altura ${sourceBounds?.height ?? 0}px; cobertura ${(sourceCoverage * 100).toFixed(2)}%).`,
    );
  }
  const iconImage = renderInventoryIcon(sourceImage, INVENTORY_ICON_CONFIG);
  const iconBytes = PNG.sync.write(iconImage, { colorType: 6 });
  const iconBounds = alphaBounds(iconImage, 8);
  const file = inventoryIconFileName(cosmetic);
  const sourceFile = path.join(outputDirectory, 'source-captures', `${cosmetic.id}.png`);
  const iconFile = path.join(outputDirectory, 'icons', file);
  await mkdir(path.dirname(sourceFile), { recursive: true });
  await mkdir(path.dirname(iconFile), { recursive: true });
  await writeFile(sourceFile, sourceBytes);
  await writeFile(iconFile, iconBytes);

  return {
    id: cosmetic.id,
    label: cosmeticLabel(cosmetic),
    metal: cosmetic.metal,
    grip: cosmetic.grip,
    index: cosmetic.index,
    file,
    bytes: iconBytes.byteLength,
    sha256: sha256(iconBytes),
    alphaBounds: iconBounds,
    sourceCapture: {
      file: `source-captures/${cosmetic.id}.png`,
      bytes: sourceBytes.byteLength,
      sha256: sha256(sourceBytes),
      alphaBounds: sourceBounds,
      configuration,
      view: {
        id: capture.id,
        camera: capture.camera,
        target: capture.target,
        framing: capture.framing,
      },
    },
  };
}

async function createContactSheet(context, cosmetics, icons, output) {
  const page = await context.newPage();
  const cards = await Promise.all(icons.map(async (icon, index) => {
    const bytes = await readFile(path.join(output, 'icons', icon.file));
    const source = `data:image/png;base64,${bytes.toString('base64')}`;
    return `<figure>
      <div class="icon-stage"><img src="${source}" alt=""></div>
      <figcaption><strong>${escapeHtml(cosmetics[index].metal)}</strong><span>${escapeHtml(cosmetics[index].grip)}</span></figcaption>
    </figure>`;
  }));
  await page.setViewportSize({ width: 960, height: 860 });
  await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #0c1315; color: #e7eeeb; font-family: "Segoe UI", sans-serif; }
    main { width: 960px; min-height: 860px; padding: 34px 42px 42px; background: linear-gradient(150deg, #132124, #0b1214); }
    header { display: flex; align-items: end; justify-content: space-between; margin-bottom: 25px; }
    h1 { margin: 0 0 5px; font-size: 28px; letter-spacing: -.03em; }
    p { margin: 0; color: #91aaa5; font-size: 14px; }
    code { color: #b4dbd1; font-size: 12px; }
    section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    figure { margin: 0; overflow: hidden; border: 1px solid #304542; border-radius: 12px; background: #111b1d; }
    .icon-stage { height: 145px; display: grid; place-items: center; background-color: #182527; background-image: linear-gradient(45deg,#1e2d2f 25%,transparent 25%),linear-gradient(-45deg,#1e2d2f 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1e2d2f 75%),linear-gradient(-45deg,transparent 75%,#1e2d2f 75%); background-size: 24px 24px; background-position: 0 0,0 12px,12px -12px,-12px 0; }
    img { width: 112px; height: 112px; image-rendering: pixelated; }
    figcaption { display: flex; justify-content: space-between; gap: 8px; padding: 11px 12px 12px; font-size: 12px; border-top: 1px solid #273a38; }
    strong { color: #d7e5e1; font-weight: 650; }
    span { color: #86a29b; text-align: right; }
  </style></head><body><main><header><div><h1>Ícones de inventário · matriz 4×4</h1><p>Modelo real · PBR para inventário · saída nativa 32 × 32</p></div><code>renderer v${INVENTORY_ICON_RENDERER_VERSION}</code></header><section>${cards.join('')}</section></main></body></html>`);
  await page.locator('main').screenshot({
    path: path.join(output, 'inventory-icon-contact-sheet.png'),
    animations: 'disabled',
    type: 'png',
  });
  await page.close();
}

async function promote(outputDirectory, manifest) {
  await mkdir(authoritativeDirectory, { recursive: true });
  await mkdir(packDirectory, { recursive: true });
  for (const icon of manifest.icons) {
    const candidate = path.join(outputDirectory, 'icons', icon.file);
    await copyFile(candidate, path.join(authoritativeDirectory, icon.file));
    await copyFile(candidate, path.join(packDirectory, icon.file));
  }
  await writeFile(
    path.join(authoritativeDirectory, 'inventory-icon-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  const [catalog, packageInfo] = await Promise.all([
    readFile(customizationCatalogPath, 'utf8').then(JSON.parse),
    readFile(path.join(projectDirectory, 'package.json'), 'utf8').then(JSON.parse),
  ]);
  const cosmetics = sortCosmeticsForMatrix(
    catalog.cosmetics,
    catalog.metalFinishes,
    catalog.gripFinishes,
  );
  if (cosmetics.length !== 16) throw new Error(`O pipeline exige a matriz 4 × 4 completa; recebeu ${cosmetics.length} acabamentos.`);
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
    if (!address || typeof address === 'string') throw new Error('O renderer não publicou uma porta TCP.');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: {
        width: INVENTORY_ICON_CONFIG.sourceSize,
        height: INVENTORY_ICON_CONFIG.sourceSize,
      },
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const baseUrl = `http://127.0.0.1:${address.port}`;
    await page.goto(`${baseUrl}/bedrock-renderer.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const api = window.__ASPERGILLUM_CAPTURE__;
      return Boolean(api?.ready || api?.error);
    }, null, { timeout: 60000 });
    const runtimeError = await page.evaluate(() => window.__ASPERGILLUM_CAPTURE__.error);
    if (runtimeError) throw new Error(`Falha no renderer: ${runtimeError}`);

    const icons = [];
    for (const cosmetic of cosmetics) {
      process.stdout.write(`Renderizando ${cosmeticLabel(cosmetic)}...\n`);
      icons.push(await renderCosmetic(page, cosmetic, options.output));
    }
    if (pageErrors.length) throw new Error(`Erros no browser:\n${pageErrors.join('\n')}`);
    if (consoleErrors.length) throw new Error(`Erros no console:\n${consoleErrors.join('\n')}`);

    const manifest = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      renderer: {
        name: 'Aspergillum Inventory Icon Renderer',
        version: INVENTORY_ICON_RENDERER_VERSION,
        captureApiVersion: 3,
      },
      renderedAgainst: {
        version: packageInfo.version,
        releaseLabel: packageInfo.aspergillum.releaseLabel,
      },
      source: {
        geometry: 'packs/resource/models/entity/aspergillum.geo.json',
        colorMaps: 'packs/resource/textures/entity/aspergillum*.png',
        normalMaps: 'packs/resource/textures/entity/aspergillum*_normal.png',
        mersMaps: 'packs/resource/textures/entity/aspergillum*_mer.png',
      },
      config: INVENTORY_ICON_CONFIG,
      icons,
      limitation: 'Render Three.js derivado dos assets reais; o teste do inventário no Minecraft Bedrock continua obrigatório para escala, mipmapping, fundo e cache reais.',
    };
    await writeFile(
      path.join(options.output, 'inventory-icon-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    await createContactSheet(context, cosmetics, icons, options.output);
    if (options.apply) await promote(options.output, manifest);
    await context.close();
    process.stdout.write(
      options.apply
        ? `Ícones promovidos para assets-src e aplicados ao pack; evidência em ${options.output}\n`
        : `Candidata gerada em ${options.output}; use --apply somente após revisar a prancha.\n`,
    );
  } finally {
    await browser?.close();
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
