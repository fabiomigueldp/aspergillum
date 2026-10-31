import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..'),baseline='0.7.0';
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const previous=readZip(path.join(root,`dist/releases/Altare-${baseline}.mcaddon`)).entries.filter(e=>!e.name.endsWith('/'));
const current=readZip(path.join(root,`dist/releases/Altare-${version}.mcaddon`)).entries.filter(e=>!e.name.endsWith('/'));
const files=new Map(current.map(e=>[e.name,e.read()])),changed=[];
let identical=0;
for(const e of previous){
 const bytes=files.get(e.name);assert.ok(bytes,`Missing prior file ${e.name}`);
 if(hash(bytes)===hash(e.read())){identical++;continue;}
 const name=e.name;
 if(/^Altare_(BP|RP)\/texts\/(pt_BR|en_US)\.lang$/.test(name))assert.equal(bytes.toString(),e.read().toString().replaceAll(baseline,version));
 else if(/^Altare_BP\/blocks\/s_colonnade_(bare|lace)\.block\.json$/.test(name)){
  const now=JSON.parse(bytes),old=JSON.parse(e.read());
  const materials=now['minecraft:block'].components['minecraft:material_instances'];
  assert.equal(materials.column.texture,'altare_ornate_column');delete materials.column;assert.deepEqual(now,old,'Only the column material binding may change');
 }else if(name==='Altare_RP/textures/terrain_texture.json'){
  const now=JSON.parse(bytes),old=JSON.parse(e.read());
  assert.ok(now.texture_data.altare_ornate_column);delete now.texture_data.altare_ornate_column;assert.deepEqual(now,old);
 }else assert.ok(/^Altare_(BP|RP)\/manifest\.json$/.test(name)||/^Altare_RP\/models\/blocks\/ornate_colonnade_(bare|lace)_e\d+\.geo\.json$/.test(name)||/^Altare_RP\/textures\/blocks\/ornate_(panel|gilt|lace)(_(normal|mer))?\.png$/.test(name),`Unexpected change ${name}`);
 changed.push(name);
}
const names=new Set(previous.map(e=>e.name)),added=current.filter(e=>!names.has(e.name)).map(e=>e.name);
assert.equal(added.length,4);assert.ok(added.every(n=>/^Altare_RP\/textures\/blocks\/ornate_column(\.texture_set\.json|(_(normal|mer))?\.png)$/.test(n)));
const report={version,baseline,identicalPreviousFiles:identical,changed,added,preserved:'Runtime script, every ID and ordered state/default, every collision, previous non-colonnade geometry/texture and support height. Colonnade block components differ only by one material binding.',inGame:'Pending'};
fs.writeFileSync(path.join(root,`dist/validation/${version}/colonnade-polish.json`),JSON.stringify(report,null,2)+'\n');
console.log(`Colonnade polish: ${identical} prior files identical; ${changed.length} allowed changes; ${added.length} new material files.`);
