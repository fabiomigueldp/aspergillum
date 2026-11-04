import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {twinPedestalFamilyGeometry} from '../assets-src/atelier/twin-pedestal-family-study.mjs';
import {twinPedestalCells} from '../assets-src/atelier/twin-pedestal-cell-study.mjs';
import {twinPedestalCollision} from '../assets-src/atelier/twin-pedestal-collision-study.mjs';
import {coveredPedestalModel} from '../assets-src/atelier/twin-pedestal-recipe-study.mjs';
import {centerRole} from '../src/domain/catalog.ts';
const root=path.resolve(import.meta.dirname,'..');
export const manifestPath=path.join(root,'assets-src/native-pedestal/poses.v1.json');
export const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const digest=v=>crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export const cubesOf=cell=>cell.doc['minecraft:geometry'][0].bones.flatMap(b=>b.cubes).map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
export function collectNativePoses({initialize=false,modelFactory=twinPedestalFamilyGeometry}={}){
 if(initialize&&fs.existsSync(manifestPath))throw Error('Refusing to overwrite the authoritative pose manifest');
 const manifest=initialize?{schemaVersion:1,policy:'width families1/3/7; depth1/2/3; original end inset; local grain; closed cuts',base:[],center:[]}:JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const contexts=new Map(),centerIndices=new Map(manifest.center.map((r,i)=>[r.basePose+','+r.role,i]));for(let i=0;i<manifest.base.length;i++)for(const c of manifest.base[i].contexts){const k=c.join(',');if(contexts.has(k))throw Error('Duplicated authoritative native context');contexts.set(k,i);}
 const initialGroups=new Map(),profiles=[],profileHashes=[],plans={},visited=new Set();let cells=0,configs=0;
 for(let w=1;w<=16;w++)for(let d=1;d<=16;d++){if(Math.min(w,d)>8)continue;for(let f=0;f<4;f++){
  const source=modelFactory(w,d,f),bare=twinPedestalCells(w,d,f,{sourceModel:source,uvPolicy:'module-grain',capCuts:true}),covered=twinPedestalCells(w,d,f,{sourceModel:coveredPedestalModel(source),uvPolicy:'module-grain',capCuts:true}),collision=twinPedestalCollision(w,d,f,{sourceModel:source}),nx=f%2?d:w,nz=f%2?w:d,indices=[];configs++;
  for(let i=0;i<bare.cells.length;i++){
   const b=bare.cells[i],c=covered.cells[i],edges=(b.z===0?1:0)|(b.x===nx-1?2:0)|(b.z===nz-1?4:0)|(b.x===0?8:0),physical=collision.cells[i].nativeBoxes,hash=digest({bare:cubesOf(b),covered:cubesOf(c),physical,facing:f,edges}),context=[w,d,f,b.x,b.z],key=context.join(',');
   let index=initialize?initialGroups.get(hash):contexts.get(key);
   if(initialize&&index===undefined){index=manifest.base.length;initialGroups.set(hash,index);manifest.base.push({facing:f,edges,representative:context,contexts:[]});}
   if(index===undefined)throw Error(`Unversioned native context ${key}`);
   if(initialize)manifest.base[index].contexts.push(context);
   const entry=manifest.base[index];if(entry.facing!==f||entry.edges!==edges)throw Error(`Persistent pose meaning changed at ${index}/${key}`);
   if(profileHashes[index]&&profileHashes[index]!==hash)throw Error(`Art refinement split persistent pose ${index}; explicit schema evolution required (${key})`);
   profileHashes[index]=hash;profiles[index]??={bare:b,covered:c,collision:physical,facing:f,edges};indices.push(index);visited.add(key);cells++;
   let column=f%2?b.z:b.x;if(f>=2)column=w-1-column;const role=edges&(1<<f)?centerRole(w,column):0,centerKey=index+','+role;
   if(!centerIndices.has(centerKey)){if(!initialize)throw Error(`Unversioned centered pose ${centerKey}`);centerIndices.set(centerKey,manifest.center.length);manifest.center.push({basePose:index,role});}
  }
  plans[[w,d,f].join(',')]=indices;
 }}
 if(!initialize&&visited.size!==contexts.size)throw Error('Authoritative manifest contains unreachable/deleted contexts');
 if(profiles.length!==448||manifest.center.length!==504)throw Error(`Native budget changed: ${profiles.length}/${manifest.center.length}`);
 if(initialize){fs.mkdirSync(path.dirname(manifestPath),{recursive:true});fs.writeFileSync(manifestPath,JSON.stringify(manifest)+'\n');}
 return {manifest,profiles,plans,stats:{configs,cells,base:profiles.length,center:manifest.center.length,manifestSha256:digest(manifest)}};
}
export function emitNativeDomainData(result){
 const source='// Generated from assets-src/native-pedestal/poses.v1.json. Do not renumber.\n'+
 'export const NATIVE_BASE_POSES:readonly Readonly<{facing:number;edges:number}>[]='+JSON.stringify(result.manifest.base.map(({facing,edges})=>({facing,edges})))+';\n'+
 'export const NATIVE_CENTER_POSES:readonly Readonly<{basePose:number;role:number}>[]='+JSON.stringify(result.manifest.center)+';\n'+
 'export const NATIVE_PLANS:Readonly<Record<string,readonly number[]>>='+JSON.stringify(result.plans)+';\n';
 fs.writeFileSync(path.join(root,'src/domain/native-pedestal-data.ts'),source);
}
if(process.argv[1]===import.meta.filename){const result=collectNativePoses({initialize:process.argv.includes('--initialize')});emitNativeDomainData(result);console.log(JSON.stringify(result.stats,null,2));}
