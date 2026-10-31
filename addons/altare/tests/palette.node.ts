import test from 'node:test';
import assert from 'node:assert/strict';
import {PALETTE_SHAPES,encodePalette,decodePalette} from '../src/domain/palette-layout.ts';
import {LITURGICAL_COLORS,STRUCTURES,SURFACES,liturgicalDesign,designFor,colorOf} from '../src/domain/catalog.ts';
import {planFinish,withEdges,sameTile,positionKey,type Tile,type Position} from '../src/domain/surface.ts';
import {encodeTile,decodeTile} from '../src/domain/block-codec.ts';
import {commitFinish} from '../src/application/finish.ts';
const grid=(w:number,d:number):Tile[]=>Array.from({length:w*d},(_,i)=>({position:{x:i%w,y:4,z:Math.floor(i/w)},stone:0,cloth:1,frontal:0,facing:0,edges:15}));
test('compact palette codebook has a safe isolated default and 112 unique reversible poses',()=>{
 assert.equal(PALETTE_SHAPES.length,28);const poses=new Set<string>();
 for(let shape=0;shape<7;shape++)for(let detail=0;detail<4;detail++)for(let facing=0;facing<4;facing++){
  const states={'altare:shape':shape,'altare:detail':detail,'altare:facing':facing};
  const t=decodePalette(states);poses.add(JSON.stringify(t));assert.deepEqual(encodePalette(t),states);
  assert.ok(!t.frontal||(t.edges&(1<<facing)));
 }
 assert.equal(poses.size,112);assert.deepEqual(decodePalette({'altare:shape':0,'altare:detail':0,'altare:facing':0}),{edges:15,frontal:0,facing:0});
 assert.throws(()=>decodePalette({'altare:shape':7,'altare:detail':0,'altare:facing':0}));
 assert.throws(()=>encodePalette({edges:0,frontal:1,facing:0}));
});
test('every liturgical color fits rectangular centres 1..16 in all structures, surfaces and directions',()=>{
 assert.equal(LITURGICAL_COLORS.length,8);
 for(const structure of STRUCTURES)for(const surface of SURFACES)for(const color of LITURGICAL_COLORS){
  const design=liturgicalDesign(structure,surface,color);assert.equal(colorOf(design),color);
  if(color==='red')assert.equal(design.id,designFor(structure,surface,'ruby','none').id);
  for(let width=1;width<=16;width++)for(const depth of [1,2])for(let facing=0;facing<4;facing++){
   const tiles=planFinish(grid(facing%2?depth:width,facing%2?width:depth),{stone:0,cloth:0,ornamental:false,facing,design:design.id});
   assert.equal(tiles.filter(t=>t.frontal>0).length,width%2?1:2);
   for(const t of tiles){const p=encodeTile(t);assert.deepEqual(decodeTile(p.id,t.position,p.states),t);}
  }
 }
 assert.throws(()=>liturgicalDesign('pilaster','marble','unknown'));
});
test('breaking a neighbour never produces an unencodable palette pose or changes color',()=>{
 const design=liturgicalDesign('trestle','walnut','purple');
 for(let shape=0;shape<7;shape++)for(let detail=0;detail<4;detail++)for(let facing=0;facing<4;facing++){
  const t=decodeTile(design.id,{x:0,y:4,z:0},{'altare:shape':shape,'altare:detail':detail,'altare:facing':facing})!;
  for(let edges=0;edges<16;edges++){
   const next=withEdges(t,edges);assert.equal(next.design,t.design);assert.equal(next.edges,edges);
   assert.ok(next.frontal===t.frontal||next.frontal===0);
   const p=encodeTile(next);assert.deepEqual(decodeTile(p.id,next.position,p.states),next);
  }
 }
 const old=grid(1,1)[0]!;assert.deepEqual(withEdges({...old,frontal:9},0),{...old,frontal:9,edges:0});
});
test('palette changes participate in late identity checks and rollback without writing above the altar',()=>{
 const before=planFinish(grid(8,2),{stone:0,cloth:0,ornamental:false,facing:1,design:liturgicalDesign('pilaster','marble','rose').id});
 const after=planFinish(before,{stone:0,cloth:0,ornamental:false,facing:3,design:liturgicalDesign('trestle','walnut','green').id});
 assert.ok(!sameTile(before[0],after[0]!));assert.deepEqual(before.map(t=>t.position),after.map(t=>t.position));
 const world=new Map(before.map(t=>[positionKey(t.position),t]));let writes=0;
 const port={read:(p:Position)=>world.get(positionKey(p))??null,write:(t:Tile)=>{assert.equal(t.position.y,4);world.set(positionKey(t.position),t);if(++writes===6)throw Error('injected');}};
 assert.throws(()=>commitFinish(port,before,after),/rolled back/);assert.deepEqual([...world.values()],before);
 const back=planFinish(after,{stone:0,cloth:3,ornamental:true,facing:0});assert.ok(back.every(t=>!t.design));
});
