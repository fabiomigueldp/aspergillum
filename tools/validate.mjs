import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");
const packRoots = [path.join(root, "packs", "behavior"), path.join(root, "packs", "resource")];
const errors = [];
let jsonCount = 0;
let textureCount = 0;
let decodedTextureBytes = 0;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

for (const packRoot of packRoots) {
  if (!fs.existsSync(packRoot)) errors.push(`Missing pack: ${packRoot}`);
  for (const file of walk(packRoot)) {
    if (!file.endsWith(".json")) continue;
    jsonCount += 1;
    try {
      const source = fs.readFileSync(file, "utf8");
      JSON.parse(source);
      if (/minecraft-bedrock-(?:beta|experimental)|@minecraft\/server-beta/.test(source)) {
        errors.push(`Preview dependency in ${path.relative(root, file)}`);
      }
    } catch (error) {
      errors.push(`Invalid JSON ${path.relative(root, file)}: ${error.message}`);
    }
  }
}

const behaviorManifest = JSON.parse(fs.readFileSync(path.join(packRoots[0], "manifest.json"), "utf8"));
const resourceManifest = JSON.parse(fs.readFileSync(path.join(packRoots[1], "manifest.json"), "utf8"));
const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const terrainTextureDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "textures", "terrain_texture.json"), "utf8"),
);
const customizationCatalog = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src", "customization", "catalog.json"), "utf8"),
);
const cosmetics = customizationCatalog.cosmetics ?? [];
const uuids = [
  behaviorManifest.header.uuid,
  ...behaviorManifest.modules.map((module) => module.uuid),
  resourceManifest.header.uuid,
  ...resourceManifest.modules.map((module) => module.uuid),
];
if (new Set(uuids).size !== uuids.length) errors.push("Manifest UUIDs are not unique");
if (!behaviorManifest.dependencies.some((dependency) => dependency.uuid === resourceManifest.header.uuid)) {
  errors.push("Behavior Pack does not depend on the Resource Pack UUID");
}
if (!behaviorManifest.dependencies.some((dependency) => dependency.module_name === "@minecraft/server" && dependency.version === "2.9.0")) {
  errors.push("Behavior Pack must pin @minecraft/server 2.9.0");
}
if (!behaviorManifest.dependencies.some((dependency) => dependency.module_name === "@minecraft/server-ui" && dependency.version === "2.1.0")) {
  errors.push("Behavior Pack must pin stable @minecraft/server-ui 2.1.0");
}
if (behaviorManifest.dependencies.some((dependency) => dependency.module_name === "@minecraft/common")) {
  errors.push("@minecraft/common is an npm type dependency and must not be declared as a Bedrock manifest module");
}
for (const [label, manifest] of [["Behavior", behaviorManifest], ["Resource", resourceManifest]]) {
  if (JSON.stringify(manifest.header.min_engine_version) !== JSON.stringify([1, 26, 40])) {
    errors.push(`${label} Pack must target min_engine_version 1.26.40`);
  }
}
if (behaviorManifest.header.name === resourceManifest.header.name) {
  errors.push("Behavior and Resource Packs require distinct localization keys");
}

const expectedPackVersion = packageMetadata.version.split(".").map(Number);
if (JSON.stringify(behaviorManifest.header.version) !== JSON.stringify(expectedPackVersion)) {
  errors.push("Behavior Pack version does not match package.json");
}
if (JSON.stringify(resourceManifest.header.version) !== JSON.stringify(expectedPackVersion)) {
  errors.push("Resource Pack version does not match package.json");
}

const blockDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "blocks", "aspersorium.block.json"), "utf8"),
);
const block = blockDefinition["minecraft:block"];
const baseGeometry = block?.components?.["minecraft:geometry"];
if ("n_way_visual_rotation" in (baseGeometry ?? {})) {
  errors.push("Aspersorium must not use experimental n_way_visual_rotation");
}
if (baseGeometry?.identifier !== "geometry.aspergillum.aspersorium.rotation_0") {
  errors.push("Aspersorium must use the generated zero-degree geometry by default");
}
const rotations = new Set(
  block?.permutations
    ?.filter((permutation) => permutation.condition.includes("aspergillum:rotation"))
    .map((permutation) => permutation.components?.["minecraft:geometry"]?.identifier),
);
for (let rotationIndex = 1; rotationIndex < 16; rotationIndex += 1) {
  if (!rotations.has(`geometry.aspergillum.aspersorium.rotation_${rotationIndex}`)) {
    errors.push(`Missing stable aspersorium rotation ${rotationIndex}`);
  }
}
if (JSON.stringify(blockDefinition).includes("minecraft:sixteen_way_rotation")) {
  errors.push("Aspersorium must not use experimental minecraft:sixteen_way_rotation");
}
const rotationState = block?.description?.states?.["aspergillum:rotation"];
if (!Array.isArray(rotationState) || rotationState.length !== 16) {
  errors.push("Aspersorium requires sixteen values in its stable custom rotation state");
}
const blockStates = block?.description?.states ?? {};
const waterBaseState = blockStates["aspergillum:water_base"];
const waterOffsetState = blockStates["aspergillum:water_offset"];
const cosmeticState = blockStates["aspergillum:cosmetic"];
if (JSON.stringify(waterBaseState) !== JSON.stringify([0, 9])) {
  errors.push("Aspersorium water_base must use the compact numeric bases 0 and 9");
}
if (JSON.stringify(waterOffsetState) !== JSON.stringify(Array.from({ length: 9 }, (_, index) => index))) {
  errors.push("Aspersorium water_offset must use values 0 through 8");
}
if ("aspergillum:water_level" in blockStates) {
  errors.push("Aspersorium must not restore the invalid seventeen-value water_level state");
}
if (JSON.stringify(cosmeticState) !== JSON.stringify(cosmetics.map(({ index }) => index))) {
  errors.push("Aspersorium cosmetic state must match the authored customization catalog");
}
for (const [stateName, values] of Object.entries(blockStates)) {
  if (Array.isArray(values) && values.length > 16) {
    errors.push(`Block state ${stateName} exceeds Bedrock's sixteen-value runtime limit`);
  }
}
const blockStateSpace = Object.values(blockStates).reduce(
  (product, values) => product * (Array.isArray(values) ? values.length : 1),
  1,
);
if (blockStateSpace !== 9216) {
  errors.push(`Aspersorium must expose the reviewed 9216-state permutation space, found ${blockStateSpace}`);
}
const expectedWaterBones = ["water_low", "water_mid", "water_high", "water_full"];
const baseBoneVisibility = baseGeometry?.bone_visibility ?? {};
for (const bone of expectedWaterBones) {
  if (bone in baseBoneVisibility) errors.push(`Official Aspersorium block must not render entity-owned bone ${bone}`);
}
const aspersoriumGeometry = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "models", "blocks", "aspersorium.geo.json"), "utf8"),
)["minecraft:geometry"]?.[0];
if ((aspersoriumGeometry?.bones ?? []).some((bone) => expectedWaterBones.includes(bone.name))) {
  errors.push("Official Aspersorium block geometry must not contain entity-owned water bones");
}
const materialInstances = block?.components?.["minecraft:material_instances"] ?? {};
function validateAspersoriumMaterialProfile(instances, label) {
  if (Object.keys(instances ?? {}).join() !== "*" || instances?.["*"]?.render_method !== "opaque") {
    errors.push(`${label} must contain only the physically validated opaque structure material`);
  }
}
validateAspersoriumMaterialProfile(materialInstances, "Base Aspersorium material profile");
const expectedAspersoriumDestructionParticles = {
  texture: "aspersorium_destruction",
  tint_method: "none",
  particle_count: 56,
};
if (JSON.stringify(block?.components?.["minecraft:destruction_particles"])
  !== JSON.stringify(expectedAspersoriumDestructionParticles)) {
  errors.push("Aspersorium must use its reviewed 16x16 hammered-metal destruction texture and count");
}
if (JSON.stringify(terrainTextureDefinition.texture_data?.aspersorium_destruction?.textures)
  !== JSON.stringify(["textures/blocks/aspersorium_destruction"])) {
  errors.push("Aspersorium destruction texture must be registered in terrain_texture.json");
}
if (JSON.stringify(block?.components?.["minecraft:tick"])
  !== JSON.stringify({ interval_range: [80, 120], looping: true })) {
  errors.push("Official Aspersorium requires its distributed 80..120 tick visual reconciliation");
}

const waterEntityDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "entities", "aspersorium_water_visual.entity.json"), "utf8"),
)["minecraft:entity"];
const waterEntityDescription = waterEntityDefinition?.description;
if (waterEntityDescription?.identifier !== "aspergillum:aspersorium_water_visual"
  || waterEntityDescription?.is_spawnable !== false
  || waterEntityDescription?.is_summonable !== true) {
  errors.push("Official water visual must be script-spawnable without exposing a spawn egg");
}
const expectedWaterEntityComponents = [
  "minecraft:persistent",
  "minecraft:cannot_be_attacked",
  "minecraft:physics",
  "minecraft:collision_box",
];
const waterEntityComponents = waterEntityDefinition?.components ?? {};
if (JSON.stringify(Object.keys(waterEntityComponents)) !== JSON.stringify(expectedWaterEntityComponents)
  || waterEntityComponents["minecraft:physics"]?.has_gravity !== false
  || waterEntityComponents["minecraft:physics"]?.has_collision !== false
  || waterEntityComponents["minecraft:collision_box"]?.width !== 0
  || waterEntityComponents["minecraft:collision_box"]?.height !== 0) {
  errors.push("Official water visual must preserve the approved minimal nonphysical component profile");
}
if (waterEntityComponents["minecraft:pushable"] !== undefined) {
  errors.push("Legacy minecraft:pushable is invalid in entity schema 1.26.40");
}
const waterLevelProperty = waterEntityDescription?.properties?.["aspergillum:water_visual_level"];
if (waterLevelProperty?.client_sync !== true
  || JSON.stringify(waterLevelProperty?.range) !== JSON.stringify([1, 4])) {
  errors.push("Official water visual must client-sync exactly the four visual levels");
}
const waterClientDescription = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "entity", "aspersorium_water_visual.entity.json"), "utf8"),
)["minecraft:client_entity"]?.description;
if (waterClientDescription?.identifier !== "aspergillum:aspersorium_water_visual"
  || waterClientDescription?.materials?.default !== "entity_alphablend"
  || waterClientDescription?.textures?.default !== "textures/entity/aspersorium_water_visual"
  || waterClientDescription?.geometry?.default !== "geometry.aspergillum.aspersorium_water_visual") {
  errors.push("Official water visual client entity must preserve its isolated entity_alphablend pass");
}
const waterEntityGeometry = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "models", "entity", "aspersorium_water_visual.geo.json"), "utf8"),
)["minecraft:geometry"]?.[0];
const waterEntityBones = new Map((waterEntityGeometry?.bones ?? []).map((bone) => [bone.name, bone]));
if (waterEntityGeometry?.description?.identifier !== "geometry.aspergillum.aspersorium_water_visual"
  || waterEntityGeometry?.description?.texture_width !== 32
  || waterEntityGeometry?.description?.texture_height !== 32
  || JSON.stringify([...waterEntityBones.keys()]) !== JSON.stringify(["root", ...expectedWaterBones])) {
  errors.push("Official entity geometry must contain exactly root plus the four authored water levels");
}
const authoredAspersoriumGeometry = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src", "models", "aspersorium.model.json"), "utf8"),
)["minecraft:geometry"]?.[0];
for (const boneName of expectedWaterBones) {
  const authored = authoredAspersoriumGeometry?.bones?.find((bone) => bone.name === boneName)?.cubes?.[0];
  const generated = waterEntityBones.get(boneName)?.cubes?.[0];
  if (JSON.stringify(generated?.origin) !== JSON.stringify(authored?.origin)
    || JSON.stringify(generated?.size) !== JSON.stringify(authored?.size)) {
    errors.push(`Entity water level ${boneName} must derive its origin and size from the authored Aspersorium model`);
  }
  if (Object.values(generated?.uv ?? {}).some((face) => face.material_instance !== undefined)) {
    errors.push(`Entity water level ${boneName} cannot retain block material-instance references`);
  }
}
if (block?.components?.["minecraft:movable"]?.movement_type !== "immovable") {
  errors.push("Persistent docked metadata requires the Aspersorium to remain immovable");
}
const cosmeticMaterialPermutations = new Map(
  block?.permutations
    ?.filter((permutation) => permutation.condition.includes("aspergillum:cosmetic"))
    .map((permutation) => [
      Number(permutation.condition.match(/==\s*(\d+)/)?.[1]),
      permutation.components?.["minecraft:material_instances"]?.["*"]?.texture,
    ]),
);
for (const cosmetic of cosmetics.slice(1)) {
  if (cosmeticMaterialPermutations.get(cosmetic.index) !== `aspersorium_${cosmetic.id}`) {
    errors.push(`Aspersorium is missing material permutation for cosmetic ${cosmetic.id}`);
  }
  const permutation = block?.permutations?.find(
    (candidate) => candidate.condition.includes("aspergillum:cosmetic")
      && Number(candidate.condition.match(/==\s*(\d+)/)?.[1]) === cosmetic.index,
  );
  validateAspersoriumMaterialProfile(
    permutation?.components?.["minecraft:material_instances"],
    `Aspersorium cosmetic ${cosmetic.id}`,
  );
}
const dockedLoot = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "loot_tables", "blocks", "aspersorium_docked.loot.json"), "utf8"),
);
if (JSON.stringify(dockedLoot).includes("aspergillum:aspergillum")) {
  errors.push("Docked loot must not duplicate the script-recovered metadata-bearing aspergillum");
}

for (const recipeName of ["aspergillum.recipe.json", "aspersorium.recipe.json", "sacristan_table.recipe.json"]) {
  const recipe = JSON.parse(fs.readFileSync(path.join(packRoots[0], "recipes", recipeName), "utf8"));
  const unlock = recipe["minecraft:recipe_shaped"]?.unlock;
  if (!Array.isArray(unlock) || unlock.length === 0) errors.push(`${recipeName} requires unlock data`);
}
const aspersoriumRecipe = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "recipes", "aspersorium.recipe.json"), "utf8"),
)["minecraft:recipe_shaped"];
if (aspersoriumRecipe?.key?.C?.item !== "minecraft:chain") {
  errors.push("Aspersorium recipe must remain distinct from the vanilla cauldron recipe");
}

const publishedCosmetics = [
  ["classic", "silver", "chestnut", 0],
  ["silver_oxblood", "silver", "oxblood", 1],
  ["silver_black", "silver", "black", 2],
  ["antique_chestnut", "antique", "chestnut", 3],
  ["antique_oxblood", "antique", "oxblood", 4],
  ["antique_black", "antique", "black", 5],
  ["gilded_chestnut", "gilded", "chestnut", 6],
  ["gilded_oxblood", "gilded", "oxblood", 7],
  ["gilded_black", "gilded", "black", 8],
  ["silver_ivory", "silver", "ivory", 9],
  ["antique_ivory", "antique", "ivory", 10],
  ["gilded_ivory", "gilded", "ivory", 11],
  ["bronze_chestnut", "bronze", "chestnut", 12],
  ["bronze_oxblood", "bronze", "oxblood", 13],
  ["bronze_black", "bronze", "black", 14],
  ["bronze_ivory", "bronze", "ivory", 15],
];
if (cosmetics.length !== 16
  || cosmetics[0]?.id !== "classic"
  || JSON.stringify(customizationCatalog.metalFinishes) !== JSON.stringify(["silver", "antique", "gilded", "bronze"])
  || JSON.stringify(customizationCatalog.gripFinishes) !== JSON.stringify(["chestnut", "oxblood", "black", "ivory"])
  || JSON.stringify(cosmetics.map(({ index }) => index)) !== JSON.stringify(Array.from({ length: 16 }, (_, index) => index))) {
  errors.push("Customization catalog must expose the reviewed 4x4 matrix with indices 0 through 15");
}
if (JSON.stringify(cosmetics.map(({ id, metal, grip, index }) => [id, metal, grip, index]))
  !== JSON.stringify(publishedCosmetics)) {
  errors.push("Customization catalog must preserve every published 4x4 cosmetic mapping at indices 0 through 15");
}

const tableDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "blocks", "sacristan_table.block.json"), "utf8"),
);
const tableBlock = tableDefinition["minecraft:block"];
const tableStates = tableBlock?.description?.states ?? {};
if (JSON.stringify(tableStates["aspergillum:table_has_aspergillum"]) !== JSON.stringify([false, true])) {
  errors.push("Sacristan table must expose its stable occupied state");
}
if (JSON.stringify(tableStates["aspergillum:table_cosmetic"]) !== JSON.stringify(cosmetics.map(({ index }) => index))) {
  errors.push("Sacristan table cosmetic state must match the authored catalog");
}
if (JSON.stringify(tableStates["aspergillum:table_rotation"])
  !== JSON.stringify(Array.from({ length: 16 }, (_, index) => index))) {
  errors.push("Sacristan table must expose all sixteen stable rotations");
}
const tableStateSpace = Object.values(tableStates).reduce(
  (product, values) => product * (Array.isArray(values) ? values.length : 1),
  1,
);
if (tableStateSpace !== 512) {
  errors.push(`Sacristan table must expose the reviewed 512-state space, found ${tableStateSpace}`);
}
if (tableBlock?.components?.["minecraft:movable"]?.movement_type !== "immovable") {
  errors.push("Persistent customization metadata requires the Sacristan table to remain immovable");
}
if (tableBlock?.components?.["aspergillum:sacristan_table_interaction"] === undefined) {
  errors.push("Sacristan table requires its stable custom interaction component");
}
const expectedTableDestructionParticles = {
  texture: "sacristan_table_destruction",
  tint_method: "none",
  particle_count: 80,
};
if (JSON.stringify(tableBlock?.components?.["minecraft:destruction_particles"])
  !== JSON.stringify(expectedTableDestructionParticles)) {
  errors.push("Sacristan table must use its reviewed 16x16 wood/velvet/brass destruction texture and count");
}
if (JSON.stringify(terrainTextureDefinition.texture_data?.sacristan_table_destruction?.textures)
  !== JSON.stringify(["textures/blocks/sacristan_table_destruction"])) {
  errors.push("Sacristan table destruction texture must be registered in terrain_texture.json");
}
const tableBaseGeometry = tableBlock?.components?.["minecraft:geometry"];
if (tableBaseGeometry?.identifier !== "geometry.aspergillum.sacristan_table.rotation_0"
  || tableBaseGeometry?.bone_visibility?.resting_aspergillum
    !== "q.block_state('aspergillum:table_has_aspergillum') == true") {
  errors.push("Sacristan table must hide and reveal its resting aspergillum through the occupied state");
}
const tableRotations = new Set(
  tableBlock?.permutations
    ?.filter((permutation) => permutation.condition.includes("aspergillum:table_rotation"))
    .map((permutation) => permutation.components?.["minecraft:geometry"]?.identifier),
);
for (let rotationIndex = 1; rotationIndex < 16; rotationIndex += 1) {
  if (!tableRotations.has(`geometry.aspergillum.sacristan_table.rotation_${rotationIndex}`)) {
    errors.push(`Missing stable Sacristan table rotation ${rotationIndex}`);
  }
}
const tableCosmeticMaterials = new Map(
  tableBlock?.permutations
    ?.filter((permutation) => permutation.condition.includes("aspergillum:table_cosmetic"))
    .map((permutation) => [
      Number(permutation.condition.match(/==\s*(\d+)/)?.[1]),
      permutation.components?.["minecraft:material_instances"]?.["*"]?.texture,
    ]),
);
for (const cosmetic of cosmetics.slice(1)) {
  if (tableCosmeticMaterials.get(cosmetic.index) !== `sacristan_table_${cosmetic.id}`) {
    errors.push(`Sacristan table is missing material permutation for cosmetic ${cosmetic.id}`);
  }
}
const occupiedTableLoot = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "loot_tables", "blocks", "sacristan_table_occupied.loot.json"), "utf8"),
);
if (JSON.stringify(occupiedTableLoot).includes("aspergillum:aspergillum")) {
  errors.push("Occupied Sacristan table loot must not duplicate the script-recovered aspergillum");
}
const tableGeometry = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "models", "blocks", "sacristan_table.geo.json"), "utf8"),
)["minecraft:geometry"]?.[0];
const tableGeometrySource = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src", "models", "sacristan_table.model.json"), "utf8"),
)["minecraft:geometry"]?.[0];
if (tableGeometry?.description?.texture_width !== 256 || tableGeometry?.description?.texture_height !== 256) {
  errors.push("Sacristan table atlas must reserve a 256x256 cosmetic presentation surface");
}
const authoredTableRoot = tableGeometrySource?.bones?.find((bone) => bone.name === "root");
const authoredVelvet = authoredTableRoot?.cubes?.find((cube) => cube.name === "velvet");
if (JSON.stringify(authoredVelvet?.origin) !== JSON.stringify([-6.5, 14, -6.5])
  || JSON.stringify(authoredVelvet?.size) !== JSON.stringify([13, 0.35, 13])) {
  errors.push("Sacristan table velvet must fill the complete 13x13 interior without crossing the raised rim");
}
if ((authoredTableRoot?.cubes ?? []).some((cube) => ["left_support", "right_support"].includes(cube.name))) {
  errors.push("Sacristan table top must not restore the removed brass supports");
}
const restingAspergillum = (tableGeometry?.bones ?? []).find((bone) => bone.name === "resting_aspergillum");
if (restingAspergillum?.cubes?.length !== 14) {
  errors.push("Sacristan table must present the complete authored aspergillum silhouette");
}
if (JSON.stringify(restingAspergillum?.pivot) !== JSON.stringify([0, 16.2, 0])
  || JSON.stringify(restingAspergillum?.rotation) !== JSON.stringify([90, 0, 0])) {
  errors.push("Sacristan table replica must retain the reviewed centered resting transform");
}
const restingBounds = [0, 1, 2].map((axis) => {
  const minima = (restingAspergillum?.cubes ?? []).map((cube) => cube.origin[axis]);
  const maxima = (restingAspergillum?.cubes ?? []).map((cube) => cube.origin[axis] + cube.size[axis]);
  return [Math.min(...minima), Math.max(...maxima)];
});
const restingCenter = restingBounds.map(([minimum, maximum]) => (minimum + maximum) / 2);
const restingSpan = restingBounds.map(([minimum, maximum]) => maximum - minimum);
if (restingCenter.some((value, axis) => Math.abs(value - [0, 16.2, 0][axis]) > 1e-6)
  || restingSpan[1] > 11.25
  || restingSpan[0] > 4
  || restingSpan[2] > 4) {
  errors.push("Sacristan table replica must remain centered and scaled to fit inside the 13x13 velvet interior");
}
const tablePommelBase = restingAspergillum?.cubes?.[1];
const tablePommelCollar = restingAspergillum?.cubes?.slice(2, 6) ?? [];
const matchesDimensions = (actual, expected) => expected.every(
  (dimension, axis) => Math.abs((actual?.[axis] ?? Number.NaN) - dimension) <= 1e-6,
);
const expectedTableCollarSizes = [
  [1.548, 0.54, 0.144],
  [1.548, 0.54, 0.144],
  [0.144, 0.54, 1.26],
  [0.144, 0.54, 1.26],
];
if (!matchesDimensions(tablePommelBase?.size, [1.62, 0.432, 1.62])
  || tablePommelCollar.some((cube, index) => !matchesDimensions(cube?.size, expectedTableCollarSizes[index]))) {
  errors.push("Sacristan table must inherit the solid pommel plate and hollow four-piece collar at the reviewed 0.72 scale");
}

const attachableSource = fs.readFileSync(
  path.join(packRoots[1], "attachables", "aspergillum.attachable.json"),
  "utf8",
);
if (/q\.is_swinging/.test(attachableSource)) errors.push("Attachable uses unsupported q.is_swinging");
if (!attachableSource.includes("controller.render.aspergillum.held")) {
  errors.push("Attachable must use its dedicated render controller");
}
for (const cosmetic of cosmetics) {
  const suffix = cosmetic.id === "classic" ? "" : `_${cosmetic.id}`;
  const expectedIdentifier = cosmetic.id === "classic"
    ? "aspergillum:aspergillum"
    : `aspergillum:aspergillum_${cosmetic.id}`;
  const variantItem = JSON.parse(
    fs.readFileSync(path.join(packRoots[0], "items", `aspergillum${suffix}.item.json`), "utf8"),
  )?.["minecraft:item"];
  if (variantItem?.description?.identifier !== expectedIdentifier
    || variantItem?.components?.["minecraft:icon"]?.textures?.default !== `aspergillum${suffix}`) {
    errors.push(`Generated item definition diverges for cosmetic ${cosmetic.id}`);
  }
  if (cosmetic.id !== "classic" && variantItem?.description?.menu_category !== undefined) {
    errors.push(`Cosmetic item ${cosmetic.id} must remain hidden from the creative catalog`);
  }
  const variantAttachable = JSON.parse(
    fs.readFileSync(path.join(packRoots[1], "attachables", `aspergillum${suffix}.attachable.json`), "utf8"),
  )?.["minecraft:attachable"]?.description;
  if (variantAttachable?.identifier !== expectedIdentifier
    || variantAttachable?.textures?.default !== `textures/entity/aspergillum${suffix}`
    || variantAttachable?.geometry?.default !== "geometry.aspergillum.held") {
    errors.push(`Generated attachable diverges for cosmetic ${cosmetic.id}`);
  }
}

