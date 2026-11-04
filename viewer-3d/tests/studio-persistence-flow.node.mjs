import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// Exercise the actual controller without a GPU or external model caches. Rendering
// is replaced at its module boundary; DOM events, queue, history and storage are real controller code.
const entry=fileURLToPath(new URL('../src/render-studio/main.js',import.meta.url));
const htmls={current:await fs.readFile(new URL('../render-studio.html',import.meta.url),'utf8'),legacy:await fs.readFile(new URL('./fixtures/studio-schema2.html',import.meta.url),'utf8')};
const sources={current:await fs.readFile(entry,'utf8'),legacy:await fs.readFile(new URL('./fixtures/studio-main-schema2.txt',import.meta.url),'utf8')};
const CURRENT_KEY='bedrock-studio.altare.v3',LEGACY_KEY='bedrock-studio.altare';
const stubs={
 'stage.js':'export class StudioStage {constructor(){return globalThis.testStage;}}',
 'altare-provider.js':'export async function createAltareProvider(){return globalThis.testProvider;}',
 'props-provider.js':'export async function createPropsProvider(){return {catalog:{version:"test",sourceHash:"props"}};}',
 'liturgical-plan.js':'export function planLiturgy(){return {notes:[]};}',
 'liturgical-scene.js':'export async function composeLiturgy(){return {notes:[]};} export function disposeDressing(){}',
};
const bundles={};
for(const [version,contents]of Object.entries(sources))bundles[version]=await build({stdin:{contents,resolveDir:fileURLToPath(new URL('../src/render-studio/',import.meta.url)),sourcefile:`${version}-main.js`,loader:'js'},bundle:true,format:'esm',platform:'neutral',write:false,plugins:[{name:'rendering-stubs',setup(build){
 build.onResolve({filter:/^\.\/(stage|altare-provider|props-provider|liturgical-plan|liturgical-scene)\.js$/},args=>({path:args.path.slice(2),namespace:'stub'}));
 build.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'js'}));
}}]});

async function controller(storage=new Map(),duringInitialization,version='current'){
 const nodes=[],downloads=[],blobs=new Map();
 class Element {
  constructor(id=''){this.id=id;this.dataset={};this.children=[];this.events=new Map();this.attributes={};this.style={setProperty(){}};this.hidden=false;this.disabled=false;this.value='';this.isConnected=true;this.clientWidth=900;this.clientHeight=600;this.label={hidden:false};nodes.push(this);}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(type,callback){const handlers=this.events.get(type)??[];handlers.push(callback);this.events.set(type,handlers);}
  async dispatch(type){for(const listener of this.events.get(type)??[])await listener({target:this});}
  click(){if(this.download)downloads.push({name:this.download,blob:blobs.get(this.href)});return this.dispatch('click');}
  append(...children){this.children.push(...children);}
  closest(){return this.label;}
  querySelectorAll(selector){const data=selector.match(/^\[data-(.+)\]$/);return data?nodes.filter(node=>Object.hasOwn(node.dataset,data[1])):[];}
 }
 const elements=new Map([...htmls[version].matchAll(/<[^>]+\bid="(studio-[^"]+)"[^>]*>/g)].map(match=>{
  const node=new Element(match[1]);
  for(const [,name,value]of match[0].matchAll(/\bdata-(\w+)="([^"]+)"/g))node.dataset[name]=value;
  node.hidden=/\bhidden\b/.test(match[0]);return [node.id.slice(7),node];
 }));
 elements.get('resolution').value='3840';
 const timers=new Map();let nextTimer=0;
 const camera={projection:'perspective',position:[0,3,-8],target:[0,.5,0],orthoSpan:8};
 const stage={renderer:{},arrangement:{notes:[]},vanilla:{manifest:{sourceHash:'vanilla',revision:1}},stage:{revision:4,blockCount:0,layout:{floor:0}},
  async prepare(){await duringInitialization?.(elements);},setModel(){},setDressing(){},configure(config){camera.projection=config.projection;},resize(){},
  cameraState(){return structuredClone(camera);},restoreCamera(value){Object.assign(camera,structuredClone(value));},
 };
 const document={baseURI:'https://studio.invalid/',querySelectorAll:()=>[...elements.values()],createElement:()=>new Element()};
 const context={document,testStage:stage,testProvider:{catalog:{version:'test',sourceHash:'models'},async compose(){return {traverse(){}};}},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
  setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id),
  URL:class extends URL {static createObjectURL(blob){const id=`blob:test-${blobs.size}`;blobs.set(id,blob);return id;}static revokeObjectURL(id){blobs.delete(id);}},Blob,structuredClone,ResizeObserver:class {observe(){}},addEventListener(){},
 };
 context.window=context;
 await vm.runInNewContext(`(async()=>{${bundles[version].outputFiles[0].text}\n})()`,context,{filename:'studio-controller.js'});
 const api=context.__BEDROCK_STUDIO__;
 assert.equal(api.error,null);assert.equal(api.ready,true);
 const settle=async()=>{for(let i=0;i<30&&!elements.get('loading').hidden;i++)await Promise.resolve();assert.equal(elements.get('loading').hidden,true);};
 return {api,elements,storage,
  async click(kind,id){const node=nodes.find(node=>node.dataset[kind]===id);assert.ok(node,`${kind} ${id}`);await node.click();await settle();},
  async download(){await elements.get('save').click();const file=downloads.at(-1);assert.match(file.name,/\.json$/);return JSON.parse(await file.blob.text());},
  async open(scene,size){const file=elements.get('file'),text=JSON.stringify(scene);file.files=[{size:size??Buffer.byteLength(text),text:async()=>text}];await file.dispatch('change');await settle();},
  flush(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}},
 };
}
const snapshot=app=>JSON.parse(JSON.stringify(app.api.scene()));
const configure=app=>app.api.configure({family:'ogive',surface:'limestone',textile:'floral',color:'red',frontal:'cross'});

