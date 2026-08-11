import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(fs.readFileSync(
  path.join(root, "assets-src", "customization", "catalog.json"),
  "utf8",
));
const errors = [];
const blockId = "aspergillum:inventory_visual";
const geometryId = "geometry.aspergillum.inventory";

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const suffixFor = (cosmetic) => cosmetic.id === "classic" ? "" : `_${cosmetic.id}`;
const itemIdFor = (cosmetic) => cosmetic.id === "classic"
  ? "aspergillum:aspergillum"
  : `aspergillum:aspergillum_${cosmetic.id}`;
const blockIdFor = (cosmetic) => `${blockId}${suffixFor(cosmetic)}`;
const materialFor = (cosmetic) => ({
  "*": {
    texture: `aspergillum_inventory${suffixFor(cosmetic)}`,
    render_method: "opaque",
  },
});
const visualFor = (cosmetic) => ({
  geometry: { identifier: geometryId },
  material_instances: materialFor(cosmetic),
});

const bootstrapSource = fs.readFileSync(path.join(root, "src", "bootstrap", "main.ts"), "utf8");
if (!bootstrapSource.includes("registerCustomComponent(INVENTORY_VISUAL_COMPONENT")
  || !bootstrapSource.includes("blockEvent.cancel = true")) {
  errors.push("Inventory visual placement guard must be registered and cancel native placement");
}

for (const cosmetic of catalog.cosmetics) {
  const suffix = suffixFor(cosmetic);
  const expectedBlockId = blockIdFor(cosmetic);
  const blockDefinition = readJson(`packs/behavior/blocks/inventory_visual${suffix}.block.json`);
  const block = blockDefinition?.["minecraft:block"];
  if (blockDefinition?.format_version !== "1.26.30"
    || block?.description?.identifier !== expectedBlockId
    || block?.description?.states !== undefined
    || block?.permutations !== undefined) {
    errors.push(`${cosmetic.id} proxy must be a state-free base-component block accepted by Bedrock 26.40`);
  }
  if (block?.description?.menu_category?.category !== "none"
    || block?.description?.menu_category?.is_hidden_in_commands !== true) {
    errors.push(`${cosmetic.id} proxy must remain hidden from catalogs and commands`);
  }
  if (block?.components?.["minecraft:geometry"]?.identifier !== geometryId
    || JSON.stringify(block?.components?.["minecraft:material_instances"])
      !== JSON.stringify(materialFor(cosmetic))
    || JSON.stringify(block?.components?.["minecraft:item_visual"])
      !== JSON.stringify(visualFor(cosmetic))) {
    errors.push(`${cosmetic.id} proxy must declare its geometry and item_visual only in base components`);
  }
  if (block?.components?.["minecraft:collision_box"] !== false
    || block?.components?.["minecraft:selection_box"] !== false
    || JSON.stringify(block?.components?.["minecraft:placement_filter"])
      !== JSON.stringify({ conditions: [{ allowed_faces: ["up"], block_filter: ["minecraft:air"] }] })
    || JSON.stringify(block?.components?.["aspergillum:inventory_visual_guard"]) !== JSON.stringify({})) {
    errors.push(`${cosmetic.id} proxy does not preserve all placement guards`);
  }
  const item = readJson(`packs/behavior/items/aspergillum${suffix}.item.json`)?.["minecraft:item"];
  const placer = item?.components?.["minecraft:block_placer"];
  if (item?.description?.identifier !== itemIdFor(cosmetic)) {
    errors.push(`${cosmetic.id} item identifier changed`);
  }
  if (item?.components?.["minecraft:max_stack_size"] !== 1
    || JSON.stringify(item?.components?.["aspergillum:aspergillum_use"]) !== JSON.stringify({})) {
    errors.push(`${cosmetic.id} must retain non-stackable state and its registered custom component`);
  }
  if (item?.components?.["minecraft:icon"] !== undefined) {
    errors.push(`${cosmetic.id} still publishes a raster minecraft:icon`);
  }
  if (placer?.block !== expectedBlockId
    || JSON.stringify(placer?.use_on) !== JSON.stringify(["minecraft:air"])
    || placer?.replace_block_item === true) {
    errors.push(`${cosmetic.id} does not reference its inert 3D proxy as a runtime-compatible string`);
  }
  const textureAlias = `aspergillum_inventory${suffix}`;
  const terrain = readJson("packs/resource/textures/terrain_texture.json");
  if (JSON.stringify(terrain.texture_data?.[textureAlias]?.textures)
    !== JSON.stringify([`textures/entity/aspergillum${suffix}`])) {
    errors.push(`${cosmetic.id} inventory material does not reuse its real entity texture`);
  }
  const itemTexture = readJson("packs/resource/textures/item_texture.json");
  if (itemTexture.texture_data?.[`aspergillum${suffix}`] !== undefined) {
    errors.push(`${cosmetic.id} retains an obsolete raster item-atlas alias`);
  }
  if (fs.existsSync(path.join(root, `packs/resource/textures/items/aspergillum${suffix}.png`))) {
    errors.push(`${cosmetic.id} retains an obsolete distributed raster icon`);
  }
}