const heldGeometry = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "models", "entity", "aspergillum.geo.json"), "utf8"),
);
const heldGeometrySource = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src", "models", "aspergillum.model.json"), "utf8"),
);
if (heldGeometry?.format_version !== "1.16.0") {
  errors.push("Attachable binding requires geometry format_version 1.16.0");
}
if (heldGeometrySource?.format_version !== heldGeometry?.format_version) {
  errors.push("Authored aspergillum model and generated Bedrock geometry must use the same format_version");
}
const heldBones = heldGeometry?.["minecraft:geometry"]?.[0]?.bones ?? [];
const heldSourceBones = heldGeometrySource?.["minecraft:geometry"]?.[0]?.bones ?? [];
if (heldBones.length !== 6) {
  errors.push("Held geometry must contain bound, presentation, action, handle, sprinkler-head, and spray-aim bones");
}
const boundBone = heldBones.find((bone) => bone.name === "aspergillum_bound");
const presentationBone = heldBones.find((bone) => bone.name === "aspergillum_presentation");
const actionBone = heldBones.find((bone) => bone.name === "aspergillum_action");
const handleBone = heldBones.find((bone) => bone.name === "handle");
const sprinklerHeadBone = heldBones.find((bone) => bone.name === "sprinkler_head");
const sprayAimBone = heldBones.find((bone) => bone.name === "spray_aim");
if (boundBone?.name !== "aspergillum_bound") {
  errors.push("Pose-calibration geometry requires the aspergillum_bound root");
}
if (boundBone?.binding !== "q.item_slot_to_bone_name(context.item_slot)") {
  errors.push("Bound bone must use the exact documented item-slot binding expression");
}
if (JSON.stringify(boundBone?.pivot) !== JSON.stringify([0, 0, 0])) {
  errors.push("Bound root must retain a neutral pivot");
}
for (const forbidden of ["parent", "locators", "inflate", "mirror", "cubes", "rotation"]) {
  if (boundBone?.[forbidden] !== undefined) {
    errors.push(`Bound root must not define ${forbidden}`);
  }
}
if (presentationBone?.parent !== "aspergillum_bound") {
  errors.push("Presentation bone must inherit directly from the proven bound root");
}
if (presentationBone?.binding !== undefined || presentationBone?.locators !== undefined || presentationBone?.cubes !== undefined) {
  errors.push("Presentation bone must contain only the perspective-neutral structural transform");
}
if (JSON.stringify(presentationBone?.pivot) !== JSON.stringify([-6, 24, 1])) {
  errors.push("Presentation pivot must coincide with the empirically calibrated dark-handle grip");
}
if (JSON.stringify(presentationBone?.rotation) !== JSON.stringify([25, 0, -12])) {
  errors.push("Presentation bone must retain the controlled structural pose");
}
if (actionBone?.parent !== "aspergillum_presentation"
  || JSON.stringify(actionBone?.pivot) !== JSON.stringify([-6, 24, 1])
  || actionBone?.cubes !== undefined
  || actionBone?.binding !== undefined) {
  errors.push("Action bone must be a neutral grip-centred child of the presentation bone");
}
if (handleBone?.parent !== "aspergillum_action" || sprinklerHeadBone?.parent !== "aspergillum_action") {
  errors.push("Handle and sprinkler head must inherit from the action bone");
}
if (handleBone?.locators !== undefined || sprinklerHeadBone?.locators !== undefined) {
  errors.push("Only the dedicated spray-aim bone may own the release locator");
}
if (sprayAimBone?.parent !== "sprinkler_head"
  || JSON.stringify(sprayAimBone?.pivot) !== JSON.stringify([-6, 36.8, 1])
  || JSON.stringify(sprayAimBone?.locators?.aspergillum_tip) !== JSON.stringify([-6, 37.8, 1])
  || sprayAimBone?.cubes !== undefined
  || sprayAimBone?.binding !== undefined) {
  errors.push("Spray-aim must be a non-rendering sprinkler-head child with the calibrated aspergillum_tip locator");
}
const cubes = [...(handleBone?.cubes ?? []), ...(sprinklerHeadBone?.cubes ?? [])];
const sourceCubes = heldSourceBones.flatMap((bone) => bone.cubes ?? []);
const authoredHeadCubes = heldSourceBones.find((bone) => bone.name === "sprinkler_head")?.cubes ?? [];
const authoredPommelBase = sourceCubes.find((cube) => cube.name === "silver_pommel_base");
const authoredGrip = sourceCubes.find((cube) => cube.name === "leather_grip");
const authoredPommelCollar = sourceCubes.filter((cube) => cube.name?.startsWith("silver_pommel_collar_"));
const expectedPommelCollar = [
  {
    name: "silver_pommel_collar_north",
    origin: [-7.075, 21.8, -0.075],
    size: [2.15, 0.75, 0.2],
    faces: ["north", "east", "south", "west", "up"],
  },
  {
    name: "silver_pommel_collar_south",
    origin: [-7.075, 21.8, 1.875],
    size: [2.15, 0.75, 0.2],
    faces: ["north", "east", "south", "west", "up"],
  },
  {
    name: "silver_pommel_collar_west",
    origin: [-7.075, 21.8, 0.125],
    size: [0.2, 0.75, 1.75],
    faces: ["east", "west", "up"],
  },
  {
    name: "silver_pommel_collar_east",
    origin: [-5.125, 21.8, 0.125],
    size: [0.2, 0.75, 1.75],
    faces: ["east", "west", "up"],
  },
];
if (JSON.stringify(authoredPommelBase?.origin) !== JSON.stringify([-7.125, 21.2, -0.125])
  || JSON.stringify(authoredPommelBase?.size) !== JSON.stringify([2.25, 0.6, 2.25])
  || JSON.stringify(authoredGrip?.origin) !== JSON.stringify([-6.8125, 21.8, 0.1875])
  || JSON.stringify(authoredGrip?.size) !== JSON.stringify([1.625, 4.7, 1.625])
  || JSON.stringify(authoredPommelCollar.map(({ name, origin, size, faces }) => ({ name, origin, size, faces })))
    !== JSON.stringify(expectedPommelCollar)) {
  errors.push("Authored handle must preserve the non-intersecting solid plate, hollow collar, and seated leather grip");
}
const pommelTransition = [authoredGrip, authoredPommelBase, ...authoredPommelCollar].filter(Boolean);
const hasPositiveVolumeOverlap = (first, second) => [0, 1, 2].every((axis) =>
  Math.min(first.origin[axis] + first.size[axis], second.origin[axis] + second.size[axis])
    - Math.max(first.origin[axis], second.origin[axis]) > 1e-6);
