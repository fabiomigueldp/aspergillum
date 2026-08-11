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

function localeEntries(pack, locale) {
  const source = fs.readFileSync(path.join(root, "packs", pack, "texts", `${locale}.lang`), "utf8");
  const entries = new Map();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, "");
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator);
    if (entries.has(key)) errors.push(`${pack}/${locale}.lang contains duplicate key ${key}`);
    entries.set(key, line.slice(separator + 1));
  }
  return entries;
}

const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const customizationCatalog = JSON.parse(fs.readFileSync(
  path.join(root, "assets-src", "customization", "catalog.json"),
  "utf8",
));
const releaseLabel = metadata.aspergillum?.releaseLabel ?? metadata.version;
const expectedVersion = metadata.version.split(".").map(Number);
const behaviorManifest = JSON.parse(fs.readFileSync(path.join(root, "packs", "behavior", "manifest.json"), "utf8"));
const resourceManifest = JSON.parse(fs.readFileSync(path.join(root, "packs", "resource", "manifest.json"), "utf8"));
const packIdentity = JSON.parse(fs.readFileSync(
  path.join(root, "assets-src", "branding", "pack-identity.json"),
  "utf8",
));
if (packIdentity.schemaVersion !== 1
  || packIdentity.manifestKeys?.name !== "pack.name"
  || packIdentity.manifestKeys?.description !== "pack.description"
  || JSON.stringify(packIdentity.locales) !== JSON.stringify(["en_US", "pt_BR"])) {
  errors.push("Pack identity contract must preserve schema 1, canonical keys, en_US, and pt_BR");
}
for (const [label, actual] of [
  ["Behavior Pack", behaviorManifest.header.version],
  ["Resource Pack", resourceManifest.header.version],
]) {
  if (JSON.stringify(actual) !== JSON.stringify(expectedVersion)) {
    errors.push(`${label} version does not match package.json`);
  }
}
for (const [kind, label, manifest] of [
  ["behavior", "Behavior", behaviorManifest],
  ["resource", "Resource", resourceManifest],
]) {
  if (manifest.header.name !== packIdentity.manifestKeys?.name
    || manifest.header.description !== packIdentity.manifestKeys?.description) {
    errors.push(`${label} Pack manifest identity does not use the canonical localized keys`);
  }
  const declaredLocales = JSON.parse(fs.readFileSync(
    path.join(root, "packs", kind, "texts", "languages.json"),
    "utf8",
  ));
  if (JSON.stringify(declaredLocales) !== JSON.stringify(packIdentity.locales)) {
    errors.push(`${label} Pack languages.json differs from the identity contract`);
  }
  for (const locale of packIdentity.locales ?? []) {
    const entries = localeEntries(kind, locale);
    for (const field of ["name", "description"]) {
      const key = packIdentity.manifestKeys[field];
      if (entries.get(key) !== packIdentity.packs?.[kind]?.[field]?.[locale]) {
        errors.push(`${label} Pack ${locale} ${key} differs from the identity contract`);
      }
    }
    if ([...entries.keys()].some((key) => key.startsWith("pack.aspergillum."))) {
      errors.push(`${label} Pack ${locale} retains a legacy pack identity key`);
    }
  }
}

