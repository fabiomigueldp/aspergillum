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

function normalizedUuid(value) {
  return typeof value === "string" ? value.toLowerCase() : value;
}

function ownsUuid(ownedIds, value) {
  return ownedIds.has(normalizedUuid(value));
}

function targetPack(descriptor, kind) {
  return kind === "behavior" ? descriptor.behavior : descriptor.resource;
}

export function replaceOwnedReferences(entries, ownedIds, pack) {
  const replacement = { pack_id: pack.uuid, version: [...pack.version] };
  const next = [];
  let inserted = false;
  for (const entry of entries) {
    if (!ownsUuid(ownedIds, entry.pack_id)) {
      next.push(entry);
      continue;
    }
    if (!inserted) {
      next.push(replacement);
      inserted = true;
    }
  }
  if (!inserted) next.push(replacement);
  return next;
}

export function removeOwnedReferences(entries, ownedIds) {
  return entries.filter((entry) => !ownsUuid(ownedIds, entry.pack_id));
}

function updateHistory(historyValue, pack) {
  const next = structuredClone(historyValue);
  if (!Array.isArray(next.packs)) next.packs = [];
  const existing = next.packs.find((entry) => normalizedUuid(entry.uuid) === normalizedUuid(pack.uuid));
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
  if (normalizedUuid(manifest.header?.uuid) !== normalizedUuid(expected.uuid) || !sameVersion(manifest.header?.version, expected.version)) {
    throw new Error(`${description} não corresponde ao destino após a cópia.`);
  }
}

function verifyWorld(entry, target) {
  for (const kind of Object.keys(PACK_KINDS)) {
    const expected = targetPack(target, kind);
    verifyPackDirectory(entry.targets[kind], expected, `${entry.world.name}/${kind}`);
    const references = JSON.parse(fs.readFileSync(path.join(entry.world.path, PACK_KINDS[kind].reference), "utf8"));
    const ownedIds = new Set([...entry.world.ownedIds[kind], normalizedUuid(expected.uuid)]);
    const addonReferences = references.filter((item) => ownsUuid(ownedIds, item.pack_id));
    if (addonReferences.length !== 1 || normalizedUuid(addonReferences[0].pack_id) !== normalizedUuid(expected.uuid) || !sameVersion(addonReferences[0].version, expected.version)) {
      throw new Error(`${entry.world.name}: referência ${kind} não foi gravada corretamente.`);
    }
  }
}

function verifyRemovedWorld(entry) {
  for (const kind of Object.keys(PACK_KINDS)) {
    if (fs.existsSync(entry.targets[kind])) throw new Error(`${entry.world.name}: diretório ${kind} permaneceu após a remoção.`);
    const references = JSON.parse(fs.readFileSync(path.join(entry.world.path, PACK_KINDS[kind].reference), "utf8"));
    if (references.some((item) => ownsUuid(entry.world.ownedIds[kind], item.pack_id))) {
      throw new Error(`${entry.world.name}: referência ${kind} permaneceu após a remoção.`);
    }
  }
}

function verifyPinnedWorld(entry, pair) {
  verifyPackDirectory(entry.targets.behavior, pair.behavior, `${entry.world.name}/behavior fixado`);
  verifyPackDirectory(entry.targets.resource, pair.resource, `${entry.world.name}/resource fixado`);
}

function safeLogPart(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "-");
}

function writeRunLog(stateRoot, result) {
  const stamp = result.finishedAt.replaceAll(":", "-");
  const target = result.target ?? "removed";
  const runPath = path.join(stateRoot, "out", "addon-manager", "runs", `${stamp}-${safeLogPart(result.addonId)}-${safeLogPart(target)}.json`);
  writeJsonAtomic(runPath, result);
  writeJsonAtomic(path.join(stateRoot, "out", "addon-manager", "state", `${safeLogPart(result.addonId)}.json`), result);
  writeJsonAtomic(path.join(stateRoot, "out", "addon-manager", "state.json"), result);
  return runPath;
}

function assertApplicable(plan) {
  if (plan.conflicts.length > 0) {
    const details = plan.conflicts.map((entry) => `${entry.world.name} (${entry.world.id}): ${entry.reason}`).join("\n");
    throw new Error(`O plano contém conflitos e não foi aplicado:\n${details}`);
  }
}

function applyPins(transaction, plan) {
  if (plan.pins.length === 0) return;
  if (!plan.shared.sources || !plan.shared.currentPair) throw new Error("Não há packs Shared coerentes para fixar os mundos preservados.");
  for (const entry of plan.pins) {
    transaction.replaceDirectory(plan.shared.sources.behavior, entry.targets.behavior);
    transaction.replaceDirectory(plan.shared.sources.resource, entry.targets.resource);
  }
}

