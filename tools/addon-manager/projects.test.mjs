import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertProjectCatalogIsolation,
  loadProjects,
  registerProject,
  resolveProject,
  unregisterProject,
} from "./projects.mjs";

const roots = [];

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bedrock-projects-test-"));
  roots.push(root);
  return root;
}

function writeProject(root, id, behaviorUuid, resourceUuid) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({
    name: `${id}-bedrock-addon`,
    version: "1.0.0",
    addonManager: {
      schemaVersion: 1,
      id,
      displayName: id[0].toUpperCase() + id.slice(1),
      artifactPrefix: id[0].toUpperCase() + id.slice(1),
      sharedDirectory: `pack.${id}`,
      worldDirectory: `${id}.managed`,
      publicIdentity: { behaviorUuid, resourceUuid },
    },
  }, null, 2)}\n`, "utf8");
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("add-on project registry", () => {
  it("registers an external project without embedding it in the primary package", () => {
    const workspace = temporaryRoot();
    const manager = path.join(workspace, "alpha");
    const external = path.join(workspace, "beta");
    writeProject(manager, "alpha", "10000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000001");
    writeProject(external, "beta", "10000000-0000-4000-8000-000000000002", "20000000-0000-4000-8000-000000000002");

    expect(registerProject({ managerRoot: manager, projectRoot: external }).changed).toBe(true);
    const projects = loadProjects({ managerRoot: manager });
    expect(projects.map((project) => project.id)).toEqual(["alpha", "beta"]);
    expect(resolveProject(projects, "Beta").id).toBe("beta");
    expect(JSON.parse(fs.readFileSync(path.join(manager, "out", "addon-manager-projects.json"), "utf8")).projects)
      .toEqual([{ id: "beta", projectRoot: path.resolve(external) }]);

    unregisterProject({ managerRoot: manager, id: "beta" });
    expect(loadProjects({ managerRoot: manager }).map((project) => project.id)).toEqual(["alpha"]);
  });

  it("lets read-only viewers skip an unavailable registered project while the manager stays strict", () => {
    const workspace = temporaryRoot();
    const manager = path.join(workspace, "alpha");
    const external = path.join(workspace, "beta");
    writeProject(manager, "alpha", "10000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000001");
    writeProject(external, "beta", "10000000-0000-4000-8000-000000000002", "20000000-0000-4000-8000-000000000002");
    registerProject({ managerRoot: manager, projectRoot: external });
    fs.rmSync(external, { recursive: true });

    expect(() => loadProjects({ managerRoot: manager })).toThrow(/package.json não encontrado/);
    const missing = [];
    expect(loadProjects({ managerRoot: manager, skipMissing: true, onMissing: (entry) => missing.push(entry.id) })
      .map((project) => project.id)).toEqual(["alpha"]);
    expect(missing).toEqual(["beta"]);
  });

  it("refuses a registration that collides with an existing public UUID", () => {
    const workspace = temporaryRoot();
    const manager = path.join(workspace, "alpha");
    const external = path.join(workspace, "beta");
    const duplicate = "10000000-0000-4000-8000-000000000009";
    writeProject(manager, "alpha", duplicate, "20000000-0000-4000-8000-000000000001");
    writeProject(external, "beta", duplicate, "20000000-0000-4000-8000-000000000002");

    expect(() => registerProject({ managerRoot: manager, projectRoot: external })).toThrow(/pertence simultaneamente/);
    expect(loadProjects({ managerRoot: manager }).map((project) => project.id)).toEqual(["alpha"]);
  });

  it("rejects UUID ownership shared by two add-ons", () => {
    const duplicate = "10000000-0000-4000-8000-000000000009";
    expect(() => assertProjectCatalogIsolation([
      {
        project: { id: "alpha", publicIdentity: { behaviorUuid: duplicate, resourceUuid: "20000000-0000-4000-8000-000000000001" } },
        catalog: [],
      },
      {
        project: { id: "beta", publicIdentity: { behaviorUuid: duplicate, resourceUuid: "20000000-0000-4000-8000-000000000002" } },
        catalog: [],
      },
    ])).toThrow(/pertence simultaneamente/);
  });
});
