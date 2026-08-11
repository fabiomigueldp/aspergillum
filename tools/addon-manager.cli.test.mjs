import { describe, expect, it } from "vitest";
import { parseCli, resolveSource } from "./addon-manager.mjs";

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
});
