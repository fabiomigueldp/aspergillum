import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMcaddon, publishArtifact } from "../release/artifact-core.mjs";
import { prepareArtifactCache } from "./artifact-cache.mjs";
import { loadArtifactCatalog, findArtifact } from "./catalog.mjs";
import { inspectBedrock } from "./bedrock.mjs";
import { applyInstallPlan, applyRemovePlan } from "./installer.mjs";
import { createInstallPlan, createRemovePlan } from "./planner.mjs";

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

function managedProject(projectRoot, id, identitySuffix) {
  const title = id[0].toUpperCase() + id.slice(1);
  const project = {
    schemaVersion: 1,
    id,
    displayName: title,
    artifactPrefix: title,
    projectRoot,
    aliases: [id],
    sharedDirectory: `pack.${id}`,
    worldDirectory: `${id}.managed`,
    currentLabel: "2.0.0",
    publicIdentity: {
      behaviorUuid: `51000000-0000-4000-8000-0000000000${identitySuffix}`,
      resourceUuid: `52000000-0000-4000-8000-0000000000${identitySuffix}`,
    },
  };
  writeJson(path.join(projectRoot, "package.json"), {
    name: `${id}-bedrock-addon`,
    version: project.currentLabel,
    addonManager: {
      schemaVersion: 1,
      id: project.id,
      displayName: project.displayName,
      artifactPrefix: project.artifactPrefix,
      sharedDirectory: project.sharedDirectory,
      worldDirectory: project.worldDirectory,
      aliases: project.aliases,
      publicIdentity: project.publicIdentity,
    },
  });
  return project;
}

async function createManagedArtifact(project, label, version, revisionSuffix) {
  const source = path.join(project.projectRoot, "sources", label);
  const behavior = path.join(source, "behavior");
  const resource = path.join(source, "resource");
  writeJson(path.join(behavior, "manifest.json"), {
    format_version: 2,
    header: { name: `${project.displayName} ${label} BP`, uuid: project.publicIdentity.behaviorUuid, version },
    modules: [{ type: "data", uuid: `53000000-0000-4000-8000-0000000000${revisionSuffix}`, version }],
    dependencies: [{ uuid: project.publicIdentity.resourceUuid, version }],
  });
  writeJson(path.join(resource, "manifest.json"), {
    format_version: 2,
    header: { name: `${project.displayName} ${label} RP`, uuid: project.publicIdentity.resourceUuid, version },
    modules: [{ type: "resources", uuid: `54000000-0000-4000-8000-0000000000${revisionSuffix}`, version }],
  });
  fs.writeFileSync(path.join(behavior, "payload.txt"), `${project.id}/${label}`, "utf8");
  fs.writeFileSync(path.join(resource, "payload.txt"), `${project.id}/${label}`, "utf8");
  const artifactPath = path.join(project.projectRoot, "dist", "releases", `${project.artifactPrefix}-${label}.mcaddon`);
  await createMcaddon({
    outputPath: artifactPath,
    behaviorPath: behavior,
    resourcePath: resource,
    behaviorRoot: `${project.displayName}_BP`,
    resourceRoot: `${project.displayName}_RP`,
  });
  const descriptor = publishArtifact({
    projectRoot: project.projectRoot,
    artifactPath,
    label,
    channel: "official",
    family: "release",
    provenance: { sourceCommit: `commit-${project.id}-${label}`, sourceDirty: false },
  });
  return { behavior, resource, descriptor };
}

function installSharedProject(bedrockRoot, project, artifact) {
  const shared = path.join(bedrockRoot, "Users", "Shared", "games", "com.mojang");
  copyPack(artifact.behavior, path.join(shared, "behavior_packs", project.sharedDirectory));
  copyPack(artifact.resource, path.join(shared, "resource_packs", project.sharedDirectory));
}

function createEmptyWorld(bedrockRoot, profile, folder, name) {
  const world = path.join(bedrockRoot, "Users", profile, "games", "com.mojang", "minecraftWorlds", folder);
  fs.mkdirSync(world, { recursive: true });
  fs.writeFileSync(path.join(world, "levelname.txt"), name, "utf8");
  writeJson(path.join(world, "world_behavior_packs.json"), []);
  writeJson(path.join(world, "world_resource_packs.json"), []);
  writeJson(path.join(world, "world_behavior_pack_history.json"), { packs: [] });
  writeJson(path.join(world, "world_resource_pack_history.json"), { packs: [] });
  return world;
}

