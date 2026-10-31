import * as THREE from 'three';
import {buildBedrockGeometry} from './bedrock-geometry.js';
import {findBedrockGeometry} from './bedrock-document.js';
import {mergeVisibleSurfaces} from './mesh-batch.js';

/** Preserve authored scale and UVs; only orient and anchor the prop to its support. */
export function buildStudioProp(document,entry,material,lighting='classic'){
 const geometry=findBedrockGeometry(document,entry.identifier);
 if(!geometry||geometry.description.identifier!==entry.identifier)throw Error(`Geometria ausente: ${entry.id}`);
 const built=buildBedrockGeometry(geometry,{identifier:entry.identifier,formatVersion:document.format_version,
  textureWidth:geometry.description.texture_width,textureHeight:geometry.description.texture_height},{default:material},{includePivots:false,includeLocators:false});
 built.root.rotation.y=THREE.MathUtils.degToRad(entry.yaw??0);
 const bounds=new THREE.Box3().setFromObject(built.root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 built.root.position.set(-center.x,-bounds.min.y,-center.z);
 const root=mergeVisibleSurfaces(built.root);built.root.traverse(o=>o.geometry?.dispose());
 if(lighting==='classic')root.traverse(mesh=>{if(!mesh.isMesh)return;const n=mesh.geometry.attributes.normal,c=[];for(let i=0;i<n.count;i++){const shade=.6*n.getX(i)**2+.8*n.getZ(i)**2+(n.getY(i)>0?1:.5)*n.getY(i)**2;c.push(...Array(3).fill(Math.pow(shade,2.2)));}mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));});
 root.userData={asset:entry.id,size:size.toArray(),anchor:[center.x,bounds.min.y,center.z],scale:1};
 return root;
}
