import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileTransaction } from "./transaction.mjs";

const roots = [];

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aspergillum-transaction-test-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("file transaction", () => {
  it("restores directories and JSON when an installation is rolled back", () => {
    const root = temporaryRoot();
    const source = path.join(root, "source");
    const target = path.join(root, "data", "pack");
    const json = path.join(root, "data", "world_behavior_packs.json");
    fs.mkdirSync(source, { recursive: true });
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(source, "value.txt"), "new", "utf8");
    fs.writeFileSync(path.join(target, "value.txt"), "old", "utf8");
    fs.writeFileSync(json, "[]\n", "utf8");
    const transaction = new FileTransaction(root);
    transaction.replaceDirectory(source, target);
    transaction.writeJson(json, [{ pack_id: "new", version: [1, 0, 0] }]);
    expect(fs.readFileSync(path.join(target, "value.txt"), "utf8")).toBe("new");
    transaction.rollback();
    expect(fs.readFileSync(path.join(target, "value.txt"), "utf8")).toBe("old");
    expect(JSON.parse(fs.readFileSync(json, "utf8"))).toEqual([]);
  });

  it("restores a removed directory on rollback and deletes it only on commit", () => {
    const root = temporaryRoot();
    const rollbackTarget = path.join(root, "data", "rollback-pack");
    const commitTarget = path.join(root, "data", "commit-pack");
    for (const target of [rollbackTarget, commitTarget]) {
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, "value.txt"), "preserved", "utf8");
    }

    const rollback = new FileTransaction(root);
    expect(rollback.removeDirectory(rollbackTarget)).toBe(true);
    expect(fs.existsSync(rollbackTarget)).toBe(false);
    rollback.rollback();
    expect(fs.readFileSync(path.join(rollbackTarget, "value.txt"), "utf8")).toBe("preserved");

    const commit = new FileTransaction(root);
    expect(commit.removeDirectory(commitTarget)).toBe(true);
    commit.commit();
    expect(fs.existsSync(commitTarget)).toBe(false);
  });
});