function addProjectToWorld(world, project, artifact, directory = `${project.id}.local`) {
  for (const [kind, uuid, packRoot, source] of [
    ["behavior", project.publicIdentity.behaviorUuid, "behavior_packs", artifact.behavior],
    ["resource", project.publicIdentity.resourceUuid, "resource_packs", artifact.resource],
  ]) {
    const referencePath = path.join(world, `world_${kind}_packs.json`);
    const references = JSON.parse(fs.readFileSync(referencePath, "utf8"));
    references.push({ pack_id: uuid, version: artifact.descriptor.bedrockVersion });
    writeJson(referencePath, references);
    const historyPath = path.join(world, `world_${kind}_pack_history.json`);
    const history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
    history.packs.push({ name: `${project.displayName} ${artifact.descriptor.label} ${kind}`, uuid, version: artifact.descriptor.bedrockVersion });
    writeJson(historyPath, history);
    copyPack(source, path.join(world, packRoot, directory));
  }
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("addon manager", () => {
  it("normalizes legacy descriptors that only declare per-pack versions", async () => {
    const root = temporaryRoot();
    const legacy = await createArtifact(root, "legacy", [6, 4, 2], "00");
    const legacyDescriptor = {
      schemaVersion: 1,
      label: "legacy",
      artifact: legacy.descriptor.artifact,
      bytes: legacy.descriptor.bytes,
      sha256: legacy.descriptor.sha256,
      behavior: legacy.descriptor.behavior,
      resource: legacy.descriptor.resource,
    };
    writeJson(`${path.resolve(root, legacy.descriptor.artifact)}.artifact.json`, legacyDescriptor);

    const [normalized] = loadArtifactCatalog({ projectRoot: root, refresh: true });
    expect(normalized).toMatchObject({
      schemaVersion: 2,
      sourceSchemaVersion: 1,
      addonId: "aspergillum",
      label: "legacy",
      bedrockVersion: [6, 4, 2],
      behaviorUuid: legacy.descriptor.behaviorUuid,
      resourceUuid: legacy.descriptor.resourceUuid,
    });
  });

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

  it("updates one add-on without changing the other add-on or reference priority", async () => {
    const managerRoot = temporaryRoot();
    const alphaRoot = path.join(managerRoot, "alpha-project");
    const betaRoot = path.join(managerRoot, "beta-project");
    fs.mkdirSync(path.join(alphaRoot, "dist", "releases"), { recursive: true });
    fs.mkdirSync(path.join(betaRoot, "dist", "releases"), { recursive: true });
    const alpha = managedProject(alphaRoot, "alpha", "41");
    const beta = managedProject(betaRoot, "beta", "42");
    const alphaX = await createManagedArtifact(alpha, "1.0.0", [1, 0, 0], "41");
    const alphaY = await createManagedArtifact(alpha, "2.0.0", [2, 0, 0], "43");
    const betaX = await createManagedArtifact(beta, "1.0.0", [1, 0, 0], "42");
    const bedrockRoot = path.join(managerRoot, "bedrock");
    installSharedProject(bedrockRoot, alpha, alphaX);
    installSharedProject(bedrockRoot, beta, betaX);
    const world = createEmptyWorld(bedrockRoot, "P1", "DEV", "devtest");
    addProjectToWorld(world, alpha, alphaX);
    addProjectToWorld(world, beta, betaX);

    const alphaCatalog = loadArtifactCatalog({ projectRoot: alphaRoot, stateRoot: managerRoot, project: alpha });
    const betaCatalog = loadArtifactCatalog({ projectRoot: betaRoot, stateRoot: managerRoot, project: beta });
    const alphaInventory = inspectBedrock({ bedrockRoot, catalog: alphaCatalog, project: alpha });
    const plan = createInstallPlan({ inventory: alphaInventory, target: findArtifact(alphaCatalog, "2.0.0"), world: "devtest" });
    applyInstallPlan({ projectRoot: alphaRoot, stateRoot: managerRoot, inventory: alphaInventory, plan, checkMinecraft: false });

    const expectedBehavior = [
      { pack_id: alpha.publicIdentity.behaviorUuid, version: [2, 0, 0] },
      { pack_id: beta.publicIdentity.behaviorUuid, version: [1, 0, 0] },
    ];
    const expectedResource = [
      { pack_id: alpha.publicIdentity.resourceUuid, version: [2, 0, 0] },
      { pack_id: beta.publicIdentity.resourceUuid, version: [1, 0, 0] },
    ];
    expect(JSON.parse(fs.readFileSync(path.join(world, "world_behavior_packs.json"), "utf8"))).toEqual(expectedBehavior);
    expect(JSON.parse(fs.readFileSync(path.join(world, "world_resource_packs.json"), "utf8"))).toEqual(expectedResource);
    expect(fs.readFileSync(path.join(world, "behavior_packs", "beta.local", "payload.txt"), "utf8")).toBe("beta/1.0.0");
    expect(fs.readFileSync(path.join(bedrockRoot, "Users", "Shared", "games", "com.mojang", "resource_packs", beta.sharedDirectory, "payload.txt"), "utf8")).toBe("beta/1.0.0");

    const betaAfter = inspectBedrock({ bedrockRoot, catalog: betaCatalog, project: beta });
    expect(betaAfter.shared.labels).toEqual(["1.0.0"]);
    expect(betaAfter.worlds.find((entry) => entry.name === "devtest").active.labels).toEqual(["1.0.0"]);
  });

  it("removes one add-on transactionally while preserving the other", async () => {
    const managerRoot = temporaryRoot();
    const alphaRoot = path.join(managerRoot, "alpha-project");
    const betaRoot = path.join(managerRoot, "beta-project");
    fs.mkdirSync(path.join(alphaRoot, "dist", "releases"), { recursive: true });
    fs.mkdirSync(path.join(betaRoot, "dist", "releases"), { recursive: true });
    const alpha = managedProject(alphaRoot, "alpha", "61");
    const beta = managedProject(betaRoot, "beta", "62");
    const alphaX = await createManagedArtifact(alpha, "1.0.0", [1, 0, 0], "61");
    const betaX = await createManagedArtifact(beta, "1.0.0", [1, 0, 0], "62");
    const bedrockRoot = path.join(managerRoot, "bedrock");
    installSharedProject(bedrockRoot, alpha, alphaX);
    installSharedProject(bedrockRoot, beta, betaX);
    const world = createEmptyWorld(bedrockRoot, "P1", "DEV", "devtest");
    addProjectToWorld(world, alpha, alphaX);
    addProjectToWorld(world, beta, betaX);

    const alphaCatalog = loadArtifactCatalog({ projectRoot: alphaRoot, stateRoot: managerRoot, project: alpha });
    const betaCatalog = loadArtifactCatalog({ projectRoot: betaRoot, stateRoot: managerRoot, project: beta });
    const betaInventory = inspectBedrock({ bedrockRoot, catalog: betaCatalog, project: beta });
    const plan = createRemovePlan({ inventory: betaInventory, world: "devtest" });
    const result = applyRemovePlan({ stateRoot: managerRoot, inventory: betaInventory, plan, checkMinecraft: false });
    expect(result).toMatchObject({ changed: true, addonId: "beta", selected: 1, sharedUpdated: true });

    expect(JSON.parse(fs.readFileSync(path.join(world, "world_behavior_packs.json"), "utf8")))
      .toEqual([{ pack_id: alpha.publicIdentity.behaviorUuid, version: [1, 0, 0] }]);
    expect(JSON.parse(fs.readFileSync(path.join(world, "world_resource_packs.json"), "utf8")))
      .toEqual([{ pack_id: alpha.publicIdentity.resourceUuid, version: [1, 0, 0] }]);
    expect(fs.existsSync(path.join(world, "behavior_packs", "beta.local"))).toBe(false);
    expect(fs.existsSync(path.join(world, "behavior_packs", "alpha.local"))).toBe(true);
    expect(fs.existsSync(path.join(bedrockRoot, "Users", "Shared", "games", "com.mojang", "behavior_packs", beta.sharedDirectory))).toBe(false);
    expect(fs.existsSync(path.join(bedrockRoot, "Users", "Shared", "games", "com.mojang", "behavior_packs", alpha.sharedDirectory))).toBe(true);

    const alphaAfter = inspectBedrock({ bedrockRoot, catalog: alphaCatalog, project: alpha });
    const betaAfter = inspectBedrock({ bedrockRoot, catalog: betaCatalog, project: beta });
    expect(alphaAfter.worlds.find((entry) => entry.name === "devtest").state).toBe("managed");
    expect(betaAfter.shared.state).toBe("none");
    expect(betaAfter.worlds.find((entry) => entry.name === "devtest").state).toBe("none");
  });
});
