import {crossbraceArchitecture,crossbraceCollision} from './crossbrace-model.mjs';
import {pilasterArchitecture,pilasterProfile} from './pilaster-model.mjs';
import {ogiveArchitecture,ogiveProfile,ogiveReliefFit} from './ogive-model.mjs';
import {garment} from './garment.mjs';
import {box,rect,rotateCube,serializeCube} from '../block-primitives.mjs';
import {textileProfiles} from './profiles.mjs';
import {structureProfile} from './structure-profiles.mjs';
import {joineryMembers,joineryCollision} from './joinery.mjs';
const edge=i=>`math.mod(math.floor(q.block_state('altare:edges') / ${2**i}), 2) == 1`;
const corner=i=>`(${edge(i)}) && (${edge((i+3)%4)})`;
const role=n=>`q.block_state('altare:role') == ${n}`;
export const atelierGeometryName=(structure,textile,frontal,facing,edges)=>`atelier_${structure}_${textile}_${frontal}_${facing}${edges===undefined?'':`_e${edges}`}`;
// Conjugate an in-plane Z rotation into the destination side. Legacy yaw-only
// cloth keeps its existing generator and output bytes.
function turn(c,f){
 const out=rotateCube(c,f);
 if(c.rotation){const [x,y,z]=c.rotation;out.rotation=f===1?[-z,y,x]:f===2?[-x,y,-z]:f===3?[z,y,-x]:[x,y,z];}
 return out;
}
function beam(a,b,z,depth=.5,thickness=.55){
 const cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const c=box([cx-length/2,cy-thickness/2,z],[length,thickness,depth],'stone');
 c.pivot=[cx,cy,z+depth/2];c.rotation=[0,0,Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI];return c;
}
function clipped(c){
 const left=Math.max(-8,c.origin[0]),right=Math.min(8,c.origin[0]+c.size[0]);
 if(right<=left)return undefined;return {...c,origin:[left,c.origin[1],c.origin[2]],size:[right-left,c.size[1],c.size[2]]};
}
export function legacyAtelierGeometry(structure,textile,frontal,facing=0,edges){
 const bones=[],visibility={},add=(name,cubes,condition)=>{bones.push({name,pivot:[0,0,0],cubes});if(condition)visibility[name]=condition;};
 const {top,slabBottom,linenThickness,coreInset,plinthHeight}=structureProfile,round=v=>Number(v.toFixed(6));
 const linenBottom=round(top-linenThickness),bodyEdge=round(-8+coreInset),bodyWidth=round(16-coreInset*2),bodyHeight=round(slabBottom-plinthHeight);
 if(textile==='none')add('top',[box([-8,slabBottom,-8],[16,round(top-slabBottom),16],'top')]);
 else{
  add('tabletop_base',[box([-8,slabBottom,-8],[16,round(linenBottom-slabBottom),16],'stone')]);
  add('top',[box([-8,linenBottom,-8],[16,linenThickness,16],'top')]);
 }
 if(['coffer','baluster','crossbrace'].includes(structure)){
  if(frontal!=='none')throw Error('Joinery models have no applied relief');
  if(structure==='crossbrace')for(const b of crossbraceArchitecture(edges??15).bones)add(b.name,b.cubes);
  else joineryMembers(structure,add,turn,edge,edges);
 }else if(structure!=='trestle'){
  add('core',[box([bodyEdge,plinthHeight,bodyEdge],[bodyWidth,bodyHeight,bodyWidth],'stone'),box([-8,0,-8],[16,plinthHeight,16],'stone')]);
  // Internal joins extend the recessed body to the cell boundary. Recesses
  // belong to the exterior perimeter, never every module in a long front.
  for(let i=0;i<4;i++)add(`core_join_${i}`,[turn(box([bodyEdge,plinthHeight,-8],[bodyWidth,bodyHeight,coreInset],'stone'),i)],`!(${edge(i)})`);
  if(structure==='pilaster')for(let i=0;i<4;i++)add(`pier_${i}`,[box([-7.75,2,-7.75],[2.25,11.1,2.25],'stone'),box([-8,1,-8],[3,1,3],'stone'),box([-8,13.1,-8],[3,1.1,3],'stone')].map(c=>turn(c,i)),corner(i));
  if(structure==='ogive'){
   const {peak,spring:shoulder}=structureProfile.arch;
   const path=[[-6.4,1.25],[-6.4,shoulder],[-5.8,shoulder+(peak-shoulder)*.38],[-3.5,peak-(peak-shoulder)*.24],[0,peak]];
   const arches=[];for(const sign of [-1,1])for(let i=0;i<path.length-1;i++)arches.push(beam([path[i][0]*sign,path[i][1]],[path[i+1][0]*sign,path[i+1][1]],-8.15,1.05,.72));
   arches.push(box([-6.8,1,-8.15],[13.6,.65,1.05],'stone'));
   for(const x of [-6.9,5.9])arches.push(box([x,shoulder-.2,-8.24],[1,.4,1.14],'stone'));
   arches.push(box([-.48,peak-.45,-8.28],[.96,.75,1.18],'stone'));
   add('ogive',arches.map(c=>turn(c,facing)),edge(facing));
  }
 }else{
  for(let i=0;i<4;i++)add(`rail_${i}`,[turn(box([-8,11.75,-7.5],[16,2.45,1.5],'stone'),i)],edge(i));
  // Each end is a real braced frame. The foot/head continue across depth
  // cells; each upright receives the long stretcher at the same elevation.
  for(const [name,side,x] of [['left',(facing+3)%4,-5.75],['right',(facing+1)%4,5.75]]){
   const frame=[
    box([x-1.5,0,-8],[3,1.5,16],'stone'),
    box([x-1.125,1.5,-1.25],[2.25,11,2.5],'stone'),
    box([x-1.375,12.5,-8],[2.75,1.7,16],'stone'),
   ];
   for(const sign of [-1,1])frame.push(turn(beam([sign*.8,8.3],[sign*5.7,12.8],-x-.75,1.5,.9),1));
   add(`frame_${name}`,frame.map(c=>turn(c,facing)),edge(side));
  }
  add('stretcher',[turn(box([-8,3.5,-.8],[16,1.5,1.6],'stone'),facing)]);
 }
 if(textile!=='none'){
  const {drop}=textileProfiles[textile];
  for(let side=0;side<4;side++){
   const curtain=[],mat=side===facing?'drape':'repeat';
   for(let i=0;i<4;i++){
    const x=-8+i*4,z0=-8.10-(i%2)*.12,z1=-8.10-((i+1)%2)*.12;
    const cx=x+2,cz=(z0+z1)/2,w=Math.hypot(4,z1-z0);
    // The rendered north plane passes through the authored fold endpoints.
    // Thickness extends inward; a per-panel X tilt would separate the seams.
    const c={origin:[cx-w/2,15.85-drop,cz],size:[w,drop,.05],pivot:[cx,15.85,cz],rotation:[0,-Math.atan2(z1-z0,4)*180/Math.PI,0],uv:{north:rect(mat,(3-i)*32,0,32,128)}};
    curtain.push(turn(c,side));
   }
   curtain.push(turn(box([-8,15.84,-8.27],[16,.16,.27],'linen'),side));
   add(`drape_${side}`,curtain,edge(side));
   // One thin, inclined miter closes the two drapes without a square corner rod.
   const width=Math.SQRT2*.1;
   const c={origin:[-8.05-width/2,15.85-drop,-8.05],size:[width,drop,.05],pivot:[-8.05,15.85,-8.05],rotation:[0,45,0],uv:{north:rect('repeat',0,0,1,128)}};
   add(`fold_corner_${side}`,[turn(c,side)],corner(side));
  }
 }
 if(frontal!=='none')for(const n of [1,2,3]){
  // World X is inverse texture U. First centre half ends at +X (visual right).
  const cx=n===2?8:n===3?-8:0,pieces=[];
  const availableBottom=structure==='pilaster'?pilasterProfile.panelBottom+.15:structure==='ogive'?ogiveProfile.reliefBottom:.75;
  const availableTop=Math.min(structure==='pilaster'?pilasterProfile.panelTop-.15:structure==='ogive'?ogiveProfile.reliefTop:14,textile==='none'?14:15.85-textileProfiles[textile].drop-.35);
  const bodyCenter=Math.min((availableBottom+availableTop)/2,structure==='ogive'?ogiveProfile.spring+1:Infinity);
  if(structure==='trestle')pieces.push(box([cx-4.25,.9,-8],[8.5,12.3,.5],'stone'));
  if(frontal==='cross'){
   pieces.push(box([cx-.6,bodyCenter-2.65,-8.25],[1.2,5.3,.3],'metal'));
   pieces.push(box([cx-2.7,bodyCenter-.6,-8.28],[5.4,1.2,.3],'metal'));
  }else{
   const c=box([cx-4,bodyCenter-3.3,-8.18],[8,6.6,.4],'metal');
   c.uv.north=rect('plaque',0,0,128,128);pieces.push(c);
  }
  // A long fall leaves a smaller exposed field. Scale the whole relief in
  // its plane, preserving its aspect instead of cutting it through the plinth.
  let fit=Math.min(1,(availableTop-availableBottom)/(frontal==='agnus'?6.6:5.3));
  if(structure==='ogive'&&n===1)fit=ogiveReliefFit(frontal==='agnus'?8:5.4,frontal==='agnus'?6.6:5.3,bodyCenter,fit);
  if(fit<1)for(const c of pieces.filter(c=>c.uv.north.material_instance!=='stone')){
   c.origin[0]=cx+(c.origin[0]-cx)*fit;c.origin[1]=bodyCenter+(c.origin[1]-bodyCenter)*fit;c.size[0]*=fit;c.size[1]*=fit;
  }
  if(['pilaster','ogive'].includes(structure))for(const c of pieces){
   // Odd centres attach to the recessed field. Even centres bear on the
   // shared pier; their plates may bridge the adjacent panel reveal.
   const face=structure==='ogive'?(n===1?ogiveProfile.coreEdge:ogiveProfile.pierOuter):(n===1?pilasterProfile.panelFace:pilasterProfile.shaftOuter);
   const projection=-c.origin[2]-(frontal==='cross'?8.25:8.18);
   c.origin[2]=-(face+c.size[2]-.04+projection);
  }
  const cut=pieces.map(clipped).filter(Boolean);
  // Each clipped half samples precisely its portion of the full plaque.
  if(frontal==='agnus')for(const c of cut.filter(c=>c.uv.north.material_instance==='plaque')){const u=n===2?64:0;c.uv.north=rect('plaque',u,0,n===1?128:64,128);}
  add(`applique_${n}`,cut.map(c=>turn(c,facing)),`(${edge(facing)}) && (${role(n)})`);
 }
 const doc={format_version:'1.16.0','minecraft:geometry':[{description:{identifier:`geometry.altare.${atelierGeometryName(structure,textile,frontal,facing,edges)}`,texture_width:128,texture_height:128,visible_bounds_width:2,visible_bounds_height:2,visible_bounds_offset:[0,.5,0]},bones:bones.map(b=>({...b,cubes:b.cubes.map(serializeCube)}))}]};
 return {doc,visibility};
}
export function structureCollision(structure,edges,facing){
 if(structure==='crossbrace')return crossbraceCollision(edges);
 if(['coffer','baluster','crossbrace'].includes(structure))return joineryCollision(structure,edges);
 if(structure!=='trestle')return true;
 const {doc,visibility}=atelierGeometry(structure,'none','none',facing);
 const q={block_state:()=>edges},math={floor:Math.floor,mod:(a,b)=>a%b};
 const cubes=doc['minecraft:geometry'][0].bones.filter(b=>!visibility[b.name]||Function('q','math',`return ${visibility[b.name]}`)(q,math)).flatMap(b=>b.cubes);
 // Stable collision uses origin/size in bottom-centred world coordinates.
 // Include cube rotations: diagonal braces need conservative AABBs, while
 // the top and the open space beneath it remain separate collision volumes.
 const round=v=>Math.round(v*1e6)/1e6;
 return cubes.map(c=>{
  const origin=[-(c.origin[0]+c.size[0]),c.origin[1],c.origin[2]],pivot=c.pivot?[-c.pivot[0],c.pivot[1],c.pivot[2]]:[0,0,0];
  const rotation=c.rotation?[-c.rotation[0],-c.rotation[1],c.rotation[2]]:[0,0,0],points=[];
  for(const x of [0,1])for(const y of [0,1])for(const z of [0,1]){
   let v=origin.map((n,i)=>n+c.size[i]*[x,y,z][i]-pivot[i]);
   for(let axis=0;axis<3;axis++){const a=rotation[axis]*Math.PI/180,j=(axis+1)%3,k=(axis+2)%3,p=v[j],q=v[k];v[j]=p*Math.cos(a)-q*Math.sin(a);v[k]=p*Math.sin(a)+q*Math.cos(a);}
   points.push(v.map((n,i)=>n+pivot[i]));
  }
  const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
  return {origin:min.map(round),size:max.map((n,i)=>round(n-min[i]))};
 });
}

