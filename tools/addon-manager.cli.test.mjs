import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCli, resolveSource, runAddonManager } from "./addon-manager.mjs";
import { registerProject } from "./addon-manager/projects.mjs";

const roots = [];

function writeProject(root, id, suffix) {
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
      publicIdentity: {
        behaviorUuid: `10000000-0000-4000-8000-0000000000${suffix}`,
        resourceUuid: `20000000-0000-4000-8000-0000000000${suffix}`,
      },
    },
  }, null, 2)}\n`, "utf8");
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("addon-manager CLI", () => {
  it("defaults to status and accepts top-level help", () => {
    expect(parseCli([]).command).toBe("status");
    expect(parseCli(["--help"]).command).toBe("help");
  });

  it("rejects ambiguous modes, selectors and missing option values", () => {
    expect(() => parseCli(["install", "x", "--apply", "--dry-run"])).toThrow(/somente --apply ou --dry-run/);
    expect(() => parseCli(["install", "x", "--world", "devtest", "--all-worlds"])).toThrow(/--all-worlds ou --world/);
    expect(() => parseCli(["install", "x", "--profile"])).toThrow(/exige um valor/);
  });

  it("can identify an old official X without requiring its artifact", () => {
    const source = resolveSource([], "1.0.2", process.cwd());
    expect(source).toMatchObject({
      label: "1.0.2",
      bedrockVersion: [1, 0, 2],
      channel: "official",
      behaviorUuid: "bac9f8bc-71f5-4db7-a0ff-3c5a365749b4",
      resourceUuid: "fdb8a79c-8f77-4831-9a5c-8e2b8ecca29e",
    });
  });

  it("loads only the selected add-on catalog for an isolated command", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "addon-cli-test-"));
    roots.push(workspace);
    const manager = path.join(workspace, "alpha");
    const external = path.join(workspace, "beta");
    writeProject(manager, "alpha", "01");
    writeProject(external, "beta", "02");
    const brokenArtifact = path.join(external, "dist", "releases", "Beta-1.0.0.mcaddon");
    fs.mkdirSync(path.dirname(brokenArtifact), { recursive: true });
    fs.writeFileSync(brokenArtifact, "not a zip", "utf8");
    registerProject({ managerRoot: manager, projectRoot: external });
    const output = { value: "", write(value) { this.value += value; } };

    expect(() => runAddonManager(["list", "alpha"], { projectRoot: manager, stdout: output, stderr: output })).not.toThrow();
    expect(output.value).toContain("Alpha:");
    expect(() => runAddonManager(["list"], { projectRoot: manager, stdout: output, stderr: output })).toThrow();
  });
});
