import test from 'node:test';
import assert from 'node:assert/strict';
import {ORNATE_DESIGNS} from '../src/domain/catalog.ts';
import {planFinish,withEdges,type Tile} from '../src/domain/surface.ts';
import {encodeTile,decodeTile} from '../src/domain/block-codec.ts';
import {customizationFromFinish,customizationFinish,changeCustomization} from '../src/domain/customization.ts';
import {ornateGeometry,lacePaint,laceLimit,columnPaint,giltPaint} from '../assets-src/atelier/ornate.mjs';
import {colonnadeProfile,colonnadeBudget} from '../assets-src/atelier/colonnade-model.mjs';
const grid=(w:number,d:number):Tile[]=>Array.from({length:w*d},(_,i)=>({position:{x:i%w,y:0,z:Math.floor(i/w)},stone:0,cloth:0,frontal:0,facing:0,edges:15}));

test('symmetric finishes need only sixteen poses each and survive every contour change',()=>{
 for(const d of ORNATE_DESIGNS)for(const w of [1,2,3,7,8,16])for(const depth of [1,2,8])for(let facing=0;facing<4;facing++){
  const tiles=planFinish(grid(w,depth),{stone:0,cloth:0,ornamental:false,facing,design:d.id});
  assert.ok(tiles.every(t=>t.facing===0&&t.frontal===0));
  for(const tile of tiles)for(let edges=0;edges<16;edges++){
   const t=withEdges(tile,edges),encoded=encodeTile(t);
   assert.deepEqual(Object.keys(encoded.states),['altare:edges']);assert.deepEqual(decodeTile(encoded.id,t.position,encoded.states),t);
  }
 }
});
test('lace repeats without a seam, has real holes and a connected heavy border',()=>{
 let holes=0,threads=0;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const p=lacePaint(x,y);assert.deepEqual(p,lacePaint(x+128,y));
  assert.ok(p.alpha===0||p.alpha===255);if(p.alpha===0)holes++;else threads++;
 }
 assert.ok(holes>4000&&threads>4000);
 for(let x=0;x<128;x+=.5){assert.equal(lacePaint(x,laceLimit(x)-1.5).alpha,255);assert.equal(lacePaint(x,laceLimit(x)+1).alpha,0);}
});
test('ornate cloth and body share full-height support and dress only exposed faces',()=>{
 for(let edges=0;edges<16;edges++)for(const lace of [false,true]){
  const g=ornateGeometry(lace,edges).doc['minecraft:geometry'][0];
  const cubes=g.bones.flatMap(b=>b.cubes);
  assert.ok(cubes.length<=colonnadeBudget.cubes);
  assert.ok(cubes.reduce((n,c)=>n+Object.values(c.uv).filter(Boolean).length,0)<=colonnadeBudget.quads);
  const top=g.bones.find(b=>b.name==='top').cubes[0];assert.equal(top.origin[1]+top.size[1],16);
  for(let side=0;side<4;side++){
   assert.equal(g.bones.some(b=>b.name===`columns_${side}`),!!(edges&(1<<side)));
   assert.equal(g.bones.some(b=>b.name===`drape_${side}`),lace&&!!(edges&(1<<side)));
  }
 }
});
test('shared floral and lace choices retain the intended relief when moving through Colonnade',()=>{
 let draft=customizationFromFinish({stone:0,cloth:0,ornamental:false,facing:3,design:'altare:a_ogive_limestone_ruby_cross'});
 draft=changeCustomization(draft,{model:'colonnade'});assert.equal(customizationFinish(draft).design,'altare:u_colonnade_ruby_red');
 draft=changeCustomization(draft,{textile:'lace'});assert.equal(customizationFinish(draft).design,'altare:s_colonnade_lace');
 draft=changeCustomization(draft,{model:'ogive'});assert.equal(customizationFinish(draft).design,'altare:u_ogive_limestone_lace_cross');
});

