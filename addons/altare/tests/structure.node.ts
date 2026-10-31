import test from 'node:test';
import assert from 'node:assert/strict';
import {structureCollision,atelierGeometry} from '../assets-src/atelier/geometry.mjs';

test('structural members keep their shape under every textile and relief',()=>{
 for(const structure of ['pilaster','ogive','trestle'])for(let facing=0;facing<4;facing++){
  const members=(textile:string,frontal:string)=>atelierGeometry(structure,textile,frontal,facing).doc['minecraft:geometry'][0].bones.filter(b=>/^(core|pier|ogive|rail|frame|stretcher)/.test(b.name));
  const baseline=members('none','none');
  for(const textile of ['none','agnus','ruby','verdant','requiem'])for(const frontal of ['none','cross','agnus'])assert.deepEqual(members(textile,frontal),baseline,`${structure}/${textile}/${frontal}/${facing}`);
 }
});

test('trestle collisions use stable origin/size boxes, support y=16 and leave the middle open',()=>{
 for(let facing=0;facing<4;facing++)for(let edges=0;edges<16;edges++){
  const collision=structureCollision('trestle',edges,facing);
  assert.ok(Array.isArray(collision)&&collision.length>0&&collision.length<=16);
  for(const b of collision){
   assert.deepEqual(Object.keys(b).sort(),['origin','size'],'min/max rejected by the reported Bedrock runtime');
   assert.ok(b.size.every((v:number)=>Number.isFinite(v)&&v>0));
   assert.ok(b.origin.every((v:number,i:number)=>Number.isFinite(v)&&v>=[-8,0,-8][i]!&&v+b.size[i]<=[8,16,8][i]!+1e-6));
  }
  assert.ok(collision.some(b=>b.origin.join(',')==='-8,14.2,-8'&&b.size.join(',')==='16,1.8,16'));
  const blocked=(point:number[])=>collision.some(b=>point.every((v,i)=>v>b.origin[i]&&v<b.origin[i]+b.size[i]));
  assert.equal(blocked([0,7,0]),false,'invisible solid body below the tabletop');
 }
});

test('trestle end frames are selected on the two structural ends in every orientation',()=>{
 for(let facing=0;facing<4;facing++)for(let edges=0;edges<16;edges++){
  const {doc,visibility}=atelierGeometry('trestle','agnus','cross',facing);
  const q={block_state:()=>edges},math={floor:Math.floor,mod:(a:number,b:number)=>a%b};
  for(const [name,side] of [['left',(facing+3)%4],['right',(facing+1)%4]] as const){
   const bone=doc['minecraft:geometry'][0].bones.find(b=>b.name===`frame_${name}`);
   assert.ok(bone,'a trestle frame must include foot, upright, head and two braces');
   assert.equal(bone.cubes.length,5);
   assert.equal(Boolean(Function('q','math',`return ${visibility[bone.name]}`)(q,math)),!!(edges&(1<<side)));
  }
  assert.ok(doc['minecraft:geometry'][0].bones.flatMap(b=>b.cubes).length<=50);
 }
});

test('stable collision volumes contain the rotated structural vertices, including diagonal braces and faceted balusters',()=>{
 for(const structure of ['trestle','baluster'])for(let facing=0;facing<4;facing++)for(let edges=0;edges<16;edges++){
  const {doc,visibility}=atelierGeometry(structure,'none','none',facing,structure==='baluster'?edges:undefined),boxes=structureCollision(structure,edges,facing);
  const q={block_state:()=>edges},math={floor:Math.floor,mod:(a:number,b:number)=>a%b};
  const cubes=doc['minecraft:geometry'][0].bones.filter(b=>!visibility[b.name]||Function('q','math',`return ${visibility[b.name]}`)(q,math)).flatMap(b=>b.cubes);
  for(const c of cubes)for(const i of [0,1])for(const j of [0,1])for(const k of [0,1]){
   const o=[-(c.origin[0]+c.size[0]),c.origin[1],c.origin[2]],pivot=c.pivot?[-c.pivot[0],c.pivot[1],c.pivot[2]]:[0,0,0];
   let [x,y,z]=o.map((v,n)=>v+[i,j,k][n]!*c.size[n]-pivot[n]);
   const [rx,ry,rz]=(c.rotation?[-c.rotation[0],-c.rotation[1],c.rotation[2]]:[0,0,0]).map(v=>v*Math.PI/180);
   [y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];
   [x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)];
   [x,y]=[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz)];
   const point=[x,y,z].map((v,n)=>v+pivot[n]);
   assert.ok(boxes.some(b=>point.every((v,n)=>v>=b.origin[n]-1e-6&&v<=b.origin[n]+b.size[n]+1e-6)),`uncovered structural vertex ${point}`);
  }
 }
});