function finishLog(stateRoot, result) {
  let runPath = null;
  let logWarning = null;
  try { runPath = writeRunLog(stateRoot, result); } catch (error) {
    logWarning = `Operação concluída, mas o registro operacional falhou: ${error instanceof Error ? error.message : String(error)}`;
  }
  return { runPath, logWarning };
}

export function applyInstallPlan({ projectRoot, stateRoot = projectRoot, inventory, plan, checkMinecraft = true }) {
  assertApplicable(plan);
  if (planIsNoop(plan)) {
    return { changed: false, addonId: plan.addonId, target: plan.target.label, selected: 0, pinned: 0, cacheReused: null, runPath: null };
  }
  if (checkMinecraft && isMinecraftRunning()) throw new Error("Feche Minecraft.Windows.exe antes da instalação.");
  const releaseLock = acquireInstallLock(inventory.bedrockRoot);
  const startedAt = new Date().toISOString();
  let transaction;
  try {
    const cache = prepareArtifactCache({ projectRoot: plan.target.projectRoot ?? projectRoot, stateRoot, descriptor: plan.target });
    transaction = new FileTransaction(inventory.bedrockRoot);
    applyPins(transaction, plan);

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
      schemaVersion: 2,
      addonId: plan.addonId,
      displayName: plan.project.displayName,
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
    const logging = finishLog(stateRoot, result);
    return {
      changed: true,
      addonId: plan.addonId,
      target: plan.target.label,
      selected: plan.selected.length,
      pinned: plan.pins.length,
      cacheReused: cache.reused,
      sharedUpdated: plan.shared.update,
      ...logging,
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

export function applyRemovePlan({ stateRoot, inventory, plan, checkMinecraft = true }) {
  assertApplicable(plan);
  if (planIsNoop(plan)) {
    return { changed: false, addonId: plan.addonId, selected: 0, pinned: 0, sharedUpdated: false, runPath: null };
  }
  if (checkMinecraft && isMinecraftRunning()) throw new Error("Feche Minecraft.Windows.exe antes da remoção.");
  const releaseLock = acquireInstallLock(inventory.bedrockRoot);
  const startedAt = new Date().toISOString();
  let transaction;
  try {
    transaction = new FileTransaction(inventory.bedrockRoot);
    applyPins(transaction, plan);
    for (const entry of plan.selected) {
      for (const kind of Object.keys(PACK_KINDS)) {
        transaction.removeDirectory(entry.targets[kind]);
        const references = removeOwnedReferences(entry.world.references[kind].value, entry.world.ownedIds[kind]);
        transaction.writeJson(entry.world.references[kind].filePath, references);
      }
    }
    if (plan.shared.update) {
      transaction.removeDirectory(plan.shared.targets.behavior);
      transaction.removeDirectory(plan.shared.targets.resource);
    }

    for (const entry of plan.pins) verifyPinnedWorld(entry, plan.shared.currentPair);
    for (const entry of plan.selected) verifyRemovedWorld(entry);
    if (plan.shared.update && (fs.existsSync(plan.shared.targets.behavior) || fs.existsSync(plan.shared.targets.resource))) {
      throw new Error(`Shared de ${plan.project.displayName} permaneceu após a remoção.`);
    }
    transaction.commit();

    const result = {
      schemaVersion: 2,
      addonId: plan.addonId,
      displayName: plan.project.displayName,
      startedAt,
      finishedAt: new Date().toISOString(),
      action: "remove",
      source: null,
      target: null,
      sha256: null,
      selectedWorlds: plan.selected.map((entry) => ({ id: entry.world.id, name: entry.world.name })),
      pinnedWorlds: plan.pins.map((entry) => ({ id: entry.world.id, name: entry.world.name })),
      sharedUpdated: plan.shared.update,
      plan: serializablePlan(plan),
    };
    const logging = finishLog(stateRoot, result);
    return {
      changed: true,
      addonId: plan.addonId,
      selected: plan.selected.length,
      pinned: plan.pins.length,
      sharedUpdated: plan.shared.update,
      ...logging,
    };
  } catch (error) {
    if (transaction && !transaction.finished) {
      try { transaction.rollback(); } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "A remoção falhou e o rollback também encontrou erro.");
      }
    }
    throw error;
  } finally {
    releaseLock();
  }
}

export { updateHistory, verifyPackDirectory, writeRunLog };
