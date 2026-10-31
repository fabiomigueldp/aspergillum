import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readZip} from '../../../tools/lib/zip.mjs';
import {ogiveBudget} from '../assets-src/atelier/ogive-model.mjs';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2),option=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const baseline=option('--baseline','0.11.1'),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const archive=path.resolve(root,option('--input',`dist/releases/Altare-${version}.mcaddon`));
const load=file=>new Map(readZip(file).entries.map(e=>[e.name,e.read()])),old=load(path.join(root,`dist/releases/Altare-${baseline}.mcaddon`)),current=load(archive);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),parse=b=>JSON.parse(b.toString()),equal=(a,b,label)=>assert.ok(isDeepStrictEqual(a,b),label);
for(const kind of ['BP','RP'])assert.equal(parse(current.get(`Altare_${kind}/manifest.json`)).header.version.join('.'),version);
assert.equal(current.size,old.size,'This polish must not add any distributed resource');
const changed=[];let blocks=0,maps=0,otherGeometries=0,ogiveGeometries=0,maxCubes=0,maxQuads=0;
for(const [name,before] of old){
 const after=current.get(name);assert.ok(after,`Missing resource ${name}`);if(hash(after)!==hash(before))changed.push(name);
 if(name.startsWith('Altare_RP/models/blocks/')&&name.includes('_ogive_')){
  const a=parse(after)['minecraft:geometry'][0],b=parse(before)['minecraft:geometry'][0];equal(a.description,b.description,`Geometry identity ${name}`);
  const protectedBones=g=>g.bones.filter(b=>!b.name.startsWith('ogive_intrados_')&&b.name!=='applique_1');
  equal(protectedBones(a),protectedBones(b),`Body, cloth and even reliefs must remain exact: ${name}`);
  const cubes=a.bones.flatMap(b=>b.cubes??[]),quads=cubes.reduce((n,c)=>n+Object.keys(c.uv).length,0);maxCubes=Math.max(maxCubes,cubes.length);maxQuads=Math.max(maxQuads,quads);
  assert.ok(cubes.length<=ogiveBudget.cubes&&quads<=ogiveBudget.quads,name);ogiveGeometries++;
 }else if(name.endsWith('/manifest.json')){
  const strip=d=>{d.header.version=[];for(const m of d.modules)m.version=[];for(const dep of d.dependencies??[])if(dep.uuid)dep.version=[];return d;};equal(strip(parse(after)),strip(parse(before)),`Pack identity ${name}`);
 }else if(name.endsWith('.lang'))assert.equal(after.toString(),before.toString().replaceAll(baseline,version),`Translations ${name}`);
 else{
  equal(after,before,`Protected byte identity ${name}`);
  if(name.startsWith('Altare_BP/blocks/'))blocks++;if(name.endsWith('.geo.json'))otherGeometries++;if(/^Altare_RP\/textures\/blocks\/.*\.png$/.test(name))maps++;
 }
}
assert.equal(blocks,397);assert.equal(maps,174);assert.equal(otherGeometries,2548);assert.equal(ogiveGeometries,1560);
assert.equal(maxCubes,110);assert.equal(maxQuads,257);
const baselineBytes=[...old.values()].reduce((n,b)=>n+b.length,0),uncompressedBytes=[...current.values()].reduce((n,b)=>n+b.length,0);
assert.ok(uncompressedBytes<=baselineBytes+128*1024,'Bound the serialized geometry increase to 128 KiB');
const captures=[];
if(!args.includes('--input'))for(const folder of [`out/ogive-${version}`,`out/ogive-matrix-${version}`]){
 const m=JSON.parse(fs.readFileSync(path.join(root,folder,'capture-manifest.json'),'utf8'));assert.equal(m.version,version);assert.equal(m.matrix,'ogive');
 for(const [file,expected] of Object.entries({...m.sourceHashes,...m.textureHashes})){
  const bytes=file.startsWith('packs/')?current.get(file.replace('packs/behavior/','Altare_BP/').replace('packs/resource/','Altare_RP/')):fs.readFileSync(path.join(root,file));assert.ok(bytes,file);assert.equal(hash(bytes),expected,`Capture parity ${file}`);
 }
 for(const c of m.captures)assert.equal(hash(fs.readFileSync(path.join(root,folder,c.file))),c.sha256);
 captures.push({folder,views:m.captures.length,backend:m.backend,limitation:m.limitation});
}
const report={version,baseline,archive:path.relative(root,archive),sha256:hash(fs.readFileSync(archive)),preserved:{byteIdenticalBlocks:blocks,textureMaps:maps,otherGeometries,ogiveBodyClothAndEvenReliefs:true,runtime:true,uuids:true,collisions:true,addedResources:0},mesh:{ogiveGeometries,maxCubes,maxQuads,budget:ogiveBudget},payload:{files:current.size,uncompressedBytes,baselineBytes,addedBytes:uncompressedBytes-baselineBytes},changed,captures,native:'Pending: exact archive, raked reveals and crown mitres in motion, support, Content Log and profiling.'};
const output=path.join(root,args.includes('--input')?'out':`dist/validation/${version}`);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'ogive-detail-compatibility.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Ogive detail: ${blocks} blocks, ${maps} maps, runtime, cloth and ${otherGeometries} unrelated geometries preserved. No added resources. Mesh ${maxCubes}/${maxQuads}; ${captures.reduce((n,c)=>n+c.views,0)} verified images.`);
