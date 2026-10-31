import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import * as THREE from '../../../viewer-3d/node_modules/three/build/three.module.js';
import { buildBedrockGeometry } from '../../../viewer-3d/src/shared/bedrock-geometry.js';

const root=path.resolve(import.meta.dirname,'..');
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const walk=(p)=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const meta=read('package.json');
const bp=read('packs/behavior/manifest.json'),rp=read('packs/resource/manifest.json');
const item=read('packs/behavior/items/mitra.item.json')['minecraft:item'];
const geometryFile=read('packs/resource/models/entity/mitra.geo.json');
const geo=geometryFile['minecraft:geometry'][0];
const errors=[];
const gate=(name,fn)=>{try{fn();console.log(`PASS ${name}`);}catch(e){errors.push(`${name}: ${e.message}`);}};
gate('independent identities, stable formats and version',()=>{
  const uuids=[bp.header.uuid,rp.header.uuid,bp.modules[0].uuid,rp.modules[0].uuid];
  assert.equal(new Set(uuids).size,4);
  for(const m of [bp,rp]){
    assert.deepEqual(m.header.version,meta.version.split('.').map(Number));
    assert.deepEqual(m.header.min_engine_version,[1,26,40]);
    assert.equal(m.format_version,2);
    assert(!JSON.stringify(m).includes('beta'));
  }
  assert.equal(bp.dependencies.length,1);assert.equal(bp.dependencies[0].uuid,rp.header.uuid);
  assert.equal(bp.modules[0].type,'data');assert.equal(geometryFile.format_version,'1.16.0');
  assert.equal(item.description.identifier,'aurifrita:mitra');
  assert.equal(item.components['minecraft:wearable'].slot,'slot.armor.head');
  assert.ok(!('dispensable' in item.components['minecraft:wearable']),'Bedrock 26.52 rejects dispensable in this wearable format');
  assert.equal(item.components['minecraft:max_stack_size'],1);
  assert(!walk(path.join(root,'packs')).some(f=>f.endsWith('.js')));
});
gate('complete, acyclic head hierarchy',()=>{
  const boneMap=new Map(geo.bones.map(b=>[b.name,b]));assert.equal(boneMap.size,geo.bones.length);
  assert.deepEqual(boneMap.get('head').pivot,[0,24,0]);assert(!boneMap.get('head').cubes);
  for(const b of geo.bones){
    const seen=new Set();let parent=b;
    while(parent){assert(!seen.has(parent.name),`cycle ${b.name}`);seen.add(parent.name);parent=parent.parent?boneMap.get(parent.parent):null;}
    if(b.name!=='head')assert(seen.has('head'),`${b.name} detached from head`);
  }
  for(const name of ['mitre_front','mitre_back','fries','lappet_left','lappet_right'])assert(boneMap.has(name));
});
gate('both attachable routes resolve and retain vanilla helmet adaptation',()=>{
  for(const suffix of ['','.player']){
    const d=read(`packs/resource/attachables/mitra${suffix}.json`)['minecraft:attachable'].description;
    assert.equal(d.geometry.default,geo.description.identifier);
    assert(fs.existsSync(path.join(root,'packs/resource',d.textures.default+'.png')));
    assert.deepEqual(d.render_controllers,['controller.render.armor']);
    if(suffix){assert(d.item['aurifrita:mitra']);assert.equal(d.animations.offset,'animation.armor.helmet.offset');}
  }
});
const color=PNG.sync.read(fs.readFileSync(path.join(root,'packs/resource/textures/entity/mitra.png')));
let cubes=0,faces=0,triangles=0;
gate('positive geometry, integer UVs, padded atlas and fully opaque sampled faces',()=>{
  assert.equal(color.width,256);assert.equal(color.height,256);
  for(const b of geo.bones)for(const c of b.cubes??[]){
    cubes++;assert(c.origin.every(Number.isFinite));assert(c.size.every(v=>Number.isFinite(v)&&v>0));
    assert(!Array.isArray(c.uv));
    for(const f of Object.values(c.uv)){
      faces++;triangles+=2;
      const [u,v]=f.uv,[w,h]=f.uv_size;
      assert([u,v,w,h].every(Number.isInteger));assert(w>0&&h>0);
      assert(u>=2&&v>=2&&u+w<=254&&v+h<=254,`UV outside padded atlas: ${[u,v,w,h]}`);
      for(let y=v;y<v+h;y++)for(let x=u;x<u+w;x++)assert.equal(color.data[(y*256+x)*4+3],255,`Transparent texel ${x},${y}`);
    }
  }
  assert(cubes<=180,`Budget exceeded: ${cubes}`);
  assert(triangles<=2160,`Triangle budget exceeded: ${triangles}`);
});
gate('material channel parity, no emissive pixels',()=>{
  const mer=PNG.sync.read(fs.readFileSync(path.join(root,'packs/resource/textures/entity/mitra_mer.png')));
  const normal=PNG.sync.read(fs.readFileSync(path.join(root,'packs/resource/textures/entity/mitra_normal.png')));
  for(const m of [mer,normal]){assert.equal(m.width,color.width);assert.equal(m.height,color.height);}
  for(let i=0;i<color.data.length;i+=4){
    assert.equal(mer.data[i+3],color.data[i+3]);assert.equal(normal.data[i+3],color.data[i+3]);
    assert.equal(mer.data[i+1],0);
  }
});
gate('rendered vertices fit declared visibility bounds and leave the face clear',()=>{
  const material=new THREE.MeshBasicMaterial();
  const built=buildBedrockGeometry(geo,{...geo.description,textureWidth:256,textureHeight:256,formatVersion:geometryFile.format_version},{default:material,water:material},{scale:1,includePivots:false,includeLocators:false});
  built.root.updateMatrixWorld(true);
  const limits={min:[-16,-4,-16],max:[16,52,16]};
  const point=new THREE.Vector3();
  for(const {mesh,boneName} of built.meshRecords){
    const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
      assert(point.toArray().every((n,j)=>Number.isFinite(n)&&n>=limits.min[j]&&n<=limits.max[j]));
      // Frontal face safety in canonical coordinates: nothing covers eyes/mouth below Y=30.
      if(point.z<0)assert(point.y>=30,`Front intrusion at ${point.toArray()}`);
      if(boneName?.startsWith('lappet'))assert(point.z>4.2,'Lappet has crossed the head plane');
    }
  }
  material.dispose();
});
gate('localized inventory name and model-derived icons',()=>{
  const atlas=read('packs/resource/textures/item_texture.json');
  assert.deepEqual(atlas.texture_data.aurifrita_mitra.textures,['textures/items/aurifrita_mitra']);
  for(const locale of ['en_US','pt_BR']){
    const lang=fs.readFileSync(path.join(root,`packs/resource/texts/${locale}.lang`),'utf8');
    assert(lang.includes('item.aurifrita:mitra.name='));assert(lang.includes('pack.name='));
  }
  const im=PNG.sync.read(fs.readFileSync(path.join(root,'packs/resource/textures/items/aurifrita_mitra.png')));
  assert.equal(im.width,64);assert.equal(im.height,64);
  const iconSource=path.join(root,'assets-src/branding/item-64.png');
  assert(fs.existsSync(iconSource),'Generate native model icons before packaging');
  const rendered=read('assets-src/branding/render-manifest.json');
  // A schema-only patch reuses unchanged art; retain its original render provenance.
  assert.match(rendered.version,/^\d+\.\d+\.\d+$/);
  assert.equal(Object.keys(rendered.sourceHashes).length,4);
  for(const [p,hash] of Object.entries(rendered.sourceHashes)){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'packs/resource',p))).digest('hex'),hash,`Stale model render: ${p}`);
  }
  for(const capture of rendered.captures){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets-src/branding',capture.file))).digest('hex'),capture.sha256);
  }
  assert(fs.readFileSync(iconSource).equals(fs.readFileSync(path.join(root,'packs/resource/textures/items/aurifrita_mitra.png'))));
  assert(fs.readFileSync(path.join(root,'packs/behavior/pack_icon.png')).equals(fs.readFileSync(path.join(root,'packs/resource/pack_icon.png'))));
});
const report={version:meta.version,passed:!errors.length,cubes,faces,triangles,errors,minecraftValidation:'pending user import and Content Log'};
fs.mkdirSync(path.join(root,'out'),{recursive:true});fs.writeFileSync(path.join(root,'out/structural-validation.json'),JSON.stringify(report,null,2)+'\n');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Aurifrita valid: ${cubes} cuboids / ${triangles} triangles; runtime QA remains manual.`);
