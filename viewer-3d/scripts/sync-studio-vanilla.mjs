import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const viewer=path.resolve(import.meta.dirname,'..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
/** The checked-in lock, not a research checkout, defines the source of these assets. */
export async function syncStudioVanilla(){
 const lock=JSON.parse(await fs.readFile(path.join(viewer,'assets-src/studio/vanilla-sources.json'),'utf8'));
 const output=path.join(viewer,'public/studio-vanilla');await fs.mkdir(output,{recursive:true});
 for(const [name,expected]of Object.entries(lock.files)){
  const destination=path.join(output,name);let bytes;
  for(const candidate of [destination,path.join(viewer,'../.research/bedrock-samples/resource_pack/textures/blocks',name)]){
   try{const local=await fs.readFile(candidate);if(hash(local)===expected.sha256){bytes=local;break;}}catch{}
  }
  if(!bytes){const response=await fetch(`${lock.rawBase}/${name}`,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Textura Minecraft indisponível: ${name} (${response.status}).`);bytes=Buffer.from(await response.arrayBuffer());}
  if(hash(bytes)!==expected.sha256)throw Error(`A textura ${name} não corresponde à revisão oficial fixada.`);
  await fs.writeFile(destination,bytes);
 }
 const manifest={...lock,sourceHash:hash(Buffer.from(JSON.stringify(lock)))};
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await fs.writeFile(path.join(output,'NOTICE.txt'),lock.notice+'\n'+lock.source+'\n');
 console.log(`Render Studio: ${Object.keys(lock.files).length} texturas vanilla verificadas (${lock.revision.slice(0,12)}).`);
}
