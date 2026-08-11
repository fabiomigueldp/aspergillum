import fs from "node:fs";
import path from "node:path";

const registryPath = path.join(import.meta.dirname, "release-registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

function versionText(version) {
  return version.join(".");
}

function validateRegistry(value) {
  if (value.schemaVersion !== 1) throw new Error(`Schema de release desconhecido: ${value.schemaVersion}`);
  const entries = [...value.official.map((entry) => ({ ...entry, channel: "official" })), ...value.diagnostics.map((entry) => ({ ...entry, channel: "diagnostic" }))];
  const labels = new Set();
  const numericVersions = new Set();
  for (const entry of entries) {
    if (!entry.label || !Array.isArray(entry.bedrockVersion) || entry.bedrockVersion.length !== 3 || !entry.bedrockVersion.every(Number.isInteger)) {
      throw new Error(`Registro de release inválido: ${JSON.stringify(entry)}`);
    }
    if (labels.has(entry.label)) throw new Error(`Rótulo de release repetido: ${entry.label}`);
    const numeric = versionText(entry.bedrockVersion);
    if (numericVersions.has(numeric)) throw new Error(`Versão Bedrock reutilizada no registro: ${numeric}`);
    labels.add(entry.label);
    numericVersions.add(numeric);
  }
  return entries;
}

const entries = validateRegistry(registry);
const byLabel = new Map(entries.map((entry) => [entry.label, entry]));

export function getReleaseRegistration(label) {
  return byLabel.get(label);
}

export function requireReleaseRegistration(label, version, channel) {
  const entry = byLabel.get(label);
  if (!entry) throw new Error(`Release ${label} não está registrada em tools/release/release-registry.json.`);
  if (channel && entry.channel !== channel) throw new Error(`Canal divergente para ${label}: ${entry.channel} != ${channel}`);
  if (versionText(entry.bedrockVersion) !== versionText(version)) {
    throw new Error(`Versão Bedrock divergente para ${label}: ${versionText(version)} != ${versionText(entry.bedrockVersion)}`);
  }
  return entry;
}

export function assertDiagnosticVariants(family, variants) {
  const registered = registry.diagnostics.filter((entry) => entry.family === family);
  if (registered.length !== variants.length) throw new Error(`Matriz ${family} diverge do registro central.`);
  for (const variant of variants) requireReleaseRegistration(variant.label, variant.version, "diagnostic");
}

export { entries, registry, registryPath, versionText };
