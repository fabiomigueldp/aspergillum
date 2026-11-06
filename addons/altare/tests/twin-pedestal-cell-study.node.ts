import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../../../viewer-3d/node_modules/three/build/three.module.js';
import {buildBedrockGeometry} from '../../../viewer-3d/src/shared/bedrock-geometry.js';
import {blockPreviewGeometry} from '../tools/block-preview-basis.mjs';
import {twinPedestalGeometry} from '../assets-src/atelier/twin-pedestal-prototype.mjs';
import {twinPedestalCells} from '../assets-src/atelier/twin-pedestal-cell-study.mjs';
const sub=(a:number[],b:number[])=>a.map((n,i)=>n-b[i]!);const dot=(a:number[],b:number[])=>a.reduce((s,n,i)=>s+n*b[i]!,0);const cross=(a:number[],b:number[])=>[a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
function triangles(doc:any,offset=[0,0,0]){
 const palette:any={named:{}};for(const k of ['wood_horizontal','wood_vertical','inlay']){const m=new THREE.MeshBasicMaterial();m.name=k;palette.named[k]=m;palette.default??=m;}
 const g=blockPreviewGeometry(doc['minecraft:geometry'][0]),b=buildBedrockGeometry(g,{identifier:g.description.identifier,textureWidth:128,textureHeight:128,formatVersion:'1.16.0'},palette,{includePivots:false,includeLocators:false});b.root.updateMatrixWorld(true);const out:any[]=[];
 b.root.traverseVisible((o:any)=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,u=o.geometry.attributes.uv,idx=o.geometry.index;for(const group of o.geometry.groups){const mat=Array.isArray(o.material)?o.material[group.materialIndex]:o.material;for(let i=group.start;i<group.start+group.count;i+=3){const pts=[],uv=[];for(let j=0;j<3;j++){const k=idx?idx.getX(i+j):i+j;pts.push(new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld).multiplyScalar(16).toArray().map((n,a)=>n+offset[a]!));uv.push([u.getX(k),u.getY(k)]);}const norm=cross(sub(pts[1]!,pts[0]!),sub(pts[2]!,pts[0]!)),area=Math.hypot(...norm)/2;out.push({pts,uv,normal:norm.map(n=>n/(2*area)),area,material:mat.name});}}o.geometry.dispose();});for(const m of Object.values(palette.named) as any[])m.dispose();return out;
}
function originalUv(t:any,p:number[]){
 if(Math.abs(dot(sub(p,t.pts[0]),t.normal))>2e-5)return null;
 const v0=sub(t.pts[1],t.pts[0]),v1=sub(t.pts[2],t.pts[0]),v2=sub(p,t.pts[0]),a=dot(v0,v0),b=dot(v0,v1),c=dot(v1,v1),d=dot(v2,v0),e=dot(v2,v1),det=a*c-b*b;
 if(det<1e-16)return null;const y=(c*d-b*e)/det,z=(a*e-b*d)/det,x=1-y-z;if(Math.min(x,y,z)<-2e-5)return null;
 return [0,1].map(i=>x*t.uv[0][i]+y*t.uv[1][i]+z*t.uv[2][i]);
}
test('research cell plans cover all dimensions without registering identifiers or states',()=>{
 let cells=0;for(let w=1;w<=16;w++)for(let d=1;d<=8;d++)for(let f=0;f<4;f++){
  const plan=twinPedestalCells(w,d,f);assert.equal(plan.registered,false);assert.equal(plan.cells.length,w*d);cells+=plan.cells.length;
  const shafts=new Set<string>();for(const cell of plan.cells){const g=cell.doc['minecraft:geometry'][0];for(const b of g.bones){if(b.name.endsWith('_shaft'))shafts.add(b.name);for(const c of b.cubes){assert.ok(c.size.every((v:number)=>v>0&&Number.isFinite(v)));for(const v of Object.values(c.uv) as any[])assert.ok(v.uv_size.every((v:number)=>v>0));}}}
  assert.deepEqual([...shafts].sort(),['pedestal_0_shaft','pedestal_1_shaft']);
 }assert.equal(cells,19584);
});
test('cell slicing preserves real mesh area, positions, winding and UVs in odd/even/narrow/maximum cases',()=>{
 for(const [w,d] of [[1,1],[3,2],[7,2],[1,3],[2,3],[16,8]])for(let f=0;f<4;f++){
  const original=triangles(twinPedestalGeometry(w,d,f).doc),plan=twinPedestalCells(w,d,f),actual:any[]=[];
  for(const cell of plan.cells){const ts=triangles(cell.doc,cell.center);for(const t of ts)for(const p of t.pts){assert.ok(p[0]>=cell.center[0]-8-2e-5&&p[0]<=cell.center[0]+8+2e-5);assert.ok(p[2]>=cell.center[2]-8-2e-5&&p[2]<=cell.center[2]+8+2e-5);}actual.push(...ts);}
  for(const mat of ['wood_horizontal','wood_vertical','inlay']){
   const area=(ts:any[])=>ts.filter(t=>t.material===mat).reduce((s,t)=>s+t.area,0);assert.ok(Math.abs(area(original)-area(actual))<.01,`${w}x${d}/${f}/${mat}: area mismatch ${area(original)} vs ${area(actual)}`);
  }
  for(const t of actual)for(let i=0;i<3;i++){
   const found=original.some(o=>o.material===t.material&&dot(o.normal,t.normal)>.99999&&(()=>{const uv=originalUv(o,t.pts[i]);return uv&&uv.every((n:number,j:number)=>Math.abs(n-t.uv[i][j])<2e-5);})());
   assert.ok(found,`${w}x${d}/${f}: UV/position not in original ${JSON.stringify({p:t.pts[i],uv:t.uv[i],m:t.material})}`);
  }
 }
});

