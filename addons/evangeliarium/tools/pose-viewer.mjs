import * as THREE from 'three';
import {buildBedrockGeometry,findBoneGroup} from '../../../viewer-3d/src/shared/bedrock-geometry.js';
import {createPlayerGeometry} from '../../../viewer-3d/src/shared/avatar-contract.js';
import {pose} from '../assets-src/pose.mjs';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,1000);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#25232a');scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(-3,6,-5);scene.add(light);
const camera=new THREE.PerspectiveCamera(36,1,.01,40);
const load=async p=>{const t=await new THREE.TextureLoader().loadAsync(p);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return t;};
const skin=await load('/viewer-3d/public/avatar-library/batina_preta_com_pelerine.png');
const atlas=await load('../packs/resource/textures/entity/book.png');
const data=await(await fetch('../packs/resource/models/entity/book_held.geo.json')).json();
const geo=data['minecraft:geometry'][0];
let player,item;
window.capturePose=(model,direction=[.65,.28,-1])=>{
 if(player)scene.remove(player.root);if(item)scene.remove(item.root);
 const avatar=createPlayerGeometry(model);
 // This diagnostic uses canonical -Z front; the workbench skin helper uses +Z front.
 for(const b of avatar.bones)for(const c of b.cubes??[]){const n=c.uv.north;c.uv.north=c.uv.south;c.uv.south=n;}
 const mat=new THREE.MeshStandardMaterial({map:skin,roughness:1,alphaTest:.5});
 player=buildBedrockGeometry(avatar,{identifier:'diagnostic.player',textureWidth:64,textureHeight:64,formatVersion:'1.16.0'},{default:mat},{includePivots:false,includeLocators:false});
 scene.add(player.root);
 const radians=v=>v*Math.PI/180;
 for(const [name,r]of [['rightArm',pose.rightArm],['leftArm',pose.leftArm]])findBoneGroup(player,name).rotation.set(radians(-r[0]),radians(r[1]),radians(-r[2]),'ZYX');
 item=buildBedrockGeometry(geo,{identifier:geo.description.identifier,textureWidth:256,textureHeight:256,formatVersion:'1.16.0'},{default:new THREE.MeshStandardMaterial({map:atlas,roughness:.65})},{includePivots:false,includeLocators:false,externalParentPivot:pose.empiricalGrip});
 findBoneGroup(player,'rightItem').add(item.root);
 const presentation=findBoneGroup(item,'book_presentation'),r=pose.presentationRotation;
 presentation.rotation.set(radians(-r[0]),radians(r[1]),radians(-r[2]),'ZYX');
 // The empirical engine seam is NOT a Three.js transform. Apply only the authored grip offset.
 presentation.position.add(new THREE.Vector3(...pose.gripOffset).multiplyScalar(1/16));
 scene.updateMatrixWorld(true);
 const target=new THREE.Vector3(0,1.15,-.08);camera.position.copy(target).add(new THREE.Vector3(...direction).normalize().multiplyScalar(3.5));camera.lookAt(target);renderer.render(scene,camera);
 const right=findBoneGroup(player,'rightItem').getWorldPosition(new THREE.Vector3()).multiplyScalar(16).toArray();
 const left=findBoneGroup(player,'leftItem').getWorldPosition(new THREE.Vector3()).multiplyScalar(16).toArray();
 const box=new THREE.Box3().setFromObject(item.root);
 return{image:renderer.domElement.toDataURL('image/png'),rightGrip:right,leftGrip:left,bookBounds:{min:box.min.toArray().map(v=>v*16),max:box.max.toArray().map(v=>v*16)},limitations:'Static native-rig diagnostic. Engine binding seam assumed; no Minecraft FP, Persona, culling or animation parity.'};
};
window.poseReady=true;
