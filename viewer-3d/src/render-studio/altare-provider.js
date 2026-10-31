import * as THREE from 'three';
import {mergeVisibleSurfaces} from '../shared/mesh-batch.js';
export {mergeVisibleSurfaces} from '../shared/mesh-batch.js';
import {buildBedrockGeometry} from '../shared/bedrock-geometry.js';
import {designId} from '../shared/studio-contract.js';

const base=new URL('./asset-library/projects/altare/',document.baseURI).href;
const cache=new Map();
async function json(file){if(!cache.has(file))cache.set(file,fetch(base+file).then(r=>{if(!r.ok)throw Error(`Recurso indisponível: ${file}`);return r.json();}).catch(e=>{cache.delete(file);throw e;}));return cache.get(file);}
export async function createAltareProvider(renderer){
 const [catalog,domain,basis]=await Promise.all([json('studio/catalog.json'),import(/* @vite-ignore */base+'studio/domain.js'),import(/* @vite-ignore */base+'studio/block-basis.js')]);
 const textures=new Map(),materials=new Map(),loader=new THREE.TextureLoader();
 async function texture(stem,color=false){
  const key=stem+':'+color;
  if(!textures.has(key))textures.set(key,loader.loadAsync(base+'pack/'+stem+'.png').then(t=>{t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=renderer.capabilities.getMaxAnisotropy();if(color)t.colorSpace=THREE.SRGBColorSpace;return t;}));
  return textures.get(key);
 }
 function channel(image,index){
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<data.data.length;i+=4)data.data[i]=data.data[i+1]=data.data[i+2]=data.data[i+index];
  ctx.putImageData(data,0,0);const result=new THREE.CanvasTexture(canvas);result.magFilter=THREE.NearestFilter;result.anisotropy=renderer.capabilities.getMaxAnisotropy();return result;
 }
 async function material(reference,lighting){
  const stem=catalog.atlas[reference.texture]?.textures?.[0];if(!stem)throw Error(`Material ausente: ${reference.texture}`);
  const key=stem+':'+reference.render_method+':'+lighting;
  if(!materials.has(key))materials.set(key,(async()=>{
   const cutout=reference.render_method.startsWith('alpha_test');
   if(lighting==='classic')return new THREE.MeshLambertMaterial({name:stem,map:await texture(stem,true),vertexColors:true,side:cutout?THREE.DoubleSide:THREE.FrontSide,alphaTest:cutout?.5:0});
   const set=(await json('pack/'+stem+'.texture_set.json'))['minecraft:texture_set'],folder=stem.slice(0,stem.lastIndexOf('/')+1);
   const [map,normal,mer]=await Promise.all([texture(stem,true),texture(folder+set.normal),texture(folder+set.metalness_emissive_roughness)]);
   return new THREE.MeshStandardMaterial({name:stem,map,normalMap:normal,normalScale:new THREE.Vector2(.65,.65),metalness:1,roughness:1,metalnessMap:channel(mer.image,0),roughnessMap:channel(mer.image,2),side:cutout?THREE.DoubleSide:THREE.FrontSide,alphaTest:cutout?.5:0});
  })());
  return materials.get(key);
 }
 function components(doc,states){
  const q={block_state:name=>states[name]},math={floor:Math.floor,mod:(a,b)=>a%b};
  // Expressions come only from the locally generated, hashed pack snapshot.
  const evaluate=expression=>typeof expression==='boolean'?expression:Function('q','math',`return ${expression}`)(q,math);
  const current=Object.assign({},doc.components,...doc.permutations.filter(p=>evaluate(p.condition)).map(p=>p.components));
  const geometry=current['minecraft:geometry'];
  return {geometry,materials:current['minecraft:material_instances'],visible:Object.fromEntries(Object.entries(geometry.bone_visibility??{}).map(([name,expr])=>[name,!!evaluate(expr)]))};
 }
 async function compose(config){
  const tiles=domain.compose({...config,design:designId(config)}),root=new THREE.Group(),materialsUsed=new Set();
  try{
   for(const tile of tiles){
    const doc=await json(catalog.blocks[tile.id]),look=components(doc,tile.states);
    const source=await json('models/blocks/'+look.geometry.identifier.replace('geometry.altare.','')+'.geo.json');
    const palette={named:{}};await Promise.all(Object.entries(look.materials).map(async([name,reference])=>{const m=await material(reference,config.lighting);materialsUsed.add(m);if(name==='*')palette.default=m;else palette.named[name]=m;}));
    const geometry=basis.blockPreviewGeometry(source['minecraft:geometry'][0]);
    const built=buildBedrockGeometry(geometry,{identifier:geometry.description.identifier,textureWidth:128,textureHeight:128,formatVersion:'1.16.0'},palette,{includePivots:false,includeLocators:false});
    for(const [name,bone]of built.boneGroups)bone.visible=look.visible[name]??true;
    built.root.position.set(tile.position.x-(config.width-1)/2,0,tile.position.z-(config.depth-1)/2);root.add(built.root);
   }
   const merged=mergeVisibleSurfaces(root);if(config.lighting==='classic')merged.traverse(mesh=>{if(!mesh.isMesh)return;const normals=mesh.geometry.attributes.normal,colors=[];for(let i=0;i<normals.count;i++){const shade=.6*normals.getX(i)**2+.8*normals.getZ(i)**2+(normals.getY(i)>0?1:.5)*normals.getY(i)**2;colors.push(...Array(3).fill(Math.pow(shade,2.2)));}mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));});merged.userData={sourceHash:catalog.sourceHash,version:catalog.version,tiles:tiles.length,materials:materialsUsed.size};return merged;
  }finally{root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 }
 return {catalog,compose};
}
