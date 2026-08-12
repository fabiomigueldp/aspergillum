import fs from "node:fs";
import path from "node:path";
import { pairMatches, versionText } from "./identity.mjs";

function summaryText(summary) {
  if (!summary || summary.state === "none") return "—";
  if (summary.labels?.length) return summary.labels.join("/");
  if (summary.pair) return `${versionText(summary.pair.behavior.version)} (UUID não catalogado)`;
  return summary.state;
}

function worldStorage(world, shared) {
  if (world.state === "conflict") return "conflito";
  if (world.active.state === "none") return world.local.state === "none" ? "—" : "local órfão";
  if (world.local.state !== "none" && pairMatches(world.active.pair, world.local.pair)) return "local";
  if (shared.pair && pairMatches(world.active.pair, shared.pair)) return "Shared";
  return "cache/externo";
}

function escapeCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function provenanceText(artifact) {
  if (artifact.sourceCommit) return `${artifact.sourceCommit.slice(0, 10)}${artifact.sourceDirty ? "+dirty" : ""}`;
  return artifact.sourceSchemaVersion === 1 ? "descritor v1" : "sem commit";
}

export function statusRows(inventory) {
  return inventory.worlds
    .map((world) => ({
      addonId: inventory.project.id,
      profile: world.profile.id,
      folder: world.folder,
      name: world.name,
      active: summaryText(world.active),
      local: summaryText(world.local),
      storage: worldStorage(world, inventory.shared),
      state: world.state,
      issues: world.issues,
    }))
    .sort((left, right) => left.profile.localeCompare(right.profile) || left.name.localeCompare(right.name, "pt-BR"));
}

export function renderStatus(inventory) {
  const lines = [
    `${inventory.project.displayName} Shared: ${summaryText(inventory.shared)} (${inventory.shared.path})`,
    `Perfis: ${inventory.profiles.length}; mundos: ${inventory.worlds.length}`,
    "",
    "Perfil | Mundo | Pasta | Ativo | Local | Origem | Estado",
    "--- | --- | --- | --- | --- | --- | ---",
  ];
  for (const row of statusRows(inventory)) {
    lines.push([row.profile, row.name, row.folder, row.active, row.local, row.storage, row.state].map(escapeCell).join(" | "));
  }
  return lines.join("\n");
}

export function renderAggregateStatus(inventories) {
  const lines = [
    `Add-ons gerenciados: ${inventories.length}`,
    "",
    "Add-on | Shared | Mundos ativos | Conflitos",
    "--- | --- | ---: | ---:",
  ];
  for (const inventory of inventories) {
    lines.push([
      inventory.project.displayName,
      summaryText(inventory.shared),
      inventory.worlds.filter((world) => world.active.state !== "none").length,
      inventory.worlds.filter((world) => world.state === "conflict").length,
    ].map(escapeCell).join(" | "));
  }
  lines.push("", "Add-on | Perfil | Mundo | Pasta | Ativo | Local | Origem | Estado", "--- | --- | --- | --- | --- | --- | --- | ---");
  const activeRows = inventories.flatMap((inventory) => statusRows(inventory)
    .filter((row) => row.state !== "none")
    .map((row) => ({ ...row, displayName: inventory.project.displayName })));
  if (activeRows.length === 0) lines.push("— | — | — | — | — | — | — | none");
  for (const row of activeRows) {
    lines.push([row.displayName, row.profile, row.name, row.folder, row.active, row.local, row.storage, row.state].map(escapeCell).join(" | "));
  }
  return lines.join("\n");
}

export function renderArtifactList(catalog, currentLabel, project = { displayName: "Aspergillum" }) {
  const lines = [
    `${project.displayName}:`,
    "Rótulo | Canal | Versão Bedrock | Família | SHA-256 | Procedência",
    "--- | --- | --- | --- | --- | ---",
  ];
  for (const artifact of catalog) {
    const current = artifact.label === currentLabel ? " (current)" : "";
    const provenance = provenanceText(artifact);
    lines.push(`${artifact.label}${current} | ${artifact.channel} | ${versionText(artifact.bedrockVersion)} | ${artifact.family ?? "—"} | ${artifact.sha256.slice(0, 12)}… | ${provenance}`);
  }
  return lines.join("\n");
}

