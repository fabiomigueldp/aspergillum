import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMcaddon, publishArtifact } from "../release/artifact-core.mjs";
import { prepareArtifactCache } from "./artifact-cache.mjs";
import { loadArtifactCatalog, findArtifact } from "./catalog.mjs";
import { inspectBedrock } from "./bedrock.mjs";
import { applyInstallPlan } from "./installer.mjs";
import { createInstallPlan } from "./planner.mjs";

const temporaryRoots = [];

function temporaryRoot() {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), "aspergillum-manager-test-"));
  temporaryRoots.push(value);
  fs.mkdirSync(path.join(value, "dist", "releases"), { recursive: true });
  return value;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function copyPack(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

async function createArtifact(root, label, version, suffix, identitySuffix = suffix) {
  const source = path.join(root, "sources", label);
  const behavior = path.join(source, "behavior");
  const resource = path.join(source, "resource");
  const behaviorUuid = `10000000-0000-4000-8000-0000000000${identitySuffix}`;
  const resourceUuid = `20000000-0000-4000-8000-0000000000${identitySuffix}`;
  writeJson(path.join(behavior, "manifest.json"), {
    format_version: 2,
    header: { name: `Aspergillum ${label} BP`, uuid: behaviorUuid, version },
    modules: [{ type: "data", uuid: `30000000-0000-4000-8000-0000000000${suffix}`, version }],
    dependencies: [{ uuid: resourceUuid, version }],
  });
  writeJson(path.join(resource, "manifest.json"), {
    format_version: 2,
    header: { name: `Aspergillum ${label} RP`, uuid: resourceUuid, version },
    modules: [{ type: "resources", uuid: `40000000-0000-4000-8000-0000000000${suffix}`, version }],
  });
  fs.writeFileSync(path.join(behavior, "payload.txt"), label, "utf8");
  fs.writeFileSync(path.join(resource, "payload.txt"), label, "utf8");
  const artifactPath = path.join(root, "dist", "releases", `Aspergillum-${label}.mcaddon`);
  await createMcaddon({ outputPath: artifactPath, behaviorPath: behavior, resourcePath: resource });
  const descriptor = publishArtifact({
    projectRoot: root,
    artifactPath,
    label,
    channel: "diagnostic",
    family: "test",
    provenance: { sourceCommit: "0123456789abcdef", sourceDirty: false },
  });
  return { behavior, resource, descriptor };
}

function createWorld({ bedrockRoot, profile, folder, name, artifact, local = true }) {
  const world = path.join(bedrockRoot, "Users", profile, "games", "com.mojang", "minecraftWorlds", folder);
  fs.mkdirSync(world, { recursive: true });
  fs.writeFileSync(path.join(world, "levelname.txt"), name, "utf8");
  writeJson(path.join(world, "world_behavior_packs.json"), [{ pack_id: artifact.descriptor.behaviorUuid, version: artifact.descriptor.bedrockVersion }]);
  writeJson(path.join(world, "world_resource_packs.json"), [{ pack_id: artifact.descriptor.resourceUuid, version: artifact.descriptor.bedrockVersion }]);
  writeJson(path.join(world, "world_behavior_pack_history.json"), { packs: [{ name: `Aspergillum ${artifact.descriptor.label} BP`, uuid: artifact.descriptor.behaviorUuid, version: artifact.descriptor.bedrockVersion }] });
  writeJson(path.join(world, "world_resource_pack_history.json"), { packs: [{ name: `Aspergillum ${artifact.descriptor.label} RP`, uuid: artifact.descriptor.resourceUuid, version: artifact.descriptor.bedrockVersion }] });
  if (local) {
    copyPack(artifact.behavior, path.join(world, "behavior_packs", "pack"));
    copyPack(artifact.resource, path.join(world, "resource_packs", "pack"));
  }
  return world;
}

function installShared(bedrockRoot, artifact) {
  const shared = path.join(bedrockRoot, "Users", "Shared", "games", "com.mojang");
  copyPack(artifact.behavior, path.join(shared, "behavior_packs", "pack.asper"));
  copyPack(artifact.resource, path.join(shared, "resource_packs", "pack.asper"));
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("addon manager", () => {
  it("updates every exact X world across profiles and preserves other versions", async () => {
    const root = temporaryRoot();
    const bedrockRoot = path.join(root, "bedrock");
    const x = await createArtifact(root, "x", [7, 0, 1], "01");
    const y = await createArtifact(root, "y", [7, 0, 2], "02");
    const z = await createArtifact(root, "z", [7, 0, 3], "03");
    installShared(bedrockRoot, x);
    createWorld({ bedrockRoot, profile: "P1", folder: "W1", name: "devtest", artifact: x });
    createWorld({ bedrockRoot, profile: "P2", folder: "W2", name: "also-x", artifact: x, local: false });
    createWorld({ bedrockRoot, profile: "P2", folder: "W3", name: "preserve-z", artifact: z });
    const catalog = loadArtifactCatalog({ projectRoot: root });
    const inventory = inspectBedrock({ bedrockRoot, catalog });
    const plan = createInstallPlan({ inventory, source: findArtifact(catalog, "x"), target: findArtifact(catalog, "y"), action: "upgrade" });
    expect(plan.selected.map((entry) => entry.world.name).sort()).toEqual(["also-x", "devtest"]);
    expect(plan.preserved.map((entry) => entry.world.name)).toEqual(["preserve-z"]);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("pins unselected Shared dependants and atomically installs Y in Shared and devtest", async () => {
    const root = temporaryRoot();
    const bedrockRoot = path.join(root, "bedrock");
    const x = await createArtifact(root, "x", [8, 0, 1], "11");
    const y = await createArtifact(root, "y", [8, 0, 2], "12", "11");
    installShared(bedrockRoot, x);
    const devtestPath = createWorld({ bedrockRoot, profile: "P1", folder: "DEV", name: "devtest", artifact: x });
    const unrelatedBehavior = { pack_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", version: [1, 0, 0] };
    const unrelatedResource = { pack_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", version: [1, 0, 0] };
    writeJson(path.join(devtestPath, "world_behavior_packs.json"), [unrelatedBehavior, { pack_id: x.descriptor.behaviorUuid, version: x.descriptor.bedrockVersion }]);
    writeJson(path.join(devtestPath, "world_resource_packs.json"), [unrelatedResource, { pack_id: x.descriptor.resourceUuid, version: x.descriptor.bedrockVersion }]);
    const preservedPath = createWorld({ bedrockRoot, profile: "P2", folder: "OLD", name: "shared-only", artifact: x, local: false });
    const catalog = loadArtifactCatalog({ projectRoot: root });
    const inventory = inspectBedrock({ bedrockRoot, catalog });
    const target = findArtifact(catalog, "y");
    const plan = createInstallPlan({ inventory, target, world: "devtest", action: "install" });
    expect(plan.selected).toHaveLength(1);
    expect(plan.pins.map((entry) => entry.world.name)).toEqual(["shared-only"]);

    const result = applyInstallPlan({ projectRoot: root, inventory, plan, checkMinecraft: false });
    expect(result).toMatchObject({ changed: true, selected: 1, pinned: 1, sharedUpdated: true, cacheReused: false });
    expect(prepareArtifactCache({ projectRoot: root, descriptor: target }).reused).toBe(true);
    const after = inspectBedrock({ bedrockRoot, catalog });
    expect(after.shared.labels).toEqual(["y"]);
    expect(after.worlds.find((world) => world.name === "devtest").active.labels).toEqual(["y"]);
    const preserved = after.worlds.find((world) => world.name === "shared-only");
    expect(preserved.active.labels).toEqual(["x"]);
    expect(preserved.local.labels).toEqual(["x"]);
    expect(fs.existsSync(path.join(preservedPath, "behavior_packs", "aspergillum.managed", "manifest.json"))).toBe(true);
    const devtest = after.worlds.find((world) => world.name === "devtest");
    expect(fs.readFileSync(path.join(devtest.local.pair.behavior.path, "payload.txt"), "utf8")).toBe("y");
    expect(devtest.histories.behavior.entries).toHaveLength(1);
    expect(devtest.histories.behavior.entries[0]).toMatchObject({ uuid: y.descriptor.behaviorUuid, version: y.descriptor.bedrockVersion });
    expect(devtest.references.behavior.value).toContainEqual(unrelatedBehavior);
    expect(devtest.references.resource.value).toContainEqual(unrelatedResource);
  });

  it("blocks a world that contains only half of the exact X identity", async () => {
    const root = temporaryRoot();
    const bedrockRoot = path.join(root, "bedrock");
    const x = await createArtifact(root, "x", [9, 0, 1], "21");
    const y = await createArtifact(root, "y", [9, 0, 2], "22");
    installShared(bedrockRoot, x);
    const worldPath = createWorld({ bedrockRoot, profile: "P1", folder: "HALF", name: "half-x", artifact: x });
    writeJson(path.join(worldPath, "world_resource_packs.json"), []);
    fs.rmSync(path.join(worldPath, "resource_packs"), { recursive: true, force: true });
    const catalog = loadArtifactCatalog({ projectRoot: root });
    const inventory = inspectBedrock({ bedrockRoot, catalog });
    const plan = createInstallPlan({ inventory, source: findArtifact(catalog, "x"), target: findArtifact(catalog, "y"), action: "upgrade" });
    expect(plan.selected).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].reason).toMatch(/parte da identidade X/);
  });
});
