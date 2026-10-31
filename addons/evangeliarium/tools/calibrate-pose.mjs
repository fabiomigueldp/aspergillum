// Reproduce the neutral bind/presentation calculation. Prints a candidate; changes no assets.
import * as T from '../../../viewer-3d/node_modules/three/build/three.module.js';
import {pose} from '../assets-src/pose.mjs';
const rad=Math.PI/180;
const rotation=angles=>new T.Quaternion().setFromEuler(new T.Euler(-angles[0]*rad,angles[1]*rad,-angles[2]*rad,'ZYX'));
function solve(angles,armPosition,itemPivot,target,orientation){
 const q=rotation(angles),inverse=q.clone().invert();
 const hand=new T.Vector3(...itemPivot).applyQuaternion(q).add(new T.Vector3(-5,22,0)).add(new T.Vector3(...armPosition));
 const offset=new T.Vector3(...target).sub(hand).applyQuaternion(inverse);
 const e=new T.Euler().setFromQuaternion(inverse.multiply(rotation(orientation)),'ZYX');
 return {hand:hand.toArray(),gripOffset:offset.toArray(),presentationPosition:offset.clone().add(new T.Vector3(...pose.engineCalibration)).toArray(),presentationRotation:[-e.x/rad,e.y/rad,-e.z/rad]};
}
console.log(JSON.stringify({
 limitation:'Mathematical rig calculation. Engine fit must be checked with evangeliarium:inspect in Minecraft.',
 third:solve(pose.rightArm,[0,0,0],[-1,-7,1],[-2.5,20,-7.5],[0,0,0]),
 first:solve(pose.firstRightRotation,pose.firstRightPosition,[-1,-7,0],[2.5,15,13],[0,180,0])
},null,2));
