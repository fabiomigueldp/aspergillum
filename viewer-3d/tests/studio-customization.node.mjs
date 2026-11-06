import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {normalizeStudioConfig,STUDIO_PRESETS,designId} from '../src/shared/studio-contract.js';
const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/shared/altar-customization.js',import.meta.url))],bundle:true,format:'esm',platform:'neutral',write:false});
const {studioCustomization,studioAppearance,changeCustomization,createStudioHistory}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
test('unified controls retain the appearance of existing scene presets',()=>{
 for(const preset of STUDIO_PRESETS){const config=normalizeStudioConfig(preset),draft=studioCustomization(config);assert.equal(designId({...config,...studioAppearance(draft)}),designId(config));}
 const old=normalizeStudioConfig({family:'ogive',textile:'ruby',frontal:'cross'});
 assert.equal(studioCustomization(old).textile,'floral');
 assert.equal(studioAppearance(studioCustomization(old)).frontal,'cross');
});
test('suspended relief returns after color or textile changes, including history navigation',()=>{
 let draft=studioCustomization(normalizeStudioConfig({family:'trestle',surface:'walnut',textile:'ruby',frontal:'cross'}));
 const history=createStudioHistory();history.record(draft);
 draft=changeCustomization(draft,{color:'purple'});history.record(draft);
 assert.equal(studioAppearance(draft).frontal,'none');
 assert.equal(studioAppearance(history.undo()).frontal,'cross');
 assert.equal(studioAppearance(history.redo()).frontal,'none');
 draft=changeCustomization(draft,{textile:'agnus'});history.record(draft);
 assert.equal(studioAppearance(draft).frontal,'cross');
 history.undo();history.record(changeCustomization(draft,{model:'pilaster'}));assert.equal(history.canRedo,false);
});

test('joinery controls resolve real wood recipes and restore hidden stone/relief choices',()=>{
 const original=studioCustomization(normalizeStudioConfig({family:'ogive',surface:'limestone',textile:'ruby',frontal:'cross'}));
 for(const model of ['coffer','baluster','crossbrace']){
  const draft=changeCustomization(original,{model});
  const appearance=studioAppearance(draft);
  assert.equal(appearance.surface,'walnut');assert.equal(appearance.frontal,'none');
  assert.equal(designId(appearance),`altare:j_${model}_ruby`);
  const config=normalizeStudioConfig(appearance);
  assert.equal(designId(studioAppearance(studioCustomization(config))),designId(config));
  assert.deepEqual(studioAppearance(changeCustomization(draft,{model:'ogive'})),studioAppearance(original));
 }
});

test('symmetric model round-trips lace scenes and keeps earlier model choices',()=>{
 const original=studioCustomization(normalizeStudioConfig({family:'ogive',surface:'limestone',textile:'ruby',frontal:'cross'}));
 const draft=changeCustomization(original,{model:'colonnade',ornateLace:false});
 assert.equal(designId(studioAppearance(draft)),'altare:s_colonnade_bare');
 const lace=studioAppearance(changeCustomization(draft,{ornateLace:true}));
 assert.equal(lace.textile,'lace');assert.equal(designId(studioAppearance(studioCustomization(normalizeStudioConfig(lace)))),'altare:s_colonnade_lace');
 assert.deepEqual(studioAppearance(changeCustomization(draft,{model:'ogive'})),{...studioAppearance(original),textile:'none'});
});

test('twin pedestals retain hidden choices through a model switch and undo/redo',()=>{
 const original=studioCustomization(normalizeStudioConfig({family:'ogive',surface:'limestone',textile:'floral',color:'red',frontal:'cross'}));
 const draft=changeCustomization(original,{model:'twin_pedestal'}),appearance=studioAppearance(draft);
 assert.equal(appearance.surface,'walnut');assert.equal(appearance.frontal,'none');assert.equal(designId(appearance),'altare:n_twin_floral_red');
 assert.deepEqual(studioAppearance(changeCustomization(draft,{model:'ogive'})),studioAppearance(original));
 const history=createStudioHistory();history.record(original);history.record(draft);
 assert.deepEqual(history.undo(),original);assert.deepEqual(history.redo(),draft);
});
