import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { entries, getReleaseRegistration, requireReleaseRegistration } from "./release-registry.mjs";

describe("release registry", () => {
  it("reserves every label and Bedrock version exactly once", () => {
    expect(new Set(entries.map((entry) => entry.label)).size).toBe(entries.length);
    expect(new Set(entries.map((entry) => entry.bedrockVersion.join("."))).size).toBe(entries.length);
  });

  it("matches package.json and both current manifests", () => {
    const root = path.resolve(import.meta.dirname, "..", "..");
    const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const label = metadata.aspergillum?.releaseLabel ?? metadata.version;
    const behavior = JSON.parse(fs.readFileSync(path.join(root, "packs", "behavior", "manifest.json"), "utf8"));
    const resource = JSON.parse(fs.readFileSync(path.join(root, "packs", "resource", "manifest.json"), "utf8"));
    expect(() => requireReleaseRegistration(label, behavior.header.version, "official")).not.toThrow();
    expect(resource.header.version).toEqual(behavior.header.version);
    expect(getReleaseRegistration(label)?.channel).toBe("official");
  });
});
