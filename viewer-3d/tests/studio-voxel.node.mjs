import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {BLOCKS,SHAPES,planEnvironment,blockKey} from '../src/render-studio/voxel-plan.js';
import {meshVoxelPlan} from '../src/render-studio/voxel-mesh.js';
const lock=JSON.parse(fs.readFileSync(new URL('../assets-src/studio/vanilla-sources.json',import.meta.url)));
test('every environment uses pinned native 16x16 textures and a Minecraft block grid',()=>{
 for(const block of Object.values(BLOCKS))for(const texture of Object.values(block)){
  const file=lock.files[texture+'.png'];assert.ok(file);assert.equal(file.width,16);assert.equal(file.height,16);assert.match(file.sha256,/^[a-f0-9]{64}$/);
 }
 for(const id of ['gallery','chapel','studio'])for(const width of [1,7,8,16])for(const depth of [1,2,8]){
  const plan=planEnvironment(id,width,depth),cells=new Map(plan.cells.map(c=>[blockKey(c.x,c.y,c.z),c]));
  assert.equal(cells.size,plan.cells.length);
  for(const c of plan.cells){assert.ok([c.x,c.y,c.z].every(Number.isInteger));assert.ok(BLOCKS[c.block]);assert.ok(SHAPES[c.shape]);}
  for(let x=0;x<width;x++)for(let z=0;z<depth;z++){
   assert.equal(cells.get(blockKey(x,-1,z)).shape,'cube','altar must sit on y=0');assert.ok(!cells.has(blockKey(x,0,z)),'scenery must never intersect the altar');
  }
 }
 assert.equal(planEnvironment('transparent').cells.length,0);
});

test('stairs and transparent panes expose only their actual surface, with native texel density',()=>{
 const materials=new Map(Object.values(BLOCKS).flatMap(Object.values).map(id=>[id,new THREE.MeshLambertMaterial()]));
 const cell=(x,shape,block='stone')=>({x,y:0,z:0,shape,block});
 for(const [cells,expectedArea]of [
  [[cell(0,'stairNorth')],5.5],[[cell(0,'archWest')],5.5],
  [[cell(0,'cube'),cell(1,'slab')],9],
  [[cell(0,'paneZ','blueGlass')],2.5],
  [[cell(0,'cube'),cell(1,'cube','blueGlass')],11],
 ]){
  const root=meshVoxelPlan({cells,offset:[0,0,0]},materials);let area=0;
  for(const mesh of root.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv;
   for(let i=0;i<p.count;i+=3){
    const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);
    const cross=b.clone().sub(a).cross(c.clone().sub(a));area+=cross.length()/2;
    assert.ok(cross.dot(new THREE.Vector3().fromBufferAttribute(n,i))>0,'outward winding on every fragment');
    const uvLength=Math.hypot(uv.getX(i+1)-uv.getX(i),uv.getY(i+1)-uv.getY(i));
    assert.ok(Math.abs(a.distanceTo(b)-uvLength)<1e-6,'one UV unit must remain one block');
   }mesh.geometry.dispose();
  }assert.ok(Math.abs(area-expectedArea)<1e-6,`surface ${area} must equal ${expectedArea}`);
 }for(const material of materials.values())material.dispose();
});

test('new constructions keep the aisle clear and isolate roofs for the upper inspection view',()=>{
 for(const id of ['gallery','chapel','studio']){
  const plan=planEnvironment(id,7,2),cells=new Map(plan.cells.map(c=>[blockKey(c.x,c.y,c.z),c]));
  for(let z=-12;z<-3;z++)for(let x=2;x<=4;x++)assert.ok(!cells.has(blockKey(x,0,z)),'processional aisle stays open');
  for(const [x,z]of plan.landmarks.planters)assert.equal(cells.get(blockKey(x,1,z)).block,'flowers');
  assert.equal(plan.cells.some(c=>c.layer==='roof'),id!=='studio');
  assert.ok(plan.cells.some(c=>c.shape==='archEast'));
  if(id!=='studio')assert.ok(plan.cells.some(c=>c.shape==='paneZ'));
 }
 const materials=new Map(Object.values(BLOCKS).flatMap(Object.values).map(id=>[id,new THREE.MeshLambertMaterial()]));
 const root=meshVoxelPlan({offset:[0,0,0],cells:[{x:0,y:0,z:0,block:'stone',shape:'cube'},{x:0,y:2,z:0,block:'stone',shape:'slab',layer:'roof'}]},materials);
 assert.equal(root.children.length,2,'same material remains independently visible in the ceiling layer');
 assert.deepEqual(root.children.map(c=>c.userData.layer).sort(),['architecture','roof']);
 for(const mesh of root.children)mesh.geometry.dispose();for(const material of materials.values())material.dispose();
});
test('voxel mesher culls shared faces, keeps partial-block UV scale and outward winding',()=>{
 const materials=new Map(Object.values(BLOCKS).flatMap(b=>Object.values(b)).map(id=>[id,new THREE.MeshLambertMaterial()]));
 for(const cells of [
  [{x:0,y:0,z:0,shape:'cube',block:'stone'},{x:1,y:0,z:0,shape:'cube',block:'stone'}],
  [{x:0,y:0,z:0,shape:'slab',block:'stone'}],
 ]){
  const root=meshVoxelPlan({cells,offset:[0,0,0]},materials);assert.equal(root.userData.visibleFaces,cells.length===2?10:6);
  for(const m of root.children){const p=m.geometry.attributes.position,n=m.geometry.attributes.normal,uv=m.geometry.attributes.uv;
   for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);assert.ok(b.sub(a).cross(c.sub(a)).dot(new THREE.Vector3().fromBufferAttribute(n,i))>0);}
   if(cells.length===1)for(let i=0;i<p.count;i++)if(n.getY(i)===0)assert.ok(uv.getY(i)<=.5,'half slab crops texture instead of squeezing a full block into it');
   m.geometry.dispose();
  }
 }
 for(const m of materials.values())m.dispose();
});