for (let firstIndex = 0; firstIndex < pommelTransition.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < pommelTransition.length; secondIndex += 1) {
    if (hasPositiveVolumeOverlap(pommelTransition[firstIndex], pommelTransition[secondIndex])) {
      errors.push(`Pommel transition volumes must not intersect: ${pommelTransition[firstIndex].name} / ${pommelTransition[secondIndex].name}`);
    }
  }
}
if (cubes.length !== 14 || authoredHeadCubes.length !== 6) {
  errors.push("Handle and sprinkler head must preserve the eight-piece handle and six stable head volumes");
} else {
  const grip = [-6, 24, 1];
  const handleContainsGrip = grip.every(
    (coordinate, axis) => cubes[0].origin[axis] <= coordinate && cubes[0].origin[axis] + cubes[0].size[axis] >= coordinate,
  );
  if (!handleContainsGrip) errors.push("Dark handle must contain the empirically calibrated grip point");
  const minY = Math.min(...cubes.map((cube) => cube.origin[1]));
  const maxY = Math.max(...cubes.map((cube) => cube.origin[1] + cube.size[1]));
  const maxWidth = Math.max(...cubes.map((cube) => cube.size[0]));
  if (Math.abs(maxY - minY - 15.6) > 1e-6 || maxWidth > 5) {
    errors.push("Real mesh must preserve the validated hand-scale envelope");
  }
  if (cubes.some((cube) => cube.size.some((dimension) => dimension <= 0))) {
    errors.push("Real mesh must not contain zero-thickness or negative-size cubes");
  }

  const faceNames = ["north", "east", "south", "west", "up", "down"];
  const expectedHeadVolumes = [
    { name: "lower_head_ring", origin: [-7.7, 32.15, -0.7], size: [3.4, 0.4, 3.4], faces: ["north", "east", "south", "west", "down"] },
    { name: "lower_head_dome", origin: [-8.15, 32.55, -1.15], size: [4.3, 0.65, 4.3], faces: ["north", "east", "south", "west", "down"] },
    { name: "perforated_head", origin: [-8.47, 33.2, -1.47], size: [4.94, 2.15, 4.94], faces: ["north", "east", "south", "west", "up", "down"] },
    { name: "upper_head_dome", origin: [-8.15, 35.35, -1.15], size: [4.3, 0.65, 4.3], faces: ["north", "east", "south", "west", "up"] },
    { name: "upper_head_ring", origin: [-7.7, 36, -0.7], size: [3.4, 0.4, 3.4], faces: ["north", "east", "south", "west", "up"] },
    { name: "top_finial", origin: [-6.7475, 36.4, 0.2525], size: [1.495, 0.4, 1.495], faces: ["north", "east", "south", "west", "up"] },
  ];
  if (JSON.stringify(authoredHeadCubes.map(({ name, origin, size, faces }) => ({ name, origin, size, faces })))
    !== JSON.stringify(expectedHeadVolumes)) {
    errors.push("Sprinkler head must preserve six stable four-walled volumes and the approved single-cap seam masks");
  }
  const facePlane = (cube, faceName) => {
    const [x, y, z] = cube.origin;
    const [sizeX, sizeY, sizeZ] = cube.size;
    if (faceName === "west" || faceName === "east") {
      return { axis: 0, plane: faceName === "west" ? x : x + sizeX, minA: y, maxA: y + sizeY, minB: z, maxB: z + sizeZ };
    }
    if (faceName === "down" || faceName === "up") {
      return { axis: 1, plane: faceName === "down" ? y : y + sizeY, minA: x, maxA: x + sizeX, minB: z, maxB: z + sizeZ };
    }
    return { axis: 2, plane: faceName === "north" ? z : z + sizeZ, minA: x, maxA: x + sizeX, minB: y, maxB: y + sizeY };
  };
  const renderedHeadFaces = authoredHeadCubes.flatMap((cube) =>
    (cube.faces ?? faceNames).map((faceName) => ({ cube, faceName, ...facePlane(cube, faceName) })));
  for (let firstIndex = 0; firstIndex < renderedHeadFaces.length; firstIndex += 1) {
    const first = renderedHeadFaces[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < renderedHeadFaces.length; secondIndex += 1) {
      const second = renderedHeadFaces[secondIndex];
      if (first.axis !== second.axis || Math.abs(first.plane - second.plane) > 1e-6) continue;
      const overlapA = Math.min(first.maxA, second.maxA) - Math.max(first.minA, second.minA);
      const overlapB = Math.min(first.maxB, second.maxB) - Math.max(first.minB, second.minB);
      if (overlapA > 1e-6 && overlapB > 1e-6) {
        errors.push(`Sprinkler-head rendered faces must not overlap on one plane: ${first.cube.name}.${first.faceName} / ${second.cube.name}.${second.faceName}`);
      }
    }
  }

  const horizontalCoverage = new Map();
  for (const cube of authoredHeadCubes) {
    for (const faceName of cube.faces ?? faceNames) {
      if (faceName !== "up" && faceName !== "down") continue;
      const plane = faceName === "down" ? cube.origin[1] : cube.origin[1] + cube.size[1];
      const key = `${faceName}:${plane.toFixed(6)}`;
      horizontalCoverage.set(key, (horizontalCoverage.get(key) ?? 0) + cube.size[0] * cube.size[2]);
    }
  }
  const expectedHorizontalCoverage = new Map([
    ["down:32.150000", 11.56],
    ["down:32.550000", 18.49],
    ["down:33.200000", 24.4036],
    ["up:35.350000", 24.4036],
    ["up:36.000000", 18.49],
    ["up:36.400000", 11.56],
    ["up:36.800000", 2.235025],
  ]);
  if (horizontalCoverage.size !== expectedHorizontalCoverage.size
    || [...expectedHorizontalCoverage].some(([key, expectedArea]) =>
      Math.abs((horizontalCoverage.get(key) ?? Number.NaN) - expectedArea) > 1e-6)) {
    errors.push("Sprinkler-head seams must retain exactly one authored horizontal cap per junction");
  }

  if (sourceCubes.length !== cubes.length) {
    errors.push("Authored and generated aspergillum models must contain the same fourteen cubes");
  }
  const allowedSurfaces = new Set(["leather", "silver", "gold", "perforated_silver"]);
  for (const [index, sourceCube] of sourceCubes.entries()) {
    if (!sourceCube.name || !allowedSurfaces.has(sourceCube.surface)) {
      errors.push(`Authored aspergillum cube ${index + 1} requires a semantic name and approved surface`);
    }
    if (JSON.stringify(sourceCube.origin) !== JSON.stringify(cubes[index]?.origin)
      || JSON.stringify(sourceCube.size) !== JSON.stringify(cubes[index]?.size)) {
      errors.push(`Generated aspergillum cube ${index + 1} diverges from its authored origin or size`);
    }
  }

  const atlasWidth = heldGeometry["minecraft:geometry"][0].description.texture_width;
  const atlasHeight = heldGeometry["minecraft:geometry"][0].description.texture_height;
  const occupiedRects = [];
  const expectedFaceSize = (size, faceName) => {
    const [sizeX, sizeY, sizeZ] = size;
    const dimensions = faceName === "east" || faceName === "west"
      ? [sizeZ, sizeY]
      : faceName === "north" || faceName === "south"
        ? [sizeX, sizeY]
        : [sizeX, sizeZ];
    return dimensions.map((dimension) => Math.max(1, Math.ceil(dimension * 2)));
  };
  for (const [cubeIndex, cube] of cubes.entries()) {
    if (!cube.uv || Array.isArray(cube.uv)) {
      errors.push(`Aspergillum cube ${cubeIndex + 1} must use explicit per-face UVs; fractional Box UVs are unsafe in Bedrock`);
      continue;
    }
    const selectedFaces = sourceCubes[cubeIndex]?.faces ?? faceNames;
    if (Object.keys(cube.uv).sort().join() !== [...selectedFaces].sort().join()) {
      errors.push(`Aspergillum cube ${cubeIndex + 1} must map exactly its authored visible faces`);
      continue;
    }
    for (const faceName of selectedFaces) {
      const face = cube.uv[faceName];
      const values = [...(face?.uv ?? []), ...(face?.uv_size ?? [])];
      if (values.length !== 4 || values.some((value) => !Number.isInteger(value))) {
        errors.push(`Aspergillum cube ${cubeIndex + 1}.${faceName} must use integer UV coordinates and sizes`);
        continue;
      }
      const [u, v] = face.uv;
      const [width, height] = face.uv_size;
      if (width < 1 || height < 1) {
        errors.push(`Aspergillum cube ${cubeIndex + 1}.${faceName} collapses below one texel`);
      }
      if (JSON.stringify(face.uv_size) !== JSON.stringify(expectedFaceSize(cube.size, faceName))) {
        errors.push(`Aspergillum cube ${cubeIndex + 1}.${faceName} must use the approved two-texel-per-unit footprint`);
      }
      if (u < 0 || v < 0 || u + width > atlasWidth || v + height > atlasHeight) {
        errors.push(`Aspergillum cube ${cubeIndex + 1}.${faceName} exceeds the declared texture atlas`);
      }
      const overlaps = occupiedRects.some((rect) =>
        u < rect.u + rect.width && u + width > rect.u && v < rect.v + rect.height && v + height > rect.v);
      if (overlaps) errors.push(`Aspergillum cube ${cubeIndex + 1}.${faceName} overlaps another UV island`);
      occupiedRects.push({ u, v, width, height });
    }
  }

  const aspersoriumDescription = aspersoriumGeometry?.description;
  if (aspersoriumDescription?.texture_width !== 256 || aspersoriumDescription?.texture_height !== 256) {
    errors.push("Aspersorium atlas must reserve a 256x256 region for the shared docked aspergillum material");
  }
  const dockedCubes = (aspersoriumGeometry?.bones ?? [])
    .find((bone) => bone.name === "resting_aspergillum")?.cubes ?? [];
  const dockedTranslation = [6, -17, -1];
  const dockedUvOffset = [128, 0];
  if (dockedCubes.length !== cubes.length) {
    errors.push("Docked aspergillum must be generated from every held-model cube");
  } else {
    for (const [cubeIndex, cube] of cubes.entries()) {
      const dockedCube = dockedCubes[cubeIndex];
      const expectedOrigin = cube.origin.map((coordinate, axis) => coordinate + dockedTranslation[axis]);
      if (JSON.stringify(dockedCube.origin) !== JSON.stringify(expectedOrigin)
        || JSON.stringify(dockedCube.size) !== JSON.stringify(cube.size)) {
        errors.push(`Docked aspergillum cube ${cubeIndex + 1} diverges from the held-model silhouette`);
      }
      const selectedFaces = Object.keys(cube.uv);
      if (Object.keys(dockedCube.uv ?? {}).sort().join() !== [...selectedFaces].sort().join()) {
        errors.push(`Docked aspergillum cube ${cubeIndex + 1} diverges from the held-model face mask`);
      }
      for (const faceName of selectedFaces) {
        const expectedUv = [
          cube.uv[faceName].uv[0] + dockedUvOffset[0],
          cube.uv[faceName].uv[1] + dockedUvOffset[1],
        ];
        if (JSON.stringify(dockedCube.uv?.[faceName]?.uv) !== JSON.stringify(expectedUv)
          || JSON.stringify(dockedCube.uv?.[faceName]?.uv_size) !== JSON.stringify(cube.uv[faceName].uv_size)) {
          errors.push(`Docked aspergillum cube ${cubeIndex + 1}.${faceName} must share the held-model UV island`);
        }
      }
    }
  }

  const tableTranslation = [6, -12.8, -1];
  const tableScaleAnchor = [-6, 29, 1];
  const tableScale = 0.72;
  const tableUvOffset = [128, 0];
  if ((restingAspergillum?.cubes ?? []).length !== cubes.length) {
    errors.push("Sacristan table must be generated from every held-model cube");
  } else {
    for (const [cubeIndex, cube] of cubes.entries()) {
      const tableCube = restingAspergillum.cubes[cubeIndex];
      const expectedOrigin = cube.origin.map((coordinate, axis) =>
        tableScaleAnchor[axis] + (coordinate - tableScaleAnchor[axis]) * tableScale + tableTranslation[axis]);
      const expectedSize = cube.size.map((dimension) => dimension * tableScale);
      if (!matchesDimensions(tableCube.origin, expectedOrigin) || !matchesDimensions(tableCube.size, expectedSize)) {
        errors.push(`Sacristan table aspergillum cube ${cubeIndex + 1} diverges from the scaled held-model silhouette`);
      }
      const selectedFaces = Object.keys(cube.uv);
      if (Object.keys(tableCube.uv ?? {}).sort().join() !== [...selectedFaces].sort().join()) {
        errors.push(`Sacristan table aspergillum cube ${cubeIndex + 1} diverges from the held-model face mask`);
      }
      for (const faceName of selectedFaces) {
        const expectedUv = [cube.uv[faceName].uv[0] + tableUvOffset[0], cube.uv[faceName].uv[1]];
        if (JSON.stringify(tableCube.uv?.[faceName]?.uv) !== JSON.stringify(expectedUv)
          || JSON.stringify(tableCube.uv?.[faceName]?.uv_size) !== JSON.stringify(cube.uv[faceName].uv_size)) {
          errors.push(`Sacristan table aspergillum cube ${cubeIndex + 1}.${faceName} must share the held-model UV island`);
        }
      }
    }
  }
}
const attachableDefinition = JSON.parse(attachableSource)?.["minecraft:attachable"]?.description;
const expectedAnimations = {
  hold_first_person: "animation.aspergillum.hold_first_person",
  hold_third_person: "animation.aspergillum.hold_third_person",
  sprinkle_first_person: "animation.aspergillum.action.sprinkle.first_person",
  sprinkle_third_person: "animation.aspergillum.action.sprinkle.third_person",
  action_controller: "controller.animation.aspergillum.action",
};
if (JSON.stringify(attachableDefinition?.animations) !== JSON.stringify(expectedAnimations)) {
  errors.push("Attachable must expose the frozen hold poses and perspective-specific action controller resources");
}
const expectedAnimateScript = [
  { hold_first_person: "context.is_first_person == 1.0" },
  { hold_third_person: "context.is_first_person == 0.0" },
  "action_controller",
];
if (JSON.stringify(attachableDefinition?.scripts?.animate) !== JSON.stringify(expectedAnimateScript)) {
  errors.push("Attachable must select one hold pose and continuously evaluate its action controller");
}
if (attachableDefinition?.materials?.default !== "entity") {
  errors.push("Pose-calibration attachable must use the opaque entity material");
}
if (attachableDefinition?.particle_effects !== undefined || attachableDefinition?.sound_effects !== undefined) {
  errors.push("Attachable timelines must not duplicate server-authorized transactional VFX or audio");
}

