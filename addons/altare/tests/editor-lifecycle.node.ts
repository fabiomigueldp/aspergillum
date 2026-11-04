import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {current} from './helpers/native-ui.ts';
import {positionKey,type Tile} from '../src/domain/surface.ts';

const world=new Map<string,Tile>(),writes:Tile[]=[],messages:string[]=[];
let reconciles=0,timer:(()=>void)|undefined;
const system={currentTick:0,runTimeout(callback:()=>void){timer=callback;return 1;},clearRun(){timer=undefined;}};
class Port {
 constructor(_dimension:unknown){}
 read(p:any){return world.get(positionKey(p))??null;}
 write(tile:Tile){writes.push(tile);world.set(positionKey(tile.position),tile);}
 reconcile(){reconciles++;}
}
(globalThis as any).__altareEditorTest={system,GameMode:{Creative:'creative',Survival:'survival'},BedrockSurfacePort:Port,TOOL:'altare:finish_tool'};
const bundled=await build({entryPoints:[new URL('../src/infrastructure/editor.ts',import.meta.url).pathname],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'editor-double',setup(b){
 b.onResolve({filter:/^@minecraft\/server$/},()=>({path:'server',namespace:'test-editor'}));
 b.onResolve({filter:/^@minecraft\/server-ui$/},()=>({path:'ui',namespace:'test-editor'}));
 b.onResolve({filter:/^\.\/surface-port\.ts$/},()=>({path:'port',namespace:'test-editor'}));
 b.onLoad({filter:/.*/,namespace:'test-editor'},({path})=>({contents:path==='ui'?'export const {CustomForm,ObservableBoolean,ObservableNumber,ObservableUIRawMessage}=globalThis.__altareTestUI;':'export const {system,GameMode,BedrockSurfacePort,TOOL}=globalThis.__altareEditorTest;'}));
}}]});
const {edit,sessions}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0]!.text).toString('base64'));
const dimension={id:'test'},position={x:0,y:0,z:0};
const player={id:'p',isValid:true,dimension,selectedSlotIndex:0,location:{x:0,y:0,z:0},getGameMode:()=> 'creative',getComponent:()=>({container:{getItem:()=>({typeId:'altare:finish_tool'})}}),onScreenDisplay:{setActionBar:(m:any)=>messages.push(m.translate)}};
function reset(){sessions.releasePlayer('p');sessions.releasePlayer('other');world.clear();writes.length=0;messages.length=0;reconciles=0;system.currentTick=0;player.isValid=true;world.set('0,0,0',{position,stone:0,cloth:1,frontal:0,facing:0,edges:0});}
const click=(name:string)=>current.controls.find((c:any)=>c.label===`altare.menu.${name}`).callback();

test('opening, changing choices and cancelling never reconcile or write stale contours',async()=>{
 reset();const before=structuredClone([...world.values()]);const result=edit(player,dimension,position,1);
 current.controls.find((c:any)=>c.label==='altare.menu.pattern').value.setData(2);
 assert.equal(reconciles,0);assert.equal(writes.length,0);click('cancel');await result;
 assert.deepEqual([...world.values()],before);assert.deepEqual(messages,[]);
 assert.ok(sessions.acquire('other','test',['0,0,0'],1));sessions.releasePlayer('other');
});
test('busy opening does not mutate another editor surface',async()=>{
 reset();const lease=sessions.acquire('other','test',['0,0,0'],0);await edit(player,dimension,position);
 assert.equal(reconciles,0);assert.equal(writes.length,0);assert.deepEqual(messages,['altare.error.busy']);assert.ok(sessions.isCurrent(lease,1));sessions.release(lease);
});
test('Apply repairs contours only inside commit and keeps clicked front',async()=>{
 reset();const result=edit(player,dimension,position,1);click('apply');await result;
 assert.equal(reconciles,0);assert.equal(writes.length,1);assert.equal(writes[0]!.edges,15);assert.equal(writes[0]!.facing,1);assert.deepEqual(messages,['altare.success']);
});
test('timeout closes once, reports interruption and allows a fresh lease',async()=>{
 reset();const result=edit(player,dimension,position);system.currentTick=1200;timer!();await result;
 assert.equal(current.showing,false);assert.equal(writes.length,0);assert.deepEqual(messages,['altare.error.expired']);assert.equal(timer,undefined);
 assert.ok(sessions.acquire('other','test',['0,0,0'],1201));sessions.releasePlayer('other');
});
test('invalidation does not write or release a replacement session',async()=>{
 reset();const result=edit(player,dimension,position);sessions.invalidate('test','0,0,0');
 const replacement=sessions.acquire('p','test',['0,0,0'],1);await result;
 assert.equal(writes.length,0);assert.deepEqual(messages,['altare.error.expired']);assert.ok(sessions.isCurrent(replacement,2));sessions.release(replacement);
});
test('Cancel followed by invalidation before promise resumes remains silent',async()=>{
 reset();const result=edit(player,dimension,position);click('cancel');sessions.invalidate('test','0,0,0');await result;
 assert.equal(writes.length,0);assert.deepEqual(messages,[]);
});
test('native dismissal followed by release remains silent; leaving cannot publish stale feedback',async()=>{
 reset();let result=edit(player,dimension,position);current.close();sessions.releasePlayer('p');await result;assert.deepEqual(messages,[]);
 result=edit(player,dimension,position);player.isValid=false;sessions.releasePlayer('p');await result;assert.deepEqual(messages,[]);assert.equal(writes.length,0);
});

test('release after Apply but before continuation reports once and never commits',async()=>{
 reset();const result=edit(player,dimension,position);click('apply');sessions.invalidate('test','0,0,0');await result;
 assert.deepEqual(messages,['altare.error.expired']);assert.equal(writes.length,0);
});
test('failed native close cannot hold a released lock or yield duplicate interruption messages',async()=>{
 reset();const result=edit(player,dimension,position),form=current,close=form.close.bind(form);
 form.close=()=>{throw Error('native close failed');};sessions.invalidate('test','0,0,0');
 assert.ok(sessions.acquire('other','test',['0,0,0'],1));form.close=close;click('apply');await result;
 assert.deepEqual(messages,['altare.error.expired']);assert.equal(writes.length,0);sessions.releasePlayer('other');
});

test('late slot and world changes still reject Apply without writing',async()=>{
 reset();let result=edit(player,dimension,position);player.selectedSlotIndex=1;click('apply');await result;
 assert.deepEqual(messages,['altare.error.expired']);assert.equal(writes.length,0);player.selectedSlotIndex=0;
 reset();result=edit(player,dimension,position);world.set('0,0,0',{...world.get('0,0,0')!,stone:2});click('apply');await result;
 assert.deepEqual(messages,['altare.error.changed']);assert.equal(writes.length,0);assert.equal(world.get('0,0,0')!.stone,2);
});
