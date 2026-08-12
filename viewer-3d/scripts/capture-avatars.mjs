import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  AVATAR_ACTIONS,
  AVATAR_MODELS,
  DEFAULT_AVATAR_PRESET,
  resolveAvatarCaptureViews,
  validateSkinDimensions,
} from '../src/shared/avatar-contract.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const projectDirectory = path.resolve(viewerDirectory, '..');
const projectPackage = JSON.parse(await readFile(path.join(projectDirectory, 'package.json'), 'utf8'));
const viewerPackage = JSON.parse(await readFile(path.join(viewerDirectory, 'package.json'), 'utf8'));
const defaultSkinPath = path.join(viewerDirectory, 'public', DEFAULT_AVATAR_PRESET.skin);

const HELP = `
Captura um jogador Bedrock com skin e aspersório vinculados ao rightItem.

Uso:
  npm run capture:avatars -- [opções]

Opções:
  --skin <arquivo>       PNG 64×64 ou 128×128 (padrão: Batina preta com pelerine)
  --model <perfil>       wide ou slim (padrão: wide)
  --action <ação>        idle, load ou sprinkle (padrão: idle)
  --times <s,...>        instantes; sem valor usa os quadros-chave da ação
  --views <id,...>       vistas na ordem solicitada (padrão: 5 vistas corporais)
  --perspective <modo>   third ou first (padrão: third)
  --material <modo>      pbr ou classic (padrão: pbr)
  --cosmetic <id>        acabamento do catálogo (padrão: classic)
  --size <px>            largura e altura 320..2048 (padrão: 720)
  --width <px>           largura 320..2048; útil para viewmodel 16:9
  --height <px>          altura 320..2048; útil para viewmodel 16:9
  --columns <n>          1..6 na prancha (padrão: 3)
  --output <pasta>       destino (padrão: out/avatar-captures/<timestamp>)
  --no-outer-layers      oculta chapéu, jaqueta, mangas e calças externas
  --grid                 inclui grade diagnóstica
  --wireframe            sobrepõe o modo wireframe
  --transparent          fundo transparente
  --help                 mostra esta ajuda

Vistas:
  front, front-right, right, back, left, grip, head, first-person
`;

