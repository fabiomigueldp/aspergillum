import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {twinPedestalRecipe,nativePedestalStudyBudget} from '../assets-src/atelier/twin-pedestal-recipe-study.mjs';
import {definitions} from '../assets-src/textures.mjs';
import {atelierDefinitions} from '../assets-src/atelier/materials.mjs';
import {ogiveDefinitions} from '../assets-src/atelier/ogive-art.mjs';
import {SHARED_TEXTILES,LITURGICAL_COLORS} from '../src/domain/catalog.ts';
const textureIds=new Set([...definitions(),...atelierDefinitions(),...ogiveDefinitions()].map(d=>d.id));
test('all textile recipes use the real shared garment, covered tabletop and two-sided drapes',()=>{
 const cases=[[1,1],[2,1],[3,2],[7,2],[1,3],[2,3],[16,8],[8,16],[1,16]];let maxCubes=0,maxQuads=0,checked=0;
 for(const [w,d] of cases)for(let f=0;f<4;f++)for(const textile of SHARED_TEXTILES)for(const color of textile==='floral'?LITURGICAL_COLORS:['red']){
  const p=twinPedestalRecipe(w!,d!,f,{textile,color});assert.equal(p.registered,false);assert.equal(p.cells.length,w!*d!);checked++;
  for(const cell of p.cells){
   const g=cell.doc['minecraft:geometry'][0],cubes=g.bones.flatMap((b:any)=>b.cubes),quads=cubes.reduce((n:number,c:any)=>n+Object.keys(c.uv).length,0);maxCubes=Math.max(maxCubes,cubes.length);maxQuads=Math.max(maxQuads,quads);
   assert.ok(cubes.length<=nativePedestalStudyBudget.cubes);assert.ok(quads<=nativePedestalStudyBudget.quads);assert.ok(cell.collision.length<=16);assert.equal(cell.facing,f);
   for(const texture of Object.values(cell.materials) as string[])assert.ok(textureIds.has(texture),texture);
   const mensa=g.bones.find((b:any)=>b.name==='mensa');assert.ok(Math.abs(Math.max(...mensa.cubes.map((c:any)=>c.origin[1]+c.size[1]))-(textile==='none'?16:15.91))<1e-7);
   const garments=g.bones.filter((b:any)=>b.name.startsWith('garment_'));if(textile==='none'){assert.equal(garments.length,0);continue;}
   const top=garments.find((b:any)=>b.name==='garment_top').cubes[0];assert.equal(top.origin[1],15.91);assert.equal(top.origin[1]+top.size[1],16);
   for(const b of garments.filter((b:any)=>b.name.startsWith('garment_drape_'))){for(const c of b.cubes.slice(0,2))assert.ok(c.uv.north&&c.uv.south||c.uv.east&&c.uv.west);}
   if(cell.edges&(1<<f)){assert.equal(cell.materials['cloth_'+f],textile==='floral'?`textile_ruby_${cell.textileRole}${color==='red'?'':'_'+color}`:cell.materials['cloth_'+f]);}
  }
 }
 assert.equal(checked,612);assert.equal(maxCubes,59);assert.equal(maxQuads,189);
});
test('centered motifs occur once or as two complementary halves on the intended front',()=>{
 for(const width of [1,2,3,7,8,16])for(const depth of [1,2,3])for(let facing=0;facing<4;facing++){
  const p=twinPedestalRecipe(width,depth,facing,{textile:'floral',color:'purple'}),roles=p.cells.filter((c:any)=>c.textileRole>0).map((c:any)=>c.textileRole).sort();assert.deepEqual(roles,width%2?[1]:[2,3]);
  for(const c of p.cells)if(c.textileRole)assert.ok(c.edges&(1<<facing));
 }
});
