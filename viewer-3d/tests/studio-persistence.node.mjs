import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStudioConfig,STUDIO_PRESETS} from '../src/shared/studio-contract.js';
import {studioCustomization,studioAppearance,changeCustomization,createStudioHistory} from '../src/shared/altar-customization.js';
import {createStudioSceneState,restoreStudioSceneState,readStudioSceneFile} from '../src/shared/studio-persistence.js';

const camera={projection:'perspective',position:[0,3,-8],target:[0,.5,0],orthoSpan:8};
const base=()=>studioCustomization(normalizeStudioConfig({family:'ogive',surface:'limestone',textile:'ruby',frontal:'cross'}));
const state=draft=>createStudioSceneState(normalizeStudioConfig(studioAppearance(draft)),draft);
const roundtrip=draft=>restoreStudioSceneState(JSON.parse(JSON.stringify(state(draft))));

test('scene roundtrip preserves relief suspended by floral color and repeated save/reopen cycles',()=>{
 let draft=changeCustomization(base(),{color:'purple'});
 for(let i=0;i<3;i++){
  const saved=state(draft);assert.equal(saved.schema,3);assert.equal(saved.config.frontal,'none');assert.equal(saved.draft.relief,'cross');
  const restored=roundtrip(draft);assert.deepEqual(restored.draft,draft);assert.deepEqual(restored.config,saved.config);
  assert.equal(studioAppearance(changeCustomization(restored.draft,{color:'red'})).frontal,'cross');
  draft=restored.draft;
 }
});

test('scene roundtrip restores suspended stone and relief after joinery, Colonnade and Classic',()=>{
 const original=base();
 for(const model of ['coffer','baluster','colonnade','classic']){
  const suspended=changeCustomization(original,{model}),restored=roundtrip(suspended);
  assert.equal(restored.draft.surface,'limestone');assert.equal(restored.draft.relief,'cross');
  assert.equal(restored.config.frontal,'none');
  if(model!=='classic')assert.equal(restored.config.surface,model==='colonnade'?'marble':'walnut');
  assert.deepEqual(studioAppearance(changeCustomization(restored.draft,{model:'ogive'})),studioAppearance(original));
 }
});

test('saving copies state and restored draft remains compatible with undo/redo',()=>{
 const draft=changeCustomization(base(),{model:'coffer',color:'purple'}),saved=state(draft),history=createStudioHistory();
 const before=JSON.stringify(saved);history.record(restoreStudioSceneState(saved));
 const active=changeCustomization(draft,{model:'ogive',color:'red'});history.record(roundtrip(active));
 assert.equal(studioAppearance(history.undo().draft).frontal,'none');
 assert.equal(studioAppearance(history.redo().draft).frontal,'cross');
 draft.surface='marble';assert.equal(saved.draft.surface,'limestone');assert.equal(JSON.stringify(saved),before);
 const restored=restoreStudioSceneState(saved);restored.draft.relief='agnus';restored.config.width=1;assert.equal(JSON.stringify(saved),before);
});

test('legacy scene schemas retain their visible appearance without fabricating hidden choices',()=>{
 for(const preset of STUDIO_PRESETS){
  const config=normalizeStudioConfig(preset),restored=restoreStudioSceneState({schema:2,config});
  assert.deepEqual(restored.config,config);assert.deepEqual(normalizeStudioConfig({...config,...studioAppearance(restored.draft)}),config);
  assert.deepEqual(restoreStudioSceneState(JSON.parse(JSON.stringify(createStudioSceneState(restored.config,restored.draft)))),restored);
 }
 const classic=restoreStudioSceneState({schema:1,config:{family:'classic',cloth:4,textile:'agnus'}});
 assert.equal(classic.config.textile,'gold_long');assert.equal(classic.draft.textile,'gold_long');
 const colonnade=restoreStudioSceneState({schema:1,config:{family:'colonnade',textile:'agnus'}});
 assert.equal(colonnade.config.textile,'lace');assert.equal(colonnade.draft.textile,'lace');
 const oldClassic=restoreStudioSceneState({schema:2,config:{family:'classic',textile:'gold_long',frontal:'cross'}});
 assert.deepEqual(restoreStudioSceneState(createStudioSceneState(oldClassic.config,oldClassic.draft)),oldClassic);
 const oldJoinery=restoreStudioSceneState({schema:2,config:{family:'coffer',surface:'walnut',textile:'floral',color:'purple',frontal:'none'}});
 assert.equal(oldJoinery.draft.surface,'walnut');assert.equal(oldJoinery.draft.relief,'none');
 assert.deepEqual(restoreStudioSceneState({config:{family:'classic',cloth:4}},{allowLegacySchema:true}),restoreStudioSceneState({schema:1,config:{family:'classic',cloth:4}}));
});

