import * as THREE from 'three';
import {RoomEnvironment} from '/viewer-3d/node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import {buildBedrockGeometry} from '/viewer-3d/src/shared/bedrock-geometry.js';
import {blockPreviewGeometry} from './block-preview-basis.mjs';

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor('#deddd3');
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
const loader=new THREE.TextureLoader(),textureCache=new Map(),materialCache=new Map();
const base='/addons/altare/packs/resource/';
async function texture(p,color=false){
 if(textureCache.has(p))return textureCache.get(p);
 const t=await loader.loadAsync(base+p+'.png');t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;
 if(color)t.colorSpace=THREE.SRGBColorSpace;textureCache.set(p,t);return t;
}
function channel(img,which){
 const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
 const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height);
 for(let i=0;i<data.data.length;i+=4){const value=data.data[i+which];data.data[i]=value;data.data[i+1]=value;data.data[i+2]=value;}
 ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(canvas);t.magFilter=THREE.NearestFilter;return t;
}
async function material(p,pbr,method='opaque'){
 const key=`${p}:${pbr}:${method}`;if(materialCache.has(key))return materialCache.get(key);
 const map=await texture(p,true);
 const m=new THREE.MeshStandardMaterial({map,roughness:.83,metalness:0,side:method==='alpha_test'?THREE.DoubleSide:THREE.FrontSide,alphaTest:method.startsWith('alpha_test')?.5:0});
 if(pbr){
  const set=(await fetch(base+p+'.texture_set.json').then(r=>r.json()))['minecraft:texture_set'];
  const folder=p.slice(0,p.lastIndexOf('/')+1);
  m.normalMap=await texture(folder+set.normal);m.normalScale.set(.65,.65);
  const mer=await texture(folder+set.metalness_emissive_roughness);m.metalness=1;m.roughness=1;m.metalnessMap=channel(mer.image,0);m.roughnessMap=channel(mer.image,2);
 }
 materialCache.set(key,m);return m;
}
window.captureAltare=async(config)=>{
 renderer.setSize(config.width,config.height);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#deddd3');
 scene.environment=environment;scene.environmentIntensity=.45;
 scene.add(new THREE.HemisphereLight('#fff8e5','#667369',1.4));
 const light=new THREE.DirectionalLight('#fff6e5',2.4);light.position.set(-5,9,-7);light.castShadow=true;light.shadow.mapSize.set(2048,2048);
 light.shadow.camera.left=-14;light.shadow.camera.right=14;light.shadow.camera.top=14;light.shadow.camera.bottom=-14;light.shadow.normalBias=.02;scene.add(light);
 const fill=new THREE.DirectionalLight('#d3e5ed',.7);fill.position.set(4,5,5);scene.add(fill);
 const geometryDocs=new Map(await Promise.all([...new Set(config.tiles.map(t=>t.geometry))].map(async id=>[id,await fetch(base+`models/blocks/${id.replace('geometry.altare.','')}.geo.json`).then(r=>r.json())])));
 for(const tile of config.tiles){
  const g=blockPreviewGeometry(geometryDocs.get(tile.geometry)['minecraft:geometry'][0]);
  const palette={named:{}};
  for(const [name,p] of Object.entries(tile.textures)){const m=await material(p,config.pbr,tile.renderMethods?.[name]);if(name==='*')palette.default=m;else palette.named[name]=m;}
  const built=buildBedrockGeometry(g,{identifier:g.description.identifier,textureWidth:128,textureHeight:128,formatVersion:'1.16.0'},palette,{includePivots:false,includeLocators:false});
  for(const [name,group] of built.boneGroups){
   if(tile.visibleBones){group.visible=tile.visibleBones[name]??true;continue;}
   if(name==='bare_top')group.visible=tile.cloth===0;
   if(name==='linen_top')group.visible=tile.cloth!==0;
   const frame=name.match(/^frontal_(left|right)_(\d)$/);
   if(frame){const side=Number(frame[2]),end=(side+(frame[1]==='left'?1:3))%4;group.visible=!!(tile.edges&(1<<side))&&!!(tile.edges&(1<<end))&&tile.frontal!==0&&tile.facing===side;}
   const match=name.match(/^(edge|cloth|frontal|corner)_(\d)$/);
   if(match){const side=Number(match[2]);const exposed=!!(tile.edges&(1<<side));
    if(match[1]==='edge')group.visible=exposed;
    if(match[1]==='cloth')group.visible=exposed&&tile.cloth!==0;
    if(match[1]==='frontal')group.visible=exposed&&tile.frontal!==0&&tile.facing===side;
    if(match[1]==='corner')group.visible=exposed&&!!(tile.edges&(1<<((side+3)%4)))&&tile.cloth!==0;
   }
  }
  built.root.position.set(tile.position.x,0,tile.position.z);
  built.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(built.root);
 }
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#deddd3',roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.002;ground.receiveShadow=true;scene.add(ground);
 const maxX=Math.max(...config.tiles.map(t=>t.position.x)),maxZ=Math.max(...config.tiles.map(t=>t.position.z));
 const center=new THREE.Vector3(maxX/2,.55,maxZ/2);
 const aspect=config.width/config.height;
 if(config.focus){
  const f=config.focus.facing??0,corner=config.focus.anchor==='corner';
  const points=corner?[[-.5,-.5],[maxX+.5,-.5],[maxX+.5,maxZ+.5],[-.5,maxZ+.5]]:[[maxX/2,-.5],[maxX+.5,maxZ/2],[maxX/2,maxZ+.5],[-.5,maxZ/2]];
  center.set(points[f][0],config.focus.height,points[f][1]);
 }
 const extent=config.focus?.extent??Math.max((maxX+1.7)/aspect,(maxZ+1.5)/aspect,2.1)*config.zoom;
 const camera=new THREE.OrthographicCamera(-extent*aspect/2,extent*aspect/2,extent/2,-extent/2,.01,100);
 camera.position.copy(center).add(new THREE.Vector3(...config.direction).normalize().multiplyScalar(14));camera.lookAt(center);
 renderer.render(scene,camera);
 const result={dataUrl:renderer.domElement.toDataURL('image/png'),camera:{position:camera.position.toArray(),target:center.toArray(),projection:'orthographic',extent},renderer:renderer.info.render};
 // Geometry is per capture; textures/materials are shared and deliberately retained.
 scene.traverse(o=>{if(o.isMesh)o.geometry.dispose();});ground.material.dispose();
 return result;
};
window.captureReady=true;
