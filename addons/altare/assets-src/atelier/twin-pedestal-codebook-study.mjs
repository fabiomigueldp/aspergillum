import crypto from 'node:crypto';
import {twinPedestalCells} from './twin-pedestal-cell-study.mjs';
import {twinPedestalCollision} from './twin-pedestal-collision-study.mjs';

// Pure build-time proof, not imported by the production codec or runtime.
// Recipe identity remains in a future per-recipe block ID. Persistent digits use
// fixed radices16×16; only the page range may grow, never reinterpret old digits.
export const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const hash=v=>crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export function encodePose(index){if(!Number.isInteger(index)||index<0||index>=4096)throw Error('Pose index outside three 4-bit digits');return {pose:index%16,bank:Math.floor(index/16)%16,page:Math.floor(index/256)};}
export function decodePose(state,pages){if(!Number.isInteger(pages)||pages<1||pages>16||!Number.isInteger(state.pose)||state.pose<0||state.pose>15||!Number.isInteger(state.bank)||state.bank<0||state.bank>15||!Number.isInteger(state.page)||state.page<0||state.page>=pages)throw Error('Invalid native pose state');return state.pose+16*state.bank+256*state.page;}
export function appendOnlyManifest(keys,previous=[]){
 if(new Set(previous).size!==previous.length)throw Error('Duplicate persistent pose key');
 const seen=new Set(previous),added=[...new Set(keys)].filter(k=>!seen.has(k)).sort(),result=[...previous,...added];if(result.length>4096)throw Error('Native pose bank capacity exceeded');return result;
}
export function buildNativePedestalStudy({previous=[],modelFactory,orientedDimensions=false}={}){
 const records=new Map(),visuals=new Map(),plans=[];let maxCubes=0,maxBoxes=0,instances=0;
 for(let width=1;width<=16;width++)for(let depth=1;depth<=(orientedDimensions?16:8);depth++)for(let facing=0;facing<4;facing++){
  if(Math.min(width,depth)>8)continue;
  const sourceModel=modelFactory?.(width,depth,facing),plan=twinPedestalCells(width,depth,facing,{uvPolicy:'module-grain',capCuts:true,sourceModel}),physical=twinPedestalCollision(width,depth,facing,{sourceModel}),nx=facing%2?depth:width,nz=facing%2?width:depth,cells=[];
  for(let i=0;i<plan.cells.length;i++){
   const cell=plan.cells[i],cubes=cell.doc['minecraft:geometry'][0].bones.flatMap(b=>b.cubes).map(c=>canonical(c)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),collision=physical.cells[i].nativeBoxes;
   const visualKey=hash({cubes,collision}),edges=(cell.z===0?1:0)|(cell.x===nx-1?2:0)|(cell.z===nz-1?4:0)|(cell.x===0?8:0),record={visualKey,facing,edges},key=hash(record);
   visuals.set(visualKey,{cubes,collision});records.set(key,record);cells.push({x:cell.x,z:cell.z,key});instances++;maxCubes=Math.max(maxCubes,cubes.length);maxBoxes=Math.max(maxBoxes,collision.length);
  }
  plans.push({width,depth,facing,cells});
 }
 const manifest=appendOnlyManifest(records.keys(),previous),indices=new Map(manifest.map((key,i)=>[key,i])),pages=Math.ceil(manifest.length/256);
 // Old entries may remain reserved, but this proof requires their immutable
 // payload archive to be supplied before generating a real successor pack.
 const missingPrevious=previous.filter(key=>!records.has(key));
 return {schema:'altare-native-pedestal-study-1',registered:false,baseVersion:'0.12.3',stateDigits:{pose:16,bank:16,page:pages},declaredStates:256*pages,padding:256*pages-manifest.length,manifest,missingPrevious,records:Object.fromEntries([...records].sort(([a],[b])=>a.localeCompare(b))),visuals:Object.fromEntries([...visuals].sort(([a],[b])=>a.localeCompare(b))),plans:plans.map(p=>({...p,cells:p.cells.map(({key,...cell})=>({...cell,index:indices.get(key),state:encodePose(indices.get(key))}))})),stats:{configurations:plans.length,instances,semanticProfiles:records.size,visualProfiles:visuals.size,maxCubes,maxBoxes}};
}
