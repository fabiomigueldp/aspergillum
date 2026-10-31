import * as THREE from 'three';
import {buildStudioProp} from '../shared/studio-prop-geometry.js';

export async function createPropsProvider(renderer){
 const base=new URL('studio-props/',document.baseURI).href;
 const response=await fetch(base+'manifest.json');if(!response.ok)throw Error('Biblioteca de objetos ausente. Execute npm run studio:altare.');
 const catalog=await response.json(),templates=new Map(),loader=new THREE.TextureLoader();
 async function template(id,lighting='classic'){
  const key=id+':'+lighting;
  if(!templates.has(key))templates.set(key,(async()=>{
   const entry=catalog.assets.find(a=>a.id===id);if(!entry)throw Error(`Objeto local indisponível: ${id}. Sincronize os packs de origem.`);
   const prefix=base+entry.pack+'/',[document,map]=await Promise.all([fetch(prefix+entry.geometry).then(r=>{if(!r.ok)throw Error('Geometria indisponível.');return r.json();}),loader.loadAsync(prefix+entry.texture)]);
   map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestMipmapLinearFilter;map.anisotropy=renderer.capabilities.getMaxAnisotropy();
   const material=new THREE.MeshLambertMaterial({name:'pack:'+id,map,side:THREE.DoubleSide,alphaTest:.1,vertexColors:lighting==='classic'});
   return buildStudioProp(document,entry,material,lighting);
  })());
  return templates.get(key);
 }
 async function instance(id,lighting){const source=await template(id,lighting),result=source.clone(true);result.traverse(o=>{if(o.geometry)o.geometry=o.geometry.clone();});return result;}
 return {catalog,instance,template};
}
