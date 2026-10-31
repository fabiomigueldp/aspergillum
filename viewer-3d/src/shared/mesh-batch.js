import * as THREE from 'three';

/** Batch only after the shared adapter applies geometry, UVs and visibility. */
export function mergeVisibleSurfaces(root){
 root.updateMatrixWorld(true);const groups=new Map(),result=new THREE.Group();
 root.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const group of geometry.groups.length?geometry.groups:[{start:0,count:geometry.attributes.position.count,materialIndex:0}]){
   const material=materials[group.materialIndex];if(!material?.visible)continue;
   if(!groups.has(material))groups.set(material,{position:[],normal:[],uv:[]});const target=groups.get(material);
   for(const key of ['position','normal','uv']){const attr=geometry.attributes[key];for(let i=group.start*attr.itemSize;i<(group.start+group.count)*attr.itemSize;i++)target[key].push(attr.array[i]);}
  }
  geometry.dispose();
 });
 for(const [material,attributes]of groups){
  const geometry=new THREE.BufferGeometry();for(const [key,values]of Object.entries(attributes))geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,key==='uv'?2:3));
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);
 }
 return result;
}
