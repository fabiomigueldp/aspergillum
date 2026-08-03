import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cli = path.join(root, "node_modules", "@minecraft", "creator-tools", "cli", "index.mjs");
const addon = path.join(root, "dist", `Aspergillum-${version}.mcaddon`);
const reportDirectory = path.join(root, "dist", "validation");

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
process.exit(result.status ?? 1);