test('invalid scene envelopes and future schemas are rejected without mutating the input',()=>{
 for(const value of [null,[],true,'scene',{}, {schema:3},{schema:3,config:{}},{schema:4,config:{}},{schema:'3',config:{}},{schema:1,config:null},{schema:1,config:[]},{schema:2,config:'invalid'}])assert.throws(()=>restoreStudioSceneState(value));
 const valid=state(base());
 for(const patch of [{family:'missing'},{width:0},{width:NaN},{exposure:Infinity},{ornamental:'yes'},{environment:'https://invalid'}]){
  const saved={...valid,config:{...valid.config,...patch}},before=structuredClone(saved);assert.throws(()=>restoreStudioSceneState(saved));assert.deepEqual(saved,before);
 }
});

test('invalid or inconsistent editor drafts cannot bypass configuration validation',()=>{
 const valid=state(changeCustomization(base(),{model:'coffer',color:'purple'}));
 for(const draft of [null,[],{},'draft',...[
  {model:'missing'},{surface:'https://invalid'},{textile:'ruby'},{color:'cyan'},{relief:'unknown'},
  {stone:-1},{cloth:5},{stone:'1'},{facing:NaN},{facing:4},{facing:1},{ornamental:1},{ornateLace:true},
  {model:'ogive'},{color:'red'},{textile:'agnus'},
 ].map(patch=>({...valid.draft,...patch}))])assert.throws(()=>restoreStudioSceneState({...valid,draft}));
 for(const key of Object.keys(valid.draft)){const draft={...valid.draft};delete draft[key];assert.throws(()=>restoreStudioSceneState({...valid,draft}));}
 assert.throws(()=>createStudioSceneState(valid.config,base()));
});

test('persisted drafts allowlist known fields and ignore prototype-pollution keys',()=>{
 const saved=state(base()),extra=JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"url":"https://invalid"}');
 saved.draft={...saved.draft,...extra};saved.config={...saved.config,...extra};
 const restored=restoreStudioSceneState(saved);assert.deepEqual(restored,{config:state(base()).config,draft:base()});
 assert.equal(Object.hasOwn(restored.draft,'__proto__'),false);assert.equal(Object.hasOwn(restored.config,'constructor'),false);assert.equal({}.polluted,undefined);
 const inherited=Object.create(base());assert.throws(()=>restoreStudioSceneState({...saved,draft:inherited}));
});

test('scene files validate camera, projection and addon before exposing restorable state',()=>{
 const saved={...state(changeCustomization(base(),{color:'purple'})),addon:'altare',camera};
 const result=readStudioSceneFile(JSON.parse(JSON.stringify(saved)));assert.deepEqual(result,{...restoreStudioSceneState(saved),camera});
 for(const patch of [{addon:'other'},{camera:null},{camera:{...camera,position:[null,0,0]}},{camera:{...camera,projection:'orthographic'}},{schema:4}])assert.throws(()=>readStudioSceneFile({...saved,...patch}));
 result.camera.position[0]=30;assert.equal(camera.position[0],0);
});
