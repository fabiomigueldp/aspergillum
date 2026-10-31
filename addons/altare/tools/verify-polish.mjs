import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
// Historical gate: later structural releases intentionally change gameplay.
const version=process.argv[2]??'0.4.1';
const baseline=path.join(root,'dist/releases/Altare-0.4.0.mcaddon');
const artifact=path.join(root,`dist/releases/Altare-${version}.mcaddon`);
const read=file=>new Map(readZip(file).entries.filter(e=>!e.name.endsWith('/')).map(e=>[e.name,e.read()]));
const before=read(baseline),after=read(artifact);
assert.deepEqual([...after.keys()].sort(),[...before.keys()].sort(),'Presentation polish must not add or remove distributed files');
const changes={geometry:[],texture:[],manifest:[],locale:[]};let identical=0;
const normalizeVersion=(value,release)=>{
 if(Array.isArray(value))return value.map(v=>normalizeVersion(v,release));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,key==='version'&&JSON.stringify(v)===JSON.stringify(release)?'RELEASE':normalizeVersion(v,release)]));
 return value;
};
for(const [name,bytes] of after){
 const old=before.get(name);if(bytes.equals(old)){identical++;continue;}
 if(/^Altare_RP\/textures\/blocks\/textile_.+\.png$/.test(name)){changes.texture.push(name);continue;}
 if(/^Altare_RP\/models\/blocks\/atelier_.+\.geo\.json$/.test(name)){
  const a=JSON.parse(old)['minecraft:geometry'][0],b=JSON.parse(bytes)['minecraft:geometry'][0];
  assert.deepEqual(b.description,a.description);assert.deepEqual(b.bones.map(v=>[v.name,v.pivot,v.cubes?.length]),a.bones.map(v=>[v.name,v.pivot,v.cubes?.length]));
  changes.geometry.push(name);continue;
 }
 if(/^Altare_[BR]P\/manifest.json$/.test(name)){
  assert.deepEqual(normalizeVersion(JSON.parse(bytes),version.split('.').map(Number)),normalizeVersion(JSON.parse(old),[0,4,0]));
  changes.manifest.push(name);continue;
 }
 if(/^Altare_[BR]P\/texts\/.+\.lang$/.test(name)){
  assert.equal(bytes.toString(),old.toString().replaceAll('0.4.0',version));changes.locale.push(name);continue;
 }
 assert.fail(`Unexpected change outside cloth presentation: ${name}`);
}
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={version,baselineSha256:hash(baseline),artifactSha256:hash(artifact),identicalFiles:identical,changes,status:'Only cloth textures/architectural geometry and release version changed; behavior blocks, runtime, collisions and classic assets byte-identical.'};
fs.writeFileSync(path.join(root,`dist/validation/${version}/presentation-parity.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,changes:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,v.length]))},null,2));
