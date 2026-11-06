/** Headless counterpart of pose-viewer.mjs. Exports existing rig only, no WebGL. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildBedrockGeometry,findBoneGroup} from '../../../viewer-3d/src/shared/bedrock-geometry.js';
import {createPlayerGeometry} from '../../../viewer-3d/src/shared/avatar-contract.js';
import {poseForBook} from '../assets-src/pose.mjs';
const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.resolve(root,'../../viewer-3d/package.json'));
const THREE=require('three');
const output=path.join(root,'out/hand-diagnostic');fs.mkdirSync(output,{recursive:true});
const radians=v=>v*Math.PI/180;
const material=new THREE.MeshBasicMaterial();
const options={includePivots:false,includeLocators:false};
function meshes(group){
 const result=[];
 group.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv'),vertices=[];
  for(let i=0;i<p.count;i++)vertices.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).multiplyScalar(16).toArray());
  const raw=mesh.geometry.index?Array.from(mesh.geometry.index.array):Array.from({length:p.count},(_,i)=>i);
  const indices=mesh.geometry.groups.flatMap(g=>{const m=Array.isArray(mesh.material)?mesh.material[g.materialIndex]:mesh.material;return m?.visible===false||m?.opacity===0?[]:raw.slice(g.start,g.start+g.count);});
  result.push({name:mesh.name,bone:mesh.parent?.name,vertices,indices,uv:uv?Array.from({length:uv.count},(_,i)=>[uv.getX(i),uv.getY(i)]):[]});
 });return result;
}
const summary=[];
for(const skin of ['wide','slim'])for(const book of ['book','missal','pontifical','lectionary']){
 const pose=poseForBook(book);
 const avatar=createPlayerGeometry(skin);
 for(const b of avatar.bones)for(const c of b.cubes??[]){const n=c.uv.north;c.uv.north=c.uv.south;c.uv.south=n;}
 const player=buildBedrockGeometry(avatar,{identifier:'diagnostic.player',textureWidth:64,textureHeight:64,formatVersion:'1.16.0'},{default:material},options);
 for(const [name,r]of [['rightArm',pose.rightArm],['leftArm',pose.leftArm]])findBoneGroup(player,name).rotation.set(radians(-r[0]),radians(r[1]),radians(-r[2]),'ZYX');
 const geo=JSON.parse(fs.readFileSync(path.join(root,`packs/resource/models/entity/${book}_held.geo.json`)))['minecraft:geometry'][0];
 const item=buildBedrockGeometry(geo,{identifier:geo.description.identifier,textureWidth:256,textureHeight:256,formatVersion:'1.16.0'},{default:material},{...options,externalParentPivot:pose.empiricalGrip});
 // Export player before item attachment so its mesh list does not duplicate the book.
 player.root.updateMatrixWorld(true);const playerMeshes=meshes(player.root);
 findBoneGroup(player,'rightItem').add(item.root);
 const presentation=findBoneGroup(item,'book_presentation'),r=pose.presentationRotation;
 presentation.rotation.set(radians(-r[0]),radians(r[1]),radians(-r[2]),'ZYX');
 presentation.position.add(new THREE.Vector3(...pose.gripOffset).multiplyScalar(1/16));
 player.root.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(item.root);
 const grips=Object.fromEntries(['rightItem','leftItem'].map(name=>[name,findBoneGroup(player,name).getWorldPosition(new THREE.Vector3()).multiplyScalar(16).toArray()]));
 const bounds={min:box.min.toArray().map(v=>v*16),max:box.max.toArray().map(v=>v*16)};
 if(book!=='book'){
  assert.ok(Math.abs(bounds.min[0]+bounds.max[0])<.01,'Smaller book must stay centered');
  const handMeshes=playerMeshes.filter(m=>m.name.includes('Arm /'));
  for(const hand of handMeshes){
   const lo=[0,1,2].map(i=>Math.min(...hand.vertices.map(v=>v[i]))),hi=[0,1,2].map(i=>Math.max(...hand.vertices.map(v=>v[i])));
   assert.ok([0,1,2].every(i=>Math.min(hi[i],bounds.max[i])-Math.max(lo[i],bounds.min[i])>0),'Hand and book bounds must overlap; visual contact still requires review');
   assert.ok(bounds.min[2]<lo[2]-.1,'Printed front must remain ahead of palms');
  }
 }
 const record={book,skin,pose,unitsPerBlock:16,textures:{player:path.resolve(root,'../../viewer-3d/public/avatar-library/batina_preta_com_pelerine.png'),item:path.join(root,`packs/resource/textures/entity/${book}.png`)},coordinateSystem:'Canonical Bedrock diagnostic: Y up, -Z front; model units, exactly pose-viewer.mjs composition.',limitation:'Static existing-rig composition; engine seam assumed. No Minecraft FP, Persona, culling, occlusion or animation parity.',grips,bounds,player:playerMeshes,item:meshes(item.root)};
 fs.writeFileSync(path.join(output,`${book}-${skin}.json`),JSON.stringify(record));summary.push({book,skin,bounds,grips});
}
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const sources=['assets-src/pose.mjs',...['book','missal','pontifical','lectionary'].map(b=>`packs/resource/models/entity/${b}_held.geo.json`)];
fs.writeFileSync(path.join(output,'provenance.json'),JSON.stringify({sourceHashes:Object.fromEntries(sources.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),limitations:'Static canonical rig only; AABB overlap is a regression guard, not proof of mesh contact. Independent wide/slim front/side review required; Minecraft acceptance remains pending.'},null,2)+'\n');console.log(JSON.stringify(summary,null,2));
