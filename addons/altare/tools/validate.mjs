import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {locales} from '../assets-src/locales.mjs';
import {definitions} from '../assets-src/textures.mjs';
import {atelierDefinitions} from '../assets-src/atelier/materials.mjs';
import {ogiveDefinitions} from '../assets-src/atelier/ogive-art.mjs';
import {authorGeometry,geometryName,visibility} from '../assets-src/model.mjs';
import {MENSA_LAYOUT} from '../src/domain/pose-layout.ts';
import {decodeTile,encodeTile} from '../src/domain/block-codec.ts';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const metadata=read('package.json'),bp=read('packs/behavior/manifest.json'),rp=read('packs/resource/manifest.json');
assert.deepEqual(bp.header.version,metadata.version.split('.').map(Number));assert.deepEqual(bp.header.version,rp.header.version);
assert.equal(bp.header.uuid,metadata.addonManager.publicIdentity.behaviorUuid);assert.equal(rp.header.uuid,metadata.addonManager.publicIdentity.resourceUuid);
assert.ok(rp.capabilities.includes('pbr'));
assert.ok(bp.dependencies.every(d=>!d.module_name||!d.version.includes('beta')));
assert.equal(bp.dependencies.find(d=>d.uuid===rp.header.uuid)?.version.join('.'),metadata.version);
assert.deepEqual(Object.keys(locales.pt_BR).sort(),Object.keys(locales.en_US).sort());
const block=read('packs/behavior/blocks/mensa.block.json')['minecraft:block'];
const states=block.description.states;
assert.ok(Object.values(states).every(v=>v.length<=16));
assert.deepEqual(states,{...MENSA_LAYOUT.states,'altare:stone':[0,1,2],'altare:cloth':[1,0,2,3,4]});
assert.deepEqual(MENSA_LAYOUT.states,{'altare:pose':Array.from({length:16},(_,i)=>i),'altare:part':Array.from({length:8},(_,i)=>i),'altare:layer':[0,1,2]});
assert.equal(MENSA_LAYOUT.size,384);assert.equal(MENSA_LAYOUT.poses.length,368);
const expectedPoses=[15,...Array.from({length:15},(_,i)=>i)].map(edges=>({edges,frontal:0,facing:0}));
for(let frontal=1;frontal<12;frontal++)for(let facing=0;facing<4;facing++)for(let local=1;local<16;local+=2){
 expectedPoses.push({edges:((local<<facing)|(local>>>(4-facing)))&15,frontal,facing});
}
assert.deepEqual(MENSA_LAYOUT.poses,expectedPoses);
const budget=Object.values(states).reduce((n,v)=>n*v.length,1);assert.equal(budget,5760);
assert.equal(block.components['minecraft:collision_box'],true);assert.equal(block.components['minecraft:selection_box'],true);
assert.equal(block.components['minecraft:movable'].movement_type,'immovable');
assert.ok(!block.description.traits);assert.ok(!block.components['minecraft:replaceable']);
const atlas=read('packs/resource/textures/terrain_texture.json').texture_data;
const geometryNames=new Set(),geometries=new Map();let cubes=0;
for(const variant of ['short','short_1','short_2','short_3','long','long_1','long_2','long_3']){
 const doc=read(`packs/resource/models/blocks/mensa_${variant}.geo.json`),g=doc['minecraft:geometry'][0];
 assert.equal(doc.format_version,'1.16.0');geometryNames.add(g.description.identifier);geometries.set(g.description.identifier,g);
 assert.deepEqual(doc,JSON.parse(JSON.stringify(authorGeometry(variant.startsWith('long'),Number(variant.split('_')[1]??0)))));
 const names=new Set(g.bones.map(b=>b.name));assert.equal(names.size,g.bones.length);
 const list=g.bones.flatMap(b=>b.cubes??[]);assert.ok(list.length<=50);cubes=list.length;
 for(const c of list){
  assert.ok(c.origin.every(Number.isFinite)&&c.size.every(v=>Number.isFinite(v)&&v>0));
  assert.ok(c.origin[1]>=0&&c.origin[1]+c.size[1]<=16+1e-8,'never occupy the cell above');
  assert.ok(c.origin[0]>=-8.5&&c.origin[2]>=-8.5&&c.origin[0]+c.size[0]<=8.5&&c.origin[2]+c.size[2]<=8.5);
  for(const uv of Object.values(c.uv)){
   assert.ok(uv.uv.every(Number.isInteger)&&uv.uv_size.every(v=>Number.isInteger(v)&&v>0));
   assert.ok(uv.uv.every((v,i)=>v>=0&&v+uv.uv_size[i]<=128));
   assert.ok(['stone','linen','hem','frontal','frame','top','seam'].includes(uv.material_instance));
  }
 }
 const top=g.bones.filter(b=>['bare_top','linen_top'].includes(b.name));
 assert.ok(top.every(b=>b.cubes[0].origin[1]+b.cubes[0].size[1]===16));
}
for(const components of [block.components,...block.permutations.map(p=>p.components)]){
 if(components['minecraft:geometry'])assert.ok(geometryNames.has(components['minecraft:geometry'].identifier));
 for(const m of Object.values(components['minecraft:material_instances']??{})){
  assert.equal(m.render_method,'opaque');assert.ok(atlas[m.texture]);
 }
}
// Execute the emitted Molang over every persistent state, including padded
// aliases. Compare it to the authoring model and the runtime codec independently.
const math={floor:Math.floor,mod:(a,b)=>a%b};
const query=values=>({block_state:key=>{assert.ok(Object.hasOwn(values,key),`Undeclared Mensa state: ${key}`);return values[key];}});
const rules=block.permutations.map(rule=>({...rule,matches:Function('q','math',`return ${rule.condition}`)}));
const geometryRules=rules.filter(rule=>rule.components['minecraft:geometry']);
const materialRules=rules.filter(rule=>rule.components['minecraft:material_instances']);
assert.equal(geometryRules.length,96);assert.equal(materialRules.length,180);assert.equal(rules.length,276);
assert.ok(rules.every(rule=>Object.keys(rule.components).length===1),'Do not duplicate full components for each persistent state');
const sourceVisibility=Array.from({length:4},(_,facing)=>Object.fromEntries(Object.entries(visibility(facing)).map(([bone,expr])=>[bone,Function('q','math',`return ${expr}`)])));
const bakedVisibility=new Map(geometryRules.map(rule=>[rule,Object.fromEntries(Object.entries(rule.components['minecraft:geometry'].bone_visibility).map(([bone,expr])=>[bone,typeof expr==='boolean'?()=>expr:Function('q','math',`return ${expr}`)]))]));
const usedRules=new Set(),position={x:0,y:0,z:0};
const defaultStates=Object.fromEntries(Object.entries(states).map(([key,values])=>[key,values[0]]));
for(let index=0;index<MENSA_LAYOUT.size;index++){
 const state=MENSA_LAYOUT.stateAt(index),pose=MENSA_LAYOUT.decode(state),expected=expectedPoses[index<368?index:0];
 assert.deepEqual(state,{'altare:pose':index%16,'altare:part':Math.floor(index/16)%8,'altare:layer':Math.floor(index/128)});
 assert.deepEqual(pose,expected);
 assert.deepEqual(MENSA_LAYOUT.encode(pose),MENSA_LAYOUT.stateAt(index<368?index:0));
 for(let stone=0;stone<3;stone++)for(let cloth=0;cloth<5;cloth++){
  const persistent={...state,'altare:stone':stone,'altare:cloth':cloth},q=query(persistent);
  const decoded=decodeTile('altare:mensa',position,persistent);assert.ok(decoded);
  assert.deepEqual({edges:decoded.edges,frontal:decoded.frontal,facing:decoded.facing},pose);
  assert.equal(decoded.stone,stone);assert.equal(decoded.cloth,cloth);
  const encoded=encodeTile(decoded);
  assert.deepEqual(encoded,{id:'altare:mensa',states:{...MENSA_LAYOUT.encode(pose),'altare:stone':stone,'altare:cloth':cloth}});
  assert.deepEqual(decodeTile(encoded.id,position,encoded.states),decoded);
  const matchedGeometry=geometryRules.filter(rule=>rule.matches(q,math)),matchedMaterials=materialRules.filter(rule=>rule.matches(q,math));
  assert.equal(matchedGeometry.length,1);assert.equal(matchedMaterials.length,1);
  const geometryRule=matchedGeometry[0],materialRule=matchedMaterials[0];usedRules.add(geometryRule);usedRules.add(materialRule);
  const component=geometryRule.components['minecraft:geometry'],materials=materialRule.components['minecraft:material_instances'];
  const long=[2,4].includes(cloth),geometry=geometries.get(component.identifier);assert.ok(geometry);
  assert.equal(component.identifier,`geometry.altare.${geometryName(long,pose.facing)}`);
  assert.deepEqual(geometry.bones.filter(b=>/^frontal_\d$/.test(b.name)).map(b=>b.name),[`frontal_${pose.facing}`]);
  assert.ok(Object.keys(component.bone_visibility).every(name=>geometry.bones.some(b=>b.name===name)));
  assert.deepEqual(Object.keys(component.bone_visibility).sort(),Object.keys(sourceVisibility[pose.facing]).sort());
  const authorQuery=query({'altare:edges':pose.edges,'altare:frontal':pose.frontal,'altare:facing':pose.facing,'altare:cloth':cloth});
  for(const [bone,evaluate] of Object.entries(bakedVisibility.get(geometryRule))){
   assert.equal(Boolean(evaluate(q,math)),Boolean(sourceVisibility[pose.facing][bone](authorQuery,math)),`${index}/${cloth}: ${bone}`);
  }
  const textures={'*':`stone_${stone}`,stone:`stone_${stone}`,linen:'linen',top:'linen',seam:cloth>=3?'seam_white_gold':'linen',hem:`hem_${long?'long':'short'}_${cloth>=3?'gold':'plain'}`,frontal:`frontal_${Math.max(1,pose.frontal)}`,frame:'frontal_frame'};
  assert.deepEqual(materials,Object.fromEntries(Object.entries(textures).map(([slot,texture])=>[slot,{texture:`altare_${texture}`,render_method:'opaque',ambient_occlusion:1,face_dimming:true}])));
  if(index===0&&stone===0&&cloth===1){
   assert.deepEqual(persistent,defaultStates);
   assert.deepEqual(component,block.components['minecraft:geometry']);
   assert.deepEqual(materials,block.components['minecraft:material_instances']);
  }
 }
}
assert.equal(usedRules.size,rules.length,'Every compiled rule must be reachable');
let decodedBytes=0;const checkedMaps=new Set();
for(const [alias,{textures}] of Object.entries(atlas)){
 assert.ok(Array.isArray(textures)&&textures.length===1);
 const definition=[...definitions(),...atelierDefinitions(),...ogiveDefinitions()].find(d=>`altare_${d.id}`===alias);assert.ok(definition);
 const set=read('packs/resource/'+textures[0]+'.texture_set.json')['minecraft:texture_set'];
 assert.equal(set.color,definition.id);assert.equal(set.normal,`${definition.mapSource??definition.id}_normal`);assert.equal(set.metalness_emissive_roughness,`${definition.mapSource??definition.id}_mer`);
 for(const [suffix,file] of [['',set.color],['_normal',set.normal],['_mer',set.metalness_emissive_roughness]]){
  const png=PNG.sync.read(fs.readFileSync(path.join(root,'packs/resource/textures/blocks',file+'.png')));
  assert.equal(png.width,definition.size);assert.equal(png.height,definition.height??definition.size);
  assert.ok(png.width*png.height*4<=262144,'individual atlas layer budget');
  if(!checkedMaps.has(file)){decodedBytes+=png.width*png.height*4;checkedMaps.add(file);}
  for(let i=3;i<png.data.length;i+=4)if(definition.alpha&&suffix==='')assert.ok(png.data[i]===0||png.data[i]===255);else assert.equal(png.data[i],255);
 }
}
assert.ok(decodedBytes<=33.25*1024*1024,'unique decoded texture budget, excluding icons/mips');
assert.equal(read('out/build-manifest.json').decodedTextureBytes,decodedBytes);
const script=fs.readFileSync(path.join(root,'packs/behavior/scripts/main.js'),'utf8');
assert.ok(!/onNeighborChanged|spawnEntity|spawnItem|setDynamicProperty|runInterval/.test(script));
assert.ok(!/aspergillum:/.test(script));
console.log(`Validated: ${cubes} cubes per geometry, ${budget} block permutations, y=16 support, opaque materials, stable API, locale parity.`);
await import('./validate-collection.mjs');