test('module-grain policy changes only wood UVs, keeps inlays and physical geometry, and fits the atlas',()=>{
 for(const [w,d] of [[1,1],[3,2],[7,2],[1,3],[2,3],[16,8]])for(let f=0;f<4;f++){
  const exact=twinPedestalCells(w,d,f),grain=twinPedestalCells(w,d,f,{uvPolicy:'module-grain'});
  assert.equal(grain.uvPolicy,'module-grain');assert.equal(grain.cells.length,exact.cells.length);
  for(let i=0;i<exact.cells.length;i++){
   const a=exact.cells[i]!.doc['minecraft:geometry'][0].bones,b=grain.cells[i]!.doc['minecraft:geometry'][0].bones;assert.equal(a.length,b.length);
   for(let j=0;j<a.length;j++){assert.equal(a[j]!.name,b[j]!.name);assert.equal(a[j]!.cubes.length,b[j]!.cubes.length);
    for(let k=0;k<a[j]!.cubes.length;k++){
     const old=a[j]!.cubes[k]!,now=b[j]!.cubes[k]!,{uv:oldUv,...oldShape}=old,{uv:newUv,...newShape}=now;assert.deepEqual(newShape,oldShape);assert.deepEqual(Object.keys(newUv),Object.keys(oldUv));
     for(const face of Object.keys(newUv)){const u=newUv[face]!;assert.equal(u.material_instance,oldUv[face]!.material_instance);if(u.material_instance==='inlay')assert.deepEqual(u,oldUv[face]);for(let n=0;n<2;n++){assert.ok(u.uv[n]>=-1e-7);assert.ok(u.uv_size[n]>0);assert.ok(u.uv[n]+u.uv_size[n]<=128+1e-7);}}
    }
   }
  }
 }
 assert.throws(()=>twinPedestalCells(3,2,0,{uvPolicy:'invalid'}),/Unknown UV policy/);
});

test('permanent cut caps close fragments and pair only on internal cell boundaries',()=>{
 for(const [w,d] of [[1,1],[3,2],[7,2],[1,3],[2,3],[16,8]])for(let f=0;f<4;f++){
  const original=triangles(twinPedestalGeometry(w,d,f).doc),plan=twinPedestalCells(w,d,f,{uvPolicy:'module-grain',capCuts:true}),cuts=new Map<string,number[]>();let extra=0;
  const nx=f%2?d:w,nz=f%2?w:d;
  for(const cell of plan.cells){
   const g=cell.doc['minecraft:geometry'][0];assert.ok(g.bones.reduce((n:any,b:any)=>n+b.cubes.length,0)<=50);
   for(const t of triangles(cell.doc,cell.center)){
    const old=t.pts.every((p:number[])=>original.some(o=>o.material===t.material&&dot(o.normal,t.normal)>.99999&&originalUv(o,p)!==null));
    if(old)continue;
    extra++;const axis=Math.abs(t.normal[0])>.99999?0:Math.abs(t.normal[2])>.99999?2:-1;assert.notEqual(axis,-1,'Added cap must be vertical and axis aligned');
    const coordinate=t.pts[0][axis];assert.ok(t.pts.every((p:number[])=>Math.abs(p[axis]-coordinate)<2e-5));
    const size=axis===0?nx:nz,grid=(coordinate+size*8)/16;assert.ok(grid>0&&grid<size&&Math.abs(grid-Math.round(grid))<2e-5,'Cap must lie on an internal module plane');
    const other=axis===0?2:0,values=t.pts.map((p:number[])=>p[other]),ys=t.pts.map((p:number[])=>p[1]);
    const key=JSON.stringify([axis,coordinate,Math.min(...values),Math.max(...values),Math.min(...ys),Math.max(...ys)].map(n=>Number(n.toFixed(4))))+t.material;
    const areas=cuts.get(key)??[0,0];areas[t.normal[axis]>0?0:1]+=t.area;cuts.set(key,areas);
   }
  }
  for(const areas of cuts.values())assert.ok(Math.abs(areas[0]!-areas[1]!)<.001,'Two permanent caps must have opposite normals and equal area');
  if(w===1&&d===1)assert.equal(extra,0);else assert.ok(extra>0);
 }
});
