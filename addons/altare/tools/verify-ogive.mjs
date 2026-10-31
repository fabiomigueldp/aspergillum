import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {PNG} from 'pngjs';
import {readZip} from '../../../tools/lib/zip.mjs';
import {ogiveBudget} from '../assets-src/atelier/ogive-model.mjs';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const baseline=option('--baseline','0.10.1'),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const archive=path.resolve(root,option('--input',`dist/releases/Altare-${version}.mcaddon`));
const load=file=>new Map(readZip(file).entries.map(e=>[e.name,e.read()])),old=load(path.join(root,`dist/releases/Altare-${baseline}.mcaddon`)),current=load(archive);
assert.equal(JSON.parse(current.get('Altare_BP/manifest.json')).header.version.join('.'),version,'Audit archive version must match its declared target');
assert.equal(JSON.parse(current.get('Altare_RP/manifest.json')).header.version.join('.'),version);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),parse=b=>JSON.parse(b.toString()),equal=(a,b,label)=>assert.ok(isDeepStrictEqual(a,b),label);
const visual=new Set(['minecraft:geometry','minecraft:material_instances']);
const gameplay=b=>({description:b.description,components:Object.fromEntries(Object.entries(b.components).filter(([k])=>!visual.has(k))),permutations:b.permutations.map(p=>({...p,components:Object.fromEntries(Object.entries(p.components).filter(([k])=>!visual.has(k)))})).filter(p=>Object.keys(p.components).length)});
const ogive=name=>name.includes('_ogive_');let blocks=0,ogiveBlocks=0,otherModels=0,maps=0,maxCubes=0,maxQuads=0,editorFix=false;
const changed=[];
for(const [name,before] of old){
 const after=current.get(name);assert.ok(after,`Missing published resource ${name}`);if(hash(before)!==hash(after))changed.push(name);
 if(name.startsWith('Altare_BP/blocks/')){
  equal(gameplay(parse(after)['minecraft:block']),gameplay(parse(before)['minecraft:block']),`World contract ${name}`);blocks++;
  if(ogive(name))ogiveBlocks++;else equal(after,before,`Unrelated block ${name}`);
 }else if(name.startsWith('Altare_RP/models/blocks/')&&ogive(name)){
  equal(parse(after)['minecraft:geometry'][0].description,parse(before)['minecraft:geometry'][0].description,`Existing geometry identity ${name}`);
 }else if(name==='Altare_RP/textures/terrain_texture.json'){
  const a=parse(after),b=parse(before);for(const id of ['stone_0','stone_1','atelier_walnut'])delete a.texture_data[`altare_ogive_${id}`];equal(a,b,'Existing texture atlas aliases');
 }else if(name==='Altare_BP/scripts/main.js'&&version==='0.11.1'){
  const needle='const none = new ObservableNumber(0), cleanups = [];',replacement='const none = new ObservableNumber(0, { clientWritable: true }), cleanups = [];';
  assert.equal(before.toString().split(needle).length,2,'The isolated editor fix must have exactly one source binding');
  assert.equal(after.toString(),before.toString().replace(needle,replacement),'Only the documented fixed-input binding may change in runtime');editorFix=true;
 }else if(name.endsWith('/manifest.json')){
  const strip=d=>{d.header.version=[];for(const m of d.modules)m.version=[];for(const dep of d.dependencies??[])if(dep.uuid)dep.version=[];return d;};equal(strip(parse(after)),strip(parse(before)),`Pack identity ${name}`);
 }else if(name.endsWith('.lang'))assert.equal(after.toString(),before.toString().replaceAll(baseline,version),`Translations ${name}`);
 else{
  equal(after,before,`Protected resource ${name}`);if(name.endsWith('.geo.json'))otherModels++;if(/^Altare_RP\/textures\/blocks\/.*\.png$/.test(name))maps++;
 }
}
const added=[...current.keys()].filter(k=>!old.has(k)),addedModels=added.filter(n=>n.endsWith('.geo.json'));
assert.ok(added.every(n=>/^Altare_RP\/models\/blocks\/(?:atelier|universal)_ogive_.*_e(?:[0-9]|1[0-5])\.geo\.json$/.test(n)||/^Altare_RP\/textures\/blocks\/ogive_(?:stone_[01]|atelier_walnut)\.(?:png|texture_set\.json)$/.test(n)),'Only Ogive contours and three cutout colors/sets may be added');
assert.equal(addedModels.length,1440);assert.equal(added.length,1446);
for(const id of ['stone_0','stone_1','atelier_walnut']){
 const file=`Altare_RP/textures/blocks/ogive_${id}`,s=parse(current.get(file+'.texture_set.json'))['minecraft:texture_set'];
 assert.deepEqual(s,{color:`ogive_${id}`,normal:`${id}_normal`,metalness_emissive_roughness:`${id}_mer`});
 const a=PNG.sync.read(current.get(file+'.png')),b=PNG.sync.read(old.get(`Altare_RP/textures/blocks/${id}.png`));assert.equal(a.width,128);assert.equal(a.height,128);
 let clear=0;for(let i=0;i<a.data.length;i+=4){equal(a.data.subarray(i,i+3),b.data.subarray(i,i+3),'Donor RGB remains exact');assert.ok(a.data[i+3]===0||a.data[i+3]===255);if(!a.data[i+3])clear++;}assert.ok(clear>2000);
}
for(const [name,bytes] of current)if(name.endsWith('.geo.json')&&ogive(name)){
 const g=parse(bytes)['minecraft:geometry'][0],c=g.bones.flatMap(b=>b.cubes??[]),quads=c.reduce((n,c)=>n+Object.keys(c.uv).length,0);
 assert.equal(g.description.identifier,`geometry.altare.${path.basename(name,'.geo.json')}`);maxCubes=Math.max(maxCubes,c.length);maxQuads=Math.max(maxQuads,quads);assert.ok(c.length<=ogiveBudget.cubes&&quads<=ogiveBudget.quads,name);
}
assert.equal(blocks,397);assert.equal(ogiveBlocks,111);assert.equal(maps,171);
const baselineBytes=[...old.values()].reduce((s,b)=>s+b.length,0),uncompressedBytes=[...current.values()].reduce((s,b)=>s+b.length,0);
assert.ok(uncompressedBytes<=baselineBytes+12*1024*1024,'Bound compiled geometry overhead; keep the repeated family compact');
const captures=[];
if(!args.includes('--input'))for(const folder of [`out/ogive-${version}`,`out/ogive-matrix-${version}`]){
 const m=JSON.parse(fs.readFileSync(path.join(root,folder,'capture-manifest.json'),'utf8'));assert.equal(m.version,version);assert.equal(m.matrix,'ogive');let packedAssets=0;
 for(const [file,expected] of Object.entries({...m.sourceHashes,...m.textureHashes})){
  const bytes=file.startsWith('packs/')?current.get(file.replace('packs/behavior/','Altare_BP/').replace('packs/resource/','Altare_RP/')):fs.readFileSync(path.join(root,file));assert.ok(bytes,file);assert.equal(hash(bytes),expected,`Capture resource ${file}`);if(file.startsWith('packs/'))packedAssets++;
 }
 for(const c of m.captures)assert.equal(hash(fs.readFileSync(path.join(root,folder,c.file))),c.sha256);captures.push({folder,views:m.captures.length,packedAssets,backend:m.backend,limitation:m.limitation});
}
const report={version,baseline,archive:path.relative(root,archive),sha256:hash(fs.readFileSync(archive)),preserved:{publishedBlocksAndOrderedStates:blocks,ogiveGameplayContracts:ogiveBlocks,unchangedOtherGeometries:otherModels,unchangedTextureMaps:maps,runtime:editorFix?'Only fixed dropdown value gains clientWritable; exact one-line difference verified':true,uuids:true,collisions:true},mesh:{maxCubes,maxQuads,budget:ogiveBudget},payload:{files:current.size,uncompressedBytes,baselineBytes,addedBytes:uncompressedBytes-baselineBytes},changed,added,captures,native:'Pending: exact imported archive, cutout/solid geometry joins in motion, support, Content Log and profiling at 1/16/64 altars.'};
const output=path.join(root,args.includes('--input')?'out':`dist/validation/${version}`);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'ogive-compatibility.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Ogive compatibility: ${blocks} IDs/states, ${maps} maps and ${otherModels} unrelated geometries preserved; runtime ${editorFix?'differs only by the verified fixed-dropdown option':'unchanged'}. Mesh ${maxCubes} cubes / ${maxQuads} quads; ${added.length} new files; ${captures.reduce((s,c)=>s+c.views,0)} verified images.`);