const holdAnimations = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "animations", "aspergillum.hold.animation.json"), "utf8"),
)?.animations;
const firstPersonPose = holdAnimations?.["animation.aspergillum.hold_first_person"];
const thirdPersonPose = holdAnimations?.["animation.aspergillum.hold_third_person"];
if (JSON.stringify(firstPersonPose?.bones?.aspergillum_presentation?.rotation) !== JSON.stringify([180, 0, 0])) {
  errors.push("First-person pose must perform the controlled end-for-end inversion");
}
if (JSON.stringify(thirdPersonPose?.bones?.aspergillum_presentation?.position) !== JSON.stringify([5, -1.5, -2.25])) {
  errors.push("Third-person pose must apply only the measured grip translation");
}
if (JSON.stringify(thirdPersonPose?.bones?.aspergillum_presentation?.rotation) !== JSON.stringify([10, 0, 0])) {
  errors.push("Third-person pose must apply only the measured forward-pitch correction");
}
for (const [name, pose] of Object.entries({ firstPersonPose, thirdPersonPose })) {
  if (pose?.loop !== true || Object.keys(pose?.bones ?? {}).join() !== "aspergillum_presentation") {
    errors.push(`${name} must be a continuous presentation-bone-only pose`);
  }
  const transform = pose?.bones?.aspergillum_presentation ?? {};
  if (transform.scale !== undefined) {
    errors.push(`${name} must not add an unverified scale offset`);
  }
}
if (firstPersonPose?.bones?.aspergillum_presentation?.position !== undefined) {
  errors.push("The validated first-person pose must remain positionally frozen");
}

const actionAnimationPath = path.join(packRoots[1], "animations", "aspergillum.action.animation.json");
const actionAnimations = fs.existsSync(actionAnimationPath)
  ? JSON.parse(fs.readFileSync(actionAnimationPath, "utf8"))?.animations
  : undefined;
const loadAnimation = actionAnimations?.["animation.aspergillum.player.load"];
if (loadAnimation?.animation_length !== 1.1
  || loadAnimation?.override_previous_animation !== false
  || loadAnimation?.blend_weight !== "variable.is_first_person ? 0.32 : 1.0"
  || Object.keys(loadAnimation?.bones ?? {}).join() !== "rightarm") {
  errors.push("Loading must remain a camera-safe additive rightarm-only choreography with a finite recovery tail");
}
const loadSource = JSON.stringify(loadAnimation);
const loadRotation = loadAnimation?.bones?.rightarm?.rotation;
if (!Array.isArray(loadRotation)
  || loadRotation.length !== 3
  || !loadSource.includes("query.anim_time")
  || !loadSource.includes("variable.is_first_person")
  || !loadSource.includes("variable.attack_time <= 0.0")
  || !loadSource.includes("variable.attack_time >= 1.0")
  || !loadSource.includes("math.hermite_blend")
  || !loadSource.includes("(variable.attack_time - 0.5) / 0.5")) {
  errors.push("Loading must use a runtime-safe analytic motion curve and close the native third-person arm seam with the guarded Hermite bridge");
}
if (loadSource.includes('"lerp_mode":"catmullrom"')) {
  errors.push("Loading cannot combine dynamic Molang values with precomputed Catmull-Rom keyframes");
}
const bodySprinkle = actionAnimations?.["animation.aspergillum.player.sprinkle.body"];
const firstPersonSprinkle = actionAnimations?.["animation.aspergillum.action.sprinkle.first_person"];
const thirdPersonSprinkle = actionAnimations?.["animation.aspergillum.action.sprinkle.third_person"];
if (bodySprinkle !== undefined) {
  errors.push("Sprinkle must leave player bones entirely to the native swing recovery");
}
for (const [name, animation] of Object.entries({ firstPersonSprinkle, thirdPersonSprinkle })) {
  if (animation?.animation_length !== 0.82 || Object.keys(animation?.bones ?? {}).join() !== "aspergillum_action") {
    errors.push(`${name} must settle by 0.82 seconds and target only aspergillum_action`);
  }
}

const actionControllerPath = path.join(packRoots[1], "animation_controllers", "aspergillum.animation_controllers.json");
const actionController = fs.existsSync(actionControllerPath)
  ? JSON.parse(fs.readFileSync(actionControllerPath, "utf8"))?.animation_controllers?.["controller.animation.aspergillum.action"]
  : undefined;
if (actionController?.initial_state !== "idle"
  || Object.keys(actionController?.states ?? {}).join() !== "idle,sprinkle,recovery") {
  errors.push("Attachable action controller must expose the controlled idle/sprinkle/recovery lifecycle");
}

