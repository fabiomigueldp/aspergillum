import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {planFinish,positionKey,type Tile} from '../src/domain/surface.ts';
import {encodeTile,decodeTile} from '../src/domain/block-codec.ts';
let component:any,writes=0;
const messages:string[]=[],invalidations:string[]=[];
const worldTiles=new Map<string,Tile>();
let unknown=false;
function permutation(id:string,states:Record<string,number>){return {type:{id},getAllStates:()=>states};}
const api={Direction:{North:0,East:1,South:2,West:3},BlockPermutation:{resolve:permutation},
 system:{beforeEvents:{startup:{subscribe:(f:any)=>f({blockComponentRegistry:{registerCustomComponent:(_id:string,c:any)=>component=c}})}},run:(f:any)=>f()},
 world:{beforeEvents:{playerInteractWithBlock:{subscribe:()=>{}}},afterEvents:Object.fromEntries(['playerLeave','playerDimensionChange','playerSpawn','entityDie'].map(k=>[k,{subscribe:()=>{}}]))},
 sessions:{invalidate:(_dimension:string,key:string)=>invalidations.push(key),releasePlayer:()=>{}},edit:()=>{},tell:(_player:any,key:string)=>messages.push(key)};
(globalThis as any).__nativeRuntime=api;
const bundled=await build({entryPoints:[fileURLToPath(new URL('../src/bootstrap/main.ts',import.meta.url))],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'runtime-adapters',setup(b){b.onResolve({filter:/^@minecraft\/server$|^\.\.\/infrastructure\/editor\.ts$|^\.\.\/presentation\/menu\.ts$/},args=>({path:args.path,namespace:'adapter'}));b.onLoad({filter:/.*/,namespace:'adapter'},()=>({contents:'export const {Direction,BlockPermutation,system,world,sessions,edit,tell}=globalThis.__nativeRuntime;'}));}}]});
await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0]!.text).toString('base64'));
const position={x:0,y:0,z:0};
const dimension={id:'overworld',getBlock(p:any){if(unknown&&p.x===-1)return undefined;const tile=worldTiles.get(positionKey(p));if(!tile)return {typeId:'minecraft:air',location:p,permutation:permutation('minecraft:air',{}),setPermutation:()=>writes++};const e=encodeTile(tile);return {typeId:e.id,location:p,permutation:permutation(e.id,e.states),setPermutation:()=>writes++};}};
const native=(x:number)=>planFinish([{position:{x,y:0,z:0},stone:0,cloth:0,frontal:0,facing:0,edges:15}],{stone:0,cloth:0,ornamental:false,facing:0,design:'altare:n_twin_agnus'})[0]!;
const event=(id='altare:mensa')=>({block:{location:position},dimension,player:{},cancel:false,permutationToPlace:permutation(id,{})});
function reset(){worldTiles.clear();messages.length=0;writes=0;unknown=false;}
test('native placement and generic extensions use a plain pending module rather than duplicating native supports',()=>{
 for(const id of ['altare:mensa','altare:n_twin_agnus']){reset();worldTiles.set('1,0,0',native(1));const e=event(id);component.beforeOnPlayerPlace(e);assert.equal(e.cancel,false);assert.equal(e.permutationToPlace.type.id,'altare:mensa');assert.deepEqual(messages,['placement.pending']);assert.equal(writes,0);assert.deepEqual(decodeTile('altare:mensa',position,e.permutationToPlace.getAllStates()),{position,stone:0,cloth:0,frontal:0,facing:0,edges:15});}
 reset();const e=event('altare:n_twin_agnus');component.beforeOnPlayerPlace(e);assert.equal(e.permutationToPlace.type.id,'altare:n_twin_agnus');assert.deepEqual(messages,[]);
});
test('unknown neighbors cancel inheritance without reading or writing beyond local cells',()=>{
 reset();worldTiles.set('1,0,0',native(1));unknown=true;const e=event();component.beforeOnPlayerPlace(e);assert.equal(e.cancel,true);assert.deepEqual(messages,['error.unloaded']);assert.equal(writes,0);
});
test('native onTick/onBreak/onPlace never repairs a global pose or writes survivors',()=>{
 reset();worldTiles.set('0,0,0',native(0));const block={location:position};component.onTick({block,dimension});component.onBreak({block,dimension});component.onPlace({block,dimension});assert.equal(writes,0);assert.deepEqual(worldTiles.get('0,0,0'),native(0));
});
