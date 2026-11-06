import {twinPedestalGeometry,pedestalDimensions} from './twin-pedestal-prototype.mjs';
import {serializeCube} from '../block-primitives.mjs';
// Pure, unregistered planning only. These are author-space sixteenths, not a
// publication payload. The project supports arrays capped at 16 boxes/cell.
const EPS=1e-8,round=n=>Number(n.toFixed(6));
const down=n=>Math.floor((n+1e-9)*1e6)/1e6,up=n=>Math.ceil((n-1e-9)*1e6)/1e6;
export function cubeVertices(c){
 const pivot=c.pivot??[0,0,0],r=(c.rotation??[0,0,0]).map(n=>n*Math.PI/180),v=[];
 for(let i=0;i<8;i++){
  let [x,y,z]=c.origin.map((n,k)=>n+((i>>k)&1)*c.size[k]-pivot[k]);
  [x,y]=[x*Math.cos(r[2])-y*Math.sin(r[2]),x*Math.sin(r[2])+y*Math.cos(r[2])];
  [x,z]=[x*Math.cos(r[1])+z*Math.sin(r[1]),-x*Math.sin(r[1])+z*Math.cos(r[1])];
  [y,z]=[y*Math.cos(r[0])-z*Math.sin(r[0]),y*Math.sin(r[0])+z*Math.cos(r[0])];
  v.push([x+pivot[0],y+pivot[1],z+pivot[2]]);
 }
 return v;
}
const bounds=points=>({origin:[0,1,2].map(k=>down(Math.min(...points.map(p=>p[k])))),end:[0,1,2].map(k=>up(Math.max(...points.map(p=>p[k]))))});
const containsBox=(a,b)=>a.origin.every((n,k)=>n<=b.origin[k]+EPS&&a.end[k]>=b.end[k]-EPS);
export const containsPoint=(b,p)=>p.every((n,k)=>n>=b.origin[k]-EPS&&n<=b.origin[k]+b.size[k]+EPS);
const sized=b=>({origin:b.origin.map(round),size:b.end.map((n,k)=>round(n-b.origin[k]))});
export function normalizeBoxes(boxes){
 const unique=[...new Map(boxes.map(b=>[JSON.stringify([b.origin,b.end]),b])).values()];
 // No span merging: only exact duplicates and complete containment are removed.
 return unique.filter((b,i)=>!unique.some((a,j)=>i!==j&&containsBox(a,b))).map(sized).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
export function unionVolume(boxes){
 if(!boxes.length)return 0;
 const axes=[0,1,2].map(k=>[...new Set(boxes.flatMap(b=>[b.origin[k],round(b.origin[k]+b.size[k])]))].sort((a,b)=>a-b));
 let sum=0;
 for(let yi=0;yi<axes[1].length-1;yi++){
  const y=(axes[1][yi]+axes[1][yi+1])/2,active=boxes.filter(b=>y>b.origin[1]&&y<b.origin[1]+b.size[1]);
  const xs=[...new Set(active.flatMap(b=>[b.origin[0],round(b.origin[0]+b.size[0])]))].sort((a,b)=>a-b);
  for(let xi=0;xi<xs.length-1;xi++){
   const x=(xs[xi]+xs[xi+1])/2,intervals=active.filter(b=>x>b.origin[0]&&x<b.origin[0]+b.size[0]).map(b=>[b.origin[2],round(b.origin[2]+b.size[2])]).sort((a,b)=>a[0]-b[0]);
   let z=0,lo=0,hi=0,first=true;
   for(const [a,b]of intervals){if(first){lo=a;hi=b;first=false;}else if(a<=hi)hi=Math.max(hi,b);else{z+=hi-lo;lo=a;hi=b;}}
   if(!first)z+=hi-lo;sum+=(axes[1][yi+1]-axes[1][yi])*(xs[xi+1]-xs[xi])*z;
  }
 }
 return sum;
}
export function twinPedestalCollision(width,depth,facing=0,{sourceModel}={}){
 const model=sourceModel??twinPedestalGeometry(width,depth,facing),solids=[],sourceVertices=[];
 for(const bone of model.doc['minecraft:geometry'][0].bones){
  const cubes=bone.cubes.map(serializeCube),vertices=cubes.map(cubeVertices);
  sourceVertices.push(...vertices.flat());
  if(bone.name.endsWith('_shaft'))solids.push({...bounds(vertices.flat()),role:bone.name});
  else for(let i=0;i<cubes.length;i++)solids.push({...bounds(vertices[i]),role:bone.name+(cubes[i].rotation?'_inlay':'')});
 }
 const groups=new Map();
 for(const s of solids){
  // Native compact alternative: preserve three independent courses for the
  // tabletop; enclose each base/capital separately, never both supports.
  const key=s.role.startsWith('pedestal_')?s.role.replace(/_inlay$/,''):s;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);
 }
 const economicalSolids=[...groups.values()].map(group=>({...bounds(group.flatMap(s=>[s.origin,s.end])),role:group[0].role.replace(/_inlay$/,'')}));
 const nativeSolids=[...solids.filter(s=>!s.role.includes('_capital')), ...economicalSolids.filter(s=>s.role.includes('_capital'))];
 const nx=facing%2?depth:width,nz=facing%2?width:depth,cells=[];
 for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
  const center=[(x-(nx-1)/2)*16,0,(z-(nz-1)/2)*16],clipped=[],roles=new Set();
  for(const s of solids){
   const origin=s.origin.map((n,k)=>Math.max(n-center[k],k===1?0:-8)),end=s.end.map((n,k)=>Math.min(n-center[k],k===1?16:8));
   if(end.every((n,k)=>n-origin[k]>EPS)){clipped.push({origin,end});roles.add(s.role);}
  }
  const boxes=normalizeBoxes(clipped),profileKey=JSON.stringify(boxes);
  const nativeClipped=nativeSolids.map(s=>({origin:s.origin.map((n,k)=>Math.max(n-center[k],k===1?0:-8)),end:s.end.map((n,k)=>Math.min(n-center[k],k===1?16:8))})).filter(b=>b.end.every((n,k)=>n-b.origin[k]>EPS));
  const nativeBoxes=normalizeBoxes(nativeClipped),nativeProfileKey=JSON.stringify(nativeBoxes);
  const economicalClipped=economicalSolids.map(s=>({origin:s.origin.map((n,k)=>Math.max(n-center[k],k===1?0:-8)),end:s.end.map((n,k)=>Math.min(n-center[k],k===1?16:8))})).filter(b=>b.end.every((n,k)=>n-b.origin[k]>EPS));
  const economicalBoxes=normalizeBoxes([...economicalClipped.filter(b=>b.origin[1]<14.2),{origin:[-8,14.2,-8],end:[8,16,8]}]),economicalProfileKey=JSON.stringify(economicalBoxes);
  const envelope=sized(bounds(boxes.flatMap(b=>[b.origin,b.origin.map((n,k)=>n+b.size[k])])));
  cells.push({x,z,center,boxes,profileKey,roles:[...roles].sort(),singleBox:envelope,nativeBoxes,nativeProfileKey,economicalBoxes,economicalProfileKey});
 }
 return {width,depth,facing,profile:model.profile,solids:solids.map(s=>({...sized(s),role:s.role})),sourceVertices,cells,unregistered:true};
}
export function collisionStudyReport(){
 const economicalProfiles=new Set(),nativeProfiles=new Set(),profiles=new Set(),singleProfiles=new Set(),roleProfiles=new Set(),bySize=[],examples=[];
 let economicalMaxBoxes=0,maxEconomicalExcessPerCell=0,maxEconomicalExcessPerAltar=0,detailExcessUpperBound=0,nativeMaxBoxes=0,maxNativeExcessPerCell=0,totalNativeExcess=0,maxNativeExcessPerAltar=0,cellInstances=0,maxBoxes=0,maxSingleBoxExcess=0,totalSingleBoxExcess=0;
 for(let w=1;w<=16;w++)for(let d=1;d<=8;d++){
  let perSizeMax=0,perSizeProfiles=new Set(),excess=0,nativeExcess=0,economicalExcess=0;
  for(let f=0;f<4;f++){
   let nativeExcessFacing=0,economicalExcessFacing=0;
   const study=twinPedestalCollision(w,d,f);cellInstances+=study.cells.length;
   const p=study.profile,cut=Math.min(.55,p.shaftW*.15),nominalShaft=(p.shaftW*p.shaftD-2*cut*cut)*8.5;
   // Upper bound adds shaft enclosure vs nominal solid octagons and inlay
   // AABB-vs-diamond excess independently, intentionally not subtracting overlaps.
   const shaftExcess=study.solids.filter(s=>s.role.endsWith('_shaft')).reduce((sum,s)=>sum+s.size.reduce((a,b)=>a*b,1)-nominalShaft,0);
   const inlayExcess=study.solids.filter(s=>s.role.endsWith('_inlay')).reduce((sum,s)=>sum+s.size.reduce((a,b)=>a*b,1)-.48*.48*.024,0);
   detailExcessUpperBound=Math.max(detailExcessUpperBound,shaftExcess+inlayExcess);
   for(const cell of study.cells){
    economicalProfiles.add(cell.economicalProfileKey);economicalMaxBoxes=Math.max(economicalMaxBoxes,cell.economicalBoxes.length);
    const economicalE=unionVolume(cell.economicalBoxes)-unionVolume(cell.boxes);maxEconomicalExcessPerCell=Math.max(maxEconomicalExcessPerCell,economicalE);economicalExcessFacing+=economicalE;if(f===0)economicalExcess+=economicalE;
    nativeProfiles.add(cell.nativeProfileKey);nativeMaxBoxes=Math.max(nativeMaxBoxes,cell.nativeBoxes.length);
    const nativeE=unionVolume(cell.nativeBoxes)-unionVolume(cell.boxes);totalNativeExcess+=nativeE;nativeExcessFacing+=nativeE;maxNativeExcessPerCell=Math.max(maxNativeExcessPerCell,nativeE);if(f===0)nativeExcess+=nativeE;
    profiles.add(cell.profileKey);perSizeProfiles.add(cell.profileKey);singleProfiles.add(JSON.stringify(cell.singleBox));
    roleProfiles.add(JSON.stringify([cell.roles,cell.profileKey]));maxBoxes=Math.max(maxBoxes,cell.boxes.length);perSizeMax=Math.max(perSizeMax,cell.boxes.length);
    const e=cell.singleBox.size.reduce((a,b)=>a*b,1)-unionVolume(cell.boxes);maxSingleBoxExcess=Math.max(maxSingleBoxExcess,e);totalSingleBoxExcess+=e;if(f===0)excess+=e;
   }
   maxNativeExcessPerAltar=Math.max(maxNativeExcessPerAltar,nativeExcessFacing);maxEconomicalExcessPerAltar=Math.max(maxEconomicalExcessPerAltar,economicalExcessFacing);
   if(f===0&&[[1,1],[1,2],[1,3],[3,2],[3,3],[16,8]].some(([a,b])=>a===w&&b===d))examples.push({width:w,depth:d,cells:study.cells.map(({profileKey,nativeProfileKey,economicalProfileKey,...c})=>c)});
  }
  maxEconomicalExcessPerAltar=Math.max(maxEconomicalExcessPerAltar,economicalExcess);
  maxNativeExcessPerAltar=Math.max(maxNativeExcessPerAltar,nativeExcess);
  bySize.push({economicalExcessFacing0:round(economicalExcess),nativeExcessFacing0:round(nativeExcess),width:w,depth:d,cellInstances:4*w*d,profiles:perSizeProfiles.size,maxBoxes:perSizeMax,singleBoxExcessFacing0:round(excess)});
 }
 return {studyRevision:2,units:'sixteenths; volumes are cubic sixteenths',dimensions:128,facings:4,configurations:512,cellInstances,detailedExcessUpperBoundPerAltar:round(detailExcessUpperBound),economicalNative:{distinctProfiles:economicalProfiles.size,maxBoxesPerCell:economicalMaxBoxes,maxExcessPerCell:round(maxEconomicalExcessPerCell),maxExcessPerAltar:round(maxEconomicalExcessPerAltar)},nativeCompact:{distinctProfiles:nativeProfiles.size,maxBoxesPerCell:nativeMaxBoxes,maxExcessPerCell:round(maxNativeExcessPerCell),maxExcessPerAltar:round(maxNativeExcessPerAltar),totalExcessAcrossInstances:round(totalNativeExcess)},distinctMultiBoxProfiles:profiles.size,distinctSingleBoxProfiles:singleProfiles.size,distinctRoleAndMultiBoxProfiles:roleProfiles.size,maxBoxesPerCell:maxBoxes,maxSingleBoxExcessPerCell:round(maxSingleBoxExcess),totalSingleBoxExcessAcrossInstances:round(totalSingleBoxExcess),budget:{existingStates:80000,headroom:0,economicalStandaloneProfiles:economicalProfiles.size,oneIdPerEconomicalProfile:{ids:economicalProfiles.size,states:economicalProfiles.size},oneIdPerNativeCompactProfile:{ids:nativeProfiles.size,states:nativeProfiles.size},oneIdPackedEconomicalPalette:{ids:1,statePropertyCardinalities:[13,9,4],states:468,unusedProfiles:468-economicalProfiles.size},oneIdPackedNativeCompactPalette:{ids:1,statePropertyCardinalities:[15,10,4],states:600,unusedProfiles:600-nativeProfiles.size},oneIdPerSizeWithFacingAndCellCoordinates:{ids:128,states:cellInstances},oneIdPerCollisionProfile:{ids:profiles.size,states:profiles.size},oneIdPerSingleBoxProfile:{ids:singleProfiles.size,states:singleProfiles.size},oneIdPerSizeFacingCell:{ids:cellInstances,states:cellInstances},singleIdCartesianSizeFacingCell:{ids:1,states:16*8*4*16*8},roleAndProfile:{ids:roleProfiles.size,states:roleProfiles.size}},limitations:['Planning only; no block registration or version/schema changes.','Native multipart collision exists in target j_crossbrace_none.block.json. Project validator caps arrays at 16 boxes. Detailed per-course profiles can exceed 16; nativeCompact profiles satisfy the cap by conservatively enclosing each individual capital while retaining all four base courses.','Profile counts are standalone collision-palette costs, not a proof of an absolute global minimum or visual tile identity costs; independent visual/material/editor properties can require more states.','Single-box envelopes fill empty space beneath the tabletop and around supports; they do not satisfy the tight-collision requirement.','Octagonal shafts use AABBs of the actual rendered shell vertices, including 0.02-unit skin. Inlays use their rotated AABBs. All other detailed boxes follow exact solid courses. Economical native additionally encloses all base courses and all three tabletop courses in one slab. Native compact and economical excess is measured as exact union-volume difference against the detailed envelope.','Bounds are outward-rounded to 1e-6 units. Only exact duplicates and fully contained boxes are removed.'],bySize,examples};
}
