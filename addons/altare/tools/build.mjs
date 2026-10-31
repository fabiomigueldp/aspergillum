import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {PNG} from 'pngjs';
import {build} from 'esbuild';
import {authorGeometry,visibility,geometryName} from '../assets-src/model.mjs';
import {definitions} from '../assets-src/textures.mjs';
import {locales} from '../assets-src/locales.mjs';
import {FRONTAL_STATES} from '../src/domain/frontal-layout.ts';
import {DESIGNS,CATALOG_PERMUTATIONS} from '../src/domain/catalog.ts';
import {atelierDefinitions} from '../assets-src/atelier/materials.mjs';
import {ogiveDefinitions} from '../assets-src/atelier/ogive-art.mjs';
import {compileCollection} from './catalog-pack.mjs';
export const root=path.resolve(import.meta.dirname,'..');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const version=metadata.version.split('.').map(Number),uuids=metadata.addonManager.publicIdentity;
const write=(p,data)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);};
// Baked Pilaster/Ogive contours repeat structural data. Compact these families;
// keep the byte identity of every unrelated published resource.
const json=(p,data)=>write(p,JSON.stringify(data,null,/_pilaster_|_ogive_/.test(p)?0:2)+'\n');
// Output is wholly generated. Refuse to clean anything outside this add-on's packs directory.
const packRoot=path.resolve(root,'packs');
if(path.dirname(packRoot)!==root||path.basename(packRoot)!=='packs')throw Error('Unsafe output path');
fs.rmSync(packRoot,{recursive:true,force:true});
const textureData={},hashes={};let decodedTextureBytes=0;
const allDefinitions=[...definitions(),...atelierDefinitions(),...ogiveDefinitions()];
const collection=compileCollection();
for(const {id,paint,size,height=size,logicalHeight=128,sampleOffset=-.5,extendNormals=false,mapSource} of allDefinitions){
 const color=new PNG({width:size,height}),normal=new PNG({width:size,height}),mer=new PNG({width:size,height});
 const scale=size/128,scaleY=height/logicalHeight;
 const evaluate=(x,y)=>paint((x+.5)/scale+sampleOffset,(y+.5)/scaleY+sampleOffset);
 const samples=Array.from({length:size*height},(_,i)=>evaluate(i%size,Math.floor(i/size)));
 // A split centre continues through the neighbour, not the opposite edge of its own tile.
 const at=(x,y)=>extendNormals&&(x<0||x>=size||y<0||y>=height)?evaluate(x,y):samples[((y+height)%height)*size+(x+size)%size];
 for(let y=0;y<height;y++)for(let x=0;x<size;x++){
  const s=at(x,y),i=(y*size+x)*4;
  color.data.set([...s.rgb,s.alpha??255],i);mer.data.set([s.metal,0,s.rough,255],i);
  const dx=(at(x-1,y).height-at(x+1,y).height)*.3*scale;
  const dy=(at(x,y-1).height-at(x,y+1).height)*.3*scaleY;
  const n=Math.hypot(dx,dy,1);
  normal.data.set([Math.round(127.5+127.5*dx/n),Math.round(127.5+127.5*dy/n),Math.round(127.5+127.5/n),255],i);
 }
 for(const [suffix,img] of (mapSource?[['',color]]:[['',color],['_normal',normal],['_mer',mer]])){
  const p=`packs/resource/textures/blocks/${id}${suffix}.png`,bytes=PNG.sync.write(img);
  write(p,bytes);hashes[p]=crypto.createHash('sha256').update(bytes).digest('hex');decodedTextureBytes+=size*height*4;
 }
 json(`packs/resource/textures/blocks/${id}.texture_set.json`,{format_version:'1.16.100','minecraft:texture_set':{color:id,normal:`${mapSource??id}_normal`,metalness_emissive_roughness:`${mapSource??id}_mer`}});
 textureData[`altare_${id}`]={textures:[`textures/blocks/${id}`]};
}
for(const long of [false,true])for(let facing=0;facing<4;facing++)json(`packs/resource/models/blocks/${geometryName(long,facing)}.geo.json`,authorGeometry(long,facing));
for(const [name,{doc}] of Object.entries(collection.models))json(`packs/resource/models/blocks/${name}.geo.json`,doc);
for(const [id,block] of Object.entries(collection.blocks))json(`packs/behavior/blocks/${id.split(':')[1]}.block.json`,block);
const material=id=>({texture:`altare_${id}`,render_method:'opaque',ambient_occlusion:1,face_dimming:true});
export function materials(stone=0,cloth=1,frontal=0){
 return {'*':material(`stone_${stone}`),stone:material(`stone_${stone}`),linen:material('linen'),top:material('linen'),seam:material(cloth>=3?'seam_white_gold':'linen'),
  hem:material(`hem_${[2,4].includes(cloth)?'long':'short'}_${cloth>=3?'gold':'plain'}`),frontal:material(`frontal_${Math.max(1,frontal)}`),frame:material('frontal_frame')};
}
const geom=(long,facing=0)=>({identifier:`geometry.altare.${geometryName(long,facing)}`,bone_visibility:visibility(facing)});
const permutations=[];
// One complete material mapping per style combination avoids component overwrite ambiguity.
for(let stone=0;stone<3;stone++)for(let cloth=0;cloth<5;cloth++)for(const frontal of FRONTAL_STATES){
 permutations.push({condition:`q.block_state('altare:stone') == ${stone} && q.block_state('altare:cloth') == ${cloth} && q.block_state('altare:frontal') == ${frontal}`,
  components:{'minecraft:material_instances':materials(stone,cloth,frontal)}});
}
for(const long of [false,true])for(let facing=0;facing<4;facing++){
 const cloth=long?"q.block_state('altare:cloth') == 2 || q.block_state('altare:cloth') == 4":"q.block_state('altare:cloth') != 2 && q.block_state('altare:cloth') != 4";
 permutations.push({condition:`q.block_state('altare:facing') == ${facing} && (${cloth})`,components:{'minecraft:geometry':geom(long,facing)}});
}
json('packs/behavior/blocks/mensa.block.json',{format_version:'1.26.30','minecraft:block':{
 description:{identifier:'altare:mensa',menu_category:{category:'construction'},states:{'altare:edges':[15,...Array.from({length:15},(_,i)=>i)],'altare:stone':[0,1,2],'altare:cloth':[1,0,2,3,4],'altare:frontal':FRONTAL_STATES,'altare:facing':[0,1,2,3]}},
 components:{'minecraft:geometry':geom(false),'minecraft:material_instances':materials(),'minecraft:collision_box':true,'minecraft:selection_box':true,
  'minecraft:destructible_by_mining':{seconds_to_destroy:1.5},'minecraft:destructible_by_explosion':{explosion_resistance:6},
  'minecraft:movable':{movement_type:'immovable'},'minecraft:map_color':'#d1c9b5','minecraft:light_dampening':15,
  'minecraft:tick':{interval_range:[80,120],looping:true},'altare:surface':{}},permutations,
}});
json('packs/behavior/items/finish_tool.item.json',{format_version:'1.26.30','minecraft:item':{description:{identifier:'altare:finish_tool',menu_category:{category:'equipment'}},components:{'minecraft:display_name':{value:'item.altare:finish_tool.name'},'minecraft:icon':{textures:{default:'altare_finish_tool'}},'minecraft:max_stack_size':1}}});
write('packs/behavior/functions/altare/dev_kit.mcfunction','give @s altare:mensa 64\ngive @s altare:finish_tool 1\n');
json('packs/resource/blocks.json',{format_version:'1.1.0','altare:mensa':{sound:'stone'},...collection.sounds});
json('packs/resource/textures/terrain_texture.json',{resource_pack_name:'altare',texture_name:'atlas.terrain',padding:8,num_mip_levels:4,texture_data:textureData});
json('packs/resource/textures/item_texture.json',{resource_pack_name:'altare',texture_name:'atlas.items',texture_data:{altare_finish_tool:{textures:['textures/items/finish_tool']}}});
const icon=new PNG({width:32,height:32});
for(let y=3;y<29;y++)for(let x=3;x<29;x++){
 const needle=Math.abs(x-(y*.45+6))<1.3;
 const swatch=x>9&&x<26&&y>7&&y<23;
 if(swatch||needle)icon.data.set(needle?[183,141,63,255]:[237,233,222,255],(y*32+x)*4);
}
write('packs/resource/textures/items/finish_tool.png',PNG.sync.write(icon));
const packIcon=new PNG({width:256,height:256});
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 let rgb=[41,49,43];if(x>29&&x<227&&y>79&&y<180)rgb=[192,174,143];
 if(x>29&&x<227&&y>70&&y<89)rgb=[237,233,222];
 if(x>42&&x<214&&y>98&&y<166)rgb=[140,125,72];
 if(Math.abs(Math.hypot(x-128,y-132)-25)<3)rgb=[211,186,109];
 if(y>112&&y<152&&(Math.abs(x-128)<2||Math.abs(Math.abs(x-128)-Math.abs(y-132))<2))rgb=[132,36,35];
 packIcon.data.set([...rgb,255],(y*256+x)*4);
}
for(const kind of ['behavior','resource']){
 const header={name:'pack.name',description:'pack.description',uuid:kind==='behavior'?uuids.behaviorUuid:uuids.resourceUuid,version,min_engine_version:[1,26,40]};
 const modules=kind==='resource'?[{type:'resources',uuid:'b8279667-bd45-42b9-a390-56de25bedeb2',version}]
  :[{type:'data',uuid:'b4aa27e2-8c61-49c5-9718-161896cf030d',version},{type:'script',language:'javascript',entry:'scripts/main.js',uuid:'5f1640a9-cd72-4df5-99da-e066d4b63c2b',version}];
 const manifest={format_version:2,header,modules,metadata:{authors:['Altare'],product_type:'addon'}};
 if(kind==='resource')manifest.capabilities=['pbr'];
 if(kind==='behavior')manifest.dependencies=[{uuid:uuids.resourceUuid,version},{module_name:'@minecraft/server',version:'2.9.0'},{module_name:'@minecraft/server-ui',version:'2.1.0'}];
 json(`packs/${kind}/manifest.json`,manifest);write(`packs/${kind}/pack_icon.png`,PNG.sync.write(packIcon));
 json(`packs/${kind}/texts/languages.json`,Object.keys(locales));
 for(const [locale,entries] of Object.entries(locales)){
  const lines=Object.entries(entries).filter(([k])=>kind==='resource'||k.startsWith('pack.')).map(([k,v])=>`${k}=${v.replace('{version}',metadata.version)}`);
  if(kind==='resource')for(const d of DESIGNS)lines.push(`tile.${d.id}.name=${entries[`altare.structure.${d.structure}`]} · ${entries[`altare.surface.${d.surface}`]}${d.palette?' · '+entries[`altare.color.${d.palette}`]:''}`);
  write(`packs/${kind}/texts/${locale}.lang`,lines.join('\n')+'\n');
 }
}
await build({entryPoints:[path.join(root,'src/bootstrap/main.ts')],bundle:true,format:'esm',platform:'neutral',external:['@minecraft/server','@minecraft/server-ui'],target:'es2022',outfile:path.join(root,'packs/behavior/scripts/main.js')});
const artSource='assets-src/guadalupe/reference-plates-v1.png';
json('out/build-manifest.json',{version:metadata.version,diagnostic:true,artSources:[artSource,'assets-src/atelier/embroidery-plates-v2.png'].map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')})),textureHashes:hashes,materials:allDefinitions.map(({id,size,height=size,mapSource})=>({id,width:size,height,...(mapSource?{mapSource}:{})})),decodedTextureBytes,permutationBudget:CATALOG_PERMUTATIONS,designs:DESIGNS.length,geometryCubesMax:Math.max(48,...Object.values(collection.models).map(({doc})=>doc['minecraft:geometry'][0].bones.reduce((n,b)=>n+(b.cubes?.length??0),0))),maxSurfaceCells:128,topModelY:16});
console.log(`Altare ${metadata.version}: ${DESIGNS.length} compiled designs, ${Object.keys(collection.models).length+8} geometries, ${allDefinitions.length} material sets, stable API bundle.`);