const dropletPath = path.join(packRoots[1], "particles", "holy_water_droplet.particle.json");
if (!fs.existsSync(dropletPath)) {
  errors.push("Holy-water droplet particle definition is required");
} else {
  const dropletSource = fs.readFileSync(dropletPath, "utf8");
  const droplet = JSON.parse(dropletSource)?.particle_effect;
  const dropletComponents = droplet?.components ?? {};
  if (/q\.(?:particle_age|particle_lifetime)/.test(dropletSource)) {
    errors.push("Holy-water droplet must use particle variables instead of unsupported entity queries");
  }
  if (droplet?.description?.identifier !== "aspergillum:holy_water_droplet") {
    errors.push("Holy-water droplet particle identifier is invalid");
  }
  if (droplet?.description?.basic_render_parameters?.material !== "particles_alpha") {
    errors.push("Holy-water droplet must preserve the crisp particles_alpha presentation proven in 1.0.6");
  }
  if (droplet?.description?.basic_render_parameters?.texture !== "textures/particle/holy_water") {
    errors.push("Holy-water droplet must use its dedicated texture");
  }
  const billboard = dropletComponents["minecraft:particle_appearance_billboard"];
  if (billboard?.facing_camera_mode !== "rotate_xyz" || billboard?.direction !== undefined) {
    errors.push("Holy-water droplets must preserve the camera-readable v1.0.15d billboard orientation");
  }
  if (JSON.stringify(billboard?.size) !== JSON.stringify([
    "0.042 * variable.aspergillum_scale",
    "0.1 * variable.aspergillum_scale",
  ])) {
    errors.push("Holy-water droplets must preserve the physically approved visible size envelope");
  }
  const lifetime = dropletComponents["minecraft:particle_lifetime_expression"]?.max_lifetime;
  if (lifetime !== "1.05 + math.random(0.0, 0.35)") {
    errors.push("Holy-water droplets must preserve the proven 1.0.6 lifetime envelope");
  }
  const motion = dropletComponents["minecraft:particle_motion_dynamic"];
  if (JSON.stringify(motion?.linear_acceleration) !== JSON.stringify([0, -7.2, 0]) || motion?.linear_drag_coefficient !== 0.035) {
    errors.push("Holy-water droplets must preserve the proven 1.0.6 gravity and drag");
  }
  const collision = dropletComponents["minecraft:particle_motion_collision"];
  if (collision?.enabled !== true || collision?.expire_on_contact !== true || collision?.collision_radius !== 0.025) {
    errors.push("Holy-water droplets must preserve terrain collision and the 1.0.6 collision radius");
  }
  if (collision?.events?.[0]?.event !== "aspergillum:micro_splash"
    || droplet?.events?.["aspergillum:micro_splash"]?.particle_effect?.effect !== "aspergillum:holy_water_micro_splash") {
    errors.push("Holy-water collision must emit exactly the dedicated micro-splash effect");
  }
  if (dropletComponents["minecraft:particle_appearance_lighting"] !== undefined) {
    errors.push("Holy-water droplets must keep their blue hue independent from local colored lighting");
  }
  const gradient = dropletComponents["minecraft:particle_appearance_tinting"]?.color?.gradient;
  if (JSON.stringify(gradient) !== JSON.stringify({
    "0.0": [0.28, 0.62, 0.84, 1.0],
    "0.55": [0.18, 0.5, 0.75, 0.98],
    "0.88": [0.11, 0.38, 0.65, 0.86],
    "1.0": [0.09, 0.32, 0.58, 0.0],
  })) {
    errors.push("Holy-water droplets must preserve the approved cool-blue lifetime palette");
  }
  if (Object.values(gradient ?? {}).some((rgba) => !Array.isArray(rgba) || rgba.length !== 4)) {
    errors.push("Holy-water tint keys must use explicit RGBA arrays instead of ambiguous eight-digit hex colors");
  }
  const interpolant = dropletComponents["minecraft:particle_appearance_tinting"]?.color?.interpolant;
  if (interpolant !== "variable.particle_age / variable.particle_lifetime") {
    errors.push("Holy-water droplet fade must use supported particle lifetime variables");
  }
}

const itemDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "items", "aspergillum.item.json"), "utf8"),
);
const itemComponents = itemDefinition?.["minecraft:item"]?.components;
if (itemComponents?.["minecraft:allow_off_hand"] !== false) {
  errors.push("Direct rightItem binding requires off-hand use to remain disabled");
}
if (itemComponents?.["minecraft:swing_duration"]?.value !== itemComponents?.["minecraft:cooldown"]?.duration) {
  errors.push("Aspergillum swing duration and attack cooldown must remain synchronized");
}

const compiledScript = fs.readFileSync(path.join(packRoots[0], "scripts", "main.js"), "utf8");
if (!compiledScript.includes("aspergillum:aspersorium_water_visual")
  || !compiledScript.includes("water_visual_level")
  || !compiledScript.includes("Could not reconcile water visual")) {
  errors.push("Compiled release script must include the approved water-visual reconciliation lifecycle");
}
if (!compiledScript.includes("playAnimation")
  || !compiledScript.includes("animation.aspergillum.player.load")) {
  errors.push("Compiled script must preserve the accepted one-shot loading animation");
}
if (compiledScript.includes("animation.aspergillum.player.sprinkle.body")
  || compiledScript.includes("playSprinkleAnimation")) {
  errors.push("Compiled sprinkle flow must not restore the absolute player-body choreography");
}
if (!compiledScript.includes("animation.aspergillum.player.sprinkle.recovery_bridge")
  || !compiledScript.includes("playSprinkleRecoveryBridge")) {
  errors.push("Compiled sprinkle flow must include the attack-time recovery bridge");
}
if (!compiledScript.includes("spawnParticle") || !compiledScript.includes("aspergillum:holy_water_droplet")) {
  errors.push("Compiled script must emit the namespaced holy-water droplet particle");
}
if (!compiledScript.includes("dropletCount: 36") || !compiledScript.includes("pulseCount: 6")) {
  errors.push("Compiled spray must emit the complete 36-droplet burst");
}
if (!compiledScript.includes("horizontalSpread: 0.26")
  || !compiledScript.includes("verticalCenter: 0.035")
  || !compiledScript.includes("verticalSpread: 0.055")) {
  errors.push("Compiled spray must retain the wide-horizontal, narrow-vertical fan");
}
if (!compiledScript.includes("steeringResponsiveness: 0.8") || !compiledScript.includes("maximumTurnDegrees: 30")) {
  errors.push("Compiled spray must retain the controlled camera-steering profile");
}
if (!compiledScript.includes("transportSprayBasis") || !compiledScript.includes('phase: "reserved"')) {
  errors.push("Compiled spray must preserve transported steering and reserve-before-release semantics");
}
if (compiledScript.includes("random.splash")) {
  errors.push("Compiled spray must not duplicate the locator-timed release sound");
}
for (const contract of [
  "aspergillum:schema_version",
  "aspergillum:instance_id",
  "aspergillum:cosmetic_id",
  "aspergillum:spray_profile_id",
  "aspergillum:docked_",
  "Unsupported future aspergillum schema",
  "message.aspergillum.docked_partial",
  "remainingCharges",
]) {
  if (!compiledScript.includes(contract)) errors.push(`Compiled persistence contract is missing: ${contract}`);
}
if (!compiledScript.includes("getDynamicPropertyIds")
  || !compiledScript.includes("getRawLore")
  || !compiledScript.includes("onBreak")) {
  errors.push("Compiled script must preserve custom metadata, localized lore migration, and break recovery");
}
if (!compiledScript.includes("onUseOn")
  || !compiledScript.includes("handleAspergillumUseOn")
  || !compiledScript.includes("claimAspersoriumInteraction")) {
  errors.push("Compiled docking input must route stable item use-on and deduplicate it against block interaction");
}
for (const tableContract of [
  "aspergillum:sacristan_table",
  "aspergillum:sacristan_table_interaction",
  "CustomForm",
  "ObservableNumber",
  "showCustomizationMenu",
  "acquireCustomizationSession",
  "handleSacristanTableUse",
]) {
  if (!compiledScript.includes(tableContract)) {
    errors.push(`Compiled customization contract is missing: ${tableContract}`);
  }
}
const customizationMenuSource = fs.readFileSync(
  path.join(root, "src", "presentation", "customization-menu.ts"),
  "utf8",
);
const menuSpacerCount = customizationMenuSource.match(/\.spacer\(\)/g)?.length ?? 0;
const menuDividerCount = customizationMenuSource.match(/\.divider\(\)/g)?.length ?? 0;
if (menuSpacerCount !== 5 || menuDividerCount !== 1) {
  errors.push("Customization menu must preserve five neutral rhythm spacers and only the final action divider");
}
if (compiledScript.includes("runInterval")) {
  errors.push("Customization flows must not introduce persistent polling intervals");
}

for (const locale of ["pt_BR", "en_US"]) {
  const lang = fs.readFileSync(path.join(packRoots[1], "texts", `${locale}.lang`), "utf8");
  const requiredLocaleKeys = [
    "item.aspergillum.lore.charges",
    "item.aspergillum.lore.profile",
    "item.aspergillum.lore.appearance",
    "item.aspergillum.lore.grip",
    "item.aspergillum.lore.instructions",
    "item.aspergillum.lore.docking",
    "item.aspergillum.lore.creative",
    "ui.aspergillum.table.title",
    "ui.aspergillum.table.spray.label",
    "ui.aspergillum.table.metal.label",
    "ui.aspergillum.table.grip.label",
    "ui.aspergillum.table.finish",
    "ui.aspergillum.table.close",
    ...customizationCatalog.metalFinishes.flatMap((finish) => [
      `ui.aspergillum.metal.${finish}.name`,
      `ui.aspergillum.metal.${finish}.description`,
    ]),
    ...customizationCatalog.gripFinishes.flatMap((finish) => [
      `ui.aspergillum.grip.${finish}.name`,
      `ui.aspergillum.grip.${finish}.description`,
    ]),
  ];
  for (const key of requiredLocaleKeys) {
    if (!lang.includes(`${key}=`)) errors.push(`${locale}.lang is missing localized lore key ${key}`);
  }
}

