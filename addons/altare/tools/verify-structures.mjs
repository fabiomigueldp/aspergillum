import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const baseline=path.join(root,'dist/releases/Altare-0.4.1.mcaddon');
const artifact=path.join(root,`dist/releases/Altare-${version}.mcaddon`);
const read=file=>new Map(readZip(file).entries.filter(e=>!e.name.endsWith('/')).map(e=>[e.name,e.read()]));
const before=read(baseline),after=read(artifact);
assert.deepEqual([...after.keys()].sort(),[...before.keys()].sort(),'Structural revision must preserve the distributed file inventory');
const changes={geometry:[],collision:[],runtime:[],manifest:[],locale:[]};let identical=0,identicalPngs=0;
const normalizeVersion=(value,release)=>{
 if(Array.isArray(value))return value.map(v=>normalizeVersion(v,release));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,key==='version'&&JSON.stringify(v)===JSON.stringify(release)?'RELEASE':normalizeVersion(v,release)]));
 return value;
};
const withoutCollisionAndVisibility=bytes=>{
 const doc=JSON.parse(bytes),block=doc['minecraft:block'];
 for(const components of [block.components,...block.permutations.map(p=>p.components)]){
  delete components['minecraft:collision_box'];
  if(components['minecraft:geometry'])delete components['minecraft:geometry'].bone_visibility;
 }
 return doc;
};
const stablePresentation=geometry=>geometry.bones.filter(b=>/^(top|tabletop_base|drape_|fold_corner_|applique_)/.test(b.name));
for(const [name,bytes] of after){
 const old=before.get(name);
 if(bytes.equals(old)){identical++;if(name.endsWith('.png'))identicalPngs++;continue;}
 if(/^Altare_RP\/models\/blocks\/atelier_.+\.geo\.json$/.test(name)){
  const a=JSON.parse(old)['minecraft:geometry'][0],b=JSON.parse(bytes)['minecraft:geometry'][0];
  assert.deepEqual(b.description,a.description);
  assert.deepEqual(stablePresentation(b),stablePresentation(a),`Cloth, top and applique must remain unchanged: ${name}`);
  changes.geometry.push(name);continue;
 }
 if(/^Altare_BP\/blocks\/[al]_trestle_.+\.block\.json$/.test(name)){
  assert.deepEqual(withoutCollisionAndVisibility(bytes),withoutCollisionAndVisibility(old),`Only trestle collisions and structural visibility may change: ${name}`);
  changes.collision.push(name);continue;
 }
 if(name==='Altare_BP/scripts/main.js'){changes.runtime.push(name);continue;}
 if(/^Altare_[BR]P\/manifest.json$/.test(name)){
  assert.deepEqual(normalizeVersion(JSON.parse(bytes),version.split('.').map(Number)),normalizeVersion(JSON.parse(old),[0,4,1]));
  changes.manifest.push(name);continue;
 }
 if(/^Altare_[BR]P\/texts\/.+\.lang$/.test(name)){
  assert.equal(bytes.toString(),old.toString().replaceAll('0.4.1',version));changes.locale.push(name);continue;
 }
 assert.fail(`Unexpected change outside structural revision: ${name}`);
}
assert.equal(identicalPngs,145,'All 142 material maps, two pack icons and the tool icon must be identical');
assert.equal(changes.collision.length,66);assert.equal(changes.geometry.length,180);assert.equal(changes.runtime.length,1);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={version,baselineSha256:hash(baseline),artifactSha256:hash(artifact),identicalFiles:identical,identicalPngs,changes,status:'Structural geometry, trestle collision/visibility, runtime diagnostics/preflight and release version changed. All textures, cloth/top/applique bones, classic assets, IDs/states and other behavior components preserved.'};
fs.writeFileSync(path.join(root,`dist/validation/${version}/structure-parity.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,changes:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,v.length]))},null,2));
