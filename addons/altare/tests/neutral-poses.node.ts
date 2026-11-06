import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGNS,SURFACES,TEXTILE_VALUES,type Design} from '../src/domain/catalog.ts';
import {PALETTE_SHAPES,rotateEdges} from '../src/domain/palette-layout.ts';
import {NEUTRAL_PALETTE_POSES,NEUTRAL_PALETTE_STATE_VALUES,decodeNeutralPalette,encodeNeutralPalette,normalizeNeutralPalette} from '../src/domain/neutral-palette-layout.ts';
import {CLASSIC_TEXTILE_POSES,CLASSIC_TEXTILE_VISUAL_POSES,CLASSIC_TEXTILE_STATE_VALUES,decodeClassicTextile,encodeClassicTextile,normalizeClassicTextile} from '../src/domain/classic-textile-layout.ts';
import {decodeTile,encodeTile,normalizeTile} from '../src/domain/block-codec.ts';
import {withEdges,type Tile} from '../src/domain/surface.ts';
import {atelierGeometry,structureCollision} from '../assets-src/atelier/geometry.mjs';
import {geometryFor,clothTexture} from '../tools/universal-pack.mjs';
import {collectionMaterials} from '../tools/catalog-pack.mjs';

const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const combinations=(states:Record<string,readonly number[]>):Record<string,number>[]=>Object.entries(states).reduce<Record<string,number>[]>((rows,[key,values])=>rows.flatMap(row=>values.map(value=>({...row,[key]:value}))),[{}]);
const roundTrip=(tile:Tile)=>{const e=encodeTile(tile);return decodeTile(e.id,tile.position,e.states);};

// Resolve visible cubes and texture identities instead of comparing resource or
// bone names. Hidden frontal geometry is intentionally absent from the result.
function appearance(design:Design,edges:number,facing:number){
 const classic=design.structure==='classic',colonnade=design.structure==='colonnade';
 const model=design.universal?geometryFor(design,{edges,facing}):atelierGeometry(design.structure,design.textile,design.frontal,facing,edges);
 const mats=collectionMaterials(design,0,facing);
 if(classic)Object.assign(mats,{'*':{texture:'altare_stone_0'},stone:{texture:'altare_stone_0'},frontal:{texture:'altare_frontal_1'},frame:{texture:'altare_frontal_frame'}});
 if(colonnade){
  Object.assign(mats,{panel:{texture:'altare_ornate_panel'},gilt:{texture:'altare_ornate_gilt'},column:{texture:'altare_ornate_column'},moulding:{texture:'altare_ornate_moulding'}});
  for(let i=0;i<4;i++)mats[`cloth_${i}`]={texture:'altare_'+clothTexture(design,0)};
 }
 const values={'altare:edges':edges,'altare:role':0,'altare:frontal':0,'altare:facing':facing,'altare:cloth':1};
 const q={block_state:(key:keyof typeof values)=>values[key]},math={floor:Math.floor,mod:(a:number,b:number)=>a%b};
 const visible=(name:string)=>!Object.hasOwn(model.visibility,name)||Boolean(typeof model.visibility[name]==='boolean'?model.visibility[name]:Function('q','math',`return ${model.visibility[name]}`)(q,math));
 const cubes=model.doc['minecraft:geometry'][0].bones.filter((b:any)=>visible(b.name)).flatMap((b:any)=>b.cubes??[])
  .map((c:any)=>({...c,uv:Object.fromEntries(Object.entries(c.uv).map(([face,u]:[string,any])=>[face,{...u,material_instance:mats[u.material_instance??'*'].texture}]))}));
 return JSON.stringify({cubes:cubes.map((c:any)=>JSON.stringify(canonical(c))).sort(),collision:classic||colonnade?true:structureCollision(design.structure,edges,facing)});
}

test('symmetric blank directions have identical visible geometry, UV textures and collision for every affected recipe',()=>{
 const designs=DESIGNS.filter(d=>d.codec==='neutral_palette'||d.codec==='classic_textile'||d.codec==='symmetric'&&['pilaster','ogive'].includes(d.structure));
 assert.equal(designs.length,155);
 let comparisons=0;
 for(const design of designs)for(let edges=0;edges<16;edges++){
  const baseline=appearance(design,edges,0);
  for(let facing=1;facing<4;facing++){assert.equal(appearance(design,edges,facing),baseline,`${design.id}, edges${edges}, facing${facing}`);comparisons++;}
 }
 assert.equal(comparisons,7440);
});

test('neutral palette codebook retains every decorative direction and all 16 blank outlines',()=>{
 assert.equal(NEUTRAL_PALETTE_POSES.length,64);
 assert.equal(new Set(NEUTRAL_PALETTE_POSES.map(p=>JSON.stringify(p))).size,64);
 assert.equal(combinations(NEUTRAL_PALETTE_STATE_VALUES).length,64);
 for(const state of combinations(NEUTRAL_PALETTE_STATE_VALUES))assert.deepEqual(encodeNeutralPalette(decodeNeutralPalette(state)),state);
 for(const local of PALETTE_SHAPES)for(let facing=0;facing<4;facing++){
  const pose={...local,edges:rotateEdges(local.edges,facing),facing};
  assert.deepEqual(decodeNeutralPalette(encodeNeutralPalette(pose)),normalizeNeutralPalette(pose));
 }
 for(const bad of [-1,16,1.5,'0',undefined])assert.throws(()=>decodeNeutralPalette({'altare:pose':bad,'altare:part':0}));
 assert.throws(()=>encodeNeutralPalette({edges:0,frontal:1,facing:0}));
});

test('classic textile keeps Guadalupe and textile roles independent, with every stone and decorative direction',()=>{
 assert.equal(CLASSIC_TEXTILE_VISUAL_POSES.length,168);
 assert.equal(new Set(CLASSIC_TEXTILE_VISUAL_POSES.map(p=>JSON.stringify(p))).size,168);
 assert.equal(combinations(CLASSIC_TEXTILE_STATE_VALUES).length,504);
 for(const state of combinations(CLASSIC_TEXTILE_STATE_VALUES))assert.deepEqual(encodeClassicTextile(decodeClassicTextile(state)),state);
 for(const local of CLASSIC_TEXTILE_POSES)for(let facing=0;facing<4;facing++)for(let stone=0;stone<3;stone++){
  const pose={...local,edges:rotateEdges(local.edges,facing),facing,stone};
  assert.deepEqual(decodeClassicTextile(encodeClassicTextile(pose)),normalizeClassicTextile(pose));
 }
 for(const bad of [-1,14,1.5,'0',undefined])assert.throws(()=>decodeClassicTextile({'altare:pose':bad,'altare:part':0,'altare:stone':0}));
});

test('all affected recipes round-trip after contour changes without retaining meaningless blank facing',()=>{
 for(const design of DESIGNS.filter(d=>d.codec==='neutral_palette'||d.codec==='classic_textile'||d.codec==='symmetric'&&['pilaster','ogive'].includes(d.structure))){
  const poses=design.codec==='classic_textile'?CLASSIC_TEXTILE_VISUAL_POSES:design.codec==='symmetric'?NEUTRAL_PALETTE_POSES.slice(0,16):NEUTRAL_PALETTE_POSES;
  for(const pose of poses){
   const tile:Tile={position:{x:0,y:64,z:0},design:design.id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),...pose};
   assert.deepEqual(roundTrip(tile),normalizeTile(tile));
   for(let edges=0;edges<16;edges++){const next=withEdges(tile,edges);assert.deepEqual(roundTrip(next),next);assert.equal(next.design,design.id);assert.equal(next.edges,edges);}
  }
 }
});
