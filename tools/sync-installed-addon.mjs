import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAddonManager } from "./addon-manager.mjs";
import { renderInstallationMap as renderMap } from "./addon-manager/report.mjs";

const root = path.resolve(import.meta.dirname, "..");
const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const defaultReleaseLabel = metadata.aspergillum?.releaseLabel ?? metadata.version;

function parseVersion(value, source) {
  if (Array.isArray(value) && value.length === 3 && value.every(Number.isInteger)) return [...value];
  if (typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value)) return value.split(".").map(Number);
  throw new Error(`Versão inválida em ${source}: ${JSON.stringify(value)}`);
}

function versionText(version) {
  return version.join(".");
}

function parseArgs(argv) {
  const options = { apply: false, allWorlds: false, dryRun: false, profile: undefined, release: defaultReleaseLabel, world: "devtest" };
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
  if (options.allWorlds && options.world !== "devtest") throw new Error("Use --all-worlds sem --world.");
  return options;
}

function printHelp() {
  console.log("Compatibilidade: use preferencialmente 'npm run addon -- install [rótulo]'.\n" +
    "Este comando preserva a interface histórica --apply/--dry-run/--world/--all-worlds.");
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) return printHelp();
  console.error("sync:game é uma fachada compatível; comando canônico: npm run addon -- install");
  const translated = ["install", options.release];
  if (options.allWorlds) translated.push("--all-worlds");
  else translated.push("--world", options.world);
  if (options.profile) translated.push("--profile", options.profile);
  translated.push(options.apply && !options.dryRun ? "--apply" : "--dry-run");
  return runAddonManager(translated);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(`sync-installed-addon: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export { main, parseArgs, parseVersion, renderMap, versionText };
