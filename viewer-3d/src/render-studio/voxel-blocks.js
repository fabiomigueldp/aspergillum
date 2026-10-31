/** Vanilla texture references and buildable block shapes, in block units. */
export const BLOCKS = {
  quartz: {side:'quartz_block_side',up:'quartz_block_top',down:'quartz_block_bottom'},
  smooth: {all:'quartz_block_bottom'},
  pillar: {side:'quartz_block_lines',up:'quartz_block_lines_top',down:'quartz_block_lines_top'},
  chiseled: {side:'quartz_block_chiseled',up:'quartz_block_chiseled_top',down:'quartz_block_chiseled_top'},
  quartzBricks: {all:'quartz_bricks'}, stone: {all:'stonebrick'},
  andesite: {all:'stone_andesite_smooth'},
  stoneSlab: {side:'stone_slab_side',up:'stone_slab_top',down:'stone_slab_top'},
  sandstone: {side:'sandstone_smooth',up:'sandstone_top',down:'sandstone_top'},
  oak: {all:'planks_oak'}, spruce: {all:'planks_spruce'}, darkOak: {all:'planks_big_oak'},
  log: {side:'log_big_oak',up:'log_big_oak_top',down:'log_big_oak_top'},
  red: {all:'wool_colored_red'}, green: {all:'wool_colored_green'},
  gold: {all:'gold_block'}, terracotta: {all:'hardened_clay'},
  redClay: {all:'hardened_clay_stained_red'}, light: {all:'glowstone'},
  leaf: {all:'azalea_leaves_opaque'}, flowers: {all:'azalea_leaves_flowers_opaque'},
  grass: {side:'grass_side_carried',up:'grass_top',down:'dirt'},
  blueGlass: {all:'glass_light_blue'}, amberGlass: {all:'glass_yellow'},
};

export const SURFACE_SETTINGS = {
  glass_light_blue: {transparent:true}, glass_yellow: {transparent:true},
  grass_top: {color:0x91bd59},
  glowstone: {emissive:0xffdf9a,emissiveIntensity:.16},
};
export const isOpaqueBlock = block => !['blueGlass','amberGlass'].includes(block);
export const blockKey = (x,y,z) => `${x},${y},${z}`;

// Non-overlapping boxes. Half steps and fence rails keep the native texel scale.
export const SHAPES = {
  cube: [[0,0,0,1,1,1]], slab: [[0,0,0,1,.5,1]], upperSlab: [[0,.5,0,1,1,1]],
  carpet: [[0,0,0,1,1/16,1]],
  stairNorth: [[0,0,0,1,.5,1],[0,.5,.5,1,1,1]],
  stairSouth: [[0,0,0,1,.5,1],[0,.5,0,1,1,.5]],
  stairEast: [[0,0,0,1,.5,1],[0,.5,0,.5,1,1]],
  stairWest: [[0,0,0,1,.5,1],[.5,.5,0,1,1,1]],
  archNorth: [[0,.5,0,1,1,1],[0,0,.5,1,.5,1]],
  archSouth: [[0,.5,0,1,1,1],[0,0,0,1,.5,.5]],
  archEast: [[0,.5,0,1,1,1],[0,0,0,.5,.5,1]],
  archWest: [[0,.5,0,1,1,1],[.5,0,0,1,.5,1]],
  paneZ: [[0,0,7/16,1,1,9/16]], paneX: [[7/16,0,0,9/16,1,1]],
  post: [[6/16,0,6/16,10/16,1,10/16]],
  fenceEW: [[6/16,0,6/16,10/16,1,10/16],
    [0,6/16,7/16,6/16,9/16,9/16],[10/16,6/16,7/16,1,9/16,9/16],
    [0,12/16,7/16,6/16,15/16,9/16],[10/16,12/16,7/16,1,15/16,9/16]],
  // Low trays assembled in four cells, with an open centre for the native bouquet.
  trayNW: [[0,0,0,1,2/16,1],[0,2/16,0,1/16,8/16,1],[1/16,2/16,0,1,8/16,1/16]],
  trayNE: [[0,0,0,1,2/16,1],[15/16,2/16,0,1,8/16,1],[0,2/16,0,15/16,8/16,1/16]],
  traySW: [[0,0,0,1,2/16,1],[0,2/16,0,1/16,8/16,1],[1/16,2/16,15/16,1,8/16,1]],
  traySE: [[0,0,0,1,2/16,1],[15/16,2/16,0,1,8/16,1],[0,2/16,15/16,15/16,8/16,1]],
  amboStem: [[0,0,0,1,2/16,1],[4/16,2/16,4/16,12/16,1,12/16]],
  amboHead: [[0,0,0,1,4/16,1],[0,4/16,9/16,1,8/16,1]],
  chair: [[1/16,0,1/16,3/16,6/16,3/16],[13/16,0,1/16,15/16,6/16,3/16],
    [1/16,0,13/16,3/16,6/16,15/16],[13/16,0,13/16,15/16,6/16,15/16],
    [1/16,6/16,1/16,15/16,8/16,15/16],
    [1/16,8/16,13/16,3/16,1,15/16],[13/16,8/16,13/16,15/16,1,15/16],
    [3/16,10/16,13/16,13/16,1,15/16]],
  chairCrown: [[1/16,0,13/16,15/16,8/16,15/16]],
  chairCushion: [[2/16,8/16,2/16,14/16,9/16,12/16]],
};

/** Subtract an occluding face rectangle without creating coincident surfaces. */
export function subtractRectangle(rect,cut) {
  const [x0,y0,x1,y1] = rect;
  const a=Math.max(x0,cut[0]),b=Math.max(y0,cut[1]),c=Math.min(x1,cut[2]),d=Math.min(y1,cut[3]);
  if(a>=c||b>=d)return [rect];
  return [[x0,y0,a,y1],[c,y0,x1,y1],[a,y0,c,b],[a,d,c,y1]].filter(r=>r[2]>r[0]&&r[3]>r[1]);
}
