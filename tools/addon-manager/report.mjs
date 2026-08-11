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

export function statusRows(inventory) {
  return inventory.worlds
    .map((world) => ({
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
    `Shared: ${summaryText(inventory.shared)} (${inventory.shared.path})`,
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

export function renderArtifactList(catalog, currentLabel) {
  const lines = [
    "Rótulo | Canal | Versão Bedrock | Família | SHA-256 | Procedência",
    "--- | --- | --- | --- | --- | ---",
  ];
  for (const artifact of catalog) {
    const current = artifact.label === currentLabel ? " (current)" : "";
    const provenance = artifact.sourceCommit ? `${artifact.sourceCommit.slice(0, 10)}${artifact.sourceDirty ? "+dirty" : ""}` : "legado";
    lines.push(`${artifact.label}${current} | ${artifact.channel} | ${versionText(artifact.bedrockVersion)} | ${artifact.family ?? "—"} | ${artifact.sha256.slice(0, 12)}… | ${provenance}`);
  }
  return lines.join("\n");
}

export function renderInstallationMap({ projectRoot, inventory, catalog }) {
  const rows = statusRows(inventory);
  const lines = [
    "# Mapa local do Aspergillum",
    "",
    `Gerado em **${new Date().toISOString()}** por \`npm run addon -- map\`.`,
    "",
    "## Raízes",
    "",
    "```text",
    inventory.bedrockRoot,
    "└── Users",
    "    ├── Shared\\games\\com.mojang",
    ...inventory.profiles.map((profile, index) => `    ${index === inventory.profiles.length - 1 ? "└" : "├"}── ${profile.id}\\games\\com.mojang\\minecraftWorlds`),
    "```",
    "",
    `Projeto: \`${projectRoot}\``,
    `Shared: \`${inventory.shared.path}\``,
    `Par Shared: **${summaryText(inventory.shared)}**`,
    "",
    "## Mundos",
    "",
    "| Perfil | Pasta | Nome | Ativo | Local | Origem | Estado |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(`| ${[row.profile, row.folder, row.name, row.active, row.local, row.storage, row.state].map(escapeCell).join(" | ")} |`);
  }
  lines.push(
    "",
    "## Artefatos disponíveis",
    "",
    "| Rótulo | Canal | Versão | SHA-256 | Caminho |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const artifact of catalog) {
    lines.push(`| ${escapeCell(artifact.label)} | ${escapeCell(artifact.channel)} | ${versionText(artifact.bedrockVersion)} | \`${artifact.sha256}\` | \`${escapeCell(artifact.artifactPath)}\` |`);
  }
  lines.push(
    "",
    "Os arquivos LevelDB não são lidos nem alterados. A classificação usa exclusivamente manifests, referências ativas, históricos e cópias locais dos packs.",
    "",
  );
  return lines.join("\n");
}

export function writeInstallationMap({ projectRoot, inventory, catalog, outputPath }) {
  const target = path.resolve(outputPath ?? path.join(projectRoot, "out", "addon-manager", "installation-map.md"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, renderInstallationMap({ projectRoot, inventory, catalog }), "utf8");
  return target;
}

export { summaryText, worldStorage };
