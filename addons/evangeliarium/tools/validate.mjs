import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {colors} from '../assets-src/ui/design.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const bp=read('packs/behavior/manifest.json'),rp=read('packs/resource/manifest.json');
const ids=[bp.header.uuid,rp.header.uuid,...bp.modules.map(m=>m.uuid),...rp.modules.map(m=>m.uuid)];
assert.equal(new Set(ids).size,5);assert.deepEqual(bp.header.min_engine_version,[1,26,50]);
assert.ok(bp.dependencies.every(d=>!d.version.toString().includes('beta')));
let cubes=0;
for(const kind of ['held','closed','open','animated']){
 const g=read(`packs/resource/models/entity/book_${kind}.geo.json`);assert.equal(g.format_version,'1.16.0');
 const bones=g['minecraft:geometry'][0].bones;
 assert.ok(bones.length<=20);assert.equal(new Set(bones.map(b=>b.name)).size,bones.length);
 for(const b of bones){if(b.parent)assert.ok(bones.some(p=>p.name===b.parent));for(const c of b.cubes??[]){assert.ok(c.size.every(n=>n>0));assert.equal(Object.keys(c.uv).length,6);for(const uv of Object.values(c.uv)){assert.ok([...uv.uv,...uv.uv_size].every(Number.isInteger));assert.ok(uv.uv.every((v,i)=>v>=0&&v+uv.uv_size[i]<=256));}}}
 if(kind==='held'){
  cubes=bones.reduce((n,b)=>n+(b.cubes?.length??0),0);assert.ok(cubes<=80);
  const bound=bones.find(b=>b.name==='evangeliarium_bound');assert.deepEqual(bound,{name:'evangeliarium_bound',pivot:[0,0,0],binding:'q.item_slot_to_bone_name(context.item_slot)'});
 }
}
for(const f of ['book','book_normal','book_mer']){const im=PNG.sync.read(fs.readFileSync(path.join(root,`packs/resource/textures/entity/${f}.png`)));assert.equal(im.width,256);assert.equal(im.height,256);if(f==='book_mer')for(let i=1;i<im.data.length;i+=4)assert.equal(im.data[i],0);}
const icon=PNG.sync.read(fs.readFileSync(path.join(root,'packs/resource/textures/items/book.png')));
let opaque=0;for(let i=3;i<icon.data.length;i+=4)if(icon.data[i]>200)opaque++;
assert.ok(opaque>icon.width*icon.height*.15,'Inventory icon must contain a visible book, not a blank GPU capture');
const bridge=read('packs/resource/render_controllers/book_first_person_bridge.json').render_controllers;
assert.deepEqual(Object.keys(bridge),['controller.render.player.first_person']);
assert.ok(!fs.existsSync(path.join(root,'packs/resource/entity/player.entity.json')));
const content=read('out/content-manifest.json');assert.equal(content.dates,730);assert.equal(content.edition.verses,3779);
const script=fs.readFileSync(path.join(root,'packs/behavior/scripts/main.js'),'utf8');
assert.ok(script.includes('ActionFormData')&&script.includes('ModalFormData'));assert.ok(!script.includes('@minecraft/server-net'));assert.ok(!script.includes('fetch('));
const uiBridge=read('packs/resource/ui/server_form.json');
assert.deepEqual(Object.keys(uiBridge).sort(),['main_screen_content','namespace']);
const ui=read('packs/resource/ui/evangeliarium.json');
assert.ok(ui.long_router.controls.some(c=>c.native_container?.controls.some(n=>n['native@server_form.long_form'])));
assert.ok(ui.modal_router.controls.some(c=>c.native_container?.controls.some(n=>n['native@server_form.custom_form'])));
for(const state of ui['choice@common.button'].controls){const children=Object.values(state)[0].controls;assert.ok(children.find(c=>c.text).text.layer>0,'Button text must render above its surface');}
assert.deepEqual(read('packs/resource/ui/_ui_defs.json').ui_defs,['ui/evangeliarium.json']);
assert.ok(!fs.existsSync(path.join(root,'packs/resource/font')));
const luminance=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
assert.ok(contrast(colors.ink,colors.paper)>=7);assert.ok(contrast(colors.paper,colors.wine)>=7);
for(const name of ['paper','button','hover','pressed','rule'])assert.ok(fs.existsSync(path.join(root,`packs/resource/textures/evangeliarium/ui/${name}.png`)));
assert.ok(!script.includes('aspergillum:'));assert.ok(!script.includes('aurifrita:'));
// Regressions observed in the real Bedrock 26.52 Content Log; Creator Tools missed these.
const block=read('packs/behavior/blocks/book.block.json')['minecraft:block'];
assert.equal(typeof block.components['minecraft:material_instances']['*'].ambient_occlusion,'number');
const hidden=read('packs/resource/models/blocks/empty.geo.json')['minecraft:geometry'][0];
assert.ok(hidden.bones.some(b=>b.cubes?.length),'Bedrock cannot bound an empty block geometry');
assert.equal(block.permutations.find(p=>p.condition==="q.block_state('evangeliarium:visual')").components['minecraft:geometry'].bone_visibility.root,'0.0');
const visual=read('packs/behavior/entities/book_visual.entity.json')['minecraft:entity'];
assert.ok(!('minecraft:pushable' in visual.components));
assert.ok(read('packs/behavior/recipes/book.recipe.json')['minecraft:recipe_shaped'].unlock.length>0);
const animations=read('packs/resource/animations/book.animation.json').animations;
for(const [name,a] of Object.entries(animations)){
 if(typeof a.blend_weight==='string'&&a.blend_weight.includes('q.anim_time'))assert.ok(a.animation_length>0,`${name}: zero-duration blend`);
 for(const b of Object.values(a.bones??{}))for(const channel of Object.values(b))if(channel&&typeof channel==='object'&&!Array.isArray(channel))for(const time of Object.keys(channel))assert.match(time,/^\d+(\.\d+)?$/,`${name}: invalid time ${time}`);
}
assert.ok(animations['animation.evangeliarium.player.carry'].bones.rightarm);
assert.ok(animations['animation.evangeliarium.player.carry'].bones.leftarm);
console.log(`Validated 5 UUIDs, ${cubes} cuboids, neutral binding, 3 atlases, 730 dates, 3779 verses, stable APIs.`);
