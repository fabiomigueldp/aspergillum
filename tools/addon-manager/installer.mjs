import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { writeJsonAtomic } from "../release/artifact-core.mjs";
import { PACK_KINDS } from "./bedrock.mjs";
import { prepareArtifactCache } from "./artifact-cache.mjs";
import { sameVersion } from "./identity.mjs";
import { acquireInstallLock } from "./lock.mjs";
import { FileTransaction } from "./transaction.mjs";
import { planIsNoop, serializablePlan } from "./planner.mjs";

export function isMinecraftRunning() {
  if (process.platform !== "win32") return false;
  const result = spawnSync("tasklist.exe", ["/FI", "IMAGENAME eq Minecraft.Windows.exe", "/NH"], { encoding: "utf8", windowsHide: true });
  return result.status === 0 && result.stdout.includes("Minecraft.Windows.exe");
}

function targetPack(descriptor, kind) {
  return kind === "behavior" ? descriptor.behavior : descriptor.resource;
}

function replaceOwnedReferences(entries, ownedIds, pack) {
  const next = entries.filter((entry) => !ownedIds.has(entry.pack_id));
  next.push({ pack_id: pack.uuid, version: [...pack.version] });
  return next;
}

function updateHistory(historyValue, pack) {
  const next = structuredClone(historyValue);
  if (!Array.isArray(next.packs)) next.packs = [];
  const existing = next.packs.find((entry) => entry.uuid === pack.uuid);
  if (existing) {
    existing.can_be_redownloaded = false;
    existing.name = pack.name;
    existing.version = [...pack.version];
  } else {
    next.packs.push({ can_be_redownloaded: false, name: pack.name, uuid: pack.uuid, version: [...pack.version] });
  }
  return next;
}

function verifyPackDirectory(directory, expected, description) {
  const manifestPath = path.join(directory, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.header?.uuid !== expected.uuid || !sameVersion(manifest.header?.version, expected.version)) {
    throw new Error(`${description} não corresponde ao destino após a cópia.`);
  }
}

function verifyWorld(entry, target) {
  for (const kind of Object.keys(PACK_KINDS)) {
    const expected = targetPack(target, kind);
    verifyPackDirectory(entry.targets[kind], expected, `${entry.world.name}/${kind}`);
    const references = JSON.parse(fs.readFileSync(path.join(entry.world.path, PACK_KINDS[kind].reference), "utf8"));
    const ownedIds = new Set([...entry.world.ownedIds[kind], expected.uuid]);
    const addonReferences = references.filter((item) => ownedIds.has(item.pack_id));
    if (addonReferences.length !== 1 || addonReferences[0].pack_id !== expected.uuid || !sameVersion(addonReferences[0].version, expected.version)) {
      throw new Error(`${entry.world.name}: referência ${kind} não foi gravada corretamente.`);
    }
  }
}

function verifyPinnedWorld(entry, pair) {
  verifyPackDirectory(entry.targets.behavior, pair.behavior, `${entry.world.name}/behavior fixado`);
  verifyPackDirectory(entry.targets.resource, pair.resource, `${entry.world.name}/resource fixado`);
}

function writeRunLog(projectRoot, result) {
  const stamp = result.finishedAt.replaceAll(":", "-");
  const runPath = path.join(projectRoot, "out", "addon-manager", "runs", `${stamp}-${result.target}.json`);
  writeJsonAtomic(runPath, result);
  writeJsonAtomic(path.join(projectRoot, "out", "addon-manager", "state.json"), result);
  return runPath;
}

export function applyInstallPlan({ projectRoot, inventory, plan, checkMinecraft = true }) {
  if (plan.conflicts.length > 0) {
    const details = plan.conflicts.map((entry) => `${entry.world.name} (${entry.world.id}): ${entry.reason}`).join("\n");
    throw new Error(`O plano contém conflitos e não foi aplicado:\n${details}`);
  }
  if (planIsNoop(plan)) {
    return { changed: false, target: plan.target.label, selected: 0, pinned: 0, cacheReused: null, runPath: null };
  }
  if (checkMinecraft && isMinecraftRunning()) throw new Error("Feche Minecraft.Windows.exe antes da instalação.");
  const releaseLock = acquireInstallLock(inventory.bedrockRoot);
  const startedAt = new Date().toISOString();
  let transaction;
  try {
    const cache = prepareArtifactCache({ projectRoot, descriptor: plan.target });
    transaction = new FileTransaction(inventory.bedrockRoot);

    if (plan.pins.length > 0) {
      if (!plan.shared.sources || !plan.shared.currentPair) throw new Error("Não há packs Shared coerentes para fixar os mundos preservados.");
      for (const entry of plan.pins) {
        transaction.replaceDirectory(plan.shared.sources.behavior, entry.targets.behavior);
        transaction.replaceDirectory(plan.shared.sources.resource, entry.targets.resource);
      }
    }

    for (const entry of plan.selected) {
      transaction.replaceDirectory(cache.behavior, entry.targets.behavior);
      transaction.replaceDirectory(cache.resource, entry.targets.resource);
      for (const kind of Object.keys(PACK_KINDS)) {
        const pack = targetPack(plan.target, kind);
        const references = replaceOwnedReferences(entry.world.references[kind].value, entry.world.ownedIds[kind], pack);
        const history = updateHistory(entry.world.histories[kind].value, pack);
        transaction.writeJson(entry.world.references[kind].filePath, references);
        transaction.writeJson(entry.world.histories[kind].filePath, history);
      }
    }

    if (plan.shared.update) {
      transaction.replaceDirectory(cache.behavior, plan.shared.targets.behavior);
      transaction.replaceDirectory(cache.resource, plan.shared.targets.resource);
    }

    for (const entry of plan.pins) verifyPinnedWorld(entry, plan.shared.currentPair);
    for (const entry of plan.selected) verifyWorld(entry, plan.target);
    if (plan.shared.update) {
      verifyPackDirectory(plan.shared.targets.behavior, plan.target.behavior, "Shared/behavior");
      verifyPackDirectory(plan.shared.targets.resource, plan.target.resource, "Shared/resource");
    }
    transaction.commit();

    const result = {
      schemaVersion: 1,
      startedAt,
      finishedAt: new Date().toISOString(),
      action: plan.action,
      source: plan.source?.label ?? null,
      target: plan.target.label,
      sha256: plan.target.sha256,
      selectedWorlds: plan.selected.map((entry) => ({ id: entry.world.id, name: entry.world.name })),
      pinnedWorlds: plan.pins.map((entry) => ({ id: entry.world.id, name: entry.world.name })),
      sharedUpdated: plan.shared.update,
      cacheReused: cache.reused,
      plan: serializablePlan(plan),
    };
    let runPath = null;
    let logWarning = null;
    try { runPath = writeRunLog(projectRoot, result); } catch (error) {
      logWarning = `Instalação concluída, mas o registro operacional falhou: ${error instanceof Error ? error.message : String(error)}`;
    }
    return {
      changed: true,
      target: plan.target.label,
      selected: plan.selected.length,
      pinned: plan.pins.length,
      cacheReused: cache.reused,
      sharedUpdated: plan.shared.update,
      runPath,
      logWarning,
    };
  } catch (error) {
    if (transaction && !transaction.finished) {
      try { transaction.rollback(); } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "A instalação falhou e o rollback também encontrou erro.");
      }
    }
    throw error;
  } finally {
    releaseLock();
  }
}

export { replaceOwnedReferences, updateHistory };
