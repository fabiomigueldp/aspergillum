import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function localeEntries(locale) {
  const source = fs.readFileSync(path.join(root, "packs", "resource", "texts", `${locale}.lang`), "utf8");
  return new Map(source.split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf("=");
    return separator <= 0 ? [] : [[line.slice(0, separator), line.slice(separator + 1)]];
  }));
}

const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releaseLabel = metadata.aspergillum?.releaseLabel ?? metadata.version;
const expectedVersion = metadata.version.split(".").map(Number);
const behaviorManifest = JSON.parse(fs.readFileSync(path.join(root, "packs", "behavior", "manifest.json"), "utf8"));
const resourceManifest = JSON.parse(fs.readFileSync(path.join(root, "packs", "resource", "manifest.json"), "utf8"));
for (const [label, actual] of [
  ["Behavior Pack", behaviorManifest.header.version],
  ["Resource Pack", resourceManifest.header.version],
]) {
  if (JSON.stringify(actual) !== JSON.stringify(expectedVersion)) {
    errors.push(`${label} version does not match package.json`);
  }
}

const messagingSource = fs.readFileSync(path.join(root, "src", "presentation", "messaging.ts"), "utf8");
const messageKeys = [...new Set(messagingSource.match(/message\.aspergillum\.[a-z_]+/g) ?? [])].sort();
if (messageKeys.length !== 25) errors.push(`Expected 25 action-message keys, found ${messageKeys.length}`);
for (const locale of ["pt_BR", "en_US"]) {
  const entries = localeEntries(locale);
  const localizedKeys = [...entries.keys()].filter((key) => key.startsWith("message.aspergillum.")).sort();
  if (JSON.stringify(localizedKeys) !== JSON.stringify(messageKeys)) {
    errors.push(`${locale}.lang action-message catalog differs from the typed catalog`);
  }
  for (const loreKey of [
    "item.aspergillum.lore.charges",
    "item.aspergillum.lore.instructions",
    "item.aspergillum.lore.docking",
    "item.aspergillum.lore.creative",
  ]) {
    if (!entries.has(loreKey)) errors.push(`${locale}.lang is missing ${loreKey}`);
  }
}

const sourceFiles = walk(path.join(root, "src")).filter((file) => file.endsWith(".ts"));
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (source.includes(".playSound(") && relative !== "src/presentation/sound-coordinator.ts") {
    errors.push(`Direct playSound call bypasses the release mix: ${relative}`);
  }
  if (source.includes("setActionBar(") && relative !== "src/presentation/messaging.ts") {
    errors.push(`Direct action-bar call bypasses client localization: ${relative}`);
  }
  if (source.includes("system.runInterval")) errors.push(`Unbounded interval is forbidden in the RC: ${relative}`);
  if (/clientSystemInfo\.locale|isPortuguese/.test(source)) {
    errors.push(`Manual locale branching is forbidden in the RC: ${relative}`);
  }
}

const itemStateSource = fs.readFileSync(path.join(root, "src", "infrastructure", "item-state.ts"), "utf8");
if (!itemStateSource.includes("item.aspergillum.lore.docking")
  || !itemStateSource.includes("getRawLore().length !== 4")) {
  errors.push("Item lore must expose docking instructions and lazily refresh legacy three-line lore");
}
const wetFeedbackSource = fs.readFileSync(path.join(root, "src", "presentation", "wet-feedback.ts"), "utf8");
if (!wetFeedbackSource.includes("MICRO_SPLASH_PARTICLE") || !wetFeedbackSource.includes("LOAD_SPLASH_OFFSETS")) {
  errors.push("The RC requires bounded wet feedback after a successful load");
}

for (const documentation of ["README.md", "CHANGELOG.md", "docs/PROJECT_STATUS.md"]) {
  const source = fs.readFileSync(path.join(root, documentation), "utf8");
  if (!source.includes(releaseLabel)) errors.push(`${documentation} does not identify release ${releaseLabel}`);
}
if (!fs.existsSync(path.join(root, "docs", "RELEASE_CANDIDATE.md"))) {
  errors.push("docs/RELEASE_CANDIDATE.md is required for a release-candidate build");
}

if (errors.length > 0) {
  console.error(`Release-readiness errors:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Release readiness OK (${releaseLabel}; ${messageKeys.length} localized messages; bounded sound/VFX paths).`);
