import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStudioConfig,designId,studioDimensions,STUDIO_PRESETS,validateStudioCamera,migrateStudioConfig} from '../src/shared/studio-contract.js';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const bundled=await build({entryPoints:[fileURLToPath(new URL('../../addons/altare/tools/studio-domain.ts',import.meta.url))],bundle:true,format:'esm',platform:'neutral',write:false});
const {DESIGNS,compose}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].contents).toString('base64'));
const ids=new Set(DESIGNS.map(d=>d.id));
test('studio presets and the eight liturgical colors resolve real published designs',()=>{
 for(const preset of STUDIO_PRESETS){const id=designId(preset);if(id)assert.ok(ids.has(id));}
 for(const family of ['pilaster','ogive','trestle'])for(const surface of ['marble','limestone','walnut'])for(const color of ['white','red','green','purple','rose','black','gold','silver'])assert.ok(ids.has(designId({family,surface,textile:'palette',color,frontal:'cross'})));
 for(const family of ['coffer','baluster','crossbrace'])for(const textile of ['none','agnus','ruby','verdant','requiem','palette'])for(const color of ['white','red','green','purple','rose','black','gold','silver'])assert.ok(ids.has(designId({family,textile,color})));
});
test('studio composition uses addon domain roles and dimensions, including split centres',()=>{
 for(const width of [1,3,7,8,16]){
  const tiles=compose({width,depth:2,design:designId({family:'trestle',textile:'agnus'})});assert.equal(tiles.length,width*2);
  const centre=tiles.filter(t=>t.frontal>0);assert.equal(centre.length,width%2?1:2);assert.ok(tiles.every(t=>t.position.y===0));
 }
 assert.throws(()=>compose({width:17,depth:2}));assert.throws(()=>compose({width:7,depth:0}));
});
test('invalid imported scenes are rejected and export dimensions preserve aspect ratio',()=>{
 for(const bad of [{width:0},{width:NaN},{depth:9},{exposure:Infinity},{family:'missing'},{environment:'https://invalid'},{ornamental:'yes'}])assert.throws(()=>normalizeStudioConfig(bad));
 assert.deepEqual(studioDimensions('16:9',3840),{width:3840,height:2160});assert.deepEqual(studioDimensions('4:5',2560),{width:2048,height:2560});assert.throws(()=>studioDimensions('1:1',8192));
 for(const camera of [null,{position:[0,0,0],target:[0,0,0],projection:'perspective',orthoSpan:1},{position:[Infinity,0,0],target:[0,0,0],projection:'perspective',orthoSpan:1}])assert.throws(()=>validateStudioCamera(camera));
});

test('schema 1 scenes retain classic cloth and former Colonnade lace while schema 2 has universal styles',()=>{
 const a=migrateStudioConfig({family:'classic',cloth:4,textile:'agnus'},1);assert.equal(a.textile,'gold_long');assert.equal(a.cloth,4);
 const b=migrateStudioConfig({family:'colonnade',textile:'agnus'},1);assert.equal(b.textile,'lace');
 const c=migrateStudioConfig({family:'colonnade',textile:'agnus'},2);assert.equal(c.textile,'agnus');
 for(const family of ['classic','pilaster','ogive','trestle','coffer','baluster','colonnade','crossbrace','twin_pedestal']){
  assert.ok(ids.has(designId({family,textile:'lace'})));
  const style=normalizeStudioConfig({family,textile:'floral',color:'rose'});assert.equal(style.textile,'floral');assert.ok(ids.has(designId(style)));
 }
 assert.equal(normalizeStudioConfig({family:'classic',textile:'linen_long'}).cloth,2);
 assert.equal(normalizeStudioConfig({family:'classic',cloth:4}).textile,'gold_long');
});

test('twin-pedestal presets and all textile choices compose native addon cells',()=>{
 const presets=STUDIO_PRESETS.filter(p=>p.family==='twin_pedestal');assert.equal(presets.length,2);
 for(const textile of ['none','linen_short','linen_long','gold_short','gold_long','agnus','floral','verdant','requiem','lace']){
  const colors=textile==='floral'?['white','red','green','purple','rose','black','gold','silver']:['red'];
  for(const color of colors){
   const config=normalizeStudioConfig({family:'twin_pedestal',surface:'marble',frontal:'cross',textile,color,width:7,depth:2});
   assert.equal(config.surface,'walnut');assert.equal(config.frontal,'none');
   const design=designId(config);assert.ok(ids.has(design));assert.ok(design.startsWith('altare:n_twin_'));
   const tiles=compose({...config,design});assert.equal(tiles.length,14);assert.ok(tiles.every(t=>t.id===design&&Number.isInteger(t.nativePose)));
  }
 }
});

test('crossbrace presets compose open joinery with every shared textile and floral color',()=>{
 assert.equal(STUDIO_PRESETS.filter(p=>p.family==='crossbrace').length,2);
 for(const textile of ['none','linen_short','linen_long','gold_short','gold_long','agnus','floral','verdant','requiem','lace']){
  for(const color of textile==='floral'?['white','red','green','purple','rose','black','gold','silver']:['red']){
   const config=normalizeStudioConfig({family:'crossbrace',surface:'limestone',frontal:'cross',textile,color,width:5,depth:2});
   assert.equal(config.surface,'walnut');assert.equal(config.frontal,'none');
   const design=designId(config);assert.ok(ids.has(design));
   const tiles=compose({...config,design});assert.equal(tiles.length,10);assert.ok(tiles.every(t=>t.id===design));
  }
 }
});