function parseList(value) {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} exige um valor.`);
  return value;
}

function defaultTimes(action) {
  if (action === 'load') return [0, 0.25, 0.46, 0.54, 0.78, 1.1];
  if (action === 'sprinkle') return [0, 0.09, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.9];
  return [0];
}

function parseArgs(args) {
  const options = {
    skin: defaultSkinPath,
    model: 'wide',
    action: 'idle',
    times: null,
    views: resolveAvatarCaptureViews(),
    perspective: 'third',
    material: 'pbr',
    cosmetic: 'classic',
    size: 720,
    width: 720,
    height: 720,
    columns: 3,
    output: null,
    outerLayers: true,
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
    else if (argument === '--no-outer-layers') options.outerLayers = false;
    else if (argument === '--skin') {
      options.skin = path.resolve(projectDirectory, readValue(args, index, argument));
      index += 1;
    } else if (argument === '--model') {
      options.model = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--action') {
      options.action = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--times' || argument === '--time') {
      options.times = parseList(readValue(args, index, argument)).map(Number);
      index += 1;
    } else if (argument === '--views') {
      options.views = resolveAvatarCaptureViews(parseList(readValue(args, index, argument)));
      index += 1;
    } else if (argument === '--perspective') {
      options.perspective = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--material') {
      options.material = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--cosmetic') {
      options.cosmetic = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--size') {
      options.size = Number(readValue(args, index, argument));
      options.width = options.size;
      options.height = options.size;
      index += 1;
    } else if (argument === '--width') {
      options.width = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--height') {
      options.height = Number(readValue(args, index, argument));
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

  if (!AVATAR_MODELS[options.model]) throw new Error('--model deve ser wide ou slim.');
  if (!AVATAR_ACTIONS[options.action]) throw new Error('--action deve ser idle, load ou sprinkle.');
  if (!['first', 'third'].includes(options.perspective)) throw new Error('--perspective deve ser first ou third.');
  if (!['pbr', 'classic'].includes(options.material)) throw new Error('--material deve ser pbr ou classic.');
  if (![options.width, options.height].every((value) => (
    Number.isInteger(value) && value >= 320 && value <= 2048
  ))) {
    throw new Error('--size, --width e --height devem ser inteiros entre 320 e 2048.');
  }
  if (!Number.isInteger(options.columns) || options.columns < 1 || options.columns > 6) {
    throw new Error('--columns deve ser um inteiro entre 1 e 6.');
  }
  options.times ??= defaultTimes(options.action);
  const duration = AVATAR_ACTIONS[options.action].duration;
  if (options.times.some((value) => !Number.isFinite(value) || value < 0 || value > duration)) {
    throw new Error(`--times deve conter valores entre 0 e ${duration}.`);
  }
  if (!options.output) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    options.output = path.join(projectDirectory, 'out', 'avatar-captures', stamp);
  }
  return options;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function fingerprint(filePath) {
  const bytes = await readFile(filePath);
  return {
    path: path.relative(projectDirectory, filePath).split(path.sep).join('/'),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function inspectPng(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature || buffer.length < 24) {
    throw new Error('O arquivo de skin não é um PNG válido.');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!validateSkinDimensions(width, height)) {
    throw new Error(`A skin deve medir 64×64 ou 128×128; recebida ${width}×${height}.`);
  }
  return { width, height };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function timeKey(time) {
  return Number(time).toFixed(3).replace('.', '-');
}

async function createContactSheet(context, captures, options) {
  const tileWidth = Math.min(options.width, 640);
  const tileHeight = Math.round(tileWidth * (options.height / options.width));
  const gap = 10;
  const padding = 24;
  const captionHeight = 42;
  const rows = Math.ceil(captures.length / options.columns);
  const width = (padding * 2) + (options.columns * tileWidth) + ((options.columns - 1) * gap);
  const height = (padding * 2) + 86 + (rows * (tileHeight + captionHeight)) + ((rows - 1) * gap);
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  const figures = await Promise.all(captures.map(async (capture) => {
    const image = (await readFile(capture.absolutePath)).toString('base64');
    return `<figure><img src="data:image/png;base64,${image}" alt="${escapeHtml(capture.label)}"><figcaption>${escapeHtml(capture.label)}</figcaption></figure>`;
  }));
  await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#0d1416;color:#e8eeeb;font-family:Inter,"Segoe UI",sans-serif}.sheet{width:${width}px;min-height:${height}px;padding:${padding}px;background:#111a1c}header{height:72px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px}h1{margin:0 0 6px;font-size:24px;font-weight:650}p{margin:0;color:#91a39e;font-size:12px}.badge{padding:6px 8px;border:1px solid #49635e;color:#a4d4c4;font:650 9px/1 monospace;letter-spacing:.08em}main{display:grid;grid-template-columns:repeat(${options.columns},${tileWidth}px);gap:${gap}px}figure{margin:0;overflow:hidden;border:1px solid #2d4140;background:#172224}img{display:block;width:${tileWidth}px;height:${tileHeight}px;object-fit:cover}figcaption{height:${captionHeight}px;padding:12px;color:#c8d3cf;font-size:11px}
    </style></head><body><section class="sheet"><header><div><h1>${escapeHtml(options.title)}</h1><p>${escapeHtml(options.subtitle)}</p></div><span class="badge">AVATAR TRACE</span></header><main>${figures.join('')}</main></section></body></html>`);
  await page.locator('.sheet').screenshot({ path: options.output });
  await page.close();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  const skinBytes = await readFile(options.skin);
  const skinDimensions = inspectPng(skinBytes);
  const skinFingerprint = await fingerprint(options.skin);
  const skinSource = `data:image/png;base64,${skinBytes.toString('base64')}`;
  await mkdir(options.output, { recursive: true });

  const sourceFiles = [
    path.join(projectDirectory, 'packs', 'resource', 'models', 'entity', 'aspergillum.geo.json'),
    path.join(projectDirectory, 'packs', 'resource', 'attachables', 'aspergillum.attachable.json'),
    path.join(projectDirectory, 'packs', 'resource', 'animations', 'aspergillum.hold.animation.json'),
    path.join(projectDirectory, 'packs', 'resource', 'animations', 'aspergillum.action.animation.json'),
  ];
  const sourceFingerprints = await Promise.all(sourceFiles.map(fingerprint));
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
    await page.setViewportSize({ width: options.width, height: options.height });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${address.port}/avatar-lab.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const api = window.__ASPERGILLUM_AVATAR_CAPTURE__;
      return Boolean(api?.ready || api?.error);
    });
    const runtimeError = await page.evaluate(() => window.__ASPERGILLUM_AVATAR_CAPTURE__.error);
    if (runtimeError) throw new Error(`Falha no Avatar Lab: ${runtimeError}`);

    const configured = await page.evaluate((configuration) => (
      window.__ASPERGILLUM_AVATAR_CAPTURE__.configure(configuration)
    ), {
      skinSource,
      skinMetadata: {
        label: path.basename(options.skin),
        reference: skinFingerprint.path,
        width: skinDimensions.width,
        height: skinDimensions.height,
        sha256: skinFingerprint.sha256,
      },
      model: options.model,
      action: options.action,
      time: options.times[0],
      perspective: options.perspective,
      material: options.material,
      cosmetic: options.cosmetic,
      outerLayers: options.outerLayers,
      grid: options.grid,
      wireframe: options.wireframe,
      transparent: options.transparent,
    });

    const captures = [];
    for (const time of options.times) {
      await page.evaluate((value) => window.__ASPERGILLUM_AVATAR_CAPTURE__.setTime(value), time);
      for (const view of options.views) {
        process.stdout.write(`Capturando ${view.label} · ${options.action} ${time.toFixed(3)} s...\n`);
        const result = await page.evaluate((viewId) => (
          window.__ASPERGILLUM_AVATAR_CAPTURE__.capture(viewId)
        ), view.id);
        const fileName = `${options.action}-${timeKey(time)}s-${view.id}.png`;
        const absolutePath = path.join(options.output, fileName);
        const prefix = 'data:image/png;base64,';
        if (!result.dataUrl.startsWith(prefix)) throw new Error(`Canvas inválido em ${view.id}.`);
        await writeFile(absolutePath, Buffer.from(result.dataUrl.slice(prefix.length), 'base64'));
        captures.push({
          view: view.id,
          time,
          label: `${view.label} · ${time.toFixed(3)} s`,
          absolutePath,
          path: fileName,
          camera: result.camera,
          target: result.target,
          perspective: result.perspective,
          binding: result.snapshot.binding,
          collision: result.snapshot.collision,
        });
      }
    }
    if (pageErrors.length) throw new Error(`Erros no browser:\n${pageErrors.join('\n')}`);

    const contactSheet = path.join(options.output, 'contact-sheet.png');
    await createContactSheet(context, captures, {
      width: options.width,
      height: options.height,
      columns: options.columns,
      title: 'Jogador com aspersório',
      subtitle: `${path.basename(options.skin)} · ${options.model} · ${options.action} · ${options.material.toUpperCase()} · pack ${projectPackage.aspergillum.releaseLabel}`,
      output: contactSheet,
    });

    const captureConfiguration = {
      model: options.model,
      action: options.action,
      times: options.times,
      views: options.views.map(({ id }) => id),
      perspective: options.perspective,
      material: options.material,
      cosmetic: options.cosmetic,
      outerLayers: options.outerLayers,
      grid: options.grid,
      wireframe: options.wireframe,
      transparent: options.transparent,
      width: options.width,
      height: options.height,
      columns: options.columns,
    };
    const manifest = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      tool: {
        name: viewerPackage.name,
        version: viewerPackage.version,
        captureApiVersion: 1,
        three: viewerPackage.dependencies.three,
        playwright: viewerPackage.devDependencies.playwright,
      },
      pack: {
        releaseLabel: projectPackage.aspergillum.releaseLabel,
        version: projectPackage.version,
      },
      inputs: {
        skin: { ...skinFingerprint, ...skinDimensions, model: options.model },
        sources: sourceFingerprints,
        configurationSha256: sha256(Buffer.from(JSON.stringify(captureConfiguration))),
      },
      options: captureConfiguration,
      resolved: {
        geometry: configured.runtime.geometry,
        attachable: configured.runtime.attachable,
        binding: configured.runtime.binding,
        exactBinding: configured.binding.exact,
        bindingError: configured.binding.error,
        allFramesHeadClear: captures.every(({ collision }) => collision.headClear),
        allFramesGripEngaged: captures.every(({ collision }) => collision.gripEngaged),
      },
      captures: captures.map(({ absolutePath, ...capture }) => capture),
      contactSheet: path.basename(contactSheet),
      limitation: 'Preview diagnóstica em Three.js; o renderer proprietário e a câmera do Minecraft Bedrock continuam sendo a autoridade visual final.',
    };
    await writeFile(path.join(options.output, 'capture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    process.stdout.write(`Capturas de avatar geradas em ${options.output}\n`);
  } finally {
    await browser?.close();
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
