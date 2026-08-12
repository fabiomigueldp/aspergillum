import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { extractZip } from "../lib/zip.mjs";
import { createMcaddon, inspectArtifact, sha256File } from "./artifact-core.mjs";

const temporaryRoots = [];

function temporaryRoot() {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), "aspergillum-artifact-test-"));
  temporaryRoots.push(value);
  return value;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fixturePacks(root) {
  const behavior = path.join(root, "behavior");
  const resource = path.join(root, "resource");
  const version = [9, 8, 7];
  const behaviorUuid = "11111111-1111-4111-8111-111111111111";
  const resourceUuid = "22222222-2222-4222-8222-222222222222";
  writeJson(path.join(behavior, "manifest.json"), {
    format_version: 2,
    header: { name: "Aspergillum Test BP", uuid: behaviorUuid, version },
    modules: [{ type: "data", uuid: "33333333-3333-4333-8333-333333333333", version }],
    dependencies: [{ uuid: resourceUuid, version }],
  });
  writeJson(path.join(resource, "manifest.json"), {
    format_version: 2,
    header: { name: "Aspergillum Test RP", uuid: resourceUuid, version },
    modules: [{ type: "resources", uuid: "44444444-4444-4444-8444-444444444444", version }],
  });
  fs.mkdirSync(path.join(behavior, "functions"), { recursive: true });
  fs.writeFileSync(path.join(behavior, "functions", "test.mcfunction"), "say deterministic\n", "utf8");
  return { behavior, resource, behaviorUuid, resourceUuid, version };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("artifact core", () => {
  it("packages deterministically and derives identity from the exact mcaddon", async () => {
    const root = temporaryRoot();
    const packs = fixturePacks(root);
    const first = path.join(root, "dist", "releases", "Aspergillum-test.mcaddon");
    const second = path.join(root, "dist", "releases", "Aspergillum-test-copy.mcaddon");
    await createMcaddon({ outputPath: first, behaviorPath: packs.behavior, resourcePath: packs.resource });
    await createMcaddon({ outputPath: second, behaviorPath: packs.behavior, resourcePath: packs.resource });
    expect(sha256File(first)).toBe(sha256File(second));

    const descriptor = inspectArtifact({ projectRoot: root, artifactPath: first, label: "test", channel: "diagnostic" });
    expect(descriptor).toMatchObject({
      schemaVersion: 2,
      addonId: "aspergillum",
      displayName: "Aspergillum",
      label: "test",
      bedrockVersion: packs.version,
      behaviorUuid: packs.behaviorUuid,
      resourceUuid: packs.resourceUuid,
      channel: "diagnostic",
    });

    const extracted = path.join(root, "extracted");
    extractZip(first, extracted);
    expect(JSON.parse(fs.readFileSync(path.join(extracted, "Aspergillum_BP", "manifest.json"), "utf8")).header.uuid).toBe(packs.behaviorUuid);
  });

  it("refuses to overwrite a reserved label with different bytes", async () => {
    const root = temporaryRoot();
    const packs = fixturePacks(root);
    const output = path.join(root, "dist", "releases", "Aspergillum-locked.mcaddon");
    await createMcaddon({ outputPath: output, behaviorPath: packs.behavior, resourcePath: packs.resource });
    const approvedHash = sha256File(output);
    fs.writeFileSync(path.join(packs.behavior, "functions", "test.mcfunction"), "say changed\n", "utf8");
    await expect(createMcaddon({ outputPath: output, behaviorPath: packs.behavior, resourcePath: packs.resource })).rejects.toThrow(/bytes diferentes/);
    expect(sha256File(output)).toBe(approvedHash);
    await createMcaddon({ outputPath: output, behaviorPath: packs.behavior, resourcePath: packs.resource, replace: true });
    expect(sha256File(output)).not.toBe(approvedHash);
  });
});
