import test from 'node:test';
import assert from 'node:assert/strict';
import {definitions} from '../assets-src/textures.mjs';
import {authorGeometry,visibility} from '../assets-src/model.mjs';
import {planFinish} from '../src/domain/surface.ts';

test('split monogram joins across the actual north-face UV seam without stretching or mirroring the motif',()=>{
 const defs=new Map(definitions().map(d=>[d.id,d.paint]));
 const full=defs.get('frontal_2')!,start=defs.get('frontal_3')!,end=defs.get('frontal_4')!;
 const isRed=(s:any)=>s.rgb[0]>100&&s.rgb[1]<60&&s.rgb[2]<60;
 for(let y=10;y<76;y++)for(let x=29;x<100;x++){
  // Viewed from north: end is on the left, start is on the right.
  const split=x<64?end(x+64,y):start(x-64,y);
  assert.equal(isRed(split),isRed(full(x,y)),`motif discontinuity at ${x},${y}`);
  if(Math.hypot(x-64,y-42)<28)assert.deepEqual(split,full(x,y),'colour and relief within the centre must share the same source sample');
 }
});

test('Bedrock import places every visible perimeter bone on its world side, across all orientations and masks',()=>{
 // Independent import oracle: Blockbench parseCube, not the production serializer.
 // A model's authored positive X is world negative X. This failed on 0.1.2.
 const worldCenter=(c:any)=>[-(c.origin[0]+c.size[0]/2),c.origin[1]+c.size[1]/2,c.origin[2]+c.size[2]/2];
 const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 for(const long of [false,true])for(let facing=0;facing<4;facing++){
  const expressions=visibility(facing),bones=authorGeometry(long,facing)['minecraft:geometry'][0].bones;
  for(let side=0;side<4;side++)for(const kind of ['edge','cloth','frontal']){
   if(kind==='frontal'&&side!==facing)continue;
   const bone=bones.find(b=>b.name===`${kind}_${side}`)!;
   for(const c of bone.cubes){const p=worldCenter(c);assert.ok(p[0]!*dirs[side]![0]!+p[2]!*dirs[side]![1]!>8,`${bone.name} points inward or to the wrong side`);}
  }
  for(let edges=0;edges<16;edges++)for(let side=0;side<4;side++){
   const expression=expressions[`cloth_${side}`];
   const shown=Function('q','math',`return ${expression}`)({block_state:(k:string)=>k==='altare:edges'?edges:long?4:3},{mod:(a:number,b:number)=>a%b,floor:Math.floor});
   assert.equal(shown,!!(edges&(1<<side)));
  }
  // Check corners by both independent plane normals; a corner must cap the two named sides.
  for(let side=0;side<4;side++){
   const c=bones.find(b=>b.name===`corner_${side}`)!.cubes[0],p=worldCenter(c);
   for(const d of [side,(side+3)%4])assert.ok(p[0]!*dirs[d]![0]!+p[2]!*dirs[d]![1]!>8);
  }
 }
 for(let facing=0;facing<4;facing++){
  const tiles=Array.from({length:12},(_,i)=>({position:{x:i%4,y:0,z:Math.floor(i/4)},stone:0,cloth:3,frontal:0,facing:0,edges:15}));
  const plan=planFinish(tiles,{stone:0,cloth:3,ornamental:true,facing});
  assert.equal(plan.filter(t=>t.frontal>0).length,facing%2===0?4:3);
 }
});

test('every drape segment includes the complete hem, independent of sag and direction',()=>{
 for(const long of [false,true])for(const bone of authorGeometry(long)['minecraft:geometry'][0].bones.filter(b=>b.name.startsWith('cloth_'))){
  const segments=bone.cubes.filter(c=>Object.values(c.uv).some((uv:any)=>uv.material_instance==='hem'));
  assert.equal(segments.length,2);
  for(const c of segments)for(const uv of Object.values(c.uv) as any[])if(uv.material_instance==='hem'){
   assert.equal(uv.uv[1]+uv.uv_size[1],long?86:28,'the lower seam must never be cropped');
  }
 }
});

test('stone and linen are periodic at module boundaries; ornament resolution fits the explicit memory budget',()=>{
 const defs=definitions();let bytes=0;
 for(const d of defs){
  bytes+=d.size*(d.height??d.size)*4*3;
  for(const [x,y] of [[0,0],[12.5,42.25],[127.5,127.5]]){
   const s=d.paint(x,y);
   assert.ok([...s.rgb,s.height,s.metal,s.rough].every(Number.isFinite));
   assert.ok([...s.rgb,s.metal,s.rough].every(v=>v>=0&&v<=255));
   if(d.id.startsWith('stone_')||d.id==='linen')for(const [a,b] of [[x+128,y],[x,y+128]]){
    const repeat=d.paint(a,b);assert.deepEqual(repeat.rgb,s.rgb);assert.ok(Math.abs(repeat.height-s.height)<1e-8);
   }
  }
 }
 assert.ok(bytes<=12*1024*1024);
 assert.ok(defs.every(d=>d.size*(d.height??d.size)*4<=262144),'each atlas layer must meet the official memory budget');
 const ground=defs.find(d=>d.id==='frontal_1')!;
 for(const d of defs.filter(d=>/^frontal_\d+$/.test(d.id)&&d.id!=='frontal_5')){
  assert.equal(d.size,ground.size);assert.equal(d.height,ground.height,'PBR sampling must not change across new frontal roles');
 }
});
test('all rotated cloth vertices remain below the support plane and within the lateral envelope',()=>{
 for(const long of [false,true])for(let facing=0;facing<4;facing++){
  const g=authorGeometry(long,facing)['minecraft:geometry'][0];
  assert.ok(g.bones.flatMap(b=>b.cubes??[]).length<=50);
  for(const b of g.bones)for(const c of b.cubes??[]){
   for(const ix of [0,1])for(const iy of [0,1])for(const iz of [0,1]){
    let [x,y,z]=c.origin.map((v:number,i:number)=>v+c.size[i]*[ix,iy,iz][i]!);
    if(c.rotation){const [px,py,pz]=c.pivot;const angle=c.rotation[1]*Math.PI/180,dx=x-px,dz=z-pz;x=px+dx*Math.cos(angle)+dz*Math.sin(angle);z=pz-dx*Math.sin(angle)+dz*Math.cos(angle);}
    assert.ok(y>=0&&y<=16+1e-8);
    assert.ok(Math.abs(x)<=8.5&&Math.abs(z)<=8.5,`${b.name} ${x},${z}`);
   }
  }
 }
});
