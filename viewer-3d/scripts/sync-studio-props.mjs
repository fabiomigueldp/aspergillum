import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {buildStudioProp} from '../src/shared/studio-prop-geometry.js';

const viewer=path.resolve(import.meta.dirname,'..'),project=path.resolve(viewer,'..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const readJson=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));

async function discover(root,found,depth=0){
 if(depth>6)return;
 let entries;try{entries=await fs.readdir(root,{withFileTypes:true});}catch{return;}
 if(entries.some(e=>e.name==='manifest.json')){
  try{const manifest=await readJson(path.join(root,'manifest.json'));const uuid=manifest.header?.uuid;if(uuid){if(!found.has(uuid))found.set(uuid,[]);found.get(uuid).push(root);}}catch{}
 }
 for(const entry of entries)if(entry.isDirectory()&&!['textures','models','animations','node_modules','db'].includes(entry.name))await discover(path.join(root,entry.name),found,depth+1);
}

/** Read-only pack discovery; no scripts from imported packs are executed. */
export async function syncStudioProps(){
 const lock=await readJson(path.join(viewer,'assets-src/studio/props-sources.json'));
 const output=path.join(viewer,'public/studio-props');await fs.mkdir(output,{recursive:true});
 const sources=new Map();
 const roots=[
  ...(process.env.STUDIO_PACK_ROOTS??'').split(path.delimiter).filter(Boolean),
  ...(process.env.LOCALAPPDATA?[path.join(process.env.LOCALAPPDATA,'Temp/Minecraft Bedrock/minecraftpe/packcache/resource')]:[]),
  ...(process.env.APPDATA?[path.join(process.env.APPDATA,'Minecraft Bedrock/Users/Shared/games/com.mojang/resource_packs')]:[]),
 ];
 for(const root of roots)await discover(root,sources);
 const available=new Set(),missing=[];
 for(const pack of lock.packs){
  const candidates=[path.join(output,pack.uuid),...(pack.projectPath?[path.resolve(project,pack.projectPath)]:[]),...(sources.get(pack.uuid)??[])];
  let bytes;
  for(const candidate of candidates){
   try{
    const entries=await Promise.all(Object.entries(pack.files).map(async([file,expected])=>{
     if(path.isAbsolute(file)||file.split(/[\\/]/).includes('..'))throw Error('Caminho de recurso inválido.');
     const data=await fs.readFile(path.join(candidate,file));if(hash(data)!==expected)throw Error('Hash diferente.');return [file,data];
    }));bytes=entries;break;
   }catch{}
  }
  if(!bytes){missing.push(pack.name);continue;}
  for(const [file,data]of bytes){const target=path.join(output,pack.uuid,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);}
  available.add(pack.uuid);
 }
 const manifest={...lock,sourceHash:hash(Buffer.from(JSON.stringify(lock))),assets:lock.assets.filter(a=>available.has(a.pack)),missing};
 const material=new THREE.MeshBasicMaterial();
 for(const asset of manifest.assets){
  const document=await readJson(path.join(output,asset.pack,asset.geometry));
  const model=buildStudioProp(document,asset,material);
  if(asset.size?.some((v,i)=>Math.abs(v-model.userData.size[i])>1e-5))throw Error(`Escala importada mudou: ${asset.id}. Rever adaptador e composição antes de atualizar a referência.`);
  asset.size=model.userData.size;model.traverse(o=>o.geometry?.dispose());
 }
 material.dispose();
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await fs.writeFile(path.join(output,'NOTICE.txt'),lock.notice+'\n'+lock.packs.map(p=>`${p.name} · ${p.uuid} · ${p.version.join('.')}`).join('\n')+'\n');
 console.log(`Render Studio: ${manifest.assets.length} objetos locais verificados de ${available.size} packs.${missing.length?' Ausentes: '+missing.join(', '):''}`);
 return manifest;
}
