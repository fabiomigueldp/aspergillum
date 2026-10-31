import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import { ATLAS, DENSITY, authorModel, textureDefinitions } from '../assets-src/design.mjs';

export const root = path.resolve(import.meta.dirname, '..');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = metadata.version.split('.').map(Number);
const write = (name, bytes) => { const p = path.join(root, name); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, bytes); };
const json = (name, data) => write(name, `${JSON.stringify(data, null, 2)}\n`);
const faces = ['north','south','east','west','up','down'];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const maps = Object.fromEntries(['color','normal','mer'].map(id=>[id,new PNG({width:ATLAS,height:ATLAS})]));
const heights = new Float32Array(ATLAS*ATLAS);
const tiles = new Map();
let u=2,v=2,row=0;
// Deterministic shelf packing. The two-pixel dilation belongs to each tile, not its UV.
for (const tile of textureDefinitions()) {
  if(u+tile.w+2>ATLAS){u=2;v+=row+4;row=0;}
  if(v+tile.h+2>ATLAS) throw new Error(`Atlas overflow at ${tile.id}`);
  const placed={...tile,u,v}; tiles.set(tile.id,placed);
  for(let y=-2;y<tile.h+2;y++) for(let x=-2;x<tile.w+2;x++){
    const s=tile.paint(clamp(x,0,tile.w-1),clamp(y,0,tile.h-1));
    const i=((v+y)*ATLAS+u+x)*4;
    maps.color.data.set([...s.rgb,255],i);
    maps.mer.data.set([s.metal,0,s.rough,255],i);
    heights[i/4]=s.height;
  }
  u+=tile.w+4;row=Math.max(row,tile.h);
}
for(const tile of tiles.values()){
  const h=(x,y)=>heights[clamp(y,tile.v,tile.v+tile.h-1)*ATLAS+clamp(x,tile.u,tile.u+tile.w-1)];
  for(let y=tile.v-2;y<tile.v+tile.h+2;y++)for(let x=tile.u-2;x<tile.u+tile.w+2;x++){
    const dx=(h(x-1,y)-h(x+1,y))*0.6,dy=(h(x,y-1)-h(x,y+1))*0.6;
    const n=Math.hypot(dx,dy,1);
    maps.normal.data.set([Math.round(127.5+127.5*dx/n),Math.round(127.5+127.5*dy/n),Math.round(127.5+127.5/n),255],(y*ATLAS+x)*4);
  }
}
const uvTile=(id)=>{
  if(id==='side')return uvCrop('front',4,128,144,64);
  if(id==='gusset')return uvCrop('front',12,104,128,24);
  const t=tiles.get(id);if(!t)throw new Error(id);return{uv:[t.u,t.v],uv_size:[t.w,t.h]};
};
const uvCrop=(id,x,y,w,h)=>{const t=tiles.get(id==='back'?'front':id);return{uv:[t.u+Math.round(x),t.v+Math.round(y)],uv_size:[Math.max(1,Math.round(w)),Math.max(1,Math.round(h))]};};
const authored=authorModel();
const boneNames=new Set();
const geometry={
  format_version:'1.16.0',
  'minecraft:geometry':[{
    description:{identifier:'geometry.aurifrita.mitra',texture_width:ATLAS,texture_height:ATLAS,visible_bounds_width:2,visible_bounds_height:3.5,visible_bounds_offset:[0,1.5,0]},
    bones:authored.bones.map(({cubes,...b})=>{
      if(boneNames.has(b.name))throw new Error(`Duplicate bone ${b.name}`);boneNames.add(b.name);
      if(!cubes)return b;
      return{...b,cubes:cubes.map(c=>{
        const result={origin:c.origin,size:c.size};
        if(c.pivot)result.pivot=c.pivot;if(c.rotation)result.rotation=c.rotation;
        result.uv=Object.fromEntries(faces.map(f=>[f,uvTile(c.surface)]));
        if(c.panel){
          result.uv[c.panel.face]=uvCrop(c.panel.surface,(c.origin[0]+4.75)*DENSITY,(42.5-c.origin[1]-c.size[1])*DENSITY,c.size[0]*DENSITY,c.size[1]*DENSITY);
          for(const f of ['up','down','east','west'])result.uv[f]=uvTile('gold');
          if(c.name.startsWith('crown_step'))delete result.uv.down;
        }
        if(c.innerFace)result.uv[c.innerFace]=uvTile('lining');
        if(c.surface.startsWith('fry')){
          result.uv.up=uvTile('tip');result.uv.down=uvTile('tip');
        }
        if(c.ribbonOffset!==undefined){
          for(const f of ['north','south'])result.uv[f]=uvCrop('lappet',0,c.ribbonOffset,32,c.size[1]*DENSITY);
          for(const f of ['east','west','up','down'])result.uv[f]=uvTile('gold');
        }
        return result;
      })};
    })
  }]
};
json('packs/resource/models/entity/mitra.geo.json',geometry);
json('out/mitra.authored.json',authored);
json('out/uv-layout.json',[...tiles.values()].map(({paint,...t})=>t));
write('packs/resource/textures/entity/mitra.png',PNG.sync.write(maps.color));
write('packs/resource/textures/entity/mitra_normal.png',PNG.sync.write(maps.normal));
write('packs/resource/textures/entity/mitra_mer.png',PNG.sync.write(maps.mer));
json('packs/resource/textures/entity/mitra.texture_set.json',{
  format_version:'1.16.100','minecraft:texture_set':{color:'mitra',normal:'mitra_normal',metalness_emissive_roughness:'mitra_mer'}
});