const messagingSource = fs.readFileSync(path.join(root, "src", "presentation", "messaging.ts"), "utf8");
const messageKeys = [...new Set(messagingSource.match(/message\.aspergillum\.[a-z_]+/g) ?? [])].sort();
if (messageKeys.length !== 32) errors.push(`Expected 32 action-message keys, found ${messageKeys.length}`);
const loreKeys = [
  "item.aspergillum.lore.charges",
  "item.aspergillum.lore.profile",
  "item.aspergillum.lore.appearance",
  "item.aspergillum.lore.grip",
  "item.aspergillum.lore.instructions",
  "item.aspergillum.lore.docking",
  "item.aspergillum.lore.creative",
];
const dynamicPlaceholderCounts = new Map([
  ["item.aspergillum.lore.charges", 2],
  ["message.aspergillum.charges_inspect", 1],
  ["message.aspergillum.charges_loaded", 1],
  ["message.aspergillum.charges_remaining", 1],
  ["message.aspergillum.docked_partial", 2],
  ["message.aspergillum.docked_retained", 1],
  ["message.aspergillum.docked_transferred", 1],
]);
for (const locale of ["pt_BR", "en_US"]) {
  const entries = localeEntries("resource", locale);
  const localizedKeys = [...entries.keys()].filter((key) => key.startsWith("message.aspergillum.")).sort();
  if (JSON.stringify(localizedKeys) !== JSON.stringify(messageKeys)) {
    errors.push(`${locale}.lang action-message catalog differs from the typed catalog`);
  }
  for (const loreKey of loreKeys) {
    if (!entries.has(loreKey)) errors.push(`${locale}.lang is missing ${loreKey}`);
  }
  for (const key of [...loreKeys, ...messageKeys]) {
    const value = entries.get(key) ?? "";
    if (!/^§r§[0-9a-f]/.test(value)) {
      errors.push(`${locale}.lang ${key} must reset inherited styling before applying its color`);
    }
  }
  for (const loreKey of loreKeys) {
    if ((entries.get(loreKey) ?? "").includes("§o")) {
      errors.push(`${locale}.lang ${loreKey} must remain non-italic after its explicit reset`);
    }
  }
  for (const [key, expectedCount] of dynamicPlaceholderCounts) {
    const value = entries.get(key) ?? "";
    const actualCount = value.match(/%s/g)?.length ?? 0;
    if (actualCount !== expectedCount || /%%\d|%\d(?:\$s)?/.test(value)) {
      errors.push(`${locale}.lang ${key} must use exactly ${expectedCount} sequential %s placeholder(s)`);
    }
  }
  for (const key of [
    "message.aspergillum.charges_inspect",
    "message.aspergillum.charges_loaded",
    "message.aspergillum.charges_remaining",
  ]) {
    const value = entries.get(key) ?? "";
    if (!value.includes("/4") || value.includes("/3")) {
      errors.push(`${locale}.lang ${key} must present the four-charge capacity`);
    }
  }
}
const portugueseUiKeys = [...localeEntries("resource", "pt_BR").keys()]
  .filter((key) => key.startsWith("ui.aspergillum."))
  .sort();
const englishUiKeys = [...localeEntries("resource", "en_US").keys()]
  .filter((key) => key.startsWith("ui.aspergillum."))
  .sort();
const fixedUiKeyCount = 15;
const expectedUiKeyCount = fixedUiKeyCount
  + (customizationCatalog.metalFinishes.length + customizationCatalog.gripFinishes.length) * 2;
if (JSON.stringify(portugueseUiKeys) !== JSON.stringify(englishUiKeys)
  || portugueseUiKeys.length !== expectedUiKeyCount) {
  errors.push(
    `Customization UI catalogs must expose the same ${expectedUiKeyCount} keys in pt_BR and en_US`,
  );
}

const sourceFiles = walk(path.join(root, "src")).filter((file) => file.endsWith(".ts"));
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (source.includes(".playSound(") && relative !== "src/presentation/audio/bedrock-audio-adapter.ts") {
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
  || !itemStateSource.includes("item.aspergillum.lore.profile")
  || !itemStateSource.includes("item.aspergillum.lore.appearance")
  || !itemStateSource.includes("getRawLore().length !== 6")) {
  errors.push("Item lore must expose customization and docking instructions and lazily refresh legacy lore");
}
const wetFeedbackSource = fs.readFileSync(path.join(root, "src", "presentation", "wet-feedback.ts"), "utf8");
if (!wetFeedbackSource.includes("MICRO_SPLASH_PARTICLE") || !wetFeedbackSource.includes("LOAD_SPLASH_OFFSETS")) {
  errors.push("The RC requires bounded wet feedback after a successful load");
}
const aspergillumDomainSource = fs.readFileSync(path.join(root, "src", "domain", "aspergillum.ts"), "utf8");
const aspersoriumDomainSource = fs.readFileSync(path.join(root, "src", "domain", "aspersorium-water.ts"), "utf8");
const aspersoriumStateSource = fs.readFileSync(
  path.join(root, "src", "infrastructure", "aspersorium-water-state.ts"),
  "utf8",
);
if (!aspergillumDomainSource.includes("ASPERGILLUM_CAPACITY = 4")) {
  errors.push("The RC requires an explicit four-charge aspergillum capacity");
}
if (!aspersoriumDomainSource.includes("ASPERSORIUM_CAPACITY = 16")
  || !aspersoriumDomainSource.includes("WATER_BUCKET_FILL = ASPERSORIUM_CAPACITY")) {
  errors.push("The RC requires an independent sixteen-unit aspersorium reservoir");
}
if (!aspersoriumStateSource.includes("WATER_HIGH_BASE = 9")
  || !aspersoriumStateSource.includes("withAspersoriumWater")
  || !aspersoriumStateSource.includes("decodeAspersoriumWater")) {
  errors.push("The RC requires the compact radix-nine block-state water adapter");
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
