import test from 'node:test';
import assert from 'node:assert/strict';
import {ATELIER_DESIGNS,MENSA_ID,designFor,CATALOG_PERMUTATIONS} from '../src/domain/catalog.ts';
import {ATELIER_POSES,TRESTLE_POSES,BARE_POSES,BARE_TRESTLE_POSES,MENSA_LAYOUT,atelierLayout} from '../src/domain/pose-layout.ts';
import {decodeTile,encodeTile,normalizeTile} from '../src/domain/block-codec.ts';
import {planFinish,withEdges,isolatedTile,neighbor,edgeMask,positionKey,type Tile,type Position} from '../src/domain/surface.ts';
import {hasMixedFinishes} from '../src/domain/customization.ts';

const position={x:0,y:64,z:0};
const grid=(width:number,depth:number):Tile[]=>Array.from({length:width*depth},(_,i)=>({position:{x:i%width,y:64,z:Math.floor(i/width)},stone:0,cloth:1,frontal:0,facing:0,edges:15}));
const roundTrip=(tile:Tile)=>{const encoded=encodeTile(tile);return decodeTile(encoded.id,tile.position,encoded.states);};
function remove(tiles:readonly Tile[],p:Position,unknown:ReadonlySet<string>=new Set()):Tile[]{
 const remaining=tiles.filter(t=>positionKey(t.position)!==positionKey(p)),map=new Map(remaining.map(t=>[positionKey(t.position),t]));
 return remaining.map(tile=>withEdges(tile,edgeMask([0,1,2,3].map(i=>{const k=positionKey(neighbor(tile.position,i));return unknown.has(k)?undefined:map.has(k);}),tile.edges)));
}

test('visual codebooks have bounded state axes, safe defaults and reversible declared poses',()=>{
 for(const [layout,count] of [[BARE_POSES,16],[BARE_TRESTLE_POSES,64],[ATELIER_POSES,112],[TRESTLE_POSES,160],[MENSA_LAYOUT,384]] as const){
  assert.equal(layout.size,count);
  assert.equal(Object.values(layout.states).reduce((n,values)=>n*values.length,1),count);
  assert.ok(Object.values(layout.states).every(values=>values.length<=16));
  assert.deepEqual(layout.decode(layout.stateAt(0)),{edges:15,frontal:0,facing:0});
  const distinct=new Set(layout.poses.map(p=>JSON.stringify(p)));assert.equal(distinct.size,layout.poses.length);
  for(let index=0;index<layout.size;index++){
   const pose=layout.decode(layout.stateAt(index));
   assert.deepEqual(layout.decode(layout.encode(pose)),pose);
   assert.ok(!pose.frontal||(pose.edges&(1<<pose.facing)));
   if(index<layout.poses.length)assert.deepEqual(layout.encode(pose),layout.stateAt(index));
   else assert.deepEqual(pose,layout.poses[0]);
  }
 }
 assert.equal(MENSA_LAYOUT.poses.length,368);assert.equal(CATALOG_PERMUTATIONS,54528);
 assert.equal(CATALOG_PERMUTATIONS+9744,64272);
});

test('every compact pose remains encodable after any contour change and preserves its visible motif',()=>{
 const bases:Tile[]=[];
 for(const d of ATELIER_DESIGNS){
  const layout=atelierLayout(d),base=planFinish(grid(1,1),{stone:0,cloth:1,ornamental:false,facing:0,design:d.id})[0]!;
  for(const pose of layout.poses)bases.push({...base,...pose});
 }
 for(const pose of MENSA_LAYOUT.poses)bases.push({position,stone:1,cloth:4,...pose});
 for(const before of bases)for(let edges=0;edges<16;edges++){
  const next=withEdges(before,edges),frontExposed=!!(edges&(1<<before.facing));
  assert.equal(next.edges,edges);assert.equal(next.design,before.design);assert.equal(next.stone,before.stone);assert.equal(next.cloth,before.cloth);
  assert.equal(next.frontal,frontExposed?before.frontal:0);
  if(next.frontal)assert.equal(next.facing,before.facing);
  assert.deepEqual(roundTrip(next),next);
 }
});

