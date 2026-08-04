import { describe, expect, it } from "vitest";
import { parseArgs, parseVersion, versionText } from "./sync-installed-addon.mjs";

describe("sync-installed-addon CLI", () => {
  it("normalizes numeric Bedrock versions", () => {
    expect(parseVersion("1.2.3", "test")).toEqual([1, 2, 3]);
    expect(versionText([1, 0, 17])).toBe("1.0.17");
  });

  it("defaults to devtest dry-run and supports all-worlds", () => {
    expect(parseArgs([])).toMatchObject({ apply: false, allWorlds: false, world: "devtest" });
    expect(parseArgs(["--all-worlds", "--dry-run"])).toMatchObject({ apply: false, allWorlds: true, dryRun: true });
  });

  it("does not allow an ambiguous execution mode", () => {
    expect(() => parseArgs(["--apply", "--dry-run"])).toThrow("Use somente --apply ou --dry-run");
  });
});
