import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const local=path.dirname(fileURLToPath(import.meta.url));const {ATLAS,tiles,authorBook,geometry,paint}=await import(pathToFileURL(path.join(fs.existsSync(path.join(local,'design.mjs'))?local:root,'design.mjs')).href);
const report={format:1,geometryVersion:'1.16.0',atlas:ATLAS,checks:[],models:{},limits:['Blender previews do not prove Minecraft engine rendering, Content Log or physical/client performance.','New thicker held items preserve grip/presentation data but require native first/third-person acceptance.']};
const check=(name,fn)=>{fn();report.checks.push({name,status:'pass'});};
const rects=Object.entries(tiles).map(([id,[x,y,w,h]])=>({id,x:x-2,y:y-2,w:w+4,h:h+4}));
check('Atlas tiles include non-overlapping two-pixel dilation',()=>{for(let i=0;i<rects.length;i++){const a=rects[i];assert(a.x>=0&&a.y>=0&&a.x+a.w<=ATLAS&&a.y+a.h<=ATLAS);for(const b of rects.slice(i+1))assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${a.id}/${b.id}`);}});
for(const key of ['missal','pontifical','lectionary']){
 const cfg=JSON.parse(fs.readFileSync(path.join(root,`${key}.author.json`))).configuration;const sx=cfg.width/5,sy=cfg.height/7;
 const author=authorBook(key);const names=new Set(author.map(b=>b.name));
 if(key==='lectionary')check('lectionary: distinct identity and measured cover proportions',()=>{assert.equal(cfg.title,'LECTIONARIUM');assert.equal(cfg.subtitle,'MISSAE');assert.deepEqual(cfg.ribbons,['red','gold','green']);assert(Math.abs(cfg.width/cfg.height-18.5/26.5)<.01);assert(cfg.thickness<1.44);assert(cfg.color[1]>cfg.color[0]*2);assert(!author.flatMap(b=>b.cubes).some(c=>/Mitre|Fore-edge index/.test(c.name)));});
 check(`${key}: finite positive cuboids, names, bone hierarchy`,()=>{assert.equal(names.size,author.length);for(const b of author){assert(names.has(b.parent)||b.parent==='book_action');for(const c of b.cubes){assert(c.name);assert(c.origin.every(Number.isFinite));assert(c.size.every(n=>Number.isFinite(n)&&n>0));}}});
 if(key==='missal'){
  const pages=author.find(b=>b.name==='right_pages').cubes;
  const signatures=pages.filter(c=>c.name.startsWith('Right signature'));
  check('missal: index tabs are anchored inside paper with proportional outer silhouette',()=>{
   const tabs=pages.filter(c=>c.name.startsWith('Fore-edge index'));
   assert.equal(tabs.length,4);
   for(const tab of tabs){
    assert(Math.abs(tab.origin[0]+tab.size[0]-5.13*sx)<1e-6);
    assert(signatures.some(p=>tab.origin[0]<p.origin[0]+p.size[0]-.08*sx&&tab.origin[2]<p.origin[2]+p.size[2]&&tab.origin[2]+tab.size[2]>p.origin[2]));
   }
  });

 }
 check(`${key}: all bookmarks are stored beneath the printed page with short connected tips`,()=>{
  const bodies=author.find(b=>b.name==='ribbons').cubes;
  const tips=author.filter(b=>b.name.startsWith('ribbon_tip_')).flatMap(b=>b.cubes.map(c=>({bone:b,cube:c})));
  assert.equal(bodies.length,key==='missal'?5:3);assert.equal(tips.length,bodies.length);
  for(const body of bodies){
   assert(body.origin[2]>=.08&&body.origin[2]+body.size[2]<(cfg.thickness/2-.16));
   assert(body.origin[1]>=.18*sy-1e-6&&body.origin[1]+body.size[1]<=6.8*sy+1e-6);
   const tip=tips.find(t=>Math.abs(t.cube.origin[0]-body.origin[0])<1e-6);assert(tip);
   assert(Math.abs(tip.bone.pivot[2]-body.origin[2])<1e-6);
   assert(Math.abs(tip.bone.pivot[1]-.18*sy)<1e-6);
   assert(Math.abs(tip.cube.origin[1]+tip.cube.size[1]-.18*sy)<1e-6);
   assert(tip.cube.origin[1]>=-.24*sy-1e-6&&tip.cube.origin[1]<0);
  }
 });
 let faces=0;
 for(const kind of ['held','closed','open','animated']){
  const g=geometry(kind,key),parsed=JSON.parse(fs.readFileSync(path.join(root,`bedrock/models/entity/${key}_${kind}.geo.json`)));
  check(`${key}/${kind}: Python and JS exporter parity`,()=>assert.deepEqual(g,parsed));
  const data=g['minecraft:geometry'][0];
  check(`${key}/${kind}: per-face UVs inside atlas`,()=>{for(const b of data.bones)for(const c of b.cubes??[])for(const f of Object.values(c.uv)){assert.equal(f.uv.length,2);assert.equal(f.uv_size.length,2);for(let i=0;i<2;i++){assert(Number.isInteger(f.uv[i]));assert(Number.isInteger(f.uv_size[i]));assert(f.uv[i]>=0&&f.uv[i]+f.uv_size[i]<=ATLAS);assert(f.uv_size[i]>=1);}}});
  if(kind==='held'){
   check(`${key}: protected neutral binding and grip`,()=>{const [b,p,a]=data.bones;assert.equal(b.name,'evangeliarium_bound');assert.equal(b.binding,'q.item_slot_to_bone_name(context.item_slot)');assert.deepEqual(b.pivot,[0,0,0]);assert(!b.cubes&&!b.rotation);assert.deepEqual(p.pivot,[-6,24,1]);assert.deepEqual(a.pivot,[-6,24,1]);});
   check(`${key}: visible bounds enclose held mesh`,()=>{const d=data.description;for(const b of data.bones)for(const c of b.cubes??[])for(let i=0;i<3;i++){const bound=(i===1?d.visible_bounds_height:d.visible_bounds_width)*16/2;assert(c.origin[i]>=d.visible_bounds_offset[i]*16-bound);assert(c.origin[i]+c.size[i]<=d.visible_bounds_offset[i]*16+bound);}});
   faces=data.bones.flatMap(b=>b.cubes??[]).reduce((n,c)=>n+Object.keys(c.uv).length,0);
  }
  if(kind==='open')check(`${key}: 177 degree native front-cover opening`,()=>assert.deepEqual(data.bones.find(b=>b.name==='front_cover').rotation,[0,177,0]));
 }
 check(`${key}: palette sampling channels are finite in range`,()=>{for(const [id,[u,v,w,h]]of Object.entries(tiles))for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=paint(id,x,y,w,h,key);assert([...c.rgb,c.metal,c.rough].every(n=>Number.isInteger(n)&&n>=0&&n<=255));assert(Number.isFinite(c.height));}});
 report.models[key]={cuboids:author.flatMap(b=>b.cubes).length,visibleQuads:faces,triangles:faces*2,rgbaTextureBytesWithoutMipmaps:ATLAS*ATLAS*4*3,atlasSets:1,drawMaterialSlots:1};
}
check('Modest model cost: less than 64 cuboids / 320 quads per book',()=>{for(const v of Object.values(report.models)){assert(v.cuboids<64);assert(v.visibleQuads<320);}});
const files=[];function walk(p){for(const f of fs.readdirSync(p,{withFileTypes:true})){const p2=path.join(p,f.name);if(f.isDirectory())walk(p2);else files.push(p2)}}walk(path.join(root,'bedrock'));walk(path.join(root,'source'));
report.sourceHashes=Object.fromEntries(files.filter(p=>!p.endsWith('test_light.py')).sort().map(p=>[path.relative(root,p),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
fs.writeFileSync(path.join(root,'reports/validation.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.checks.length} checks passed.`,report.models);