test('scene file controls stay disabled until providers are ready',async()=>{
 const app=await controller(new Map(),elements=>{assert.equal(elements.get('save').disabled,true);assert.equal(elements.get('open').disabled,true);});
 assert.equal(app.elements.get('save').disabled,false);assert.equal(app.elements.get('open').disabled,false);
});

test('controller saves and reopens suspended choices through file import and localStorage restart',async()=>{
 for(const [kind,hidden,active]of [['color','purple','red'],['model','coffer','ogive']]){
  let app=await controller();await configure(app);await app.click(kind,hidden);
  const saved=await app.download();assert.deepEqual(saved,snapshot(app));assert.equal(saved.config.frontal,'none');assert.equal(saved.draft.relief,'cross');assert.equal(saved.draft.surface,'limestone');
  await app.api.preset('green');await app.open(saved);assert.deepEqual(snapshot(app),saved);
  app.flush();const storage=JSON.parse(app.storage.get(CURRENT_KEY));assert.equal(storage.schema,3);assert.deepEqual(storage.draft,saved.draft);
  app=await controller(app.storage);assert.deepEqual(snapshot(app),saved);
  await app.click(kind,active);assert.equal(snapshot(app).config.frontal,'cross');assert.equal(snapshot(app).config.surface,'limestone');
  await app.elements.get('undo').click();assert.equal(snapshot(app).config.frontal,'none');
  await app.elements.get('redo').click();assert.equal(snapshot(app).config.frontal,'cross');
 }
});

test('controller rejects invalid imports before changing scene, history or saved state',async()=>{
 const app=await controller();await configure(app);await app.click('color','purple');app.flush();
 const saved=snapshot(app),stored=app.storage.get(CURRENT_KEY);
 for(const patch of [{draft:{...saved.draft,surface:'missing'}},{draft:{...saved.draft,color:'red'}},{camera:{...saved.camera,position:[null,0,0]}},{schema:4}]){
  await app.open({...saved,...patch});assert.equal(app.elements.get('error').hidden,false);assert.deepEqual(snapshot(app),saved);app.flush();assert.equal(app.storage.get(CURRENT_KEY),stored);
 }
 await app.open(saved,32769);assert.equal(app.elements.get('error').textContent,'A cena excede o limite de 32 KB.');assert.deepEqual(snapshot(app),saved);
 await app.elements.get('undo').click();assert.equal(snapshot(app).config.color,'red');assert.equal(snapshot(app).config.frontal,'cross');
});

test('controller loads legacy localStorage and file scenes and rejects a corrupt saved draft safely',async()=>{
 const initial=await controller(),legacy=snapshot(initial);delete legacy.draft;legacy.schema=1;legacy.config={...legacy.config,family:'classic',cloth:4,textile:'agnus'};
 const app=await controller(new Map([[LEGACY_KEY,JSON.stringify(legacy)]]));assert.equal(snapshot(app).config.textile,'gold_long');
 await app.open({...legacy,schema:2,config:{...legacy.config,family:'colonnade',textile:'agnus'}});assert.equal(snapshot(app).config.textile,'agnus');
 app.flush();const saved=JSON.parse(app.storage.get(CURRENT_KEY));saved.draft.color='invalid';app.storage.set(CURRENT_KEY,JSON.stringify(saved));
 const reopened=await controller(app.storage);assert.deepEqual(snapshot(reopened).config,snapshot(initial).config);
});


test('upgrade, rollback and upgrade again preserve separate legacy and v3 scenes',async()=>{
 for(const seedLegacy of [true,false])for(const [kind,hidden,active]of [['color','purple','red'],['model','coffer','ogive']]){
  const storage=new Map();
  if(seedLegacy){const old=await controller(storage,undefined,'legacy');await configure(old);old.flush();assert.equal(JSON.parse(storage.get(LEGACY_KEY)).schema,2);}
  const legacyBefore=storage.get(LEGACY_KEY),current=await controller(storage);
  if(seedLegacy)assert.equal(snapshot(current).config.frontal,'cross');else await configure(current);
  await current.click(kind,hidden);current.flush();const v3Before=storage.get(CURRENT_KEY),scene=snapshot(current);
  assert.equal(scene.config.frontal,'none');assert.equal(scene.draft.relief,'cross');assert.equal(scene.draft.surface,'limestone');
  assert.equal(storage.get(LEGACY_KEY),legacyBefore,'migration must not write or remove the old key');
  assert.equal(JSON.parse(v3Before).schema,3);
  const rolledBack=await controller(storage,undefined,'legacy');
  if(seedLegacy)assert.equal(snapshot(rolledBack).config.frontal,'cross');else assert.equal(snapshot(rolledBack).config.family,'classic');
  await rolledBack.api.preset('wood');rolledBack.flush();
  assert.equal(JSON.parse(storage.get(LEGACY_KEY)).schema,2);assert.equal(JSON.parse(storage.get(LEGACY_KEY)).config.family,'trestle');
  assert.equal(storage.get(CURRENT_KEY),v3Before,'the old controller must leave the v3 scene byte-identical');
  const legacyAfterRollback=storage.get(LEGACY_KEY),upgraded=await controller(storage);assert.deepEqual(snapshot(upgraded),scene,'v3 takes precedence over later legacy edits');
  await upgraded.click(kind,active);assert.equal(snapshot(upgraded).config.frontal,'cross');assert.equal(snapshot(upgraded).config.surface,'limestone');
  upgraded.flush();assert.equal(storage.get(LEGACY_KEY),legacyAfterRollback,'later v3 autosaves must preserve rollback edits too');
 }
});
