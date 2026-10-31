import * as THREE from 'three';
import {DEFAULT_STUDIO_CONFIG} from '../shared/studio-contract.js';

export function disposeDressing(root){root?.traverse(o=>{o.geometry?.dispose();if(o.userData.ownedMaterial)o.material?.dispose();});}

export async function composeLiturgy(plan,config,props,altars){
 const root=new THREE.Group();root.name='liturgical-arrangement';root.userData.plan=plan;
 try{
  for(const placement of plan.placements){
   const model=await props.instance(placement.id,config.lighting);model.position.fromArray(placement.position);model.rotation.y=placement.yaw;
   model.userData.placement=placement;root.add(model);
  }
  if(plan.credence){
   const table=await altars.compose({...DEFAULT_STUDIO_CONFIG,family:'trestle',surface:'walnut',textile:'none',frontal:'none',width:2,depth:1,lighting:config.lighting});
   table.position.fromArray(plan.credence.position);table.name='credence';root.add(table);
  }
  for(const linen of plan.linens){
   const material=new THREE.MeshLambertMaterial({color:0xf4f1e9}),mesh=new THREE.Mesh(new THREE.BoxGeometry(...linen.size),material);
   mesh.position.fromArray(linen.position);mesh.name=linen.role;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.ownedMaterial=true;root.add(mesh);
  }
  return root;
 }catch(error){disposeDressing(root);throw error;}
}
