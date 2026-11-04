import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGNS,ATELIER_DESIGNS,designFor,designById,CATALOG_PERMUTATIONS,centerRole} from '../src/domain/catalog.ts';
import {planFinish,sameTile,positionKey,type Tile,type Position} from '../src/domain/surface.ts';
import {commitFinish} from '../src/application/finish.ts';
import {encodeTile,decodeTile,normalizeTile} from '../src/domain/block-codec.ts';
const grid=(w:number,d:number):Tile[]=>Array.from({length:w*d},(_,i)=>({position:{x:i%w,y:4,z:Math.floor(i/w)},stone:0,cloth:3,frontal:0,facing:0,edges:15}));
test('catalog has stable unique identities and a bounded total state budget',()=>{
 assert.equal(ATELIER_DESIGNS.length,135);assert.equal(DESIGNS.length,396);assert.equal(new Set(DESIGNS.map(d=>d.id)).size,396);
 assert.equal(CATALOG_PERMUTATIONS,54528);assert.ok(CATALOG_PERMUTATIONS+9744<=65536);
 assert.equal(designFor('trestle','walnut','agnus','none').id,'altare:a_trestle_walnut_agnus_none');
 assert.equal(designById('altare:a_future'),undefined);assert.throws(()=>designFor('future','marble','agnus','none'));
});
test('collection centers remain unique at widths 1..16 and in four directions',()=>{
 for(let width=1;width<=16;width++)for(let facing=0;facing<4;facing++){
  const before=grid(facing%2?2:width,facing%2?width:2);
  const after=planFinish(before,{stone:0,cloth:0,ornamental:false,facing,design:designFor('pilaster','marble','agnus','cross').id});
  assert.equal(after.filter(t=>t.frontal===1).length,width%2);
  assert.equal(after.filter(t=>t.frontal===2).length,width%2?0:1);
  assert.equal(after.filter(t=>t.frontal===3).length,width%2?0:1);
  assert.ok(after.filter(t=>t.frontal>0).every(t=>t.edges&(1<<facing)));
  assert.deepEqual(after.map(t=>t.position),before.map(t=>t.position));
 }
 assert.throws(()=>centerRole(0,0));
});
test('conversion rejects unknown designs, detects identity changes and rolls back across families',()=>{
 const before=grid(7,2),finish={stone:0,cloth:0,ornamental:false,facing:0,design:designFor('ogive','marble','ruby','cross').id};
 assert.throws(()=>planFinish(before,{...finish,design:'altare:a_unknown'}),/configuration/);
 const after=planFinish(before,finish);assert.ok(!sameTile(before[0],after[0]!));
 const world=new Map(before.map(t=>[positionKey(t.position),t]));let writes=0;
 const port={read:(p:Position)=>world.get(positionKey(p))??null,write:(t:Tile)=>{world.set(positionKey(t.position),t);if(++writes===5)throw Error('injected after publishing');}};
 assert.throws(()=>commitFinish(port,before,after),/rolled back/);assert.deepEqual([...world.values()],before);
 const old=planFinish(after,{stone:0,cloth:3,ornamental:true,facing:0});
 assert.ok(old.every(t=>!t.design));assert.equal(old.filter(t=>t.frontal===2).length,1);
});
test('compact codec round-trips every recipe and normalized visual pose without cosmetic axes',()=>{
 for(const design of ATELIER_DESIGNS)for(const frontal of [0,1,2,3])for(let edges=0;edges<16;edges++){
  const t=planFinish(grid(1,1),{stone:0,cloth:0,ornamental:false,facing:2,design:design.id})[0]!;
  const tile={...t,frontal,edges},encoded=encodeTile(tile);
  assert.ok(Object.keys(encoded.states).length<=2);
  assert.ok(!('altare:stone' in encoded.states)&&!('altare:cloth' in encoded.states));
  assert.deepEqual(decodeTile(encoded.id,tile.position,encoded.states),normalizeTile(tile));
 }
 const old=grid(1,1)[0]!,e=encodeTile(old);assert.deepEqual(decodeTile(e.id,old.position,e.states),old);
 assert.equal(decodeTile('minecraft:stone',old.position,{}),null);
});
