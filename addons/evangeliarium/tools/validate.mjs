import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {colors} from '../assets-src/ui/design.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const books=read('assets-src/catalog/items.json').items;
assert.equal(books.length,4);assert.equal(new Set(books.flatMap(b=>[b.id,b.blockId,b.visualId])).size,12);
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
assert.ok(ui.long_router.controls.some(c=>c['catalog@evangeliarium_ui.catalog_frame']));
assert.equal(ui.catalog_cell.size[1],56);assert.equal(ui.menu_cell.size[1],32);assert.equal(ui.nav_cell.size[1],28);
for(const state of ui['catalog_choice@common.button'].controls){const text=Object.values(state)[0].controls.find(c=>c.text).text;assert.equal(text.size[1],40);assert.ok(text.layer>0);}
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
for(const book of books){
 const item=read(`packs/behavior/items/${book.localId}.item.json`)['minecraft:item'];
 assert.equal(item.description.identifier,book.id);assert.equal(item.components['minecraft:max_stack_size'],1);
 const block=read(`packs/behavior/blocks/${book.localId}.block.json`)['minecraft:block'];assert.equal(block.description.identifier,book.blockId);
 const attachable=read(`packs/resource/attachables/${book.localId}.attachable.json`)['minecraft:attachable'];assert.equal(attachable.description.identifier,book.id);
 assert.equal(read(`packs/behavior/entities/${book.localId}_visual.entity.json`)['minecraft:entity'].description.identifier,book.visualId);
 for(const kind of ['held','open','closed','animated']){
  const geometry=read(`packs/resource/models/entity/${book.localId}_${kind}.geo.json`);assert.equal(geometry.format_version,'1.16.0');
  const model=geometry['minecraft:geometry'][0],bones=model.bones;
  assert.equal(model.description.identifier,`geometry.evangeliarium.${book.bookId==='gospel'?'':book.bookId+'.'}${kind}`);
  assert.ok(bones.length<=20);assert.ok(bones.reduce((sum,b)=>sum+(b.cubes?.length??0),0)<=80);
  if(kind==='held')assert.deepEqual(bones.find(b=>b.name==='evangeliarium_bound'),{name:'evangeliarium_bound',pivot:[0,0,0],binding:'q.item_slot_to_bone_name(context.item_slot)'});
  for(const bone of bones)for(const cube of bone.cubes??[]){assert.ok(cube.size.every(n=>Number.isFinite(n)&&n>0));for(const uv of Object.values(cube.uv)){assert.ok([...uv.uv,...uv.uv_size].every(Number.isInteger));assert.ok(uv.uv.every((n,i)=>n>=0&&n+uv.uv_size[i]<=256));}}
 }
 const icon=PNG.sync.read(fs.readFileSync(path.join(root,`packs/resource/textures/items/${book.localId}.png`)));assert.equal(icon.width,64);assert.equal(icon.height,64);assert.ok(icon.data.some((v,i)=>i%4===3&&v>200));
 for(const suffix of ['', '_normal','_mer']){const image=PNG.sync.read(fs.readFileSync(path.join(root,`packs/resource/textures/entity/${book.localId}${suffix}.png`)));assert.equal(image.width,256);assert.equal(image.height,256);if(suffix==='_mer')for(let i=1;i<image.data.length;i+=4)assert.equal(image.data[i],0);}
 assert.ok(fs.readFileSync(path.join(root,'packs/resource/render_controllers/book_first_person_bridge.json'),'utf8').includes(book.id));
}
const liturgy=read('out/liturgy-manifest.json');for(const id of ['missal','pontifical'])assert.ok(liturgy.books[id].sections>0&&liturgy.books[id].pages>0);
const lectionary=read('out/lectionary-manifest.json');assert.equal(lectionary.books.book.sections,766);assert.equal(lectionary.books.gospel.sections,766);assert.equal(lectionary.dateMapping,'none');
console.log(`Validated ${books.length} book families, 5 UUIDs, neutral binding, 4 PBR atlas sets, ${liturgy.books.missal.sections+liturgy.books.pontifical.sections} liturgical sections, 766 lectionary forms and gospel forms, 730 dates and 3779 verses.`);
