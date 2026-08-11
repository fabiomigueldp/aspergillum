import fs from "node:fs";
import path from "node:path";
import { createMcaddon, publishArtifact } from "./release/artifact-core.mjs";
import { requireReleaseRegistration } from "./release/release-registry.mjs";

const root = path.resolve(import.meta.dirname, "..");
const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releaseLabel = metadata.aspergillum?.releaseLabel ?? metadata.version;
const behaviorPath = path.join(root, "packs", "behavior");
const resourcePath = path.join(root, "packs", "resource");
const behaviorManifest = JSON.parse(fs.readFileSync(path.join(behaviorPath, "manifest.json"), "utf8"));
const resourceManifest = JSON.parse(fs.readFileSync(path.join(resourcePath, "manifest.json"), "utf8"));
requireReleaseRegistration(releaseLabel, behaviorManifest.header.version, "official");
if (behaviorManifest.header.version.join(".") !== resourceManifest.header.version.join(".")) {
  throw new Error("Behavior Pack e Resource Pack usam versões diferentes.");
}

const outputPath = path.join(root, "dist", "releases", `Aspergillum-${releaseLabel}.mcaddon`);
await createMcaddon({ outputPath, behaviorPath, resourcePath, replace: process.argv.includes("--replace") });
const descriptor = publishArtifact({ projectRoot: root, artifactPath: outputPath, label: releaseLabel, channel: "official", family: "release" });
console.log(`Created ${descriptor.artifact} (${descriptor.bytes} bytes)`);
console.log(`SHA-256 ${descriptor.sha256}`);
console.log(`Descriptor ${path.relative(root, `${outputPath}.artifact.json`)}`);