test('capitals share the exposed corners and join the full architrave under either finish',()=>{
 for(let edges=0;edges<16;edges++){
  const bare=ornateGeometry(false,edges).doc['minecraft:geometry'][0],dressed=ornateGeometry(true,edges).doc['minecraft:geometry'][0];
  const structure=(g:any)=>g.bones.filter((b:any)=>/^(core|plinth|tabletop_bevel|base_|columns_|capital_|corner_stile_|panel_frame_|architrave_)/.test(b.name));
  assert.deepEqual(structure(dressed),structure(bare),'cloth must not reshape its supporting architecture');
  const sides=Array.from({length:4},(_,i)=>i).filter(i=>edges&(1<<i)),corners=sides.filter(i=>edges&(1<<((i+3)%4)));
  const caps=bare.bones.filter((b:any)=>b.name.startsWith('capital_'));
  assert.equal(caps.length,sides.length*2-corners.length);
  assert.equal(caps.filter((b:any)=>b.name.startsWith('capital_corner_')).length,corners.length);
  for(const cap of caps){
   assert.equal(cap.cubes.length,3);
   const [neck,echinus,plate]=cap.cubes;
   assert.ok(Math.abs(neck.origin[1]+neck.size[1]-echinus.origin[1])<1e-10);
   assert.ok(Math.abs(echinus.origin[1]+echinus.size[1]-plate.origin[1])<1e-10);
   assert.ok(Math.abs(plate.origin[1]+plate.size[1]-colonnadeProfile.capitalTop)<1e-10);assert.equal(neck.uv.up,undefined,'hidden neck top must not duplicate the plate underside');
  }
  for(const band of bare.bones.filter((b:any)=>b.name.startsWith('architrave_'))){
   assert.equal(band.cubes[0].origin[1],colonnadeProfile.capitalTop);
   assert.ok(Math.abs(band.cubes.at(-1).origin[1]+band.cubes.at(-1).size[1]-colonnadeProfile.slabBottom)<1e-10);
  }
 }
});

test('fluting is matte and continuous around shaft faces; gilding remains periodic',()=>{
 for(let y=0;y<128;y+=4){
  assert.deepEqual(columnPaint(0,y),columnPaint(128,y));assert.deepEqual(giltPaint(0,y),giltPaint(128,y));
  assert.equal(columnPaint(16,y).metal,0);assert.ok(columnPaint(16,y).rough>200);
 }
 assert.ok(columnPaint(0,64).height<columnPaint(32,64).height);
 assert.equal(Math.abs(columnPaint(0,0).height),0);assert.equal(Math.abs(columnPaint(0,128).height),0);
 assert.ok(columnPaint(0,3).height>columnPaint(0,12).height);
 assert.ok(laceLimit(8)>(laceLimit(0)+laceLimit(16))/2,'the border must curve instead of forming a straight triangular edge');
});

