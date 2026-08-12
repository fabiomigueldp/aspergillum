import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gitProvenance } from "./release/artifact-core.mjs";
import { findArtifact, loadArtifactCatalog } from "./addon-manager/catalog.mjs";
import { inspectBedrock } from "./addon-manager/bedrock.mjs";
import { applyInstallPlan, applyRemovePlan } from "./addon-manager/installer.mjs";
import { createInstallPlan, createRemovePlan, serializablePlan } from "./addon-manager/planner.mjs";
import {
  assertProjectCatalogIsolation,
  loadProject,
  loadProjects,
  projectMatches,
  registerProject,
  resolveProject,
  serializeProject,
  unregisterProject,
} from "./addon-manager/projects.mjs";
import {
  renderAggregateArtifactList,
  renderAggregateStatus,
  renderArtifactList,
  renderProjectList,
  renderStatus,
  statusRows,
  writeInstallationMap,
} from "./addon-manager/report.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");

function metadata(root = projectRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
}

export function parseCli(argv) {
  const command = !argv[0] ? "status" : ["--help", "-h"].includes(argv[0]) ? "help" : argv[0];
  const options = {
    addon: undefined,
    allWorlds: false,
    apply: undefined,
    bedrockRoot: undefined,
    id: undefined,
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
    if (argument === "--addon") { options.addon = valueAfter(index, argument); index += 1; }
    else if (argument === "--all-worlds") options.allWorlds = true;
    else if (argument === "--apply") { options.apply = true; applySeen = true; }
    else if (argument === "--dry-run") { options.apply = false; dryRunSeen = true; }
    else if (argument === "--bedrock-root") { options.bedrockRoot = valueAfter(index, argument); index += 1; }
    else if (argument === "--id") { options.id = valueAfter(index, argument); index += 1; }
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
  return `Gerenciador de Add-Ons Minecraft Bedrock\n\n` +
    `Uso:\n` +
    `  npm run addon -- projects\n` +
    `  npm run addon -- register <projeto>\n` +
    `  npm run addon -- list [add-on]\n` +
    `  npm run addon -- status [add-on]\n` +
    `  npm run addon -- install [add-on] [rótulo|current] [--world devtest]\n` +
    `  npm run addon -- upgrade [add-on] <X> <Y>\n` +
    `  npm run addon -- remove <add-on> [--world devtest]\n` +
    `  npm run addon -- map [add-on]\n\n` +
    `Instalação, upgrade e remoção aplicam por padrão. Use --dry-run para apenas planejar.\n` +
    `A sintaxe histórica sem add-on continua selecionando Aspergillum. O gerenciador nunca executa build ou testes.`;
}

function currentLabel(projectOrRoot) {
  if (typeof projectOrRoot === "object" && projectOrRoot?.currentLabel) return projectOrRoot.currentLabel;
  const value = metadata(projectOrRoot);
  return value.addonManager?.currentLabel ?? value.aspergillum?.releaseLabel ?? value.version;
}

function resolveRequestedLabel(requested, projectOrRoot) {
  return !requested || requested === "current" || requested === "latest" ? currentLabel(projectOrRoot) : requested;
}

function resolveSource(catalog, requested, projectOrRoot) {
  const project = typeof projectOrRoot === "object" ? projectOrRoot : loadProject(projectOrRoot);
  const label = resolveRequestedLabel(requested, project);
  const artifact = catalog.find((entry) => entry.label === label);
  if (artifact) return artifact;
  if (/^\d+\.\d+\.\d+$/.test(label)) {
    if (!project.publicIdentity) throw new Error(`${project.displayName} não declara publicIdentity; a versão X precisa existir no catálogo.`);
    const bedrockVersion = label.split(".").map(Number);
    return {
      schemaVersion: 2,
      addonId: project.id,
      displayName: project.displayName,
      label,
      bedrockVersion,
      channel: "official",
      family: "inferred-official-source",
      base: null,
      behaviorUuid: project.publicIdentity.behaviorUuid,
      resourceUuid: project.publicIdentity.resourceUuid,
      behavior: { uuid: project.publicIdentity.behaviorUuid, version: bedrockVersion, name: null },
      resource: { uuid: project.publicIdentity.resourceUuid, version: bedrockVersion, name: null },
      artifact: null,
      artifactPath: null,
      sha256: null,
      sourceCommit: null,
      sourceDirty: null,
      projectRoot: project.projectRoot,
    };
  }
  return findArtifact(catalog, label);
}

function checkImplicitProvenance(descriptor, requested, project, stderr) {
  if (requested && requested !== "current" && requested !== "latest") return;
  const provenance = gitProvenance(project.projectRoot);
  if (descriptor.sourceCommit && provenance.sourceCommit && descriptor.sourceCommit !== provenance.sourceCommit) {
    throw new Error(`O artefato current de ${project.displayName} foi criado no commit ${descriptor.sourceCommit.slice(0, 12)}, mas o checkout está em ${provenance.sourceCommit.slice(0, 12)}. Gere o artefato desta branch ou informe o rótulo explicitamente.`);
  }
  if (!descriptor.sourceCommit) stderr.write(`Aviso: ${project.id}/${descriptor.label} não declara commit de origem; a seleção continua determinística pelo rótulo e SHA-256.\n`);
}

function projectToken(projects, value) {
  if (!value) return undefined;
  return projects.find((project) => projectMatches(project, value));
}

function operationProject(projects, positional, addonOption) {
  if (addonOption) return { project: resolveProject(projects, addonOption), rest: positional };
  const explicit = projectToken(projects, positional[0]);
  return explicit ? { project: explicit, rest: positional.slice(1) } : { project: projects[0], rest: positional };
}

function optionalProject(projects, positional, addonOption) {
  if (addonOption) {
    if (positional.length > 0) throw new Error("Não combine --addon com um add-on posicional.");
    return resolveProject(projects, addonOption);
  }
  if (positional.length === 0) return undefined;
  if (positional.length > 1) throw new Error("Este comando aceita no máximo um add-on.");
  return resolveProject(projects, positional[0]);
}

function loadCatalogEntries(projects, managerRoot, refresh, selectedProjects = projects) {
  const entries = selectedProjects.map((project) => ({
    project,
    catalog: loadArtifactCatalog({ projectRoot: project.projectRoot, stateRoot: managerRoot, project, refresh }),
  }));
  const loadedById = new Map(entries.map((entry) => [entry.project.id, entry]));
  assertProjectCatalogIsolation(projects.map((project) => loadedById.get(project.id) ?? { project, catalog: [] }));
  return entries;
}

function catalogFor(entries, project) {
  return entries.find((entry) => entry.project.id === project.id).catalog;
}

function printPlan(plan, stdout) {
  const destination = plan.action === "remove" ? "remover" : plan.target.label;
  stdout.write(`${plan.project.displayName} — ${plan.action.toUpperCase()}: ${plan.source?.label ?? "estado atual"} → ${destination}\n`);
  stdout.write(`Mundos selecionados: ${plan.selected.length}; fixados antes de Shared: ${plan.pins.length}; preservados: ${plan.preserved.length}; conflitos: ${plan.conflicts.length}\n`);
  for (const entry of plan.selected) stdout.write(`  ${plan.action === "remove" ? "REMOVER" : "ATUALIZAR"} ${entry.world.profile.id}/${entry.world.name} (${entry.world.folder})\n`);
  for (const entry of plan.pins) stdout.write(`  FIXAR VERSÃO ATUAL LOCALMENTE ${entry.world.profile.id}/${entry.world.name} (${entry.world.folder})\n`);
  for (const entry of plan.conflicts) stdout.write(`  CONFLITO ${entry.world.profile.id}/${entry.world.name}: ${entry.reason}\n`);
  stdout.write(`Shared: ${plan.shared.update ? (plan.action === "remove" ? "remover por último" : "atualizar por último") : "sem alteração"}\n`);
}

function inspectProject(project, catalog, options) {
  return inspectBedrock({ bedrockRoot: options.bedrockRoot, catalog, project, profileId: options.profile });
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

  if (command === "register") {
    if (positional.length !== 1) throw new Error("register exige o caminho de um projeto.");
    const registered = registerProject({ managerRoot: root, projectRoot: path.resolve(context.cwd ?? process.cwd(), positional[0]), idOverride: options.id });
    stdout.write(`${registered.changed ? "Registrado" : "Já registrado"}: ${registered.project.id} (${registered.project.projectRoot})\n`);
    return { command, ...registered };
  }
  if (command === "unregister") {
    if (positional.length !== 1) throw new Error("unregister exige o ID de um add-on.");
    unregisterProject({ managerRoot: root, id: positional[0] });
    stdout.write(`Registro removido: ${positional[0]}. Os packs instalados não foram alterados.\n`);
    return { command, id: positional[0] };
  }

  const projects = loadProjects({ managerRoot: root });
  if (command === "projects") {
    if (positional.length > 0) throw new Error("projects não aceita argumentos posicionais.");
    if (options.json) stdout.write(`${JSON.stringify(projects.map(serializeProject), null, 2)}\n`);
    else stdout.write(`${renderProjectList(projects)}\n`);
    return { command, count: projects.length };
  }

  if (command === "list") {
    const selected = optionalProject(projects, positional, options.addon);
    const entries = loadCatalogEntries(projects, root, options.refresh, selected ? [selected] : projects);
    if (options.json) {
      const values = (selected ? entries.filter((entry) => entry.project.id === selected.id) : entries)
        .map(({ project, catalog }) => ({ project: serializeProject(project), artifacts: catalog.map(({ artifactPath, projectRoot: artifactProjectRoot, ...artifact }) => artifact) }));
      stdout.write(`${JSON.stringify(values, null, 2)}\n`);
    } else if (selected) {
      stdout.write(`${renderArtifactList(catalogFor(entries, selected), selected.currentLabel, selected)}\n`);
    } else {
      stdout.write(`${renderAggregateArtifactList(entries)}\n`);
    }
    return { command, count: selected ? catalogFor(entries, selected).length : entries.reduce((sum, entry) => sum + entry.catalog.length, 0) };
  }

  if (command === "status" || command === "map") {
    const selected = optionalProject(projects, positional, options.addon);
    const selectedEntries = loadCatalogEntries(projects, root, options.refresh, selected ? [selected] : projects);
    const inventories = selectedEntries.map(({ project, catalog }) => inspectProject(project, catalog, options));
    if (command === "status") {
      if (options.json) stdout.write(`${JSON.stringify(inventories.map((inventory) => ({ project: serializeProject(inventory.project), shared: inventory.shared, worlds: statusRows(inventory) })), null, 2)}\n`);
      else stdout.write(`${selected ? renderStatus(inventories[0]) : renderAggregateStatus(inventories)}\n`);
      return { command, addons: inventories.length, worlds: inventories[0]?.worlds.length ?? 0 };
    }
    const mapPath = writeInstallationMap({ projectRoot: root, inventories, catalogs: selectedEntries, outputPath: options.output });
    if (options.json) stdout.write(`${JSON.stringify({ path: mapPath, addons: inventories.length, worlds: inventories[0]?.worlds.length ?? 0, artifacts: selectedEntries.reduce((sum, entry) => sum + entry.catalog.length, 0) })}\n`);
    else stdout.write(`Mapa atualizado: ${mapPath}\n`);
    return { command, mapPath };
  }

  let project;
  let catalog;
  let source;
  let target;
  let action;
  let apply;
  let inventory;
  let plan;
  if (command === "install") {
    const selected = operationProject(projects, positional, options.addon);
    project = selected.project;
    if (selected.rest.length > 1) throw new Error("install aceita no máximo um rótulo depois do add-on.");
    catalog = loadCatalogEntries(projects, root, options.refresh, [project])[0].catalog;
    const requested = selected.rest[0] ?? "current";
    target = findArtifact(catalog, resolveRequestedLabel(requested, project));
    checkImplicitProvenance(target, requested, project, stderr);
    action = "install";
    apply = options.apply ?? true;
    inventory = inspectProject(project, catalog, options);
    plan = createInstallPlan({ inventory, target, world: options.world, profileId: options.profile, allWorlds: options.allWorlds, updateShared: options.updateShared, action });
  } else if (command === "upgrade" || command === "plan-upgrade") {
    const selected = operationProject(projects, positional, options.addon);
    project = selected.project;
    if (selected.rest.length !== 2) throw new Error(`${command} exige os rótulos X e Y depois do add-on.`);
    if (options.worldSpecified || options.allWorlds) throw new Error(`${command} sempre varre todos os perfis; não use --world/--all-worlds.`);
    catalog = loadCatalogEntries(projects, root, options.refresh, [project])[0].catalog;
    source = resolveSource(catalog, selected.rest[0], project);
    const targetRequest = selected.rest[1];
    target = findArtifact(catalog, resolveRequestedLabel(targetRequest, project));
    checkImplicitProvenance(target, targetRequest, project, stderr);
    if (source.label === target.label) throw new Error("X e Y precisam ser versões diferentes.");
    action = "upgrade";
    apply = command === "upgrade" ? (options.apply ?? true) : false;
    if (command === "plan-upgrade" && options.apply) throw new Error("plan-upgrade nunca aplica alterações.");
    inventory = inspectProject(project, catalog, options);
    plan = createInstallPlan({ inventory, target, source, allWorlds: true, updateShared: options.updateShared, action });
  } else if (command === "remove") {
    if (!options.addon && !projectToken(projects, positional[0])) throw new Error("remove exige um add-on explícito.");
    const selected = operationProject(projects, positional, options.addon);
    project = selected.project;
    if (selected.rest.length > 0) throw new Error("remove não aceita rótulo de versão.");
    catalog = loadCatalogEntries(projects, root, options.refresh, [project])[0].catalog;
    action = "remove";
    apply = options.apply ?? true;
    inventory = inspectProject(project, catalog, options);
    plan = createRemovePlan({ inventory, world: options.world, profileId: options.profile, allWorlds: options.allWorlds, updateShared: options.updateShared });
  } else {
    throw new Error(`Comando desconhecido: ${command}.\n\n${help()}`);
  }

  if (options.json) {
    if (!apply) stdout.write(`${JSON.stringify(serializablePlan(plan), null, 2)}\n`);
  } else {
    printPlan(plan, stdout);
  }
  if (!apply) {
    if (!options.json) stdout.write("Plano concluído; nenhum arquivo foi alterado.\n");
    return { command, applied: false, plan };
  }

  const result = action === "remove"
    ? applyRemovePlan({ stateRoot: root, inventory, plan, checkMinecraft: context.checkMinecraft ?? true })
    : applyInstallPlan({ projectRoot: project.projectRoot, stateRoot: root, inventory, plan, checkMinecraft: context.checkMinecraft ?? true });
  if (options.json) stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (!result.changed) stdout.write(`${project.displayName} já está no estado solicitado em todos os alvos do plano.\n`);
  else if (action === "remove") stdout.write(`Remoção concluída: ${project.displayName}; ${result.selected} mundo(s), Shared=${result.sharedUpdated ? "sim" : "não"}.\n${result.runPath ? `Registro: ${result.runPath}\n` : ""}${result.logWarning ? `Aviso: ${result.logWarning}\n` : ""}`);
  else stdout.write(`Instalação concluída: ${project.displayName} ${target.label}; ${result.selected} mundo(s), Shared=${result.sharedUpdated ? "sim" : "não"}, cache=${result.cacheReused ? "reutilizado" : "criado"}.\n${result.runPath ? `Registro: ${result.runPath}\n` : ""}${result.logWarning ? `Aviso: ${result.logWarning}\n` : ""}`);
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

export { currentLabel, help, projectRoot, resolveRequestedLabel, resolveSource };
