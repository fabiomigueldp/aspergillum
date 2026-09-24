import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewerDirectory = path.resolve(scriptDirectory, '..');
const projectDirectory = path.resolve(viewerDirectory, '..');

const HELP = `
Renderiza um convite quadrado com avatar e equipamento reais do workspace Bedrock.

Uso:
  npm run render:invitation -- [opções]

Opções:
  --output <arquivo>      PNG final (padrão: out/invitation-renders/<timestamp>.png)
  --size <px>             lado 512..4096 (padrão: 2048)
  --title <texto>         título (padrão: PRIMÍCIAS SACERDOTAIS)
  --celebrant <texto>     nome do sacerdote, exibido sob o título
  --feast <texto>         celebração exibida abaixo do título
  --venue <texto>         local exibido abaixo da celebração
  --time <texto>          horário exibido em destaque
  --addon <id>            projeto (padrão: ornatum)
  --equipment <id|none>   equipamento/localId, ou none para avatar sem item (padrão: barretepadre)
  --help                  mostra esta ajuda
`;

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} exige um valor.`);
  return value;
}

function parseArgs(args) {
  const options = {
    output: null,
    size: 2048,
    title: 'PRIMÍCIAS SACERDOTAIS',
    celebrant: '',
    feast: '',
    venue: '',
    time: '',
    addon: 'ornatum',
    equipment: 'barretepadre',
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--output') {
      options.output = path.resolve(projectDirectory, readValue(args, index, argument));
      index += 1;
    } else if (argument === '--size') {
      options.size = Number(readValue(args, index, argument));
      index += 1;
    } else if (argument === '--title') {
      options.title = readValue(args, index, argument).trim();
      index += 1;
    } else if (argument === '--celebrant') {
      options.celebrant = readValue(args, index, argument).trim();
      index += 1;
    } else if (argument === '--feast') {
      options.feast = readValue(args, index, argument).trim();
      index += 1;
    } else if (argument === '--venue') {
      options.venue = readValue(args, index, argument).trim();
      index += 1;
    } else if (argument === '--time') {
      options.time = readValue(args, index, argument).trim();
      index += 1;
    } else if (argument === '--addon') {
      options.addon = readValue(args, index, argument).trim();
      index += 1;
    } else if (argument === '--equipment') {
      options.equipment = readValue(args, index, argument).trim();
      index += 1;
    } else {
      throw new Error(`Opção desconhecida: ${argument}`);
    }
  }

  if (!Number.isInteger(options.size) || options.size < 512 || options.size > 4096) {
    throw new Error('--size deve ser um inteiro entre 512 e 4096.');
  }
  if (!options.title || options.title.length > 64) {
    throw new Error('--title deve conter entre 1 e 64 caracteres.');
  }
  if (options.celebrant.length > 64) throw new Error('--celebrant deve conter no máximo 64 caracteres.');
  if (options.feast.length > 96) throw new Error('--feast deve conter no máximo 96 caracteres.');
  if (options.venue.length > 96) throw new Error('--venue deve conter no máximo 96 caracteres.');
  if (options.time.length > 32) throw new Error('--time deve conter no máximo 32 caracteres.');
  if (!options.output) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    options.output = path.join(projectDirectory, 'out', 'invitation-renders', `${stamp}.png`);
  }
  return options;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  await mkdir(path.dirname(options.output), { recursive: true });
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
    if (!address || typeof address === 'string') throw new Error('Servidor sem porta TCP.');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: options.size, height: options.size },
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const query = new URLSearchParams({
      addon: options.addon,
      equipment: options.equipment,
      title: options.title,
      celebrant: options.celebrant,
      feast: options.feast,
      venue: options.venue,
      time: options.time,
    });
    await page.goto(
      `http://127.0.0.1:${address.port}/invitation-renderer.html?${query}`,
      { waitUntil: 'networkidle' },
    );
    await page.waitForFunction(() => {
      const renderer = window.__BEDROCK_INVITATION_RENDERER__;
      return Boolean(renderer?.ready || renderer?.error);
    }, null, { timeout: 60000 });

    const runtime = await page.evaluate(() => {
      const renderer = window.__BEDROCK_INVITATION_RENDERER__;
      return { error: renderer.error, metadata: renderer.metadata };
    });
    if (runtime.error) throw new Error(runtime.error);
    if (pageErrors.length) throw new Error(`Erros no browser:\n${pageErrors.join('\n')}`);

    await page.evaluate(() => {
      const renderer = window.__BEDROCK_INVITATION_RENDERER__;
      renderer.scene.render(true);
      renderer.scene.renderer.getContext().finish();
    });
    await page.waitForTimeout(100);

    await page.locator('#invitation-art').screenshot({
      path: options.output,
      animations: 'disabled',
      type: 'png',
    });
    const bytes = await readFile(options.output);
    const manifest = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      output: {
        path: path.relative(projectDirectory, options.output).split(path.sep).join('/'),
        width: options.size,
        height: options.size,
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
      },
      ...runtime.metadata,
      limitation: 'Composição Three.js/HTML com geometria, textura, skin e binding reais; não reproduz o shader proprietário do Minecraft Bedrock.',
    };
    const manifestPath = options.output.replace(/\.png$/i, '.manifest.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    process.stdout.write(`Convite gerado em ${options.output}\n`);
  } finally {
    await browser?.close();
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
