import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..'),baseline='0.8.2';
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
 else assert.ok(/^Altare_(BP|RP)\/manifest\.json$/.test(name)||/^Altare_RP\/models\/blocks\/ornate_colonnade_lace_e\d+\.geo\.json$/.test(name),`Unexpected change ${name}`);
 changed.push(name);
}
const names=new Set(previous.map(e=>e.name)),added=current.filter(e=>!names.has(e.name)).map(e=>e.name);
assert.deepEqual(added,[],'No new distributed assets');
const oldFiles=new Map(previous.map(e=>[e.name,e.read()]));
function geometryCost(source,lace,edges){
 const file=`Altare_RP/models/blocks/ornate_colonnade_${lace?'lace':'bare'}_e${edges}.geo.json`;
 const cubes=JSON.parse(source.get(file))['minecraft:geometry'][0].bones.flatMap(b=>b.cubes??[]);
 return {cubes:cubes.length,quads:cubes.reduce((n,c)=>n+Object.values(c.uv).filter(Boolean).length,0)};
}
function assemblyCost(source,lace,w,d){
 const total={cubes:0,quads:0};
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  const edges=(z===0?1:0)|(x===w-1?2:0)|(z===d-1?4:0)|(x===0?8:0),cost=geometryCost(source,lace,edges);
  for(const k of Object.keys(total))total[k]+=cost[k];
 }
 return {...total,modules:w*d,averageCubes:total.cubes/(w*d),averageQuads:total.quads/(w*d)};
}
const geometryCosts=[1,3,7,8,16].flatMap(w=>[false,true].map(lace=>({width:w,depth:w===1?1:2,lace,before:assemblyCost(oldFiles,lace,w,w===1?1:2),after:assemblyCost(files,lace,w,w===1?1:2)})));
const report={version,baseline,identicalPreviousFiles:identical,changed,added,geometryCosts,geometryMetric:'Authored cube records and emitted UV faces before renderer culling/batching; not a GPU time measurement.',preserved:'Runtime script, every ID and ordered state/default, every collision, previous non-colonnade geometry/texture and support height. Every block definition, texture, bare colonnade geometry and other model is byte-identical.',inGame:'Pending: native visual acceptance, support and performance profiling'};
fs.writeFileSync(path.join(root,`dist/validation/${version}/colonnade-cloth.json`),JSON.stringify(report,null,2)+'\n');
console.log(`Colonnade cloth: ${identical} prior files identical; ${changed.length} allowed changes; ${added.length} new material files.`);
