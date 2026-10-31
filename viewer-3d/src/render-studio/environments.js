import * as THREE from 'three';
import {planEnvironment} from './voxel-plan.js';
import {meshVoxelPlan} from './voxel-mesh.js';
import {SURFACE_SETTINGS} from './voxel-blocks.js';

export async function loadVanillaResources(renderer){
 const base=new URL('studio-vanilla/',document.baseURI).href,response=await fetch(base+'manifest.json');
 if(!response.ok)throw Error('Texturas Minecraft ausentes. Execute npm run studio:altare.');
 const manifest=await response.json(),loader=new THREE.TextureLoader(),textures=new Map(),materials=new Map();
 await Promise.all(Object.keys(manifest.files).map(async file=>{
  const t=await loader.loadAsync(base+file);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapLinearFilter;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textures.set(file.replace('.png',''),t);
 }));
 for(const [stem,map]of textures){const settings=SURFACE_SETTINGS[stem]??{};materials.set(stem,new THREE.MeshLambertMaterial({name:'minecraft:'+stem,map,vertexColors:true,...settings,depthWrite:!settings.transparent,side:settings.transparent?THREE.DoubleSide:THREE.FrontSide}));}
 return {manifest,materials};
}
export function createEnvironment(resources,id,width=7,depth=2,lighting='classic',arrangement=null){
 const plan=planEnvironment(id,width,depth,arrangement),root=meshVoxelPlan(plan,resources.materials,lighting);
 if(plan.details.length){const details=meshVoxelPlan({cells:plan.details,offset:plan.offset},resources.materials,lighting);root.add(...details.children);}
 root.userData.dispose=()=>root.traverse(mesh=>mesh.geometry?.dispose());
 return {root,background:plan.background,sourceHash:resources.manifest.sourceHash,blockCount:plan.cells.length+plan.details.length,revision:plan.revision,layout:plan.layout};
}
