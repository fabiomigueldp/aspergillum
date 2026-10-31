import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readZip} from '../../../tools/lib/zip.mjs';
import {pilasterBudget} from '../assets-src/atelier/pilaster-model.mjs';
const root=path.resolve(import.meta.dirname,'..'),baselineOption=process.argv.indexOf('--baseline');
const baseline=baselineOption<0?'0.9.0':process.argv[baselineOption+1];
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const input=process.argv.indexOf('--input'),archive=input<0?path.join(root,`dist/releases/Altare-${version}.mcaddon`):path.resolve(root,process.argv[input+1]);
const load=p=>new Map(readZip(p).entries.map(e=>[e.name,e.read()]));
const old=load(path.join(root,`dist/releases/Altare-${baseline}.mcaddon`)),current=load(archive);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),parse=b=>JSON.parse(b.toString());
const equal=(a,b,label)=>assert.ok(isDeepStrictEqual(a,b),label);
const visual=new Set(['minecraft:geometry','minecraft:material_instances']);
const gameplay=b=>({description:b.description,components:Object.fromEntries(Object.entries(b.components).filter(([k])=>!visual.has(k))),permutations:b.permutations.map(p=>({...p,components:Object.fromEntries(Object.entries(p.components).filter(([k])=>!visual.has(k)))})).filter(p=>Object.keys(p.components).length)});
const pilot=name=>name.includes('_pilaster_');
let blocks=0,pilasterBlocks=0,nonPilasterModels=0,maps=0,maxCubes=0,maxQuads=0;
const changed=[];
for(const [name,before] of old){
 const after=current.get(name);assert.ok(after,`Missing published resource ${name}`);
 if(hash(before)!==hash(after))changed.push(name);
 if(name.startsWith('Altare_BP/blocks/')){
  equal(gameplay(parse(after)['minecraft:block']),gameplay(parse(before)['minecraft:block']),`World contract ${name}`);blocks++;
  if(baseline==='0.10.0')equal(after,before,`Geometry-only revision must preserve every block byte: ${name}`);
  if(pilot(name))pilasterBlocks++;else equal(after,before,`Unrelated block ${name}`);
 }else if(name.startsWith('Altare_RP/models/blocks/')&&pilot(name)){
  equal(parse(after)['minecraft:geometry'][0].description,parse(before)['minecraft:geometry'][0].description,`Existing geometry identity ${name}`);
 }else if(name.endsWith('/manifest.json')){
  const strip=d=>{d.header.version=[];for(const m of d.modules)m.version=[];for(const dep of d.dependencies??[])if(dep.uuid)dep.version=[];return d;};equal(strip(parse(after)),strip(parse(before)),`Pack identity ${name}`);
 }else if(name.endsWith('.lang')){
  assert.equal(after.toString(),before.toString().replaceAll(baseline,version),`Translations ${name}`);
 }else{
  equal(after,before,`Protected resource ${name}`);
  if(name.endsWith('.geo.json'))nonPilasterModels++;
  if(/^Altare_RP\/textures\/blocks\/.*\.png$/.test(name))maps++;
 }
}
const added=[...current.keys()].filter(k=>!old.has(k));
if(baseline==='0.10.0')assert.equal(added.length,0,'This refinement must not add distributed resources');
assert.ok(added.every(n=>/^Altare_RP\/models\/blocks\/(?:atelier|universal)_pilaster_.*_e(?:[0-9]|1[0-5])\.geo\.json$/.test(n)),'Only baked Pilaster contours may be added');
for(const [name,bytes]of current)if(name.endsWith('.geo.json')&&pilot(name)){
 const g=parse(bytes)['minecraft:geometry'][0],c=g.bones.flatMap(b=>b.cubes??[]),quads=c.reduce((n,c)=>n+Object.keys(c.uv).length,0);
 maxCubes=Math.max(maxCubes,c.length);maxQuads=Math.max(maxQuads,quads);assert.ok(c.length<=pilasterBudget.cubes&&quads<=pilasterBudget.quads,name);
}
assert.equal(blocks,397);assert.equal(pilasterBlocks,111);assert.equal(maps,171);
const beforeBytes=[...old.values()].reduce((s,b)=>s+b.length,0),uncompressedBytes=[...current.values()].reduce((s,b)=>s+b.length,0);
assert.ok(uncompressedBytes<=beforeBytes+8*1024*1024,'Bound the added serialized geometry cost; whitespace must not inflate the baked family');
const captures=[];
if(input<0)for(const folder of [`out/pilaster-${version}`,`out/pilaster-matrix-${version}`]){
 const m=JSON.parse(fs.readFileSync(path.join(root,folder,'capture-manifest.json'),'utf8'));assert.equal(m.version,version);assert.equal(m.matrix,'pilaster');
 let packedAssets=0;
 for(const [file,expected]of Object.entries({...m.sourceHashes,...m.textureHashes})){
  const bytes=file.startsWith('packs/')?current.get(file.replace('packs/behavior/','Altare_BP/').replace('packs/resource/','Altare_RP/')):fs.readFileSync(path.join(root,file));
  assert.ok(bytes,file);assert.equal(hash(bytes),expected,`Capture resource ${file}`);if(file.startsWith('packs/'))packedAssets++;
 }
 for(const c of m.captures)assert.equal(hash(fs.readFileSync(path.join(root,folder,c.file))),c.sha256);
 captures.push({folder,views:m.captures.length,packedAssets,limitation:m.limitation});
}
const report={version,baseline,archive:path.relative(root,archive),sha256:hash(fs.readFileSync(archive)),preserved:{publishedBlocksAndOrderedStates:blocks,pilasterGameplayContracts:pilasterBlocks,unchangedOtherGeometries:nonPilasterModels,unchangedTextureMaps:maps,runtime:true,uuids:true,collisions:true},mesh:{maxCubes,maxQuads,budget:pilasterBudget},payload:{files:current.size,uncompressedBytes,baselineBytes:beforeBytes,addedBytes:uncompressedBytes-beforeBytes},changed,added,captures,native:'Pending: exact imported archive, support, Content Log, and performance at 1/16/64 altars.'};
const out=path.join(root,input<0?`dist/validation/${version}`:'out');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'pilaster-compatibility.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Pilaster compatibility: ${blocks} IDs/states, ${maps} maps, runtime and ${nonPilasterModels} unrelated geometries preserved. Mesh ${maxCubes} cubes / ${maxQuads} quads; ${captures.reduce((s,c)=>s+c.views,0)} verified images.`);