for(const type of ['behavior','resource']){
  const resource=type==='resource';
  json(`packs/${type}/manifest.json`,{
    format_version:2,
    header:{name:'pack.name',description:'pack.description',uuid:metadata.addonManager.publicIdentity[resource?'resourceUuid':'behaviorUuid'],version,min_engine_version:[1,26,40],pack_scope:'world'},
    modules:[{type:resource?'resources':'data',uuid:resource?'88295616-06bf-4d3f-9c25-d6e04f406ce8':'cf737802-8b7b-4de6-860b-a0c8312de97b',version}],
    ...(resource?{capabilities:['pbr']}:{dependencies:[{uuid:metadata.addonManager.publicIdentity.resourceUuid,version}]}),
    metadata:{authors:['Aurifrita Project'],product_type:'addon'}
  });
  json(`packs/${type}/texts/languages.json`,['en_US','pt_BR']);
  for(const lang of ['en_US','pt_BR']){
    const pt=lang==='pt_BR';
    const name=resource?(pt?'Recursos':'Resources'):(pt?'Comportamento':'Behavior');
    const description=pt?'Mitra dourada bordada com arcos e batatas tridimensionais.':'An embroidered gold mitre with raised arches and three-dimensional fries.';
    write(`packs/${type}/texts/${lang}.lang`,`pack.name=Aurifrita — ${name}\npack.description=${description}\n${resource?`item.aurifrita:mitra.name=${pt?'Mitra Aurifrita':'Aurifrita Mitre'}\n`:''}`);
  }
}
json('packs/behavior/items/mitra.item.json',{
  format_version:'1.26.30','minecraft:item':{
    description:{identifier:'aurifrita:mitra',menu_category:{category:'equipment'}},
    components:{'minecraft:display_name':{value:'item.aurifrita:mitra.name'},'minecraft:max_stack_size':1,'minecraft:icon':{textures:{default:'aurifrita_mitra'}},'minecraft:wearable':{slot:'slot.armor.head'}}
  }
});
json('packs/resource/textures/item_texture.json',{
  resource_pack_name:'aurifrita',texture_name:'atlas.items',texture_data:{aurifrita_mitra:{textures:['textures/items/aurifrita_mitra']}}
});
for(const player of [false,true]){
  const d={identifier:`aurifrita:mitra${player?'.player':''}`,
    ...(player?{item:{'aurifrita:mitra':"query.owner_identifier == 'minecraft:player'"}}:{}),
    materials:{default:'armor',enchanted:'armor_enchanted'},textures:{default:'textures/entity/mitra',enchanted:'textures/misc/enchanted_actor_glint'},
    geometry:{default:'geometry.aurifrita.mitra'},scripts:{parent_setup:'variable.helmet_layer_visible = 0.0;'},render_controllers:['controller.render.armor']};
  if(player){d.animations={offset:'animation.armor.helmet.offset'};d.scripts.animate=['offset'];}
  json(`packs/resource/attachables/mitra${player?'.player':''}.json`,{format_version:'1.10.0','minecraft:attachable':{description:d}});
}
write('packs/behavior/functions/aurifrita/dev_kit.mcfunction','give @s aurifrita:mitra 1\n');

// Bootstrap icon derived from the frontal construction. A native model render takes
// precedence when promoted into assets-src/branding by render-icons.mjs.
const icon=new PNG({width:64,height:64});
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const xx=(x-32)/2.6,yy=44.5-y/2.6;
  let color=null;
  if(yy>=30.5&&yy<42.5&&Math.abs(xx)<Math.min(4.75,(42.5-yy)*0.6+0.3))color=panelPixel(xx,yy);
  if(color)icon.data.set([...color,255],(y*64+x)*4);
}
function panelPixel(x,y){return tiles.get('front').paint(clamp(Math.floor((x+4.75)*16),0,151),clamp(Math.floor((42.5-y)*16),0,191)).rgb;}
const promoted=path.join(root,'assets-src/branding/item-64.png');
write('packs/resource/textures/items/aurifrita_mitra.png',fs.existsSync(promoted)?fs.readFileSync(promoted):PNG.sync.write(icon));
const cover=path.join(root,'assets-src/branding/pack-256.png');
if(fs.existsSync(cover)){
  for(const p of ['behavior','resource'])write(`packs/${p}/pack_icon.png`,fs.readFileSync(cover));
}
const files=['models/entity/mitra.geo.json','textures/entity/mitra.png','textures/entity/mitra_normal.png','textures/entity/mitra_mer.png'];
json('out/build-manifest.json',{
  version:metadata.version,geometry:'geometry.aurifrita.mitra',textureSize:[ATLAS,ATLAS],
  bones:authored.bones.length,cubes:authored.bones.reduce((n,b)=>n+(b.cubes?.length??0),0),fries:authored.fryCount,
  files:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'packs/resource',f))).digest('hex')]))
});
console.log(`Aurifrita ${metadata.version}: ${authored.bones.reduce((n,b)=>n+(b.cubes?.length??0),0)} cuboids, ${authored.fryCount} fries, ${ATLAS}px color/normal/MER.`);
