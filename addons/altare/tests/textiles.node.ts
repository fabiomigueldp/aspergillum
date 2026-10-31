import test from 'node:test';
import assert from 'node:assert/strict';
import {textilePaint,atelierDefinitions} from '../assets-src/atelier/materials.mjs';
import {hemLimit} from '../assets-src/atelier/profiles.mjs';
import {atelierGeometry} from '../assets-src/atelier/geometry.mjs';
import {textilePalette,fabricMask} from '../assets-src/atelier/palette.mjs';
import {pilasterBudget} from '../assets-src/atelier/pilaster-model.mjs';
import {ogiveBudget} from '../assets-src/atelier/ogive-model.mjs';
test('scalloped silhouette, trim and split embroidery share a continuous physical domain',()=>{
 for(const theme of ['agnus','ruby','verdant','requiem']){
  for(let x=0;x<128;x+=.5){
   assert.ok(Math.abs(hemLimit(x,theme)-hemLimit(x+64,theme))<1e-12);
   assert.equal(textilePaint(x,hemLimit(x,theme)*128+.1,theme).alpha,0);
   const trim=textilePaint(x,hemLimit(x,theme)*128-.7,theme);assert.equal(trim.alpha,255);assert.ok(trim.metal>0);
  }
  for(let y=8;y<110;y+=4)for(let x=-8;x<=8;x+=1){
   const full=textilePaint(64+x,y,theme,1),split=textilePaint(x<0?128+x:x,y,theme,x<0?3:2);
   assert.deepEqual({...split,height:0},{...full,height:0});assert.ok(Math.abs(split.height-full.height)<1e-10);
  }
  for(let y=8;y<90;y+=3){const a=textilePaint(.0001,y,theme),b=textilePaint(127.9999,y,theme);assert.ok(a.rgb.every((v:number,i:number)=>Math.abs(v-b.rgb[i])<=1));}
 }
 assert.ok(atelierDefinitions().every(d=>d.size*d.size*4<=262144));
});
test('liturgical dyes preserve embroidery, silhouettes and shared PBR while changing only the fabric',()=>{
 const rgbByColor=new Map<string,string>();let clothPixels=0,embroideryPixels=0;
 for(let x=1;x<128;x+=3)for(let y=5;y<110;y+=3){
  const base=textilePaint(x,y,'ruby',1),mask=fabricMask(base.rgb);
  for(const color of Object.keys(textilePalette)){
   const dyed=textilePaint(x,y,'ruby',1,color);
   assert.deepEqual({alpha:dyed.alpha,metal:dyed.metal,rough:dyed.rough,height:dyed.height},{alpha:base.alpha,metal:base.metal,rough:base.rough,height:base.height});
   if(mask===0){assert.deepEqual(dyed.rgb,base.rgb);embroideryPixels++;}
   if(mask>.999&&base.alpha===255){clothPixels++;rgbByColor.set(color,dyed.rgb.join(','));}
  }
 }
 assert.ok(clothPixels>1000&&embroideryPixels>1000);assert.equal(new Set(rgbByColor.values()).size,8);
 const variants=atelierDefinitions().filter(d=>d.mapSource&&d.id.startsWith('textile_'));assert.equal(variants.length,28);
 assert.ok(variants.every(d=>/^textile_ruby_[0-3]$/.test(d.mapSource)));
});
test('linen is a thin independent surface over a structural slab at the full support height',()=>{
 for(const structure of ['pilaster','ogive','trestle'])for(const textile of ['agnus','ruby','verdant','requiem'])for(let facing=0;facing<4;facing++){
  const g=atelierGeometry(structure,textile,'cross',facing).doc['minecraft:geometry'][0];
  const top=g.bones.find(b=>b.name==='top')!.cubes[0]!,slab=g.bones.find(b=>b.name==='tabletop_base')!.cubes[0]!;
  assert.ok(top.size[1]<=.1);assert.equal(top.origin[1]+top.size[1],16);assert.equal(slab.origin[1]+slab.size[1],top.origin[1]);
  assert.ok(g.bones.flatMap(b=>b.cubes??[]).length<=(structure==='pilaster'?pilasterBudget.cubes:structure==='ogive'?ogiveBudget.cubes:50));
 }
});
test('fold facets assemble a continuous left-to-right UV strip in the actual Bedrock world basis',()=>{
 for(let facing=0;facing<4;facing++){
  const geometry=atelierGeometry('pilaster','agnus','none',facing).doc['minecraft:geometry'][0];
  const axis=[[1,0],[0,1],[-1,0],[0,-1]][facing]!;
  const faces=['north','east','south','west'];
  const facets=geometry.bones.find(b=>b.name===`drape_${facing}`)!.cubes.filter(c=>Object.values(c.uv).some((uv:any)=>uv?.material_instance===`cloth_${facing}`));
  const projected=(c:any)=>-(c.origin[0]+c.size[0]/2)*axis[0]!+(c.origin[2]+c.size[2]/2)*axis[1]!;
  facets.sort((a:any,b:any)=>projected(b)-projected(a));
  assert.deepEqual(facets.map((c:any)=>c.uv[faces[facing]!].uv[0]),[0,64]);
 }
});
