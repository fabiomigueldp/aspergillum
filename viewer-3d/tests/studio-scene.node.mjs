import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {sanctuaryLayout,sceneCutaway} from '../src/render-studio/scene-layout.js';
import {planEnvironment,BLOCKS,SHAPES,blockKey} from '../src/render-studio/voxel-plan.js';
import {planLiturgy} from '../src/render-studio/liturgical-plan.js';
import {fitObjectBounds,placementBounds} from '../src/render-studio/camera-framing.js';
import {meshVoxelPlan} from '../src/render-studio/voxel-mesh.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../assets-src/studio/props-sources.json',import.meta.url)));

test('a continuous raised floor supports every native prop footprint, including even and narrow altars',()=>{
 for(const environment of ['gallery','chapel','studio'])for(const width of [1,7,8,16])for(const depth of [1,2,8]){
  const p=planLiturgy({environment,width,depth},catalog),plan=planEnvironment(environment,width,depth,p);
  const cells=new Map(plan.cells.map(c=>[blockKey(c.x,c.y,c.z),c])),l=plan.layout;
  for(let x=l.platform.left;x<=l.platform.right;x++)for(let z=0;z<l.back;z++)assert.ok(SHAPES[cells.get(blockKey(x,-1,z)).shape].some(b=>b[4]===1),'full sanctuary support');
  for(const a of p.placements.filter(a=>['platform','pedestal','planter'].includes(a.support))){
   for(const dx of [-.499,.499])for(const dz of [-.499,.499]){
    const x=Math.floor(a.position[0]+a.size[0]*dx-plan.offset[0]),z=Math.floor(a.position[2]+a.size[2]*dz-plan.offset[2]);
    const tops=plan.cells.filter(c=>c.x===x&&c.z===z).flatMap(c=>SHAPES[c.shape].map(b=>c.y+b[4])).filter(y=>y<=a.position[1]+.001);
    assert.ok(Math.abs(Math.max(...tops)-a.position[1])<.001,`${a.id} must be supported at all corners`);
   }
  }
  assert.equal(p.credence.position[1],0);assert.equal(p.credence.top,1);
  assert.ok(p.placements.filter(a=>a.support==='credence').every(a=>a.position[1]>p.credence.top));
  assert.ok(catalog.assets.find(a=>a.id==='flowers-white').size.filter((_,i)=>i!==1).every(s=>s<1.875),'bouquet fits inside the tray rim');
 }
});

test('furniture is clear of altar, candles, credence and the central circulation strip',()=>{
 const intersects=(a,b)=>[0,2].every(i=>Math.abs(a.position[i]-b.position[i])<(a.size[i]+b.size[i])/2-.001);
 for(const width of [1,7,8,16])for(const depth of [1,2,8])for(const candlePlacement of ['floor','mensa']){
  const p=planLiturgy({width,depth,candlePlacement},catalog),l=sanctuaryLayout(width,depth);
  const objects=[...p.placements.filter(a=>!['flowers','vessel','gospel'].includes(a.role)),{id:'altar',position:[0,0,0],size:[width,1,depth]},
   {id:'credence',position:p.credence.position,size:[2,1,1]}];
  const furniture=[{id:'ambo',position:[l.amboCell[0]+.5-width/2,0,l.amboCell[1]+.5-depth/2],size:[1,1.5,1]},
   ...l.chairCells.map(([x,z])=>({id:'chair',position:[x+.5-width/2,0,z+.5-depth/2],size:[1,1.5,1]}))];
  for(const a of furniture)for(const b of objects)assert.ok(!intersects(a,b),`${a.id} intersects ${b.id}`);
  // A one-block strip behind the mensa remains open, including the episcopal candle option.
  const seven=planLiturgy({width,depth,candles:7},catalog);
  assert.ok(seven.placements.filter(a=>a.support!=='altar'&&a.role!=='vessel').every(a=>
   Math.abs(a.position[0])-a.size[0]/2>=width/2||a.position[2]-a.size[2]/2>=depth/2+1));
 }
});

