import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const baseline=path.join(root,'dist/releases/Altare-0.5.0.mcaddon');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const old=readZip(baseline).entries.filter(e=>!e.name.endsWith('/'));
const current=readZip(path.join(root,`dist/releases/Altare-${version}.mcaddon`)).entries.filter(e=>!e.name.endsWith('/'));
const files=new Map(current.map(e=>[e.name,e.read()]));
const mutable=new Set(['Altare_BP/manifest.json','Altare_RP/manifest.json','Altare_BP/scripts/main.js','Altare_RP/blocks.json','Altare_RP/textures/terrain_texture.json',...['Altare_BP','Altare_RP'].flatMap(p=>['pt_BR','en_US'].map(l=>`${p}/texts/${l}.lang`))]);
let identical=0;
for(const entry of old){
 assert.ok(files.has(entry.name),`Missing previous file: ${entry.name}`);
 if(!mutable.has(entry.name)){assert.equal(hash(files.get(entry.name)),hash(entry.read()),`Previous asset changed: ${entry.name}`);identical++;}
}
const previous=new Set(old.map(e=>e.name)),added=current.filter(e=>!previous.has(e.name)).map(e=>e.name);
assert.ok(added.every(n=>/^Altare_BP\/blocks\/j_(coffer|baluster)_/.test(n)||/^Altare_RP\/models\/blocks\/atelier_(coffer|baluster)_/.test(n)||/^Altare_RP\/textures\/blocks\/joinery_walnut_horizontal/.test(n)), 'Unexpected new distributed asset');
const report={version,baseline:'0.5.0',identicalPreviousFiles:identical,addedFiles:added.length,added,previousAssetContract:'Every prior block definition, collision, geometry and texture is byte-identical.',inGame:'Pending'};
fs.writeFileSync(path.join(root,`dist/validation/${version}/joinery-compatibility.json`),JSON.stringify(report,null,2)+'\n');
console.log(`Joinery compatibility: ${identical} prior files byte-identical; ${added.length} new assets.`);
