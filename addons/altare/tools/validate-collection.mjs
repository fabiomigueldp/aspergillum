import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DESIGNS,CATALOG_PERMUTATIONS} from '../src/domain/catalog.ts';
import {MENSA_STATES} from '../src/domain/pose-layout.ts';
import {decodeTile} from '../src/domain/block-codec.ts';
import {colonnadeBudget} from '../assets-src/atelier/colonnade-model.mjs';
import {pilasterBudget} from '../assets-src/atelier/pilaster-model.mjs';
import {ogiveBudget} from '../assets-src/atelier/ogive-model.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const geometries=new Map(fs.readdirSync(path.join(root,'packs/resource/models/blocks')).filter(f=>f.startsWith('atelier_')||f.startsWith('ornate_')||f.startsWith('universal_')).map(f=>{const doc=read('packs/resource/models/blocks/'+f);assert.equal(doc.format_version,'1.16.0');const g=doc['minecraft:geometry'][0];return [g.description.identifier,g];}));
let total=MENSA_STATES,maxCubes=0;
const atlas=read('packs/resource/textures/terrain_texture.json').texture_data;
function combinations(states){
 return Object.entries(states).reduce((rows,[key,values])=>rows.flatMap(row=>values.map(value=>({...row,[key]:value}))),[{}]);
}
for(const g of geometries.values()){
 const cubes=g.bones.flatMap(b=>b.cubes??[]);maxCubes=Math.max(maxCubes,cubes.length);
 const colonnade=/geometry\.altare\.(?:ornate|universal)_colonnade_/.test(g.description.identifier);
 const pilaster=/geometry\.altare\.(?:atelier|universal)_pilaster_/.test(g.description.identifier);
 const ogive=/geometry\.altare\.(?:atelier|universal)_ogive_/.test(g.description.identifier);
 const budget=colonnade?colonnadeBudget:pilaster?pilasterBudget:ogive?ogiveBudget:{cubes:50};
 assert.ok(cubes.length<=budget.cubes,g.description.identifier);
 if(budget.quads)assert.ok(cubes.reduce((n,c)=>n+Object.values(c.uv).filter(Boolean).length,0)<=budget.quads,g.description.identifier+' face budget');
 for(const c of cubes){
  assert.ok(c.origin.every(Number.isFinite)&&c.size.every(v=>v>0));
  for(const u of Object.values(c.uv))assert.ok(u.uv.every((v,i)=>Number.isInteger(v)&&v>=0&&v+u.uv_size[i]<=128));
  // Independent Euler application in author/world basis, including ogive Z rotations.
  for(const ix of [0,1])for(const iy of [0,1])for(const iz of [0,1]){
   let v=c.origin.map((n,i)=>n+c.size[i]*[ix,iy,iz][i]);v[0]*=-1;
   const pivot=c.pivot?[-c.pivot[0],c.pivot[1],c.pivot[2]]:[0,0,0];
   v=v.map((n,i)=>n-pivot[i]);
   const r=c.rotation?[-c.rotation[0],-c.rotation[1],c.rotation[2]]:[0,0,0];
   for(let axis=0;axis<3;axis++){const a=r[axis]*Math.PI/180,j=(axis+1)%3,k=(axis+2)%3,x=v[j],y=v[k];v[j]=x*Math.cos(a)-y*Math.sin(a);v[k]=x*Math.sin(a)+y*Math.cos(a);}
   v=v.map((n,i)=>n+pivot[i]);assert.ok(v[1]>=-1e-6&&v[1]<=16+1e-6,`${g.description.identifier}: y=${v[1]}`);assert.ok(Math.abs(v[0])<=8.5&&Math.abs(v[2])<=8.5);
  }
 }
 assert.ok(g.bones.find(b=>b.name==='top').cubes.every(c=>c.origin[1]+c.size[1]===16));
}
for(const design of DESIGNS){
 const block=read(`packs/behavior/blocks/${design.id.split(':')[1]}.block.json`)['minecraft:block'];
 assert.equal(block.description.identifier,design.id);
 total+=Object.values(block.description.states).reduce((n,v)=>n*v.length,1);
 assert.ok(Object.values(block.description.states).every(v=>v.length<=16));
 for(const states of combinations(block.description.states)){
  const decoded=decodeTile(design.id,{x:0,y:0,z:0},states);const {edges}=decoded,role=design.structure==='classic'?decoded.textileRole:decoded.frontal;
  const q={block_state:k=>states[k]},math={floor:Math.floor,mod:(a,b)=>a%b};
  const matching=block.permutations.filter(p=>Function('q',`return ${p.condition}`)(q));
  assert.equal(matching.filter(p=>p.components['minecraft:geometry']).length,1);
  const components=Object.assign({},block.components,...matching.map(p=>p.components));
  const component=components['minecraft:geometry'],geometry=geometries.get(component.identifier);assert.ok(geometry);
  assert.ok(Object.keys(component.bone_visibility).every(name=>geometry.bones.some(b=>b.name===name)));
  for(const m of Object.values(components['minecraft:material_instances'])){assert.equal(m.render_method,'alpha_test');assert.ok(atlas[m.texture]);}
  if(design.palette){
   assert.equal(components['minecraft:material_instances'].drape.texture,`altare_textile_ruby_${role}${design.palette==='red'?'':'_'+design.palette}`);
   assert.equal(components['minecraft:material_instances'].top.texture,'altare_linen');
   assert.ok(Object.values(component.bone_visibility).every(v=>typeof v==='boolean'));
  }
  if(design.structure==='trestle'){
   const collision=components['minecraft:collision_box'];assert.ok(Array.isArray(collision)&&collision.length<=16);
   for(const box of collision){
    assert.deepEqual(Object.keys(box).sort(),['origin','size'],'stable collision schema must reject min/max');
    assert.ok(box.origin.every((v,i)=>Number.isFinite(v)&&v>=[-8,0,-8][i]&&box.size[i]>0&&v+box.size[i]<=[8,16,8][i]+1e-6));
   }
   assert.ok(collision.some(b=>b.origin.join(',')==='-8,14.2,-8'&&b.size.join(',')==='16,1.8,16'));
   assert.ok(!collision.some(b=>[0,7,0].every((v,i)=>v>b.origin[i]&&v<b.origin[i]+b.size[i])));
   const visibleFrames=Object.entries(component.bone_visibility).filter(([name,expr])=>name.startsWith('frame_')&&Function('q','math',`return ${expr}`)(q,math)).length;
   const facing=decoded.facing;
   const expected=[(facing+3)%4,(facing+1)%4].filter(i=>edges&(1<<i)).length;assert.equal(visibleFrames,expected);
  }
 }
}
assert.equal(total,CATALOG_PERMUTATIONS);assert.ok(total<=65536);
const siblingFolder=path.resolve(root,'../../packs/behavior/blocks');let aspergillumStates=0;
for(const file of fs.readdirSync(siblingFolder).filter(f=>f.endsWith('.json'))){
 const b=JSON.parse(fs.readFileSync(path.join(siblingFolder,file),'utf8'))['minecraft:block'];
 if(b)aspergillumStates+=Object.values(b.description.states??{}).reduce((n,v)=>n*(Array.isArray(v)?v.length:v.values.max-v.values.min+1),1);
}
assert.ok(total+aspergillumStates<=65536,'Altare and Aspergillum state budget');
fs.writeFileSync(path.join(root,'out/permutation-budget.json'),JSON.stringify({altare:total,aspergillum:aspergillumStates,combined:total+aspergillumStates,reference:65536,exceedsReference:total+aspergillumStates>65536,remaining:65536-total-aspergillumStates,limits:{combined:65536},scope:'Only these two local packs; other add-ons must be counted separately'},null,2)+'\n');
console.log(`Collection validated: ${DESIGNS.length} designs, ${geometries.size} geometries, max ${maxCubes} cubes; ${total} total state combinations; multipart support and binary cutout contract.`);
