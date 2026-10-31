import test from 'node:test';
import assert from 'node:assert/strict';
import {ornateGeometry,laceLimit} from '../assets-src/atelier/ornate.mjs';
import {planFinish,type Tile} from '../src/domain/surface.ts';
import {DESIGNS} from '../src/domain/catalog.ts';
import {customizationFromFinish,customizationFinish,changeCustomization} from '../src/domain/customization.ts';

// Independent import-basis and Euler application, including turned faces.
function point(c:any,ix:number,iy:number,iz:number){
 const origin=[-(c.origin[0]+c.size[0]),c.origin[1],c.origin[2]];
 const p=c.pivot?[-c.pivot[0],c.pivot[1],c.pivot[2]]:[0,0,0];
 let v=origin.map((n:number,i:number)=>n+c.size[i]*[ix,iy,iz][i]-p[i]);
 const r=c.rotation?[-c.rotation[0],-c.rotation[1],c.rotation[2]]:[0,0,0];
 for(let axis=0;axis<3;axis++){const a=r[axis]*Math.PI/180,j=(axis+1)%3,k=(axis+2)%3,x=v[j],y=v[k];v[j]=x*Math.cos(a)-y*Math.sin(a);v[k]=x*Math.sin(a)+y*Math.cos(a);}
 return v.map((n:number,i:number)=>n+p[i]);
}
const corners=(c:any)=>[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>point(c,x,y,z))));
const bounds=(c:any)=>{const v=corners(c);return {lo:[0,1,2].map(i=>Math.min(...v.map(p=>p[i]))),hi:[0,1,2].map(i=>Math.max(...v.map(p=>p[i])))};};
const near=(a:number,b:number)=>Math.abs(a-b)<1e-7;
const facePoints=(c:any,f:string)=>{
 const indices:any={north:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],south:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],east:[[1,0,0],[1,0,1],[1,1,1],[1,1,0]],west:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],up:[[0,1,0],[1,1,0],[1,1,1],[0,1,1]]};
 return indices[f].map(([x,y,z]:number[])=>point(c,x,y,z));
};

test('linen owns the support plane and folded lips meet it without coplanar faces',()=>{
 for(let edges=0;edges<16;edges++){
  const g=ornateGeometry(true,edges).doc['minecraft:geometry'][0],top=g.bones.find((b:any)=>b.name==='top').cubes[0],t=bounds(top);
  assert.equal(t.hi[1],16);
  for(const b of g.bones.filter((b:any)=>b.name.startsWith('drape_'))){
   const lip=b.cubes.at(-1),v=bounds(lip);
   assert.ok(near(v.hi[1],t.lo[1]),'the lip must end at the linen underside, not inside the top surface');
   assert.equal(lip.uv.up,undefined,'the linen covers this contact face');assert.ok(lip.uv.down);
  }
 }
});

test('folded lips close the outer corners with no overlapping volume',()=>{
 for(let edges=0;edges<16;edges++){
  const g=ornateGeometry(true,edges).doc['minecraft:geometry'][0];
  const lips=g.bones.filter((b:any)=>b.name.startsWith('drape_')).map((b:any)=>bounds(b.cubes.at(-1)));
  for(let i=0;i<lips.length;i++)for(let j=i+1;j<lips.length;j++){
   const a=lips[i],b=lips[j],overlap=[0,1,2].map(k=>Math.min(a.hi[k],b.hi[k])-Math.max(a.lo[k],b.lo[k]));
   assert.ok(overlap.some(d=>d<1e-7),'adjacent returns must touch rather than intersect');
  }
 }
});

