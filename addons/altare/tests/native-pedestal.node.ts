import test from 'node:test';
import assert from 'node:assert/strict';
import {NATIVE_DESIGNS,SHARED_TEXTILES,LITURGICAL_COLORS,sharedDesignFor,centerRole} from '../src/domain/catalog.ts';
import {NATIVE_BASE_POSES,NATIVE_CENTER_POSES,NATIVE_PLANS} from '../src/domain/native-pedestal-data.ts';
import {nativePoseData,nativeCentered} from '../src/domain/native-pedestal-layout.ts';
import {planFinish,withEdges,sameTile,positionKey,isolatedTile,editorSeed,type Tile,type Position} from '../src/domain/surface.ts';
import {encodeTile,decodeTile} from '../src/domain/block-codec.ts';
import {customizationFromFinish,customizationFinish,changeCustomization,customizationCapabilities,MODELS} from '../src/domain/customization.ts';
import {commitFinish} from '../src/application/finish.ts';
const grid=(w:number,d:number):Tile[]=>Array.from({length:w*d},(_,i)=>({position:{x:40+Math.floor(i/d),y:7,z:-30+i%d},stone:0,cloth:0,frontal:0,facing:0,edges:15}));
const finish=(design:string,facing:number)=>({design,facing,stone:0,cloth:0,ornamental:false});
test('native family adds one model and17 recipes without changing joinery identities',()=>{
 assert.equal(MODELS[8],'twin_pedestal');assert.equal(NATIVE_DESIGNS.length,17);
 assert.deepEqual(nativePoseData(0,false),{facing:0,edges:15,frontal:0});
 assert.deepEqual(nativePoseData(0,true),{facing:0,edges:15,frontal:1});
 assert.equal(NATIVE_PLANS['1,1,0']![0],0);
 for(const textile of SHARED_TEXTILES)for(const color of LITURGICAL_COLORS){const d=sharedDesignFor('twin_pedestal','walnut',textile,'none',color);assert.equal(d.codec,'native');assert.equal(d.surface,'walnut');assert.equal(d.frontal,'none');}
});
test('every native recipe roundtrips every codebook pose and rejects geometry/pose mismatch',()=>{
 for(const d of NATIVE_DESIGNS){const centered=nativeCentered(d.textile),count=centered?504:448;
 for(let nativePose=0;nativePose<count;nativePose++){
 const t={...grid(1,1)[0]!,design:d.id,stone:2,cloth:['none','agnus','ruby','verdant','requiem','lace','linen_short','linen_long','gold_short','gold_long'].indexOf(d.textile),nativePose,...nativePoseData(nativePose,centered)};
 const encoded=encodeTile(t);assert.deepEqual(decodeTile(encoded.id,t.position,encoded.states),t);
 assert.throws(()=>encodeTile({...t,facing:(t.facing+1)%4}),/configuration/);
 }
 assert.throws(()=>decodeTile(d.id,{x:0,y:0,z:0},{'altare:pose':'0','altare:bank':0,'altare:page':0}),/configuration/);
 }
});
test('all768 oriented rectangles select global semantic poses and centered textile roles',()=>{
 assert.equal(Object.keys(NATIVE_PLANS).length,768);assert.equal(NATIVE_BASE_POSES.length,448);assert.equal(NATIVE_CENTER_POSES.length,504);
 for(let width=1;width<=16;width++)for(let depth=1;depth<=16;depth++)if(Math.min(width,depth)<=8)for(let facing=0;facing<4;facing++){
 const nx=facing%2?depth:width,nz=facing%2?width:depth;
 for(const d of NATIVE_DESIGNS){const plan=planFinish(grid(nx,nz),finish(d.id,facing));
 assert.equal(plan.length,nx*nz);
 for(const t of plan){const x=t.position.x-40,z=t.position.z+30,base=NATIVE_PLANS[`${width},${depth},${facing}`]![x*nz+z];
 const centered=nativeCentered(d.textile),entry=centered?NATIVE_CENTER_POSES[t.nativePose!]!:undefined;
 assert.equal(entry?.basePose??t.nativePose,base);assert.equal(t.facing,facing);
 let index=facing%2?z:x;if(facing>=2)index=width-1-index;
 assert.equal(t.frontal,centered&&(t.edges&(1<<facing))?centerRole(width,index):0);
 assert.deepEqual(decodeTile(t.design!,t.position,encodeTile(t).states),t);
 }
 }
 }
});
test('native survivors freeze after break and switching away drops native pose',()=>{
 const plan=planFinish(grid(5,2),finish('altare:n_twin_agnus',3));
 for(const t of plan){for(let edges=0;edges<16;edges++)assert.deepEqual(withEdges(t,edges),t);const pending=isolatedTile(t,{x:90,y:7,z:90});assert.equal(pending.nativePose,undefined);assert.equal(pending.design,undefined);assert.equal(pending.frontal,0);}
 assert.equal(sameTile({...plan[0]!,nativePose:undefined},plan[0]!),false);
 const legacy=planFinish(plan,{stone:1,cloth:2,ornamental:true,facing:1});assert.ok(legacy.every(t=>t.nativePose===undefined&&!t.design));
});
test('native drafts preserve front, color, Guadalupe and suspended relief',()=>{
 let draft=customizationFromFinish({stone:1,cloth:3,ornamental:true,facing:3});
 draft=changeCustomization(draft,{model:'twin_pedestal',textile:'floral',color:'purple',relief:'cross'});
 assert.equal(customizationCapabilities(draft).material,false);assert.equal(customizationCapabilities(draft).relief,false);
 assert.equal(customizationFinish(draft).design,'altare:n_twin_floral_purple');
 draft=changeCustomization(draft,{textile:'none'});assert.equal(customizationCapabilities(draft).directional,true);assert.equal(customizationFinish(draft).facing,3);
 draft=changeCustomization(draft,{model:'classic',textile:'gold_short'});assert.equal(customizationFinish(draft).ornamental,true);assert.equal(draft.color,'purple');assert.equal(draft.relief,'cross');
});
test('invalid native rectangles and concurrent pose changes perform zero writes; write failure restores native poses',()=>{
 const before=planFinish(grid(3,2),finish('altare:n_twin_agnus',0));const after=planFinish(before,finish('altare:n_twin_floral_red',1));
 assert.throws(()=>planFinish(before.slice(1),finish('altare:n_twin_none',0)),/rectangle/);
 let writes=0;const world=new Map(before.map(t=>[positionKey(t.position),t]));
 const port={read:(p:Position)=>world.get(positionKey(p))??null,prepare:()=>{},write:(t:Tile)=>{writes++;world.set(positionKey(t.position),t);}};
 world.set(positionKey(before[0]!.position),{...before[0]!,nativePose:999});assert.throws(()=>commitFinish(port,before,after),/changed/);assert.equal(writes,0);
 world.set(positionKey(before[0]!.position),before[0]!);port.prepare=()=>{throw Error('rejected')};assert.throws(()=>commitFinish(port,before,after),/no blocks changed/);assert.equal(writes,0);
 port.prepare=()=>{};port.write=(t:Tile)=>{world.set(positionKey(t.position),t);if(++writes===3)throw Error('injected')};assert.throws(()=>commitFinish(port,before,after),/rolled back/);assert.deepEqual([...world.values()],before);
});


test('targeting a pending extension seeds the existing native recipe and front without changing tiles',()=>{
 const native=planFinish(grid(2,1),finish('altare:n_twin_floral_purple',3));
 const pending=isolatedTile(native[0]!,{x:42,y:7,z:-30});
 const mixed=[pending,...native],saved=structuredClone(mixed);
 assert.equal(editorSeed(mixed).design,'altare:n_twin_floral_purple');assert.equal(editorSeed(mixed).facing,3);assert.deepEqual(mixed,saved);
 assert.equal(editorSeed([{...pending,cloth:1},...native]).design,undefined,'an intentional mixed textile is not treated as pending');
});
