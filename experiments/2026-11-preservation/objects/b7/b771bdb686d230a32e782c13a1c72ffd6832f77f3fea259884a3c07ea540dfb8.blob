import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../../viewer-3d/node_modules/three/build/three.module.js';
import {buildBedrockGeometry} from '../../../viewer-3d/src/shared/bedrock-geometry.js';
import {blockPreviewGeometry} from '../tools/block-preview-basis.mjs';
import {twinPedestalGeometry} from '../assets-src/atelier/twin-pedestal-prototype.mjs';
import {twinPedestalCollision,containsPoint,normalizeBoxes,unionVolume,collisionStudyReport} from '../assets-src/atelier/twin-pedestal-collision-study.mjs';
const close=(a:number,b:number,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const worldBoxes=(s:any,key='boxes')=>s.cells.flatMap((c:any)=>c[key].map((b:any)=>({origin:b.origin.map((n:number,k:number)=>n+c.center[k]),size:b.size})));
const covered=(boxes:any[],point:number[])=>boxes.some(b=>containsPoint(b,point));

test('all 512 configurations cover every authored cube vertex with legal local boxes and two supports',()=>{
 for(let w=1;w<=16;w++)for(let d=1;d<=8;d++)for(let f=0;f<4;f++){
  const s=twinPedestalCollision(w,d,f),detailed=worldBoxes(s),native=worldBoxes(s,'nativeBoxes'),economical=worldBoxes(s,'economicalBoxes');
  assert.equal(s.cells.length,w*d);assert.equal(s.solids.filter((b:any)=>b.role.endsWith('_shaft')).length,2);
  for(const c of s.cells)for(const key of ['boxes','nativeBoxes','economicalBoxes']){
   if(key!=='boxes')assert.ok(c[key].length<=16);
   for(const b of c[key]){
    assert.deepEqual(Object.keys(b).sort(),['origin','size']);
    for(let k=0;k<3;k++){assert.ok(Number.isFinite(b.origin[k]));assert.ok(b.size[k]>0);assert.ok(b.origin[k]>=(k===1?0:-8));assert.ok(b.origin[k]+b.size[k]<=(k===1?16:8)+1e-6);}
   }
  }
  for(const p of s.sourceVertices){assert.ok(covered(economical,p));assert.ok(covered(detailed,p),`detailed missing ${w}x${d}/${f}: ${p}`);assert.ok(covered(native,p),`native missing ${w}x${d}/${f}: ${p}`);}
  for(const y of [0,.54,1,2,6,10.8,12.7]){assert.ok(!covered(economical,[0,y,0]));assert.ok(!covered(detailed,[0,y,0]));assert.ok(!covered(native,[0,y,0]),`phantom middle ${w}x${d}/${f}`);}
  for(const bs of [detailed,native,economical])for(const b of bs){const axis=f%2?2:0;if(b.origin[1]<12.9)assert.ok(b.origin[axis]>0||b.origin[axis]+b.size[axis]<0,`lower midplane occupied ${w}x${d}/${f}`);}
  assert.ok(covered(detailed,[0,13,0]));assert.ok(covered(native,[0,13,0]));
  for(const cx of s.profile.centers){
   const x=f===0?cx:f===2?-cx:0,z=f===1?cx:f===3?-cx:0;
   for(const y of [0,.55,1.3,1.85,2.2,10.7,11.15,11.8,12.8,13.4,14.2,14.66,15.7,16])assert.ok(covered(detailed,[x,y,z]),`lost contact ${w}x${d}/${f}/${y}`);
  }
 }
});

test('independent Three geometry vertices agree for narrow, odd/even depths, maximum size and all facings',()=>{
 for(const [w,d] of [[1,1],[1,2],[1,3],[2,3],[3,2],[16,8]])for(let f=0;f<4;f++){
  const source=twinPedestalGeometry(w,d,f),g=blockPreviewGeometry(source.doc['minecraft:geometry'][0]),material=new THREE.MeshBasicMaterial();
  const built=buildBedrockGeometry(g,{identifier:g.description.identifier,textureWidth:128,textureHeight:128,formatVersion:'1.16.0'},{default:material,named:{wood_horizontal:material,wood_vertical:material,inlay:material}},{includePivots:false,includeLocators:false});
  built.root.updateMatrixWorld(true);const s=twinPedestalCollision(w,d,f),boxes=worldBoxes(s,'nativeBoxes');
  built.root.traverse((o:any)=>{if(!o.isMesh)return;const attr=o.geometry.attributes.position;for(let i=0;i<attr.count;i++){
   const p=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld).multiplyScalar(16).toArray();
   // BufferGeometry uses float32; allow its sub-microunit vertex noise.
   assert.ok(boxes.some(b=>p.every((n:number,k:number)=>n>=b.origin[k]-2e-5&&n<=b.origin[k]+b.size[k]+2e-5)),`render vertex absent ${w}x${d}/${f}: ${p}`);
  }});
 }
});

test('only exact duplicate or contained boxes are removed; empty space is not spanned',()=>{
 const a={origin:[0,0,0],end:[1,1,1]},b={origin:[2,0,0],end:[3,1,1]},inside={origin:[.2,.2,.2],end:[.8,.8,.8]};
 const result=normalizeBoxes([a,a,b,inside]);assert.equal(result.length,2);assert.ok(!covered(result,[1.5,.5,.5]));close(unionVolume(result),2);
 close(unionVolume([{origin:[0,0,0],size:[2,2,2]},{origin:[1,1,1],size:[2,2,2]}]),15);
});

test('report accounts for all occupied cells, native limit, exact palette costs and unchanged 80k gate',()=>{
 const r=collisionStudyReport();assert.equal(r.configurations,512);assert.equal(r.cellInstances,19584);assert.equal(r.distinctMultiBoxProfiles,599);assert.equal(r.nativeCompact.distinctProfiles,599);assert.equal(r.maxBoxesPerCell,28);assert.equal(r.nativeCompact.maxBoxesPerCell,16);assert.equal(r.economicalNative.distinctProfiles,467);assert.equal(r.economicalNative.maxBoxesPerCell,8);assert.equal(r.budget.headroom,0);assert.equal(r.budget.existingStates,80000);assert.ok(r.nativeCompact.maxExcessPerCell>0);assert.ok(r.nativeCompact.maxExcessPerCell<r.maxSingleBoxExcessPerCell);
});

test('tile clipping preserves the detailed solid-union volume, including even-depth seams',()=>{
 for(const [w,d] of [[1,1],[1,2],[1,3],[3,2],[3,3],[16,8]])for(let f=0;f<4;f++){const s=twinPedestalCollision(w,d,f);close(unionVolume(s.solids),s.cells.reduce((sum:number,c:any)=>sum+unionVolume(c.boxes),0),1e-4);}
});

test('invalid dimensions/facing reject rather than silently invent collision states',()=>{
 assert.throws(()=>twinPedestalCollision(0,1));assert.throws(()=>twinPedestalCollision(1,9));assert.throws(()=>twinPedestalCollision(1,1,4));assert.throws(()=>twinPedestalCollision(1.5,1));
});