test('all Atelier finishes and classic rectangle dimensions keep their motifs, positions and uniform editor choices',()=>{
 for(const id of [MENSA_ID,...ATELIER_DESIGNS.map(d=>d.id)])for(const width of [1,2,3,4,7,16])for(const depth of [1,2])for(let facing=0;facing<4;facing++){
  const before=grid(facing%2?depth:width,facing%2?width:depth),saved=structuredClone(before);
  const after=planFinish(before,{stone:1,cloth:3,ornamental:true,facing,...(id===MENSA_ID?{}:{design:id})});
  assert.deepEqual(before,saved);assert.deepEqual(after.map(t=>t.position),before.map(t=>t.position));
  assert.equal(hasMixedFinishes(after),false,id);
  for(const tile of after){assert.deepEqual(roundTrip(tile),tile);if(tile.frontal)assert.equal(tile.facing,facing);}
 }
});

test('lateral breaks keep centres and halves through serialization, multiple removals and unknown neighbours',()=>{
 const id=designFor('pilaster','marble','agnus','cross').id;
 for(const design of [undefined,id,designFor('trestle','walnut','ruby','agnus').id])for(let facing=0;facing<4;facing++){
  const tiles=planFinish(grid(facing%2?1:3,facing%2?3:1),{stone:0,cloth:1,ornamental:true,facing,...(design?{design}:{})});
  const centre=tiles.find(t=>t.position.x===1||t.position.z===1)!;
  const after=remove(tiles,tiles[0]!.position),survivor=after.find(t=>positionKey(t.position)===positionKey(centre.position))!;
  assert.equal(survivor.frontal,centre.frontal);assert.ok(survivor.frontal>0);assert.equal(survivor.facing,facing);
  const reloaded:Tile[]=JSON.parse(JSON.stringify(after)).map((t:Tile)=>roundTrip(t));
  const last=remove(reloaded,reloaded.find(t=>positionKey(t.position)!==positionKey(centre.position))!.position);
  assert.equal(last[0]!.frontal,centre.frontal);assert.equal(last[0]!.edges,15);
  const unknown=remove(tiles,tiles[0]!.position,new Set([positionKey(tiles[0]!.position)]));
  assert.equal(unknown.find(t=>positionKey(t.position)===positionKey(centre.position))!.edges,centre.edges);
  const extension=isolatedTile(survivor,tiles[0]!.position);assert.equal(extension.frontal,0);assert.deepEqual(roundTrip(extension),extension);
 }
});

test('front coverage clears only the now-hidden motif; bare forms do not retain invisible roles',()=>{
 const design=designFor('ogive','marble','none','cross').id;
 const adorned=planFinish(grid(1,1),{stone:0,cloth:0,ornamental:false,facing:2,design})[0]!;
 assert.equal(adorned.frontal,1);
 const covered=withEdges(adorned,15^(1<<2));assert.equal(covered.frontal,0);assert.equal(covered.facing,0);
 assert.equal(withEdges(covered,15).frontal,0,'re-exposing a covered face never creates a new motif');
 for(let facing=0;facing<4;facing++){
  const bare=planFinish(grid(1,1),{stone:0,cloth:0,ornamental:false,facing,design:designFor('pilaster','marble','none','none').id})[0]!;
  assert.equal(bare.frontal,0);assert.equal(bare.facing,0);
  const trestle=planFinish(grid(1,1),{stone:0,cloth:0,ornamental:false,facing,design:designFor('trestle','walnut','none','none').id})[0]!;
  assert.equal(trestle.facing,facing);assert.deepEqual(roundTrip(trestle),trestle);
 }
 assert.deepEqual(normalizeTile(adorned),adorned);
});

test('compact decoders reject malformed axes and removed schemas without a fallback codec',()=>{
 for(const layout of [BARE_POSES,ATELIER_POSES,TRESTLE_POSES,MENSA_LAYOUT]){
  const state=layout.stateAt(0);
  for(const value of [-1,16,0.5,'0',null,NaN,Infinity])assert.throws(()=>layout.decode({...state,'altare:pose':value}),/configuration/);
  assert.throws(()=>layout.decode({}),/configuration/);
  assert.throws(()=>layout.decode({...state,'altare:edges':15}),/configuration/);
 }
 assert.throws(()=>decodeTile(MENSA_ID,position,{'altare:edges':15,'altare:frontal':0,'altare:facing':0,'altare:stone':0,'altare:cloth':1}),/configuration/);
 assert.throws(()=>decodeTile(MENSA_ID,position,{...MENSA_LAYOUT.stateAt(0),'altare:stone':'0','altare:cloth':1}),/configuration/);
});
