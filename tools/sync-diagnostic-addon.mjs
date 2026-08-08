import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const knownUuids = {
  behavior: new Set([
    "bac9f8bc-71f5-4db7-a0ff-3c5a365749b4",
    "fa0c5ebd-cd7d-5488-91f5-bed8c2edd1a7",
    "7f815bee-7516-528a-aaa2-8d873c10ba88",
    "ca21ec6a-1103-5f66-80f3-2cb674843dff",
  ]),
  resource: new Set([
    "fdb8a79c-8f77-4831-9a5c-8e2b8ecca29e",
    "c7c39acd-98a0-535c-80cc-e0521ea73e97",
    "be858629-a2ac-5aa8-93d8-e7382532aabd",
    "085fa6e4-e6b2-57c0-94e2-25b88daa614b",
  ]),
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseVersion(value, source) {
  if (Array.isArray(value) && value.length === 3 && value.every(Number.isInteger)) return value;
  throw new Error(`Versão inválida em ${source}: ${JSON.stringify(value)}`);
}

function versionText(version) {
  return version.join(".");
}

function parseArgs(argv) {
  const options = { apply: false, dryRun: false, profile: undefined, variant: "1.1.7a", world: "devtest" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--profile") options.profile = argv[++index];
    else if (argument === "--variant") options.variant = argv[++index];
    else if (argument === "--world") options.world = argv[++index];
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Argumento desconhecido: ${argument}`);
  }
  if (options.apply && options.dryRun) throw new Error("Use somente --apply ou --dry-run.");
  if (!/^1\.1\.7[a-c]$/.test(options.variant)) throw new Error("A variante deve ser 1.1.7a, 1.1.7b ou 1.1.7c.");
  return options;
}

function printHelp() {
  console.log(`Instala uma variante diagnóstica 1.1.7 a partir do .mcaddon oficial.\n\n` +
    `Uso:\n  node tools/sync-diagnostic-addon.mjs --variant 1.1.7a --apply\n\n` +
    `Opções:\n  --variant TAG  variante diagnóstica; padrão: 1.1.7a\n  --apply        executa a substituição\n  --dry-run      mostra os alvos sem alterar arquivos\n  --world NAME   mundo alvo; padrão: devtest\n  --profile ID   perfil Bedrock; detectado automaticamente`);
}

function ensureWindowsBedrockRoot() {
  if (process.platform !== "win32") throw new Error("Esta ferramenta exige Windows.");
  const appData = process.env.APPDATA;
  if (!appData) throw new Error("APPDATA não está definido.");
  const bedrockRoot = path.join(appData, "Minecraft Bedrock");
  const usersRoot = path.join(bedrockRoot, "Users");
  if (!fs.existsSync(usersRoot)) throw new Error(`Dados Bedrock não encontrados: ${usersRoot}`);
  return { bedrockRoot, usersRoot };
}

function readWorldName(worldPath) {
  const filePath = path.join(worldPath, "levelname.txt");
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "<sem nome>";
}

function listWorlds(comMojang) {
  const worldsRoot = path.join(comMojang, "minecraftWorlds");
  if (!fs.existsSync(worldsRoot)) return [];
  return fs.readdirSync(worldsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ folder: entry.name, name: readWorldName(path.join(worldsRoot, entry.name)), path: path.join(worldsRoot, entry.name) }));
}

function resolveProfile(usersRoot, options) {
  const profiles = fs.readdirSync(usersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "Shared")
    .map((entry) => entry.name);
  if (options.profile) {
    const comMojang = path.join(usersRoot, options.profile, "games", "com.mojang");
    if (!fs.existsSync(comMojang)) throw new Error(`Perfil Bedrock não encontrado: ${options.profile}`);
    return { id: options.profile, path: comMojang };
  }
  const candidates = profiles.filter((id) => listWorlds(path.join(usersRoot, id, "games", "com.mojang"))
    .some((world) => world.name === options.world || world.folder === options.world));
  if (candidates.length === 1) return { id: candidates[0], path: path.join(usersRoot, candidates[0], "games", "com.mojang") };
  if (profiles.length === 1) return { id: profiles[0], path: path.join(usersRoot, profiles[0], "games", "com.mojang") };
  throw new Error(`Não foi possível detectar o perfil que contém ${options.world}.`);
}

function resolveWorld(worlds, requested) {
  const matches = worlds.filter((world) => world.name === requested || world.folder === requested);
  if (matches.length === 1) return matches[0];
  if (!matches.length) throw new Error(`Mundo não encontrado: ${requested}`);
  throw new Error(`Mais de um mundo corresponde a ${requested}.`);
}

function extractArtifact(artifactPath) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aspergillum-diagnostic-"));
  const result = spawnSync("tar.exe", ["-xf", artifactPath, "-C", temporaryRoot], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    throw new Error(`Falha ao extrair o artefato: ${result.stderr || result.stdout}`);
  }
  const directories = fs.readdirSync(temporaryRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const findPack = (suffix) => {
    const entry = directories.find((candidate) => candidate.name.endsWith(suffix));
    if (!entry) throw new Error(`Pack ${suffix} não encontrado no artefato.`);
    return path.join(temporaryRoot, entry.name);
  };
  return { root: temporaryRoot, behavior: findPack("_BP"), resource: findPack("_RP") };
}

function assertInside(parent, candidate) {
  const parentPath = path.resolve(parent);
  const candidatePath = path.resolve(candidate);
  if (candidatePath !== parentPath && !candidatePath.startsWith(`${parentPath}${path.sep}`)) {
    throw new Error(`Caminho fora do armazenamento Bedrock: ${candidatePath}`);
  }
}

function copyPack(source, target, bedrockRoot) {
  assertInside(bedrockRoot, target);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function replaceReference(filePath, kind, packId, version) {
  const current = fs.existsSync(filePath) ? readJson(filePath) : [];
  if (!Array.isArray(current)) throw new Error(`Formato inesperado: ${filePath}`);
  const entries = current.filter((entry) => !knownUuids[kind].has(entry.pack_id));
  entries.push({ pack_id: packId, version: [...version] });
  fs.writeFileSync(filePath, `${JSON.stringify(entries, null, "\t")}\n`, "utf8");
}

function updateHistory(filePath, kind, packId, version, name) {
  const current = fs.existsSync(filePath) ? readJson(filePath) : { packs: [] };
  if (!Array.isArray(current.packs)) throw new Error(`Formato inesperado: ${filePath}`);
  if (!current.packs.some((entry) => entry.uuid === packId)) {
    current.packs.push({ can_be_redownloaded: false, name, uuid: packId, version: [...version] });
  }
  fs.writeFileSync(filePath, `${JSON.stringify(current, null, "\t")}\n`, "utf8");
}

function isMinecraftRunning() {
  const result = spawnSync("tasklist.exe", ["/FI", "IMAGENAME eq Minecraft.Windows.exe", "/NH"], { encoding: "utf8", windowsHide: true });
  return result.status === 0 && result.stdout.includes("Minecraft.Windows.exe");
}

function updateMap({ variant, version, artifactPath, artifactHash, profile, world, manifests, shared }) {
  const mapPath = path.join(root, "docs", "LOCAL_INSTALLATION_MAP.md");
  const existing = fs.existsSync(mapPath) ? fs.readFileSync(mapPath, "utf8") : "# Mapa da instalação local\n";
  const start = "<!-- diagnostic-installation:start -->";
  const end = "<!-- diagnostic-installation:end -->";
  const block = [
    start,
    "",
    `## Variante diagnóstica instalada: ${variant}`,
    "",
    `- Artefato: \`${artifactPath}\``,
    `- SHA-256: \`${artifactHash}\``,
    `- Versão dos manifests: \`[${version.join(", ")}]\``,
    `- Behavior UUID: \`${manifests.behavior.header.uuid}\``,
    `- Resource UUID: \`${manifests.resource.header.uuid}\``,
    `- Instalação compartilhada: \`${shared}\``,
    `- Mundo atualizado: **${world.name}** (\`${world.folder}\`)`,
    `- Perfil: \`${profile.id}\``,
    "- Variante anterior removida das referências ativas; somente este par diagnóstico permanece ativo.",
    "",
    end,
  ].join("\n");
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, "m");
  const next = pattern.test(existing) ? existing.replace(pattern, block) : `${existing.replace(/^# Mapa da instalação local\s*/m, "# Mapa da instalação local\n\n")}${block}\n`;
  fs.writeFileSync(mapPath, next, "utf8");
  return mapPath;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  const { bedrockRoot, usersRoot } = ensureWindowsBedrockRoot();
  const profile = resolveProfile(usersRoot, options);
  const world = resolveWorld(listWorlds(profile.path), options.world);
  const artifactPath = path.join(root, "dist", "releases", `Aspergillum-${options.variant}.mcaddon`);
  if (!fs.existsSync(artifactPath)) throw new Error(`Artefato não encontrado: ${artifactPath}`);
  const extracted = extractArtifact(artifactPath);
  try {
    const manifests = {
      behavior: readJson(path.join(extracted.behavior, "manifest.json")),
      resource: readJson(path.join(extracted.resource, "manifest.json")),
    };
    const version = parseVersion(manifests.behavior.header.version, "Behavior manifest");
    const expectedVersion = [1, 1, 7 + "abc".indexOf(options.variant.at(-1))];
    if (versionText(version) !== versionText(expectedVersion)) {
      throw new Error(`Versão inesperada no diagnóstico: ${versionText(version)}; esperado ${versionText(expectedVersion)}`);
    }
    if (manifests.resource.header.uuid !== manifests.behavior.dependencies.find((item) => item.uuid)?.uuid) {
      throw new Error("Dependência Resource/Behavior inconsistente no diagnóstico.");
    }
    const shared = path.join(usersRoot, "Shared", "games", "com.mojang");
    const targets = [
      { kind: "behavior", source: extracted.behavior, path: path.join(shared, "behavior_packs", "pack.asper") },
      { kind: "resource", source: extracted.resource, path: path.join(shared, "resource_packs", "pack.asper") },
      { kind: "behavior", source: extracted.behavior, path: path.join(world.path, "behavior_packs", "pack") },
      { kind: "resource", source: extracted.resource, path: path.join(world.path, "resource_packs", "pack") },
    ];
    const mode = options.apply && !options.dryRun ? "APPLY" : "DRY-RUN";
    console.log(`Aspergillum diagnostic sync ${mode}: ${options.variant} [${version.join(", ")}]`);
    console.log(`Mundo: ${world.name} (${world.folder})`);
    for (const target of targets) console.log(`${mode === "APPLY" ? "SUBSTITUIR" : "PLANO"}: ${target.path}`);
    if (mode === "APPLY") {
      if (isMinecraftRunning()) throw new Error("Feche Minecraft.Windows.exe antes da sincronização.");
      for (const target of targets) copyPack(target.source, target.path, bedrockRoot);
      replaceReference(path.join(world.path, "world_behavior_packs.json"), "behavior", manifests.behavior.header.uuid, version);
      replaceReference(path.join(world.path, "world_resource_packs.json"), "resource", manifests.resource.header.uuid, version);
      updateHistory(path.join(world.path, "world_behavior_pack_history.json"), "behavior", manifests.behavior.header.uuid, version, manifests.behavior.header.name);
      updateHistory(path.join(world.path, "world_resource_pack_history.json"), "resource", manifests.resource.header.uuid, version, manifests.resource.header.name);
      const hash = createHash("sha256").update(fs.readFileSync(artifactPath)).digest("hex");
      const mapPath = updateMap({ variant: options.variant, version, artifactPath, artifactHash: hash, profile, world, manifests, shared });
      console.log(`MAPA ATUALIZADO: ${mapPath}`);
    } else {
      console.log("Nada foi alterado. Use --apply para executar.");
    }
  } finally {
    fs.rmSync(extracted.root, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`sync-diagnostic-addon: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
