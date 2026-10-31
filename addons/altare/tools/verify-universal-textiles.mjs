import {isDeepStrictEqual} from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..'),baseline='0.8.3';
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const input=process.argv.indexOf('--input'),currentPath=input<0?path.join(root,`dist/releases/Altare-${version}.mcaddon`):path.resolve(root,process.argv[input+1]);
const load=p=>new Map(readZip(p).entries.filter(e=>!e.name.endsWith('/')).map(e=>[e.name,e.read()]));
const old=load(path.join(root,`dist/releases/Altare-${baseline}.mcaddon`)),current=load(currentPath),changed=[];
const equal=(a,b,message)=>assert.ok(isDeepStrictEqual(a,b),message??'Semantic compatibility');
const parse=b=>JSON.parse(b.toString()),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let blocks=0,structuralModels=0,protectedTextures=0;
const garmentBone=name=>['top','linen_top','tabletop_base'].includes(name)||/^(linen_return_|linen_corner_|drape_|fold_corner_|cloth_)/.test(name)||/^corner_[0-3]$/.test(name);
const gameplay=block=>({description:block.description,components:Object.fromEntries(Object.entries(block.components).filter(([k])=>!['minecraft:geometry','minecraft:material_instances'].includes(k))),permutations:block.permutations.map(p=>({...p,components:Object.fromEntries(Object.entries(p.components).filter(([k])=>!['minecraft:geometry','minecraft:material_instances'].includes(k)))}))});
for(const [name,before] of old){
 const after=current.get(name);assert.ok(after,`Missing published resource: ${name}`);
 if(hash(before)!==hash(after))changed.push(name);
 if(/^Altare_BP\/blocks\//.test(name)){
  equal(gameplay(parse(after)['minecraft:block']),gameplay(parse(before)['minecraft:block']),`Published block contract: ${name}`);blocks++;
 }else if(/^Altare_RP\/models\/blocks\//.test(name)){
  const a=parse(after)['minecraft:geometry'][0],b=parse(before)['minecraft:geometry'][0];
  equal(a.description,b.description);equal(a.bones.filter(x=>!garmentBone(x.name)),b.bones.filter(x=>!garmentBone(x.name)),`Structural members: ${name}`);
  if(name.includes('ornate_colonnade_bare_'))equal(after,before,'Bare colonnade must remain byte-identical');
  structuralModels++;
 }else if(/^Altare_RP\/textures\/blocks\/.*\.png$/.test(name)&&!name.includes('/ornate_lace')){
  equal(after,before,`Protected art: ${name}`);protectedTextures++;
 }else if(/\/manifest.json$/.test(name)){
  const a=parse(after),b=parse(before),strip=d=>{d.header.version=[];for(const m of d.modules)m.version=[];for(const dep of d.dependencies??[])if(dep.uuid)dep.version=[];return d;};equal(strip(a),strip(b));
 }else if(name.endsWith('.lang')){
  const entries=b=>new Map(b.toString().trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
  const next=entries(after);for(const [k,v] of entries(before))assert.equal(next.get(k),v.replaceAll(baseline,version),`Existing translation ${k}`);
 }else if(name==='Altare_RP/blocks.json'){
  const a=parse(after),b=parse(before);for(const [k,v] of Object.entries(b))equal(a[k],v,`Published sound ${k}`);
 }else if(/^Altare_RP\/textures\/blocks\/ornate_lace(?:_normal|_mer)?\.png$/.test(name)){
  // This revision intentionally redraws only the lace; all other old maps are protected.
 }else if(name.endsWith('/terrain_texture.json')){
  const a=parse(after).texture_data,b=parse(before).texture_data;for(const [k,v] of Object.entries(b))equal(a[k],v);
 }else if(!name.endsWith('/scripts/main.js'))equal(after,before,`Unexpected resource change: ${name}`);
}
const added=[...current.keys()].filter(k=>!old.has(k));
let renderEvidence;
const captureFolder=path.join(root,`out/universal-textiles-${version}`),captureFile=path.join(captureFolder,'capture-manifest.json');
if(input<0){
 const manifest=JSON.parse(fs.readFileSync(captureFile,'utf8'));assert.equal(manifest.version,version);assert.equal(manifest.matrix,'universal');
 let packedAssets=0;
 for(const [file,expected] of Object.entries({...manifest.sourceHashes,...manifest.textureHashes})){
  if(!file.startsWith('packs/')){assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,`Capture adapter changed: ${file}`);continue;}
  const archiveName=file.replace('packs/resource/','Altare_RP/').replace('packs/behavior/','Altare_BP/');
  assert.ok(current.has(archiveName));assert.equal(hash(current.get(archiveName)),expected,`Rendered resource differs from release: ${archiveName}`);packedAssets++;
 }
 for(const capture of manifest.captures)assert.equal(hash(fs.readFileSync(path.join(captureFolder,capture.file))),capture.sha256,`Capture checksum: ${capture.file}`);
 renderEvidence={captures:manifest.captures.length,packedAssets,manifest:path.relative(root,captureFile),limitation:manifest.limitation};
}
const report={version,baseline,archive:path.relative(root,currentPath),sha256:hash(fs.readFileSync(currentPath)),renderEvidence,preserved:{publishedBlocksAndOrderedStates:blocks,structuralModels,unchangedExistingTextureMaps:protectedTextures,uuids:true,collisions:true,guadalupeArt:true},changed,added,native:'Pending: imported archive, support, Content Log and performance. New IDs require 0.9.0; downgrade only via a pre-update world backup.'};
const folder=input<0?path.join(root,'dist/validation',version):path.join(root,'out');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'universal-textile-compatibility.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Compatibility: ${blocks} published blocks, ${structuralModels} structural models, ${protectedTextures} existing maps protected; ${added.length} additive resources.`);
