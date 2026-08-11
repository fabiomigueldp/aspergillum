import { descriptorPair, packKey, pairKey, pairMatches, pairMatchesDescriptor } from "./identity.mjs";
import { managedWorldPackPath, resolveWorld } from "./bedrock.mjs";

function localCompatible(world, expectedPair) {
  return world.local.state === "none" || pairMatches(world.local.pair, expectedPair);
}

function pairTouches(summary, pair) {
  if (!pair) return false;
  const behavior = summary?.packs?.behavior ?? (summary?.pair?.behavior ? [summary.pair.behavior] : []);
  const resource = summary?.packs?.resource ?? (summary?.pair?.resource ? [summary.pair.resource] : []);
  return behavior.some((pack) => packKey(pack) === packKey(pair.behavior))
    || resource.some((pack) => packKey(pack) === packKey(pair.resource));
}

function conflict(world, reason) {
  return { type: "world", world, reason };
}

function selectedWorld(world) {
  return {
    world,
    targets: {
      behavior: managedWorldPackPath(world, "behavior"),
      resource: managedWorldPackPath(world, "resource"),
    },
  };
}

function selectExactSourceWorlds(inventory, source, target) {
  const sourcePair = descriptorPair(source);
  const selected = [];
  const skipped = [];
  const conflicts = [];
  const preserved = [];
  for (const world of inventory.worlds) {
    if (pairMatchesDescriptor(world.active.pair, target)) {
      if (pairMatchesDescriptor(world.local.pair, target)) skipped.push({ world, reason: "já usa o destino" });
      else if (world.local.state === "none") selected.push(selectedWorld(world));
      else conflicts.push(conflict(world, "referência Y com cópia local divergente"));
      continue;
    }
    if (pairMatches(world.active.pair, sourcePair)) {
      if (world.state === "conflict" || !localCompatible(world, sourcePair)) {
        conflicts.push(conflict(world, "versão X ativa, mas packs locais estão incompletos ou divergentes"));
      } else {
        selected.push(selectedWorld(world));
      }
      continue;
    }
    if (pairTouches(world.active, sourcePair) || pairTouches(world.local, sourcePair)) {
      conflicts.push(conflict(world, "somente parte da identidade X foi encontrada"));
      continue;
    }
    if (world.state !== "none") preserved.push({ world, reason: "usa outra versão" });
  }
  return { selected, skipped, conflicts, preserved, sourcePair };
}

function selectSharedSourceWorlds(inventory, target) {
  if (!inventory.shared.pair) throw new Error("Não foi possível determinar o par atualmente instalado em Shared.");
  const sourcePair = inventory.shared.pair;
  const selected = [];
  const skipped = [];
  const conflicts = [];
  const preserved = [];
  for (const world of inventory.worlds) {
    if (pairMatchesDescriptor(world.active.pair, target)) {
      if (pairMatchesDescriptor(world.local.pair, target)) skipped.push({ world, reason: "já usa o destino" });
      else if (world.local.state === "none") selected.push(selectedWorld(world));
      else conflicts.push(conflict(world, "referência de destino com cópia local divergente"));
    } else if (pairMatches(world.active.pair, sourcePair)) {
      if (world.state === "conflict" || !localCompatible(world, sourcePair)) conflicts.push(conflict(world, "par ativo de Shared com cópia local divergente"));
      else selected.push(selectedWorld(world));
    } else if (pairTouches(world.active, sourcePair) || pairTouches(world.local, sourcePair)) {
      conflicts.push(conflict(world, "somente parte da identidade ativa em Shared foi encontrada"));
    } else if (world.state !== "none") {
      preserved.push({ world, reason: "usa outra versão" });
    }
  }
  return { selected, skipped, conflicts, preserved, sourcePair };
}

