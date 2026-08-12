import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function acquireInstallLock(bedrockRoot) {
  const normalizedRoot = path.resolve(bedrockRoot).toLowerCase();
  const key = createHash("sha256").update(normalizedRoot).digest("hex").slice(0, 24);
  const lockPath = path.join(os.tmpdir(), "bedrock-addon-manager", `${key}.lock`);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  if (fs.existsSync(lockPath)) {
    let existing;
    try { existing = JSON.parse(fs.readFileSync(lockPath, "utf8")); } catch { existing = {}; }
    const age = Date.now() - new Date(existing.createdAt ?? 0).getTime();
    if (age >= 0 && age < 15 * 60 * 1000 && processExists(existing.pid)) {
      throw new Error(`Outra instalação está em andamento (PID ${existing.pid ?? "desconhecido"}).`);
    }
    fs.rmSync(lockPath, { force: true });
  }
  const owner = randomBytes(12).toString("hex");
  const descriptor = fs.openSync(lockPath, "wx");
  fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, owner, createdAt: new Date().toISOString(), bedrockRoot: normalizedRoot })}\n`, "utf8");
  fs.closeSync(descriptor);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try {
      const current = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      if (current.owner === owner) fs.rmSync(lockPath, { force: true });
    } catch {
      // The lock disappeared or was replaced after becoming stale.
    }
  };
}
