import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";

const root = path.resolve(import.meta.dirname, "..");
const releases = path.join(root, "dist", "releases");
fs.mkdirSync(releases, { recursive: true });
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const outputPath = path.join(releases, `Aspergillum-${version}.mcaddon`);

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("warning", reject);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(path.join(root, "packs", "behavior"), "Aspergillum_BP");
  archive.directory(path.join(root, "packs", "resource"), "Aspergillum_RP");
  archive.finalize();
});

const bytes = fs.readFileSync(outputPath);
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
fs.writeFileSync(`${outputPath}.sha256`, `${sha256}  ${path.basename(outputPath)}\n`);
console.log(`Created ${path.relative(root, outputPath)} (${bytes.length} bytes)`);
console.log(`SHA-256 ${sha256}`);
