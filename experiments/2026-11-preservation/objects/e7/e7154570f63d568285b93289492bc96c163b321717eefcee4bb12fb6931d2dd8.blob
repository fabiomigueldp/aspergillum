/** Fallback diagnostic, no browser/WebGL. Uses the project's actual geometry adapter. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as THREE from '../../../viewer-3d/node_modules/three/build/three.module.js';
import {buildBedrockGeometry} from '../../../viewer-3d/src/shared/bedrock-geometry.js';
import {blockPreviewGeometry} from './block-preview-basis.mjs';
import {planFinish} from '../src/domain/surface.ts';
import {encodeTile} from '../src/domain/block-codec.ts';
import {sharedDesignFor} from '../src/domain/catalog.ts';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2),matrix=args.includes('--matrix');
const outArg=args.indexOf('--out'),out=outArg<0?path.join(root,matrix?'out/crossbrace-cpu-polish':'out/crossbrace-cpu'):path.resolve(args[outArg+1]);fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),atlas=read('packs/resource/textures/terrain_texture.json').texture_data;
const version=read('package.json').version;
if(read('packs/behavior/manifest.json').header.version.join('.')!==version||read('packs/resource/manifest.json').header.version.join('.')!==version||read('out/build-manifest.json').version!==version)throw Error('CPU preview requires a matching complete build.');
const scenes=[{id:'crossbrace-3x2-bare',w:3,d:2,textile:'none',direction:[-.52,.38,-1]}, {id:'crossbrace-7x2-linen',w:7,d:2,textile:'linen_short',direction:[-.45,.38,-1]}, {id:'crossbrace-8x2-floral',w:8,d:2,textile:'floral',color:'green',direction:[-.45,.38,-1]}, {id:'crossbrace-detail',w:1,d:1,textile:'none',direction:[-.65,.25,-1]}, {id:'crossbrace-7x2-bare',w:7,d:2,textile:'none',direction:[-.45,.38,-1]}, {id:'crossbrace-7x2-lace',w:7,d:2,textile:'lace',direction:[-.45,.38,-1]}];
if(matrix){
 for(const textile of ['none','linen_short','linen_long','gold_short','gold_long','lace','agnus','verdant','requiem'])scenes.push({id:`textile-${textile}`,w:3,d:2,textile,direction:[-.45,.22,-1]});
 for(const color of ['white','red','green','purple','rose','black','gold','silver'])scenes.push({id:`floral-${color}`,w:4,d:2,textile:'floral',color,direction:[-.45,.22,-1]});
 scenes.push(
  {id:'join-front',w:2,d:1,textile:'none',direction:[0,.02,-1],center:[.5,.5,-.44],frame:[1.8,1.1]},
  {id:'join-back',w:2,d:1,textile:'none',direction:[0,.02,1],center:[.5,.5,.44],frame:[1.8,1.1]},
  {id:'cross-front-grazing',w:1,d:1,textile:'none',direction:[-.85,.08,-.5]},
  {id:'cross-back-grazing',w:1,d:1,textile:'none',direction:[.85,.08,.5]},
  {id:'corner-underside',w:1,d:1,textile:'none',direction:[-.65,-.5,-1]},
  {id:'narrow-1x3',w:1,d:3,textile:'none',direction:[-1,.25,-.35]},
  {id:'square-2x2',w:2,d:2,textile:'none',direction:[-.65,.4,-1]},
  {id:'side-linen-long',w:1,d:2,textile:'linen_long',direction:[1,.18,.3]},
  ...[0,1,2,3].map(facing=>({id:`floral-facing-${facing}`,w:3,d:2,textile:'floral',color:'purple',facing,direction:[-.45,.28,-1]})),
 );
}
const onlyArg=args.indexOf('--only');if(onlyArg>=0){const id=args[onlyArg+1];if(!scenes.some(s=>s.id===id))throw Error(`Unknown CPU scene: ${id}`);scenes.splice(0,scenes.length,...scenes.filter(s=>s.id===id));}
const hashes={};
for(const scene of scenes){
 const design=sharedDesignFor('crossbrace','walnut',scene.textile,'none',scene.color??'red'),meshes=[];
 const tiles=planFinish(Array.from({length:scene.w*scene.d},(_,i)=>({position:{x:i%scene.w,y:0,z:Math.floor(i/scene.w)},stone:0,cloth:0,frontal:0,facing:0,edges:15})),{stone:0,cloth:0,ornamental:false,facing:scene.facing??0,design:design.id});
 for(const tile of tiles){
  const e=encodeTile(tile),block=read(`packs/behavior/blocks/${e.id.split(':')[1]}.block.json`)['minecraft:block'],q={block_state:k=>e.states[k]};
  const component=Object.assign({},block.components,...block.permutations.filter(p=>Function('q',`return ${p.condition}`)(q)).map(p=>p.components));
  const geomPath=`packs/resource/models/blocks/${component['minecraft:geometry'].identifier.replace('geometry.altare.','')}.geo.json`,doc=read(geomPath),g=blockPreviewGeometry(doc['minecraft:geometry'][0]);
  hashes[geomPath]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,geomPath))).digest('hex');
  const palette={named:{}};
  for(const [name,m] of Object.entries(component['minecraft:material_instances'])){
   const file='packs/resource/'+atlas[m.texture].textures[0]+'.png',material=new THREE.MeshBasicMaterial();material.userData.file=path.join(root,file);
   hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(material.userData.file)).digest('hex');
   if(name==='*')palette.default=material;else palette.named[name]=material;
  }
  const built=buildBedrockGeometry(g,{identifier:g.description.identifier,textureWidth:128,textureHeight:128,formatVersion:doc.format_version},palette,{includePivots:false,includeLocators:false});
  for(const [name,group] of built.boneGroups)group.visible=component['minecraft:geometry'].bone_visibility[name]??true;
  built.root.position.set(tile.position.x,0,tile.position.z);built.root.updateMatrixWorld(true);
  built.root.traverseVisible(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,uv=o.geometry.attributes.uv,idx=o.geometry.index;
   for(const group of o.geometry.groups){const material=Array.isArray(o.material)?o.material[group.materialIndex]:o.material;
    if(!material?.userData.file)continue;
    for(let i=group.start;i<group.start+group.count;i+=3){const points=[],coords=[];
     for(let j=0;j<3;j++){const k=idx?idx.getX(i+j):i+j,vertex=new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);points.push(vertex.toArray());coords.push([uv.getX(k),uv.getY(k)]);}
     meshes.push({points,uv:coords,texture:material.userData.file});
    }
   }
  });
 }
 const file=path.join(out,scene.id+'.scene.json');fs.writeFileSync(file,JSON.stringify({...scene,version,triangles:meshes}));
 const proc=spawnSync('python',[path.join(import.meta.dirname,'cpu-rasterize.py'),file,path.join(out,scene.id+'.png')],{stdio:'inherit'});if(proc.status!==0)throw Error('CPU rasterizer failed');
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version,renderer:'CPU barycentric rasterization of shared buildBedrockGeometry meshes',limitation:'Alternative technical preview. No WebGL, PBR, game lighting or Minecraft parity. Official Chromium renderer unavailable in this execution environment.',cameraConvention:'right-handed; direction centre to camera; right = worldUp cross direction',rendererSources:Object.fromEntries(['tools/capture-cpu.mjs','tools/cpu-rasterize.py','tools/block-preview-basis.mjs','../../viewer-3d/src/shared/bedrock-geometry.js','../../viewer-3d/src/shared/bedrock-uv.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,p))).digest('hex')])),sourceHashes:hashes,scenes:scenes.map(s=>({...s,file:s.id+'.png'}))},null,2)+'\n');
console.log(out);