export function atelierGeometry(structure,textile,frontal,facing=0,edges){
 if(structure==='crossbrace'&&edges===undefined)edges=15;
 const out=legacyAtelierGeometry(structure,textile,frontal,facing,edges);
 if(['pilaster','ogive'].includes(structure)){
  const mask=edges??15,g=out.doc['minecraft:geometry'][0],appliques=g.bones.filter(b=>b.name.startsWith('applique_')&&(mask&(1<<facing)));
  const architecture=(structure==='ogive'?ogiveArchitecture:pilasterArchitecture)(mask,textile!=='none');
  g.bones=architecture.bones.map(b=>({...b,pivot:[0,0,0],cubes:b.cubes.map(serializeCube)}));
  g.bones.push(...appliques);out.visibility=Object.fromEntries(appliques.map(b=>[b.name,role(Number(b.name.slice(-1)))]));
  if(textile!=='none'){
   const cloth=garment(textile,mask,{surface:i=>`cloth_${i}`});
   g.bones.push(...cloth.bones.map(b=>({...b,pivot:[0,0,0],cubes:b.cubes.map(serializeCube)})));
  }return out;
 }
 if(textile==='none')return out;
 const cloth=garment(textile,edges,{facing,twoSided:['trestle','baluster','crossbrace'].includes(structure)});
 const g=out.doc['minecraft:geometry'][0];g.bones=g.bones.filter(b=>b.name!=='top'&&!b.name.startsWith('drape_')&&!b.name.startsWith('fold_corner_'));
 for(const k of Object.keys(out.visibility))if(k==='top'||k.startsWith('drape_')||k.startsWith('fold_corner_'))delete out.visibility[k];
 g.bones.push(...cloth.bones.map(b=>({...b,pivot:[0,0,0],cubes:b.cubes.map(serializeCube)})));
 Object.assign(out.visibility,cloth.visibility);return out;
}
