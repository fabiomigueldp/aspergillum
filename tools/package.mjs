import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";

const root = path.resolve(import.meta.dirname, "..");
const releases = path.join(root, "dist", "releases");
fs.mkdirSync(releases, { recursive: true });
const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releaseLabel = metadata.aspergillum?.releaseLabel ?? metadata.version;
const outputPath = path.join(releases, `Aspergillum-${releaseLabel}.mcaddon`);
// ZIP timestamps are stored in local DOS time. A date well after the 1980
// lower bound remains stable in every supported timezone.
const archiveDate = new Date("2000-01-01T00:00:00.000Z");

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(absolute) : [absolute];
    });
}

function appendPack(archive, source, destination) {
  for (const file of collectFiles(source)) {
    const relative = path.relative(source, file).split(path.sep).join("/");
    archive.append(fs.readFileSync(file), {
      name: `${destination}/${relative}`,
      date: archiveDate,
      mode: 0o644,
    });
  }
}

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("warning", reject);
  archive.on("error", reject);
  archive.pipe(output);
  appendPack(archive, path.join(root, "packs", "behavior"), "Aspergillum_BP");
  appendPack(archive, path.join(root, "packs", "resource"), "Aspergillum_RP");
  archive.finalize();
});

const bytes = fs.readFileSync(outputPath);
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
fs.writeFileSync(`${outputPath}.sha256`, `${sha256}  ${path.basename(outputPath)}\n`);
console.log(`Created ${path.relative(root, outputPath)} (${bytes.length} bytes)`);
console.log(`SHA-256 ${sha256}`);