export function renderAggregateArtifactList(entries) {
  const lines = [
    "Add-on | Rótulo | Canal | Versão Bedrock | Família | SHA-256 | Procedência",
    "--- | --- | --- | --- | --- | --- | ---",
  ];
  for (const { project, catalog } of entries) {
    for (const artifact of catalog) {
      const current = artifact.label === project.currentLabel ? " (current)" : "";
      const provenance = provenanceText(artifact);
      lines.push(`${project.displayName} | ${artifact.label}${current} | ${artifact.channel} | ${versionText(artifact.bedrockVersion)} | ${artifact.family ?? "—"} | ${artifact.sha256.slice(0, 12)}… | ${provenance}`);
    }
  }
  return lines.join("\n");
}

export function renderProjectList(projects) {
  const lines = [
    "ID | Add-on | Atual | Projeto | Shared | Mundo",
    "--- | --- | --- | --- | --- | ---",
  ];
  for (const project of projects) {
    lines.push([project.id, project.displayName, project.currentLabel, project.projectRoot, project.sharedDirectory, project.worldDirectory].map(escapeCell).join(" | "));
  }
  return lines.join("\n");
}

function normalizeMapInput({ inventory, inventories, catalog, catalogs }) {
  const resolvedInventories = inventories ?? (inventory ? [inventory] : []);
  const resolvedCatalogs = catalogs ?? (catalog && inventory ? [{ project: inventory.project, catalog }] : []);
  if (resolvedInventories.length === 0) throw new Error("Nenhum inventário foi fornecido para o mapa.");
  return { inventories: resolvedInventories, catalogs: resolvedCatalogs };
}

export function renderInstallationMap(options) {
  const { projectRoot } = options;
  const { inventories, catalogs } = normalizeMapInput(options);
  const primary = inventories[0];
  const lines = [
    "# Mapa local dos Add-Ons Bedrock",
    "",
    `Gerado em **${new Date().toISOString()}** por \`npm run addon -- map\`.`,
    "",
    "## Raízes",
    "",
    "```text",
    primary.bedrockRoot,
    "└── Users",
    "    ├── Shared\\games\\com.mojang",
    ...primary.profiles.map((profile, index) => `    ${index === primary.profiles.length - 1 ? "└" : "├"}── ${profile.id}\\games\\com.mojang\\minecraftWorlds`),
    "```",
    "",
    `Gerenciador: \`${projectRoot}\``,
    "",
    "## Add-ons",
    "",
    "| ID | Add-on | Projeto | Shared | Par Shared |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const inventory of inventories) {
    lines.push(`| ${escapeCell(inventory.project.id)} | ${escapeCell(inventory.project.displayName)} | \`${escapeCell(inventory.project.projectRoot)}\` | \`${escapeCell(inventory.shared.path)}\` | **${escapeCell(summaryText(inventory.shared))}** |`);
  }
  for (const inventory of inventories) {
    const rows = statusRows(inventory);
    lines.push(
      "",
      `## Mundos — ${inventory.project.displayName}`,
      "",
      "| Perfil | Pasta | Nome | Ativo | Local | Origem | Estado |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const row of rows) {
      lines.push(`| ${[row.profile, row.folder, row.name, row.active, row.local, row.storage, row.state].map(escapeCell).join(" | ")} |`);
    }
  }
  lines.push(
    "",
    "## Artefatos disponíveis",
    "",
    "| Add-on | Rótulo | Canal | Versão | SHA-256 | Caminho |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const { project, catalog: projectCatalog } of catalogs) {
    for (const artifact of projectCatalog) {
      lines.push(`| ${escapeCell(project.displayName)} | ${escapeCell(artifact.label)} | ${escapeCell(artifact.channel)} | ${versionText(artifact.bedrockVersion)} | \`${artifact.sha256}\` | \`${escapeCell(artifact.artifactPath)}\` |`);
    }
  }
  lines.push(
    "",
    "Os arquivos LevelDB não são lidos nem alterados. Cada add-on é classificado somente por seus próprios UUIDs, manifests, referências ativas, históricos e cópias locais.",
    "",
  );
  return lines.join("\n");
}

export function writeInstallationMap(options) {
  const target = path.resolve(options.outputPath ?? path.join(options.projectRoot, "out", "addon-manager", "installation-map.md"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, renderInstallationMap(options), "utf8");
  return target;
}

export { escapeCell, summaryText, worldStorage };