const held = readJson("packs/resource/models/entity/aspergillum.geo.json")?.["minecraft:geometry"]?.[0];
const inventoryDefinition = readJson("packs/resource/models/blocks/aspergillum.inventory.geo.json");
const inventory = inventoryDefinition?.["minecraft:geometry"]?.[0];
if (inventoryDefinition?.format_version !== "1.16.0"
  || inventory?.description?.identifier !== geometryId) {
  errors.push("Inventory geometry must remain a stable 1.16.0 derivative of the held model");
}
const rootBone = inventory?.bones?.find((bone) => bone.name === "root");
if (JSON.stringify(rootBone?.pivot) !== JSON.stringify([0, 8, 0])
  || JSON.stringify(rootBone?.rotation) !== JSON.stringify([0, 0, -35])) {
  errors.push("Inventory geometry framing transform changed without review");
}
if (JSON.stringify(inventory).includes("binding") || JSON.stringify(inventory).includes("item_slot_to_bone_name")) {
  errors.push("Inventory-only geometry must not copy the attachable slot binding");
}
const heldVisualCubes = (held?.bones ?? [])
  .filter((bone) => bone.name === "handle" || bone.name === "sprinkler_head")
  .flatMap((bone) => bone.cubes ?? []);
const inventoryCubes = (inventory?.bones ?? [])
  .filter((bone) => bone.name === "handle" || bone.name === "sprinkler_head")
  .flatMap((bone) => bone.cubes ?? []);
if (inventoryCubes.length !== heldVisualCubes.length || inventoryCubes.length !== 14) {
  errors.push("Inventory geometry must contain all fourteen authored visual cubes exactly once");
} else {
  for (let index = 0; index < heldVisualCubes.length; index += 1) {
    if (JSON.stringify(inventoryCubes[index].uv) !== JSON.stringify(heldVisualCubes[index].uv)) {
      errors.push(`Inventory cube ${index + 1} no longer shares the held model UV layout`);
    }
  }
}
const inventoryBounds = [0, 1, 2].map((axis) => [
  Math.min(...inventoryCubes.map((cube) => cube.origin[axis])),
  Math.max(...inventoryCubes.map((cube) => cube.origin[axis] + cube.size[axis])),
]);
if (inventoryBounds.some(([minimum, maximum], axis) => axis === 1
  ? minimum < 0.999 || maximum > 15.001
  : minimum < -2.25 || maximum > 2.25)) {
  errors.push("Inventory geometry must remain centered and normalized inside its 16-unit presentation volume");
}

if (errors.length) {
  console.error(`3D inventory visual validation failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("3D inventory visuals valid: 16 string-addressed, state-free proxies reuse the authored mesh, UVs, and PBR textures without raster icons.");
}
