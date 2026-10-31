import * as THREE from 'three';

/** Fit actual object bounds, avoiding the empty corners of one combined scene AABB. */
export function fitObjectBounds(boxes,target,direction,aspect,fov,margin=1.16){
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
 const up=new THREE.Vector3().crossVectors(direction,right),tanV=Math.tan(THREE.MathUtils.degToRad(fov/2));
 let distance=0,span=0;
 for(const box of boxes)for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const v=new THREE.Vector3(x,y,z).sub(target);
  distance=Math.max(distance,Math.abs(v.dot(right))/(tanV*aspect)+v.dot(direction),Math.abs(v.dot(up))/tanV+v.dot(direction));
  span=Math.max(span,2*Math.abs(v.dot(up)),2*Math.abs(v.dot(right))/aspect);
 }
 return {distance:distance*margin,span:span*margin};
}

export function placementBounds(p){
 const [x,y,z]=p.position,[w,h,d]=p.size;
 return new THREE.Box3(new THREE.Vector3(x-w/2,y,z-d/2),new THREE.Vector3(x+w/2,y+h,z+d/2));
}