test('lights are recessed in walls, chairs have seats, and planter trays remain low',()=>{
 for(const id of ['gallery','chapel']){
  const p=planLiturgy({environment:id},catalog),plan=planEnvironment(id,7,2,p);
  for(const light of plan.cells.filter(c=>c.block==='light'))assert.ok([plan.layout.left,plan.layout.right].includes(light.x));
  assert.equal(plan.details.length,3);assert.ok(plan.details.every(c=>c.shape==='chairCushion'));
  assert.equal(plan.cells.filter(c=>c.shape==='chair').length,3);assert.equal(plan.cells.filter(c=>c.shape==='chairCrown').length,1);
  assert.equal(plan.cells.filter(c=>c.shape.startsWith('tray')).length,8);
 }
});

test('camera fitting uses projected object bounds without imaginary empty scene corners',()=>{
 const boxes=[placementBounds({position:[0,0,0],size:[7,1,2]}),placementBounds({position:[0,0,7.5],size:[1.2,4,.5]})];
 const target=new THREE.Vector3(0,1.25,0),direction=new THREE.Vector3(.26,.22,-1).normalize();
 for(const aspect of [16/9,4/5]){
  const fitted=fitObjectBounds(boxes,target,direction,aspect,45),union=boxes.reduce((b,a)=>b.union(a),new THREE.Box3());
  assert.ok(fitted.distance<fitObjectBounds([union],target,direction,aspect,45).distance);
  const camera=new THREE.PerspectiveCamera(45,aspect,.05,150);camera.position.copy(target).addScaledVector(direction,fitted.distance);camera.lookAt(target);camera.updateMatrixWorld();
  for(const b of boxes)for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
   const v=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1,'all actual corners remain inside the image');
  }
 }
});

test('cutaway layers reveal the altar from behind and retain faces previously covered by walls',()=>{
 const layout=sanctuaryLayout(7,2);
 assert.deepEqual(sceneCutaway('back',[0,4,15],layout,7,2,'gallery'),['apse']);
 assert.deepEqual(sceneCutaway('back',[5,4,15],layout,7,2,'gallery'),['apse','wall-right']);
 assert.deepEqual(sceneCutaway('top',[0,18,0],layout,7,2,'gallery'),['roof']);
 assert.deepEqual(sceneCutaway('hero',[-20,4,0],layout,7,2,'gallery'),['wall-left']);
 assert.deepEqual(sceneCutaway('hero',[7.45,4,0],layout,7,2,'gallery'),['wall-right'],'eye near the inner wall face must not be blocked');
 assert.deepEqual(sceneCutaway('top',[0,18,0],layout,7,2,'studio'),[]);
 const materials=new Map(Object.values(BLOCKS).flatMap(Object.values).map(id=>[id,new THREE.MeshLambertMaterial()]));
 const root=meshVoxelPlan({offset:[0,0,0],cells:[{x:0,y:0,z:0,shape:'cube',block:'stone'},
  {x:1,y:0,z:0,shape:'cube',block:'stone',layer:'wall-right'}]},materials);
 const main=root.children.find(c=>c.userData.layer==='architecture');
 assert.equal(main.geometry.attributes.position.count,36,'the hidden wall must not leave a hole in the retained object');
 root.traverse(o=>o.geometry?.dispose());for(const m of materials.values())m.dispose();
});

test('cloister parterres leave a continuous central approach to the steps',()=>{
 for(const width of [1,7,8,16]){
  const p=planEnvironment('studio',width,2),cells=new Map(p.cells.map(c=>[blockKey(c.x,c.y,c.z),c]));
  const {c1,c2}=sanctuaryLayout(width,2);
  for(let z=-12;z<=-4;z++)for(let x=c1-1;x<=c2+1;x++)assert.equal(cells.get(blockKey(x,-1,z)).shape,'slab');
  assert.ok(p.cells.some(c=>c.block==='leaf'&&c.z===-6&&c.y===-1));
 }
});
