import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const metadata = readJson(path.join(root, "package.json"));
const defaultReleaseLabel = metadata.aspergillum?.releaseLabel ?? metadata.version;
const numericVersion = parseVersion(metadata.version, "package.json version");

const PACKS = {
  behavior: {
    uuid: "bac9f8bc-71f5-4db7-a0ff-3c5a365749b4",
    source: path.join(root, "packs", "behavior"),
    shared: ["behavior_packs", "pack.asper"],
    world: ["behavior_packs", "pack"],
    reference: "world_behavior_packs.json",
    history: "world_behavior_pack_history.json",
  },
  resource: {
    uuid: "fdb8a79c-8f77-4831-9a5c-8e2b8ecca29e",
    source: path.join(root, "packs", "resource"),
    shared: ["resource_packs", "pack.asper"],
    world: ["resource_packs", "pack"],
    reference: "world_resource_packs.json",
    history: "world_resource_pack_history.json",
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseVersion(value, source) {
  if (Array.isArray(value) && value.length === 3 && value.every(Number.isInteger)) return value;
  if (typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value)) return value.split(".").map(Number);
  throw new Error(`Versão inválida em ${source}: ${JSON.stringify(value)}`);
}

function versionText(version) {
  return version.join(".");
}

function parseArgs(argv) {
  const options = {
    apply: false,
    allWorlds: false,
    dryRun: false,
    profile: undefined,
    release: defaultReleaseLabel,
    world: "devtest",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--all-worlds") options.allWorlds = true;
    else if (argument === "--profile") options.profile = argv[++index];
    else if (argument === "--world") options.world = argv[++index];
    else if (argument === "--release") options.release = argv[++index];
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Argumento desconhecido: ${argument}`);
  }

  if (options.apply && options.dryRun) throw new Error("Use somente --apply ou --dry-run.");
  if (options.allWorlds && options.world !== "devtest") {
    throw new Error("Use --all-worlds sem --world.");
  }
  if (options.release !== defaultReleaseLabel) {
    throw new Error(
      `A fonte atual é ${defaultReleaseLabel}; troque o checkout/package.json antes de sincronizar ${options.release}.`,
    );
  }
  return options;
}

function printHelp() {
  console.log(`Sincroniza os packs atuais do projeto com o Minecraft Bedrock.\n\n` +
    `Uso:\n` +
    `  npm run sync:game -- --apply\n` +
    `  npm run sync:game -- --apply --all-worlds\n` +
    `  npm run sync:game -- --dry-run\n\n` +
    `Opções:\n` +
    `  --apply       executa a substituição; sem isso, apenas mostra o plano\n` +
    `  --dry-run     força o modo de inspeção\n` +
    `  --world NAME  mundo alvo; padrão: devtest\n` +
    `  --all-worlds  atualiza todos os mundos que usam Aspergillum\n` +
    `  --profile ID  perfil Bedrock; detectado automaticamente por padrão\n` +
    `  --release TAG releaseLabel do package.json; padrão: ${defaultReleaseLabel}`);
}

function fullPath(candidate) {
  return path.resolve(candidate);
}

function assertInside(parent, candidate, description) {
  const parentPath = fullPath(parent);
  const candidatePath = fullPath(candidate);
  const prefix = `${parentPath}${path.sep}`;
  if (candidatePath !== parentPath && !candidatePath.startsWith(prefix)) {
    throw new Error(`Caminho fora do escopo de ${description}: ${candidatePath}`);
  }
  return candidatePath;
}

function ensureWindowsBedrockRoot() {
  if (process.platform !== "win32") throw new Error("Esta ferramenta exige Windows e o armazenamento Bedrock local.");
  const appData = process.env.APPDATA;
  if (!appData) throw new Error("APPDATA não está definido.");
  const bedrockRoot = path.join(appData, "Minecraft Bedrock");
  const usersRoot = path.join(bedrockRoot, "Users");
  if (!fs.existsSync(usersRoot)) throw new Error(`Dados Bedrock não encontrados: ${usersRoot}`);
  return { bedrockRoot, usersRoot, appData };
}

function readWorldName(worldPath) {
  const namePath = path.join(worldPath, "levelname.txt");
  return fs.existsSync(namePath) ? fs.readFileSync(namePath, "utf8").trim() : "<sem nome>";
}

function listProfileDirectories(usersRoot) {
  return fs.readdirSync(usersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "Shared")
    .map((entry) => path.join(usersRoot, entry.name));
}

function listWorldDirectories(profileComMojang) {
  const worldsRoot = path.join(profileComMojang, "minecraftWorlds");
  if (!fs.existsSync(worldsRoot)) return [];
  return fs.readdirSync(worldsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const worldPath = path.join(worldsRoot, entry.name);
      return { folder: entry.name, name: readWorldName(worldPath), path: worldPath };
    });
}

function resolveProfile(usersRoot, options) {
  const profiles = listProfileDirectories(usersRoot);
  if (options.profile) {
    const profilePath = path.join(usersRoot, options.profile, "games", "com.mojang");
    if (!fs.existsSync(profilePath)) throw new Error(`Perfil Bedrock não encontrado: ${options.profile}`);
    return { id: options.profile, path: profilePath };
  }

  const candidates = profiles.filter((profilePath) =>
    listWorldDirectories(path.join(profilePath, "games", "com.mojang"))
      .some((world) => world.name === options.world || world.folder === options.world),
  );
  if (candidates.length === 1) {
    const profilePath = candidates[0];
    return { id: path.basename(profilePath), path: path.join(profilePath, "games", "com.mojang") };
  }
  if (candidates.length > 1) {
    throw new Error(`Mais de um perfil contém ${options.world}; informe --profile explicitamente.`);
  }
  if (profiles.length === 1) {
    const profilePath = profiles[0];
    return { id: path.basename(profilePath), path: path.join(profilePath, "games", "com.mojang") };
  }
  throw new Error(`Não foi possível detectar o perfil que contém ${options.world}.`);
}

function readPackEntry(filePath, uuid) {
  if (!fs.existsSync(filePath)) return undefined;
  const entries = readJson(filePath);
  if (!Array.isArray(entries)) throw new Error(`Formato inesperado: ${filePath}`);
  const entry = entries.find((item) => item.pack_id === uuid);
  return entry ? parseVersion(entry.version, filePath) : undefined;
}

function readLocalPack(folder, uuid) {
  const manifestPath = path.join(folder, "manifest.json");
  if (!fs.existsSync(manifestPath)) return undefined;
  const manifest = readJson(manifestPath);
  if (manifest.header?.uuid !== uuid) return undefined;
  return parseVersion(manifest.header.version, manifestPath);
}

function inspectWorld(world, bedrockRoot) {
  const refs = {};
  const local = {};
  for (const [kind, pack] of Object.entries(PACKS)) {
    refs[kind] = readPackEntry(path.join(world.path, pack.reference), pack.uuid);
    local[kind] = readLocalPack(path.join(world.path, ...pack.world), pack.uuid);
  }
  return {
    ...world,
    refs,
    local,
    hasAddon: Object.values(refs).some(Boolean) || Object.values(local).some(Boolean),
    relativePath: path.relative(bedrockRoot, world.path).split(path.sep).join("\\"),
  };
}

function resolveWorld(worlds, requested) {
  const matches = worlds.filter((world) => world.name === requested || world.folder === requested);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Mais de um mundo corresponde a ${requested}.`);
  throw new Error(`Mundo não encontrado: ${requested}`);
}

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(absolute) : [absolute];
    });
}

