import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';

const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const baseline=path.resolve(root,process.argv[2]??'dist/releases/Altare-0.2.1.mcaddon');
const entries=readZip(baseline).entries;
const mapped=name=>name.replace(/^Altare_BP\//,'packs/behavior/').replace(/^Altare_RP\//,'packs/resource/');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const checked=[];
for(const entry of entries.filter(e=>e.name==='Altare_BP/blocks/mensa.block.json'||/^Altare_RP\/(models\/blocks|textures\/blocks)\//.test(e.name))){
 if(entry.name.endsWith('/'))continue;
 assert.equal(hash(entry.read()),hash(fs.readFileSync(path.join(root,mapped(entry.name)))),`Legacy asset changed: ${entry.name}`);
 checked.push(entry.name);
}
for(const prefix of ['Altare_BP','Altare_RP']){
 const name=`${prefix}/manifest.json`,entry=entries.find(e=>e.name===name);
 assert.ok(entry,`Missing baseline manifest: ${name}`);
 const before=JSON.parse(entry.read()),after=JSON.parse(fs.readFileSync(path.join(root,mapped(name)),'utf8'));
 assert.equal(after.header.uuid,before.header.uuid);
 assert.deepEqual(after.header.min_engine_version,before.header.min_engine_version);
 assert.deepEqual(after.modules.map(m=>[m.uuid,m.type]),before.modules.map(m=>[m.uuid,m.type]));
 assert.deepEqual(after.capabilities,before.capabilities);
 assert.deepEqual((after.dependencies??[]).filter(d=>d.module_name),(before.dependencies??[]).filter(d=>d.module_name));
}
const atlasName='Altare_RP/textures/terrain_texture.json';
const previousAtlas=JSON.parse(entries.find(e=>e.name===atlasName).read()).texture_data;
const currentAtlas=JSON.parse(fs.readFileSync(path.join(root,mapped(atlasName)),'utf8')).texture_data;
for(const [key,value] of Object.entries(previousAtlas))assert.deepEqual(currentAtlas[key],value,`Legacy atlas changed: ${key}`);
assert.ok(checked.length>=89,'Incomplete legacy comparison');
const report={version,baseline:path.relative(root,baseline).replaceAll('\\','/'),baselineSha256:hash(fs.readFileSync(baseline)),unchangedFiles:checked.length,checked,packIdentity:'UUIDs, modules, engine, capabilities and stable script dependencies preserved',status:'Legacy block, geometries, texture sets and maps match byte-for-byte; gameplay bundle intentionally extended'};
fs.mkdirSync(path.join(root,'out'),{recursive:true});
fs.writeFileSync(path.join(root,`out/legacy-regression-${version}.json`),JSON.stringify(report,null,2)+'\n');
console.log(`Legacy regression: ${checked.length} files identical to 0.2.1; pack identity and atlas entries preserved.`);
