import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const baseline=path.resolve(root,process.argv[2]??'dist/releases/Altare-0.4.1.mcaddon');
const entries=readZip(baseline).entries;
let blocks=0;
for(const e of entries.filter(e=>/^Altare_BP\/blocks\/.+\.json$/.test(e.name))){
 const previous=JSON.parse(e.read())['minecraft:block'];
 const current=JSON.parse(fs.readFileSync(path.join(root,e.name.replace('Altare_BP/','packs/behavior/')),'utf8'))['minecraft:block'];
 assert.equal(current.description.identifier,previous.description.identifier);
 assert.deepEqual(current.description.states,previous.description.states,`Published state contract: ${previous.description.identifier}`);
 for(const c of [previous.components,...previous.permutations.map(p=>p.components)])if(c['minecraft:geometry']){
  const id=c['minecraft:geometry'].identifier.replace('geometry.altare.','');assert.ok(fs.existsSync(path.join(root,`packs/resource/models/blocks/${id}.geo.json`)));
 }
 blocks++;
}
assert.ok(blocks>=136,'The baseline must include the published classic and architectural families');
for(const prefix of ['Altare_BP','Altare_RP']){
 const previous=JSON.parse(entries.find(e=>e.name===prefix+'/manifest.json').read());
 const current=JSON.parse(fs.readFileSync(path.join(root,prefix==='Altare_BP'?'packs/behavior/manifest.json':'packs/resource/manifest.json'),'utf8'));
 assert.equal(current.header.uuid,previous.header.uuid);assert.deepEqual(current.modules.map(m=>[m.uuid,m.type]),previous.modules.map(m=>[m.uuid,m.type]));
 assert.deepEqual(current.header.min_engine_version,previous.header.min_engine_version);
}
const report={version,baseline:path.relative(root,baseline).replaceAll('\\','/'),baselineSha256:crypto.createHash('sha256').update(fs.readFileSync(baseline)).digest('hex'),preservedBlocks:blocks,status:'Published IDs, ordered state values/defaults and pack UUIDs preserved. Visual deltas are audited separately.'};
fs.writeFileSync(path.join(root,`out/world-compatibility-${version}.json`),JSON.stringify(report,null,2)+'\n');
console.log(`World compatibility: ${blocks} published blocks preserved from ${path.basename(baseline)}.`);