function selectSpecificWorld(inventory, target, worldName, profileId) {
  const world = resolveWorld(inventory.worlds, worldName, profileId);
  if (world.state === "conflict") {
    return { selected: [], skipped: [], conflicts: [conflict(world, world.issues.join(" ") || "estado inconsistente")], preserved: [], sourcePair: world.active.pair };
  }
  if (pairMatchesDescriptor(world.active.pair, target) && pairMatchesDescriptor(world.local.pair, target)) {
    return { selected: [], skipped: [{ world, reason: "já usa o destino com cópia local" }], conflicts: [], preserved: [], sourcePair: world.active.pair };
  }
  return { selected: [selectedWorld(world)], skipped: [], conflicts: [], preserved: [], sourcePair: world.active.pair };
}

function planPins(inventory, selected, target, updateShared) {
  if (!updateShared || !inventory.shared.pair || pairMatchesDescriptor(inventory.shared.pair, target)) return { pins: [], conflicts: [] };
  const selectedIds = new Set(selected.map((entry) => entry.world.id));
  const pins = [];
  const conflicts = [];
  for (const world of inventory.worlds) {
    if (selectedIds.has(world.id) || !pairMatches(world.active.pair, inventory.shared.pair)) continue;
    if (world.local.state === "none") {
      pins.push(selectedWorld(world));
    } else if (!pairMatches(world.local.pair, inventory.shared.pair)) {
      conflicts.push(conflict(world, "depende do Shared atual, mas possui cópia local divergente; não é seguro substituir Shared"));
    }
  }
  return { pins, conflicts };
}

export function createInstallPlan({ inventory, target, source, world = "devtest", profileId, allWorlds = false, updateShared = true, action = source ? "upgrade" : "install" }) {
  if (["partial", "multiple", "conflict"].includes(inventory.shared.state) && updateShared) {
    throw new Error(`Instalação Shared inconsistente: ${(inventory.shared.issues ?? []).join(" ")}`);
  }
  const selection = source
    ? selectExactSourceWorlds(inventory, source, target)
    : allWorlds
      ? selectSharedSourceWorlds(inventory, target)
      : selectSpecificWorld(inventory, target, world, profileId);
  const pinPlan = planPins(inventory, selection.selected, target, updateShared);
  const sharedChange = updateShared && !pairMatchesDescriptor(inventory.shared.pair, target);
  return {
    schemaVersion: 1,
    action,
    source: source ?? null,
    sourcePair: selection.sourcePair ?? null,
    target,
    selected: selection.selected,
    skipped: selection.skipped,
    preserved: selection.preserved,
    pins: pinPlan.pins,
    conflicts: [...selection.conflicts, ...pinPlan.conflicts],
    shared: {
      update: sharedChange,
      currentPair: inventory.shared.pair ?? null,
      sources: inventory.shared.pair ? {
        behavior: inventory.shared.pair.behavior.path,
        resource: inventory.shared.pair.resource.path,
      } : null,
      targets: inventory.shared.targetPaths,
    },
  };
}

export function serializablePlan(plan) {
  const worldEntry = (entry) => ({ id: entry.world.id, profile: entry.world.profile.id, folder: entry.world.folder, name: entry.world.name, targets: entry.targets });
  return {
    schemaVersion: plan.schemaVersion,
    action: plan.action,
    source: plan.source?.label ?? null,
    target: plan.target.label,
    selected: plan.selected.map(worldEntry),
    pins: plan.pins.map(worldEntry),
    skipped: plan.skipped.map((entry) => ({ id: entry.world.id, name: entry.world.name, reason: entry.reason })),
    preserved: plan.preserved.map((entry) => ({ id: entry.world.id, name: entry.world.name, reason: entry.reason })),
    conflicts: plan.conflicts.map((entry) => ({ id: entry.world.id, name: entry.world.name, reason: entry.reason })),
    shared: { update: plan.shared.update, targets: plan.shared.targets },
  };
}

export function planIsNoop(plan) {
  return plan.selected.length === 0 && plan.pins.length === 0 && !plan.shared.update;
}

export function planSourceText(plan) {
  return plan.source?.label ?? (plan.sourcePair ? pairKey(plan.sourcePair) : "instalação nova");
}