const required = [
  "packs/behavior/scripts/main.js",
  "packs/resource/pack_icon.png",
  "packs/behavior/pack_icon.png",
  "packs/resource/textures/items/aspergillum.png",
  "packs/resource/textures/entity/aspergillum.png",
  "packs/resource/textures/entity/aspergillum_normal.png",
  "packs/resource/textures/entity/aspergillum_mer.png",
  "packs/resource/textures/blocks/aspersorium.png",
  "packs/resource/textures/blocks/aspersorium_destruction.png",
  "packs/resource/textures/blocks/sacristan_table.png",
  "packs/resource/textures/blocks/sacristan_table_destruction.png",
  "packs/resource/textures/particle/holy_water.png",
  "packs/resource/models/blocks/aspersorium.rotations.geo.json",
  "packs/behavior/entities/aspersorium_water_visual.entity.json",
  "packs/resource/entity/aspersorium_water_visual.entity.json",
  "packs/resource/models/entity/aspersorium_water_visual.geo.json",
  "packs/resource/render_controllers/aspersorium_water_visual.render_controllers.json",
  "packs/resource/textures/entity/aspersorium_water_visual.png",
  "packs/resource/models/blocks/sacristan_table.geo.json",
  "packs/resource/models/blocks/sacristan_table.rotations.geo.json",
  "packs/resource/animations/aspergillum.action.animation.json",
  "packs/resource/animations/aspergillum.hold.animation.json",
  "packs/resource/animation_controllers/aspergillum.animation_controllers.json",
  "packs/resource/particles/holy_water_droplet.particle.json",
  "packs/resource/particles/holy_water_release.particle.json",
  "packs/resource/particles/holy_water_micro_splash.particle.json",
  "packs/resource/render_controllers/aspergillum.render_controllers.json",
  "packs/resource/sounds/sound_definitions.json",
];
for (const cosmetic of cosmetics) {
  const suffix = cosmetic.id === "classic" ? "" : `_${cosmetic.id}`;
  required.push(
    `packs/resource/textures/items/aspergillum${suffix}.png`,
    `packs/resource/textures/entity/aspergillum${suffix}.png`,
    `packs/resource/textures/entity/aspergillum${suffix}_normal.png`,
    `packs/resource/textures/entity/aspergillum${suffix}_mer.png`,
    `packs/resource/textures/blocks/aspersorium${suffix}.png`,
    `packs/resource/textures/blocks/sacristan_table${suffix}.png`,
  );
}
for (const relative of required) if (!fs.existsSync(path.join(root, relative))) errors.push(`Missing generated asset: ${relative}`);

const brandingDirectory = path.join(root, "assets-src", "branding");
const brandingCoverPath = path.join(brandingDirectory, "aspergillum-cover-2048.png");
const brandingIconPath = path.join(brandingDirectory, "aspergillum-cover-256.png");
const brandingManifestPath = path.join(brandingDirectory, "cover-manifest.json");

function validateBrandingPng(file, width, height, label) {
  if (!fs.existsSync(file)) {
    errors.push(`Missing authoritative ${label}: ${path.relative(root, file)}`);
    return null;
  }
  try {
    const source = fs.readFileSync(file);
    const image = PNG.sync.read(source);
    if (image.width !== width || image.height !== height) {
      errors.push(`${label} must be ${width} × ${height}, got ${image.width} × ${image.height}`);
    }
    for (let alpha = 3; alpha < image.data.length; alpha += 4) {
      if (image.data[alpha] !== 255) {
        errors.push(`${label} must be fully opaque`);
        break;
      }
    }
    return source;
  } catch (error) {
    errors.push(`Unreadable ${label} ${path.relative(root, file)}: ${error.message}`);
    return null;
  }
}

const brandingCover = validateBrandingPng(brandingCoverPath, 2048, 2048, "branding cover");
const brandingIcon = validateBrandingPng(brandingIconPath, 256, 256, "branding pack icon");
if (brandingIcon) {
  for (const relative of ["packs/behavior/pack_icon.png", "packs/resource/pack_icon.png"]) {
    const generatedIconPath = path.join(root, relative);
    if (fs.existsSync(generatedIconPath) && !fs.readFileSync(generatedIconPath).equals(brandingIcon)) {
      errors.push(`${relative} must be byte-identical to the authoritative branding pack icon`);
    }
  }
}

if (!fs.existsSync(brandingManifestPath)) {
  errors.push(`Missing branding manifest: ${path.relative(root, brandingManifestPath)}`);
} else {
  try {
    const brandingManifest = JSON.parse(fs.readFileSync(brandingManifestPath, "utf8"));
    const brandingPublicationVersion = brandingManifest.publication?.currentRelease
      ?? brandingManifest.pack?.version;
    if (brandingPublicationVersion !== packageMetadata.version) {
      errors.push("Branding manifest publication version must match package.json");
    }
    if (brandingManifest.config?.title !== "ASPERGILLUM" || brandingManifest.config?.subject !== "docked") {
      errors.push("Branding manifest must preserve the approved ASPERGILLUM docked composition");
    }
    const capturesByPath = new Map(
      (brandingManifest.captures ?? []).map((capture) => [capture.path, capture]),
    );
    for (const [file, bytes] of [[brandingCoverPath, brandingCover], [brandingIconPath, brandingIcon]]) {
      if (!bytes) continue;
      const capture = capturesByPath.get(path.basename(file));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (!capture || capture.bytes !== bytes.byteLength || capture.sha256 !== sha256) {
        errors.push(`Branding manifest hash/size mismatch for ${path.basename(file)}`);
      }
    }
  } catch (error) {
    errors.push(`Invalid branding manifest: ${error.message}`);
  }
}

const entityTexturePath = path.join(packRoots[1], "textures", "entity", "aspergillum.png");
const particleTexturePath = path.join(packRoots[1], "textures", "particle", "holy_water.png");
const aspersoriumDestructionTexturePath = path.join(
  packRoots[1], "textures", "blocks", "aspersorium_destruction.png",
);
const tableDestructionTexturePath = path.join(
  packRoots[1], "textures", "blocks", "sacristan_table_destruction.png",
);
for (const file of walk(path.join(root, "packs", "resource", "textures")).filter((entry) => entry.endsWith(".png"))) {
  try {
    const image = PNG.sync.read(fs.readFileSync(file));
    textureCount += 1;
    decodedTextureBytes += image.width * image.height * 4;
    const powerOfTwo = (value) => value > 0 && (value & (value - 1)) === 0;
    if (!powerOfTwo(image.width) || !powerOfTwo(image.height)) errors.push(`Non-power-of-two texture: ${path.relative(root, file)}`);
    if (file === entityTexturePath) {
      for (let alpha = 3; alpha < image.data.length; alpha += 4) {
        if (image.data[alpha] !== 255) {
          errors.push("Held aspergillum texture must be fully opaque");
          break;
        }
      }
    }
    if (file === particleTexturePath) {
      let visiblePixels = 0;
      for (let offset = 0; offset < image.data.length; offset += 4) {
        if (image.data[offset + 3] === 0) continue;
        visiblePixels += 1;
        if (image.data[offset + 2] < image.data[offset + 1] || image.data[offset + 1] < image.data[offset]) {
          errors.push("Holy-water texture must remain blue/cyan and must not regress to green mist");
          break;
        }
      }
      if (visiblePixels < 40) errors.push("Holy-water droplet texture has insufficient visible coverage");
    }
    if (file === aspersoriumDestructionTexturePath) {
      const colors = new Set();
      for (let offset = 0; offset < image.data.length; offset += 4) {
        const [r, g, b, alpha] = image.data.subarray(offset, offset + 4);
        colors.add(`${r},${g},${b},${alpha}`);
        if (alpha !== 255 || Math.max(r, g, b) - Math.min(r, g, b) > 20) {
          errors.push("Aspersorium destruction texture must remain opaque neutral/patinated metal");
          break;
        }
      }
      if (image.width !== 16 || image.height !== 16 || colors.size !== 6) {
        errors.push("Aspersorium destruction texture must preserve its exact 16x16 six-tone pixel-art profile");
      }
    }
    if (file === tableDestructionTexturePath) {
      const colors = new Set();
      let velvetPixels = 0;
      let brassPixels = 0;
      let woodPixels = 0;
      for (let offset = 0; offset < image.data.length; offset += 4) {
        const [r, g, b, alpha] = image.data.subarray(offset, offset + 4);
        colors.add(`${r},${g},${b},${alpha}`);
        if (alpha !== 255) continue;
        if (g > r && g > b) velvetPixels += 1;
        else if (r >= 130 && g >= 90 && b <= 70) brassPixels += 1;
        else if (r > g && g > b) woodPixels += 1;
      }
      if (image.width !== 16 || image.height !== 16 || colors.size !== 8
        || velvetPixels !== 12 || brassPixels !== 4 || woodPixels !== 240) {
        errors.push("Sacristan table destruction texture must preserve its 240/12/4 wood-velvet-brass pixel budget");
      }
    }
  } catch (error) {
    errors.push(`Unreadable PNG ${path.relative(root, file)}: ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Validated ${jsonCount} JSON files, ${uuids.length} UUIDs, and ${textureCount} textures (${(decodedTextureBytes / 1024 / 1024).toFixed(2)} MiB decoded).`,
);
