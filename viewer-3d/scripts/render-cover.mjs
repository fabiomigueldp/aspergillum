import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  COVER_RENDERER_VERSION,
  createCoverSearchParams,
  normalizeCoverConfig,
} from '../src/shared/cover-contract.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const projectDirectory = path.resolve(viewerDirectory, '..');
const packageInfo = JSON.parse(await readFile(path.join(projectDirectory, 'package.json'), 'utf8'));

const HELP = `
Renderiza a capa autoral do Aspergillum com os modelos atuais do Resource Pack.

Uso:
  npm run render:cover -- [opções]

Opções:
  --output <pasta>    destino (padrão: out/cover-renders/<timestamp>)
  --size <px>         lado da imagem principal, 512..4096 (padrão: 2048)
  --title <texto>     título, até 24 caracteres (padrão: ASPERGILLUM)
  --cosmetic <id>     acabamento publicado (padrão: classic)
  --material <modo>   pbr ou classic (padrão: pbr)
  --water <nível>     low, mid, high ou full (padrão: full)
  --view <id>         vista do contrato de captura (padrão: front-right)
  --help              mostra esta ajuda
`;

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} exige um valor.`);
  return value;
}

function parseArgs(args) {
  const raw = {
    output: null,
    size: 2048,
    title: undefined,
    cosmetic: undefined,
    material: undefined,
    water: undefined,
    view: undefined,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') raw.help = true;
    else if (argument === '--output') {
      raw.output = path.resolve(projectDirectory, readValue(args, index, argument));
      index += 1;
    } else if (argument === '--size') {
      raw.size = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--title') {
      raw.title = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--cosmetic') {
      raw.cosmetic = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--material') {
      raw.material = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--water') {
      raw.water = readValue(args, index, argument);
      index += 1;
    } else if (argument === '--view') {
      raw.view = readValue(args, index, argument);
      index += 1;
    } else {
      throw new Error(`Opção desconhecida: ${argument}`);
    }
  }

  if (!Number.isInteger(raw.size) || raw.size < 512 || raw.size > 4096) {
    throw new Error('--size deve ser um inteiro entre 512 e 4096.');
  }

  const config = normalizeCoverConfig(raw);
  if (!raw.output) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    raw.output = path.join(projectDirectory, 'out', 'cover-renders', stamp);
  }

  return { ...raw, config };
}

async function renderAtSize(browser, baseUrl, query, size, output) {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { width: size, height: size },
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/cover-renderer.html?${query}`, { waitUntil: 'networkidle' });
    try {
      await page.waitForFunction(() => {
        const api = window.__ASPERGILLUM_COVER__;
        return Boolean(api?.ready || api?.error);
      }, null, { timeout: 60000 });
    } catch (error) {
      const browserState = await page.evaluate(() => {
        const cover = window.__ASPERGILLUM_COVER__;
        const capture = document.querySelector('#bedrock-source')?.contentWindow?.__ASPERGILLUM_CAPTURE__;
        return {
          cover: cover ? { version: cover.version, ready: cover.ready, error: cover.error } : null,
          status: document.querySelector('#render-status')?.textContent ?? null,
          sourceReadyState: document.querySelector('#bedrock-source')?.contentDocument?.readyState ?? null,
          capture: capture ? { version: capture.version, ready: capture.ready, error: capture.error } : null,
        };
      }).catch(() => null);
      throw new Error(
        `${error instanceof Error ? error.message : error}\nEstado do browser: ${JSON.stringify(browserState)}`,
      );
    }

    const runtimeError = await page.evaluate(() => window.__ASPERGILLUM_COVER__.error);
    if (runtimeError) throw new Error(`Falha no compositor: ${runtimeError}`);
    if (pageErrors.length) throw new Error(`Erros no browser:\n${pageErrors.join('\n')}`);
    if (consoleErrors.length) throw new Error(`Erros no console:\n${consoleErrors.join('\n')}`);

    await page.locator('#cover-art').screenshot({
      path: output,
      animations: 'disabled',
      type: 'png',
    });
    return await page.evaluate(() => window.__ASPERGILLUM_COVER__.metadata);
  } finally {
    await context.close();
  }
}

async function inspectOutput(output) {
  const bytes = await readFile(output);
  return {
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
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
    if (!address || typeof address === 'string') throw new Error('O servidor não publicou uma porta TCP.');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const query = createCoverSearchParams(options.config).toString();
    browser = await chromium.launch({ headless: true });
    const sourceOutput = path.join(options.output, `aspergillum-cover-${options.size}.png`);
    const packOutput = path.join(options.output, 'aspergillum-cover-256.png');

    process.stdout.write('Validando composição diretamente em 256 × 256...\n');
    const packMetadata = await renderAtSize(browser, baseUrl, query, 256, packOutput);
    process.stdout.write(`Renderizando capa ${options.size} × ${options.size}...\n`);
    const sourceMetadata = await renderAtSize(browser, baseUrl, query, options.size, sourceOutput);
    const [sourceFile, packFile] = await Promise.all([
      inspectOutput(sourceOutput),
      inspectOutput(packOutput),
    ]);

    const manifest = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      renderer: {
        name: 'Aspergillum Cover Renderer',
        version: COVER_RENDERER_VERSION,
      },
      pack: {
        releaseLabel: packageInfo.aspergillum.releaseLabel,
        version: packageInfo.version,
        source: 'packs/resource',
      },
      config: options.config,
      typography: {
        family: 'Bowlby One SC',
        source: 'Google Fonts',
        file: 'viewer-3d/public/fonts/bowlby-one-sc/BowlbyOneSC-Regular.ttf',
        license: 'viewer-3d/public/fonts/bowlby-one-sc/OFL.txt',
      },
      captures: [
        {
          size: options.size,
          path: path.basename(sourceOutput),
          ...sourceFile,
          metadata: sourceMetadata,
        },
        {
          size: 256,
          path: path.basename(packOutput),
          ...packFile,
          metadata: packMetadata,
        },
      ],
      limitation: 'Composição autoral Three.js/HTML baseada nos assets do pack; não substitui a validação do pack_icon importado no Minecraft Bedrock.',
    };
    await writeFile(
      path.join(options.output, 'cover-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    process.stdout.write(`Capa gerada em ${options.output}\n`);
  } finally {
    await browser?.close();
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