// Undo only the published model basis, then independently apply its rotation.
// Shared endpoints, not the generator's facet count, establish a closed shaft.
function worldPoint(c:any,ix:number,iy:number,iz:number){
 const origin=[-(c.origin[0]+c.size[0]),c.origin[1],c.origin[2]];
 let v=origin.map((n:number,i:number)=>n+c.size[i]*[ix,iy,iz][i]);
 const pivot=c.pivot?[-c.pivot[0],c.pivot[1],c.pivot[2]]:[0,0,0];
 v=v.map((n:number,i:number)=>n-pivot[i]);
 const r=c.rotation?[-c.rotation[0],-c.rotation[1],c.rotation[2]]:[0,0,0];
 for(let axis=0;axis<3;axis++){
  const a=r[axis]*Math.PI/180,j=(axis+1)%3,k=(axis+2)%3,x=v[j],y=v[k];
  v[j]=x*Math.cos(a)-y*Math.sin(a);v[k]=x*Math.sin(a)+y*Math.cos(a);
 }
 return v.map((n:number,i:number)=>n+pivot[i]);
}
test('shaft facets close without cracks in all four directions and retain their true silhouette',()=>{
 for(let edges=0;edges<16;edges++){
 const g=ornateGeometry(false,edges).doc['minecraft:geometry'][0];
 for(const bone of g.bones.filter((b:any)=>b.name.startsWith('columns_'))){
  assert.equal(bone.cubes.length%4,0);
  for(let column=0;column<bone.cubes.length/4;column++){
   const points=new Map<string,number>();
   for(const c of bone.cubes.slice(column*4,column*4+4)){
    const faces=Object.keys(c.uv).filter(k=>c.uv[k]);assert.equal(faces.length,2);
    for(const f of faces){
    const endpoints=f==='north'?[[0,0,0],[1,0,0]]:f==='east'?[[1,0,0],[1,0,1]]:f==='south'?[[0,0,1],[1,0,1]]:[[0,0,0],[0,0,1]];
    for(const [ix,iy,iz] of endpoints){const v=worldPoint(c,ix,iy,iz),key=[v[0],v[2]].map(n=>n.toFixed(7)).join(',');points.set(key,(points.get(key)??0)+1);}
    }
    assert.equal(c.origin[1],colonnadeProfile.baseTop);
    assert.ok(Math.abs(c.origin[1]+c.size[1]-colonnadeProfile.shaftTop)<1e-9);
   }
   assert.equal(points.size,8);assert.ok([...points.values()].every(n=>n===2),'every facet edge has exactly one neighbour');
  }
 }
 }
});
test('moulded panel frames stand clear of the recessed field and stay inside the columns',()=>{
 const g=ornateGeometry(false,1).doc['minecraft:geometry'][0];
 const field=g.bones.find((b:any)=>b.name==='core').cubes[0];
 const frame=g.bones.find((b:any)=>b.name==='panel_frame_0');
 assert.ok(frame.cubes.length>=8);
 for(const c of frame.cubes){
  const vertices=[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>worldPoint(c,x,y,z))));
  assert.ok(Math.max(...vertices.map(v=>Math.abs(v[0])))<colonnadeProfile.columnX-.8);
  assert.ok(Math.min(...vertices.map(v=>v[2]))<field.origin[2]-.45,'a normal map cannot substitute for physical depth');
 }
 const base=g.bones.filter((b:any)=>b.name.startsWith('base_'));
 for(const b of base)assert.ok(Math.abs(b.cubes.at(-1).origin[1]+b.cubes.at(-1).size[1]-colonnadeProfile.baseTop)<1e-9);
});
test('all sculpted parts keep the placement cell, top plane and texture bounds valid',()=>{
 for(let edges=0;edges<16;edges++)for(const lace of [false,true]){
  const g=ornateGeometry(lace,edges).doc['minecraft:geometry'][0];
  for(const c of g.bones.flatMap((b:any)=>b.cubes)){
   for(const u of Object.values(c.uv).filter(Boolean) as any[])for(let axis=0;axis<2;axis++)assert.ok(Number.isInteger(u.uv[axis])&&u.uv[axis]>=0&&u.uv[axis]+u.uv_size[axis]<=128);
   for(const x of [0,1])for(const y of [0,1])for(const z of [0,1]){
    const v=worldPoint(c,x,y,z);assert.ok(v[1]>=-1e-6&&v[1]<=16+1e-6);assert.ok(Math.abs(v[0])<=8.5&&Math.abs(v[2])<=8.5);
   }
  }
 }
});
test('projecting ledges remain closed above and below their narrower supports',()=>{
 for(let edges=1;edges<16;edges++){
  const g=ornateGeometry(true,edges).doc['minecraft:geometry'][0];
  for(const b of g.bones){
   if(b.name.startsWith('base_')){assert.ok(b.cubes[0].uv.up&&b.cubes[0].uv.down);assert.ok(b.cubes.slice(1).every((c:any)=>c.uv.up));}
   if(b.name.startsWith('capital_')){assert.ok(b.cubes.slice(0,-1).every((c:any)=>c.uv.down));assert.ok(b.cubes.at(-1).uv.up&&b.cubes.at(-1).uv.down);}
   if(b.name.startsWith('architrave_'))assert.ok(b.cubes.every((c:any)=>c.uv.down));
   if(b.name.startsWith('drape_')){assert.ok(b.cubes.at(-1).uv.down);assert.equal(b.cubes.at(-1).uv.up,undefined,'the support sheet owns the upper contact');}
  }
 }
});
test('the seven-block dressed altar keeps its compiled surface cost bounded',()=>{
 const cells=planFinish(grid(7,2),{stone:0,cloth:0,ornamental:false,facing:0,design:'altare:s_colonnade_lace'});
 const counts=cells.map(t=>ornateGeometry(true,t.edges).doc['minecraft:geometry'][0].bones.flatMap((b:any)=>b.cubes));
 assert.ok(counts.reduce((n,cs)=>n+cs.length,0)/cells.length<=50);
 assert.ok(counts.reduce((n,cs)=>n+cs.reduce((m,c)=>m+Object.values(c.uv).filter(Boolean).length,0),0)/cells.length<=180);
});
test('fine panel beads close their corners with butt joints and no overlapping front faces',()=>{
 const g=ornateGeometry(false,1).doc['minecraft:geometry'][0];
 const bars=g.bones.find((b:any)=>b.name==='panel_frame_0').cubes.filter((_:any,i:number)=>i%2===1);
 const bounds=bars.map((c:any)=>{
  const vs=[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>worldPoint(c,x,y,z))));
  return {lo:[0,1,2].map(i=>Math.min(...vs.map(v=>v[i]))),hi:[0,1,2].map(i=>Math.max(...vs.map(v=>v[i])))};
 });
 const [bottom,top,left,right]=bounds,near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8);
 for(const vertical of [left,right]){near(vertical.lo[1],bottom.hi[1]);near(vertical.hi[1],top.lo[1]);}
 near(bottom.lo[0],left.lo[0]);near(bottom.hi[0],right.hi[0]);
 near(top.lo[0],left.lo[0]);near(top.hi[0],right.hi[0]);
});

