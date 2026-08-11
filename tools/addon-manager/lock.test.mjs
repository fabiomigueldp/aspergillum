import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { acquireInstallLock } from "./lock.mjs";

describe("installation lock", () => {
  it("serializes installers targeting the same Bedrock tree", () => {
    const bedrockRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aspergillum-lock-test-"));
    const releaseFirst = acquireInstallLock(bedrockRoot);
    try {
      expect(() => acquireInstallLock(bedrockRoot)).toThrow(/Outra instalação/);
    } finally {
      releaseFirst();
      fs.rmSync(bedrockRoot, { recursive: true, force: true });
    }
    const releaseSecond = acquireInstallLock(bedrockRoot);
    releaseSecond();
  });
});
