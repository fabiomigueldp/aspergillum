import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAddonManager } from "./addon-manager.mjs";

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
  return options;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log("Compatibilidade: npm run sync:diagnostic -- --variant <rótulo> --apply\nComando canônico: npm run addon -- install <rótulo>");
    return;
  }
  console.error("sync:diagnostic é uma fachada compatível; comando canônico: npm run addon -- install <rótulo>");
  const translated = ["install", options.variant, "--world", options.world];
  if (options.profile) translated.push("--profile", options.profile);
  translated.push(options.apply && !options.dryRun ? "--apply" : "--dry-run");
  return runAddonManager(translated);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(`sync-diagnostic-addon: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export { main, parseArgs };