test('corner seams join the actual lace endpoints and end at the shared hem phase',()=>{
 for(let edges=0;edges<16;edges++){
  const g=ornateGeometry(true,edges).doc['minecraft:geometry'][0],points:number[][]=[];
  for(const b of g.bones.filter((b:any)=>b.name.startsWith('drape_')))for(const c of b.cubes)for(const [f,u] of Object.entries(c.uv) as any[])if(u?.material_instance==='lace')points.push(...facePoints(c,f).filter((p:number[])=>near(p[1],15.85)));
  for(const b of g.bones.filter((b:any)=>b.name.startsWith('fold_corner_'))){
   const c=b.cubes[0],[f,u]=Object.entries(c.uv).find(([,u]:any)=>u) as any;
   assert.equal(u.material_instance,'linen','the narrow stitched seam must not stretch a slice of the lace pattern');
   const top=facePoints(c,f).filter((p:number[])=>near(p[1],15.85));assert.equal(top.length,2);
   for(const p of top)assert.equal(points.filter(q=>q.every((n,i)=>near(n,p[i]))).length,1,'each seam end belongs to exactly one neighbouring drape');
   assert.ok(near(bounds(c).lo[1],15.85-4.5*laceLimit(0)/128));
  }
 }
});

test('cloth clears the architectural envelope and tiles retain a continuous free support plane',()=>{
 for(let edges=0;edges<16;edges++){
  const g=ornateGeometry(true,edges).doc['minecraft:geometry'][0];
  const body=g.bones.filter((b:any)=>!['top'].includes(b.name)&&!b.name.startsWith('drape_')&&!b.name.startsWith('fold_corner_')).flatMap((b:any)=>b.cubes).flatMap(corners);
  const envelope=Math.max(...body.flatMap((p:number[])=>[Math.abs(p[0]),Math.abs(p[2])]));
  for(const b of g.bones.filter((b:any)=>b.name.startsWith('drape_')||b.name.startsWith('fold_corner_')))for(const c of b.cubes){
   const vs=corners(c);
   assert.ok([0,2].some(axis=>vs.every(p=>p[axis]>=envelope-1e-7)||vs.every(p=>p[axis]<=-envelope+1e-7)),`${b.name} must stay outside the stone envelope`);
   assert.ok(vs.every(p=>p[1]<=16+1e-8));
  }
 }
 for(const [w,d] of [[1,1],[1,8],[16,1],[3,2],[7,2],[2,7],[8,2],[16,8]]){
  const grid:Tile[]=Array.from({length:w*d},(_,i)=>({position:{x:i%w,y:0,z:Math.floor(i/w)},stone:0,cloth:0,frontal:0,facing:0,edges:15}));
  const cells=planFinish(grid,{stone:0,cloth:0,ornamental:false,facing:0,design:'altare:s_colonnade_lace'});
  const tops=cells.map(t=>{const g=ornateGeometry(true,t.edges).doc['minecraft:geometry'][0],b=bounds(g.bones.find((b:any)=>b.name==='top').cubes[0]);return {lo:b.lo.map((n,i)=>n+[t.position.x*16,0,t.position.z*16][i]),hi:b.hi.map((n,i)=>n+[t.position.x*16,0,t.position.z*16][i])};});
  for(let z=0;z<d;z++)for(let x=0;x<w;x++){
   const a=tops[z*w+x];assert.equal(a.hi[1],16);
   assert.ok(a.lo[0]<=x*16-8+1e-7&&a.hi[0]>=x*16+8-1e-7&&a.lo[2]<=z*16-8+1e-7&&a.hi[2]>=z*16+8-1e-7);
   if(x+1<w)assert.ok(near(a.hi[0],tops[z*w+x+1].lo[0]));
   if(z+1<d)assert.ok(near(a.hi[2],tops[(z+1)*w+x].lo[2]));
  }
 }
});

test('the shared textile selection follows the altar family and retains color and relief intent',()=>{
 for(const design of DESIGNS){
  const initial=customizationFromFinish({stone:0,cloth:0,ornamental:false,facing:3,design:design.id});
  const visiting=changeCustomization(initial,{model:'colonnade'});
  assert.equal(visiting.textile,initial.textile);
  const back=changeCustomization(visiting,{model:initial.model});assert.deepEqual(customizationFinish(back),customizationFinish(initial));
  for(const textile of ['none','lace'] as const){
   const changed=changeCustomization(visiting,{textile}),returned=changeCustomization(changed,{model:initial.model});
   assert.equal(returned.textile,textile);assert.equal(returned.color,initial.color);assert.equal(returned.relief,initial.relief);
  }
 }
});
