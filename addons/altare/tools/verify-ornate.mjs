import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const old=readZip(path.join(root,'dist/releases/Altare-0.6.1.mcaddon')).entries.filter(e=>!e.name.endsWith('/'));
const current=readZip(path.join(root,`dist/releases/Altare-${version}.mcaddon`)).entries.filter(e=>!e.name.endsWith('/'));
const files=new Map(current.map(e=>[e.name,e.read()]));
const mutable=new Set(['Altare_BP/manifest.json','Altare_RP/manifest.json','Altare_BP/scripts/main.js','Altare_RP/blocks.json','Altare_RP/textures/terrain_texture.json',...['Altare_BP','Altare_RP'].flatMap(p=>['pt_BR','en_US'].map(l=>`${p}/texts/${l}.lang`))]);
let identical=0;
for(const e of old){assert.ok(files.has(e.name));if(!mutable.has(e.name)){assert.equal(hash(files.get(e.name)),hash(e.read()),`Previous asset changed: ${e.name}`);identical++;}}
const names=new Set(old.map(e=>e.name)),added=current.filter(e=>!names.has(e.name)).map(e=>e.name);
assert.ok(added.every(n=>/^Altare_BP\/blocks\/s_colonnade_(bare|lace)\.block\.json$/.test(n)||/^Altare_RP\/models\/blocks\/ornate_colonnade_/.test(n)||/^Altare_RP\/textures\/blocks\/ornate_(panel|gilt|lace)/.test(n)));
const report={version,baseline:'0.6.1',identicalPreviousFiles:identical,added,unchanged:'All previous block definitions, state defaults, collision components, models and textures.',inGame:'Pending'};
fs.writeFileSync(path.join(root,`dist/validation/${version}/ornate-compatibility.json`),JSON.stringify(report,null,2)+'\n');
console.log(`Ornate compatibility: ${identical} prior files byte-identical; ${added.length} added.`);