test('each exposed corner has one shared shaft and every shaft has a unique centre',()=>{
 for(let edges=0;edges<16;edges++){
  const g=ornateGeometry(false,edges).doc['minecraft:geometry'][0],centres=new Set<string>();
  let sides=0,corners=0;
  for(let side=0;side<4;side++){
   if(edges&(1<<side))sides++;
   const present=!!(edges&(1<<side))&&!!(edges&(1<<((side+3)%4)));
   assert.equal(g.bones.some((b:any)=>b.name===`columns_corner_${side}`),present);if(present)corners++;
  }
  for(const b of g.bones.filter((b:any)=>b.name.startsWith('columns_')))for(let i=0;i<b.cubes.length;i+=4){
   const p=b.cubes[i].pivot,key=[-p[0],p[2]].map((n:number)=>n.toFixed(7)).join(',');
   assert.ok(!centres.has(key));centres.add(key);
   if(b.name.startsWith('columns_corner_')){assert.ok(Math.abs(Math.abs(p[0])-colonnadeProfile.cornerColumn)<1e-8);assert.ok(Math.abs(Math.abs(p[2])-colonnadeProfile.cornerColumn)<1e-8);}
  }
  assert.equal(centres.size,sides*2-corners);
 }
});

test('every octagonal shaft fits its bearing surfaces and the three profile courses meet',()=>{
 const bounds=(c:any)=>{
  const vs=[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>worldPoint(c,x,y,z))));
  return {lo:[0,1,2].map(i=>Math.min(...vs.map(v=>v[i]))),hi:[0,1,2].map(i=>Math.max(...vs.map(v=>v[i])))};
 };
 for(let edges=0;edges<16;edges++){
  const g=ornateGeometry(false,edges).doc['minecraft:geometry'][0];
  for(const base of g.bones.filter((b:any)=>b.name.startsWith('base_'))){
   const cap=g.bones.find((b:any)=>b.name===base.name.replace('base_','capital_'));
   for(const b of [base,cap]){
    assert.equal(b.cubes.length,3);
    for(let i=1;i<3;i++)assert.ok(Math.abs(bounds(b.cubes[i-1]).hi[1]-bounds(b.cubes[i]).lo[1])<1e-8);
   }
   const foot=bounds(base.cubes.at(-1)),neck=bounds(cap.cubes[0]),cx=(foot.lo[0]+foot.hi[0])/2,cz=(foot.lo[2]+foot.hi[2])/2;
   const shaft=g.bones.filter((b:any)=>b.name.startsWith('columns_')).flatMap((b:any)=>b.cubes).filter((c:any)=>Math.abs(-c.pivot[0]-cx)<1e-8&&Math.abs(c.pivot[2]-cz)<1e-8);
   assert.equal(shaft.length,4);
   for(const c of shaft){
    const s=bounds(c);for(const i of [0,2]){assert.ok(s.lo[i]>=foot.lo[i]-1e-8&&s.hi[i]<=foot.hi[i]+1e-8);assert.ok(s.lo[i]>=neck.lo[i]-1e-8&&s.hi[i]<=neck.hi[i]+1e-8);}
    assert.ok(Math.abs(s.lo[1]-foot.hi[1])<1e-8&&Math.abs(s.hi[1]-neck.lo[1])<1e-8);
   }
  }
 }
});