function packStats(directory) {
  const files = collectFiles(directory);
  return {
    bytes: files.reduce((total, file) => total + fs.statSync(file).size, 0),
    files: files.map((file) => path.relative(directory, file).split(path.sep).join("\\")),
  };
}

function worldStats(worldPath) {
  const files = collectFiles(worldPath);
  const directories = [];
  function collectDirectories(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const absolute = path.join(directory, entry.name);
      directories.push(absolute);
      collectDirectories(absolute);
    }
  }
  collectDirectories(worldPath);
  return {
    bytes: files.reduce((total, file) => total + fs.statSync(file).size, 0),
    directories: directories.length,
    files: files.length,
  };
}

function updateJsonVersions(filePath, uuid, version, history) {
  if (!fs.existsSync(filePath)) return false;
  const value = readJson(filePath);
  if (!Array.isArray(value) && (!history || !Array.isArray(value.packs))) {
    throw new Error(`Formato inesperado: ${filePath}`);
  }
  const entries = history ? value.packs : value;
  let changed = false;
  for (const entry of entries) {
    const entryUuid = history ? entry.uuid : entry.pack_id;
    if (entryUuid !== uuid) continue;
    const current = Array.isArray(entry.version) ? entry.version.join(".") : "";
    if (current !== versionText(version)) {
      entry.version = [...version];
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
  return changed;
}

function copyPack(source, target, bedrockRoot) {
  assertInside(bedrockRoot, target, "dados Bedrock");
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function getMinecraftPackage() {
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", "Get-AppxPackage -Name 'Microsoft.MinecraftUWP*' | Select-Object -First 1 Name,Version,InstallLocation | ConvertTo-Json -Compress"],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0 || !result.stdout.trim()) return undefined;
  try { return JSON.parse(result.stdout.trim()); } catch { return undefined; }
}

function displayVersion(version, currentVersion, releaseLabel) {
  if (!version) return "—";
  const text = versionText(version);
  return text === versionText(currentVersion) ? `${text} (${releaseLabel})` : text;
}

function cloneWorldForMap(world, selectedKinds, currentVersion, releaseLabel) {
  const kinds = selectedKinds.get(world.folder);
  if (!kinds) return world;
  const refs = { ...world.refs };
  const local = { ...world.local };
  for (const kind of kinds) {
    refs[kind] = [...currentVersion];
    local[kind] = [...currentVersion];
  }
  return {
    ...world,
    refs,
    local,
    hasAddon: true,
    currentRelease: releaseLabel,
  };
}

function tableCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|");
}

function renderMap({ bedrockRoot, profile, sharedComMojang, packageInfo, releaseLabel, version, artifactPath, artifactHash, packInfo, world, allWorlds, selectedWorlds, selectedKinds }) {
  const selectedFolders = new Set(selectedWorlds.map((item) => item.folder));
  const projectedWorlds = allWorlds.map((item) => cloneWorldForMap(item, selectedKinds, version, releaseLabel));
  const currentWorldStats = worldStats(world.path);
  const packagePath = packageInfo?.InstallLocation ?? "<AppX não resolvido>";
  const lines = [
    "# Mapa da instalação local",
    "",
    `Mapa gerado por \`tools/sync-installed-addon.mjs\` em **${new Date().toISOString()}**.`,
    "A sincronização usa diretamente `packs/`, substitui os diretórios locais e atualiza os vínculos do mundo selecionado.",
    "",
    "## Instalação do Minecraft",
    "",
    "```text",
    `Pacote AppX: ${packagePath}`,
    `Versão AppX: ${packageInfo?.Version ?? "<não resolvida>"}`,
    `Raiz de dados: ${bedrockRoot}`,
    "```",
    "",
    "## Mapa principal",
    "",
    "```text",
    `${bedrockRoot}`,
    "└── Users",
    "    ├── Shared",
    "    │   └── games\\com.mojang",
    "    │       ├── behavior_packs\\pack.asper",
    "    │       └── resource_packs\\pack.asper",
    "    └── " + profile.id,
    "        └── games\\com.mojang",
    "            └── minecraftWorlds",
    `                └── ${world.folder} (${world.name})`,
    "```",
    "",
    `Shared: \`${sharedComMojang}\``,
    `Perfil: \`${profile.path}\``,
    `Mundo sincronizado nesta execução: \`${world.name}\` (${selectedWorlds.length} alvo(s)).`,
    "",
    "## Aspergillum instalado",
    "",
    `- Rótulo: \`${releaseLabel}\`;`,
    `- Versão numérica dos manifests: \`[${version.join(", ")}]\`;`,
    `- Artefato: \`${artifactPath}\`;`,
    `- SHA-256: \`${artifactHash}\`.`,
    "",
    "| Pack | UUID | Arquivos | Bytes | Caminho compartilhado |",
    "| --- | --- | ---: | ---: | --- |",
    `| Behavior | ${PACKS.behavior.uuid} | ${packInfo.behavior.files.length} | ${packInfo.behavior.bytes} | \`${path.join(sharedComMojang, ...PACKS.behavior.shared)}\` |`,
    `| Resource | ${PACKS.resource.uuid} | ${packInfo.resource.files.length} | ${packInfo.resource.bytes} | \`${path.join(sharedComMojang, ...PACKS.resource.shared)}\` |`,
    "",
    "## Mundo sincronizado",
    "",
    `Nome: **${world.name}**`,
    `Pasta: \`${world.path}\``,
    `Snapshot: ${currentWorldStats.files} arquivos, ${currentWorldStats.directories} diretórios; o tamanho varia com o LevelDB.`,
    "",
    "```text",
    `${world.folder}`,
    "├── behavior_packs\\pack                 # Behavior Pack local",
    "├── resource_packs\\pack                 # Resource Pack local",
    "├── db                                   # LevelDB do mundo",
    "├── level.dat / level.dat_old",
    "├── levelname.txt",
    "├── world_icon.jpeg",
    "├── world_behavior_packs.json",
    "├── world_resource_packs.json",
    "├── world_behavior_pack_history.json",
    "└── world_resource_pack_history.json",
    "```",
    "",
    `Os vínculos ativos e históricos de \`${world.name}\` apontam para \`[${version.join(", ")}]\`.`,
    "",
    "## Mundos do perfil",
    "",
    "| Pasta | Nome | BP ativo | RP ativo | BP local | RP local | Atualizado |",
    "| --- | --- | ---: | ---: | ---: | ---: | :---: |",
  ];
  for (const item of projectedWorlds.sort((left, right) => left.folder.localeCompare(right.folder))) {
    lines.push(`| ${tableCell(item.folder)} | ${tableCell(item.name)} | ${tableCell(displayVersion(item.refs.behavior, version, releaseLabel))} | ${tableCell(displayVersion(item.refs.resource, version, releaseLabel))} | ${tableCell(displayVersion(item.local.behavior, version, releaseLabel))} | ${tableCell(displayVersion(item.local.resource, version, releaseLabel))} | ${selectedFolders.has(item.folder) ? "sim" : "não"} |`);
  }
  lines.push(
    "",
    "## Inventário dos packs",
    "",
    "### Behavior Pack",
    "",
    "```text",
    ...packInfo.behavior.files.map((file) => `behavior_packs\\pack.asper\\${file}`),
    "```",
    "",
    "### Resource Pack",
    "",
    "```text",
    ...packInfo.resource.files.map((file) => `resource_packs\\pack.asper\\${file}`),
    "```",
    "",
    "## Relação com o projeto",
    "",
    "```text",
    `${root}`,
    "├── packs\\behavior",
    "├── packs\\resource",
    `├── dist\\releases\\Aspergillum-${releaseLabel}.mcaddon`,
    `├── dist\\validation\\${releaseLabel}`,
    "└── docs\\LOCAL_INSTALLATION_MAP.md",
    "```",
    "",
    "O diretório `db` é binário e volátil; a presença do add-on é determinada pelos manifests, referências de mundo e cópias dos packs.",
    "",
  );
  return lines.join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  const { bedrockRoot, usersRoot } = ensureWindowsBedrockRoot();
  const profile = resolveProfile(usersRoot, options);
  const sharedComMojang = path.join(usersRoot, "Shared", "games", "com.mojang");
  const worlds = listWorldDirectories(profile.path).map((world) => inspectWorld(world, bedrockRoot));
  const selectedWorld = resolveWorld(worlds, options.world);
  const selectedWorlds = options.allWorlds ? worlds.filter((world) => world.hasAddon) : [selectedWorld];
  if (!selectedWorlds.length) throw new Error("Nenhum mundo com Aspergillum foi encontrado.");

  const releaseLabel = options.release;
  const artifactPath = path.join(root, "dist", "releases", `Aspergillum-${releaseLabel}.mcaddon`);
  const artifactHash = fs.existsSync(artifactPath)
    ? requireHash(artifactPath)
    : "<artefato ainda não gerado>";
  const packInfo = {};
  for (const [kind, pack] of Object.entries(PACKS)) {
    const manifestPath = path.join(pack.source, "manifest.json");
    const manifest = readJson(manifestPath);
    if (manifest.header?.uuid !== pack.uuid) throw new Error(`UUID inesperado em ${manifestPath}`);
    const manifestVersion = parseVersion(manifest.header.version, manifestPath);
    if (versionText(manifestVersion) !== versionText(numericVersion)) {
      throw new Error(`Versão do ${kind} divergente de package.json: ${versionText(manifestVersion)} != ${versionText(numericVersion)}`);
    }
    packInfo[kind] = { ...packStats(pack.source), manifest };
  }

  const selectedKinds = new Map(selectedWorlds.map((world) => [
    world.folder,
    options.allWorlds
      ? Object.keys(PACKS).filter((kind) => world.refs[kind] || world.local[kind])
      : Object.keys(PACKS),
  ]));
  const targets = [
    ...Object.entries(PACKS).map(([kind, pack]) => ({ kind, path: path.join(sharedComMojang, ...pack.shared), source: pack.source })),
    ...selectedWorlds.flatMap((world) => selectedKinds.get(world.folder).map((kind) => {
      const pack = PACKS[kind];
      return { kind: `${kind}:${world.folder}`, path: path.join(world.path, ...pack.world), source: pack.source };
    })),
  ];
  for (const target of targets) assertInside(bedrockRoot, target.path, "dados Bedrock");

  const mode = options.apply && !options.dryRun ? "APPLY" : "DRY-RUN";
  console.log(`Aspergillum sync ${mode}: ${releaseLabel} [${numericVersion.join(", ")}]`);
  console.log(`Shared: ${sharedComMojang}`);
  console.log(`Mundo: ${selectedWorld.name} (${selectedWorld.folder})`);
  for (const target of targets) console.log(`${mode === "APPLY" ? "SUBSTITUIR" : "PLANO"}: ${target.path}`);

  if (mode === "APPLY") {
    if (isMinecraftRunning()) throw new Error("Feche Minecraft.Windows.exe antes da sincronização.");
    for (const target of targets) copyPack(target.source, target.path, bedrockRoot);
    for (const world of selectedWorlds) {
      for (const [kind, pack] of Object.entries(PACKS)) {
        if (selectedKinds.get(world.folder).includes(kind)) {
          updateJsonVersions(path.join(world.path, pack.reference), pack.uuid, numericVersion, false);
          updateJsonVersions(path.join(world.path, pack.history), pack.uuid, numericVersion, true);
        }
      }
    }
  }

  const mapPath = path.join(root, "docs", "LOCAL_INSTALLATION_MAP.md");
  const packageInfo = getMinecraftPackage();
  const map = renderMap({
    bedrockRoot,
    profile,
    sharedComMojang,
    packageInfo,
    releaseLabel,
    version: numericVersion,
    artifactPath,
    artifactHash,
    packInfo,
    world: selectedWorld,
    allWorlds: worlds,
    selectedWorlds,
    selectedKinds,
  });
  if (mode === "APPLY") fs.writeFileSync(mapPath, map, "utf8");
  console.log(`${mode === "APPLY" ? "MAPA ATUALIZADO" : "MAPA PREVISTO"}: ${mapPath}`);
  if (mode !== "APPLY") console.log("Nada foi alterado. Use --apply para executar.");
}

function requireHash(filePath) {
  const hash = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  return hash;
}

function isMinecraftRunning() {
  const result = spawnSync("tasklist.exe", ["/FI", "IMAGENAME eq Minecraft.Windows.exe", "/NH"], { encoding: "utf8", windowsHide: true });
  return result.status === 0 && result.stdout.includes("Minecraft.Windows.exe");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`sync-installed-addon: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export { parseArgs, parseVersion, renderMap, versionText };
