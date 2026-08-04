import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cli = path.join(root, "node_modules", "@minecraft", "creator-tools", "cli", "index.mjs");
const addon = path.join(root, "dist", "releases", `Aspergillum-${version}.mcaddon`);
const reportDirectory = path.join(root, "dist", "validation", version);

if (!reportDirectory.startsWith(`${root}${path.sep}`)) {
  throw new Error(`Refusing to clean validation reports outside the workspace: ${reportDirectory}`);
}
fs.rmSync(reportDirectory, { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  [cli, "--input-file", addon, "--output-folder", reportDirectory, "--offline", "--yes", "validate"],
  { cwd: root, encoding: "utf8", stdio: "inherit" },
);

if (result.error) throw result.error;
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);

const csvPath = path.join(reportDirectory, `aspergillum-${version}.csv`);
if (!fs.existsSync(csvPath)) throw new Error(`Creator Tools did not produce ${csvPath}`);
const reportLines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/);
const failures = reportLines.filter((line) => /,"?(?:Error|Failure)"?,/i.test(line));
const warnings = reportLines.filter((line) => /,"?Warning"?,/i.test(line));
const knownOfflineLinks = [
  "`aspergillum:aspersorium`",
  "`minecraft:iron_nugget`",
  "`minecraft:stick`",
  "`minecraft:chain`",
  "`minecraft:iron_ingot`",
];
const unexpectedWarnings = warnings.filter((line) =>
  !line.includes("Link to item type is not found in this pack")
  || !knownOfflineLinks.some((identifier) => line.includes(identifier)),
);

if (failures.length > 0 || unexpectedWarnings.length > 0) {
  if (failures.length > 0) console.error(`Creator Tools failures:\n${failures.join("\n")}`);
  if (unexpectedWarnings.length > 0) console.error(`Unexpected Creator Tools warnings:\n${unexpectedWarnings.join("\n")}`);
  process.exit(1);
}
console.log(`Creator Tools report accepted (${warnings.length} known offline link warnings, 0 unexpected warnings).`);
