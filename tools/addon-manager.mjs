import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gitProvenance } from "./release/artifact-core.mjs";
import { registry } from "./release/release-registry.mjs";
import { findArtifact, loadArtifactCatalog } from "./addon-manager/catalog.mjs";
import { inspectBedrock } from "./addon-manager/bedrock.mjs";
import { applyInstallPlan } from "./addon-manager/installer.mjs";
import { createInstallPlan, serializablePlan } from "./addon-manager/planner.mjs";
import { renderArtifactList, renderStatus, statusRows, writeInstallationMap } from "./addon-manager/report.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");

function metadata(root = projectRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
}

export function parseCli(argv) {
  const command = !argv[0] ? "status" : ["--help", "-h"].includes(argv[0]) ? "help" : argv[0];
  const options = {
    allWorlds: false,
    apply: undefined,
    bedrockRoot: undefined,
    json: false,
    output: undefined,
    profile: undefined,
    refresh: false,
    updateShared: true,
    world: "devtest",
    worldSpecified: false,
  };
  const positional = [];
  let applySeen = false;
  let dryRunSeen = false;
  const valueAfter = (index, option) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${option} exige um valor.`);
    return value;
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--all-worlds") options.allWorlds = true;
    else if (argument === "--apply") { options.apply = true; applySeen = true; }
    else if (argument === "--dry-run") { options.apply = false; dryRunSeen = true; }
    else if (argument === "--bedrock-root") { options.bedrockRoot = valueAfter(index, argument); index += 1; }
    else if (argument === "--json") options.json = true;
    else if (argument === "--no-shared") options.updateShared = false;
    else if (argument === "--output") { options.output = valueAfter(index, argument); index += 1; }
    else if (argument === "--profile") { options.profile = valueAfter(index, argument); index += 1; }
    else if (argument === "--refresh") options.refresh = true;
    else if (argument === "--world") { options.world = valueAfter(index, argument); options.worldSpecified = true; index += 1; }
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument.startsWith("--")) throw new Error(`Opção desconhecida: ${argument}`);
    else positional.push(argument);
  }
  if (applySeen && dryRunSeen) throw new Error("Use somente --apply ou --dry-run.");
  if (options.allWorlds && options.worldSpecified) throw new Error("Use --all-worlds ou --world, não ambos.");
  return { command, options, positional };
}

function help() {
  return `Gerenciador de instalações Aspergillum\n\n` +
    `Uso:\n` +
    `  npm run addon -- list\n` +
    `  npm run addon -- status\n` +
    `  npm run addon -- install [rótulo|current] [--world devtest]\n` +
    `  npm run addon -- upgrade <X> <Y>\n` +
    `  npm run addon -- plan-upgrade <X> <Y>\n` +
    `  npm run addon -- map\n\n` +
    `Instalação e upgrade aplicam por padrão. Use --dry-run para apenas planejar.\n` +
    `O instalador nunca executa build, testes ou validação; o .mcaddon precisa existir.`;
}

function currentLabel(root) {
  const value = metadata(root);
  return value.aspergillum?.releaseLabel ?? value.version;
}

function resolveRequestedLabel(requested, root) {
  return !requested || requested === "current" || requested === "latest" ? currentLabel(root) : requested;
}

function resolveSource(catalog, requested, root) {
  const label = resolveRequestedLabel(requested, root);
  const artifact = catalog.find((entry) => entry.label === label);
  if (artifact) return artifact;
  if (/^\d+\.\d+\.\d+$/.test(label)) {
    const bedrockVersion = label.split(".").map(Number);
    return {
      schemaVersion: 1,
      label,
      bedrockVersion,
      channel: "official",
      family: "inferred-official-source",
      base: null,
      behaviorUuid: registry.publicIdentity.behaviorUuid,
      resourceUuid: registry.publicIdentity.resourceUuid,
      behavior: { uuid: registry.publicIdentity.behaviorUuid, version: bedrockVersion, name: null },
      resource: { uuid: registry.publicIdentity.resourceUuid, version: bedrockVersion, name: null },
      artifact: null,
      artifactPath: null,
      sha256: null,
      sourceCommit: null,
      sourceDirty: null,
    };
  }
  return findArtifact(catalog, label);
}

function checkImplicitProvenance(descriptor, requested, root, stderr) {
  if (requested && requested !== "current" && requested !== "latest") return;
  const provenance = gitProvenance(root);
  if (descriptor.sourceCommit && provenance.sourceCommit && descriptor.sourceCommit !== provenance.sourceCommit) {
    throw new Error(`O artefato current foi criado no commit ${descriptor.sourceCommit.slice(0, 12)}, mas o checkout está em ${provenance.sourceCommit.slice(0, 12)}. Gere o artefato desta branch ou informe o rótulo explicitamente.`);
  }
  if (!descriptor.sourceCommit) stderr.write(`Aviso: ${descriptor.label} é um artefato legado sem commit de origem; a seleção continua determinística pelo rótulo.\n`);
}

function printPlan(plan, stdout) {
  stdout.write(`${plan.action.toUpperCase()}: ${plan.source?.label ?? "estado atual"} → ${plan.target.label}\n`);
  stdout.write(`Mundos selecionados: ${plan.selected.length}; fixados antes de Shared: ${plan.pins.length}; preservados: ${plan.preserved.length}; conflitos: ${plan.conflicts.length}\n`);
  for (const entry of plan.selected) stdout.write(`  ATUALIZAR ${entry.world.profile.id}/${entry.world.name} (${entry.world.folder})\n`);
  for (const entry of plan.pins) stdout.write(`  FIXAR X LOCALMENTE ${entry.world.profile.id}/${entry.world.name} (${entry.world.folder})\n`);
  for (const entry of plan.conflicts) stdout.write(`  CONFLITO ${entry.world.profile.id}/${entry.world.name}: ${entry.reason}\n`);
  stdout.write(`Shared: ${plan.shared.update ? "atualizar por último" : "sem alteração"}\n`);
}

export function runAddonManager(argv = process.argv.slice(2), context = {}) {
  const root = context.projectRoot ?? projectRoot;
  const stdout = context.stdout ?? process.stdout;
  const stderr = context.stderr ?? process.stderr;
  const { command, options, positional } = parseCli(argv);
  if (options.help || command === "help") {
    stdout.write(`${help()}\n`);
    return { command: "help" };
  }
  const catalog = loadArtifactCatalog({ projectRoot: root, refresh: options.refresh });
  if (command === "list") {
    if (positional.length > 0) throw new Error("list não aceita argumentos posicionais.");
    if (options.json) stdout.write(`${JSON.stringify(catalog.map(({ artifactPath, ...entry }) => entry), null, 2)}\n`);
    else stdout.write(`${renderArtifactList(catalog, currentLabel(root))}\n`);
    return { command, count: catalog.length };
  }

  const inventory = inspectBedrock({ bedrockRoot: options.bedrockRoot, catalog, profileId: options.profile });
  if (command === "status") {
    if (positional.length > 0) throw new Error("status não aceita argumentos posicionais.");
    if (options.json) stdout.write(`${JSON.stringify({ shared: inventory.shared, worlds: statusRows(inventory) }, null, 2)}\n`);
    else stdout.write(`${renderStatus(inventory)}\n`);
    return { command, worlds: inventory.worlds.length };
  }
  if (command === "map") {
    if (positional.length > 0) throw new Error("map não aceita argumentos posicionais.");
    const mapPath = writeInstallationMap({ projectRoot: root, inventory, catalog, outputPath: options.output });
    if (options.json) stdout.write(`${JSON.stringify({ path: mapPath, worlds: inventory.worlds.length, artifacts: catalog.length })}\n`);
    else stdout.write(`Mapa atualizado: ${mapPath}\n`);
    return { command, mapPath };
  }

  let source;
  let target;
  let action;
  let apply;
  if (command === "install") {
    if (positional.length > 1) throw new Error("install aceita no máximo um rótulo.");
    const requested = positional[0] ?? "current";
    target = findArtifact(catalog, resolveRequestedLabel(requested, root));
    checkImplicitProvenance(target, requested, root, stderr);
    action = "install";
    apply = options.apply ?? true;
  } else if (command === "upgrade" || command === "plan-upgrade") {
    if (positional.length !== 2) throw new Error(`${command} exige os rótulos X e Y.`);
    if (options.worldSpecified || options.allWorlds) throw new Error(`${command} sempre varre todos os perfis; não use --world/--all-worlds.`);
    source = resolveSource(catalog, positional[0], root);
    const targetRequest = positional[1];
    target = findArtifact(catalog, resolveRequestedLabel(targetRequest, root));
    checkImplicitProvenance(target, targetRequest, root, stderr);
    if (source.label === target.label) throw new Error("X e Y precisam ser versões diferentes.");
    action = "upgrade";
    apply = command === "upgrade" ? (options.apply ?? true) : false;
    if (command === "plan-upgrade" && options.apply) throw new Error("plan-upgrade nunca aplica alterações.");
  } else {
    throw new Error(`Comando desconhecido: ${command}.\n\n${help()}`);
  }

  const plan = createInstallPlan({
    inventory,
    target,
    source,
    world: options.world,
    profileId: options.profile,
    allWorlds: source ? true : options.allWorlds,
    updateShared: options.updateShared,
    action,
  });
  if (options.json) {
    if (!apply) stdout.write(`${JSON.stringify(serializablePlan(plan), null, 2)}\n`);
  } else {
    printPlan(plan, stdout);
  }
  if (!apply) {
    if (!options.json) stdout.write("Plano concluído; nenhum arquivo foi alterado.\n");
    return { command, applied: false, plan };
  }
  const result = applyInstallPlan({ projectRoot: root, inventory, plan, checkMinecraft: context.checkMinecraft ?? true });
  if (options.json) stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (!result.changed) stdout.write(`${target.label} já está instalado em todos os alvos do plano.\n`);
  else stdout.write(`Instalação concluída: ${target.label}; ${result.selected} mundo(s), Shared=${result.sharedUpdated ? "sim" : "não"}, cache=${result.cacheReused ? "reutilizado" : "criado"}.\n${result.runPath ? `Registro: ${result.runPath}\n` : ""}${result.logWarning ? `Aviso: ${result.logWarning}\n` : ""}`);
  return { command, applied: true, plan, result };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runAddonManager();
  } catch (error) {
    console.error(`addon-manager: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export { help, projectRoot, resolveRequestedLabel, resolveSource };
