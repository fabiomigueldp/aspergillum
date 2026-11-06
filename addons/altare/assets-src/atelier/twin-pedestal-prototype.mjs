import {box,rect,serializeCube,rotateCube} from '../block-primitives.mjs';

// Isolated visual study: global dimensions in sixteenths, never inferred from
// published contour states. It does not register or replace any block identity.
// Study revision 2 balances the two depth shoulders of each capital.
const round=n=>Number(n.toFixed(7));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function member(origin,size,material='wood_horizontal'){
 const c=box(origin.map(round),size.map(round),material);
 for(const uv of Object.values(c.uv))uv.uv_size=uv.uv_size.map(v=>Math.min(128,v));return c;
}
function octagonalShaft(cx,w,d,y,h){
 const c=Math.min(.55,w*.15),x=w/2,z=d/2;
 const polygon=[[-x+c,-z],[x-c,-z],[x,-z+c],[x,z-c],[x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c]];
 return polygon.map((a,i)=>{
  const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],width=Math.hypot(dx,dz),mx=cx+(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
  return {origin:[mx-width/2,y,mz].map(round),size:[round(width),h,.02],pivot:[mx,y,mz].map(round),rotation:[0,round(-Math.atan2(dz,dx)*180/Math.PI),0],uv:{north:rect('wood_vertical',0,0,Math.max(1,Math.round(width*8)),Math.round(h*8))}};
 });
}
function inlay(cx,y,z,back=false){
 const size=.48,c=member([cx-size/2,y-size/2,z],[size,size,.024],'inlay');
 c.pivot=[cx,y,z+.012];c.rotation=[0,0,45];
 c.uv={[back?'south':'north']:rect('inlay',0,18,1,1)};return c;
}
export function pedestalDimensions(width,depth){
 if(!Number.isInteger(width)||width<1||width>16||!Number.isInteger(depth)||depth<1||depth>8)throw Error('Prototype dimensions must be 1..16 by 1..8');
 const W=width*16,D=depth*16;
 const shaftW=width===1?2.6:clamp(3.5+width*.5,4,8);
 const shaftD=clamp(depth*3.5,4,10),baseW=width===1?4:clamp(5+width,7,14);
 const capW=width===1?4.5:clamp(8+width*.65,9,13),inset=width===1?3.5:clamp(7+width*.5,8,12);
 const baseD=Math.min(D-3,clamp(depth*9+width*.5,10,24)),capD=Math.min(D-2,clamp(depth*12,12,28));
 return {W,D,shaftW,shaftD,baseW,baseD,capW,capD,centers:[-W/2+inset,W/2-inset],top:16,slabBottom:14.2};
}
export function twinPedestalGeometry(width=3,depth=2,facing=0){
 if(!Number.isInteger(facing)||facing<0||facing>3)throw Error('Invalid facing');
 const p=pedestalDimensions(width,depth),bones=[];
 const add=(name,cubes)=>bones.push({name,pivot:[0,0,0],cubes});
 add('mensa',[
  member([-p.W/2+.18,14.2,-p.D/2+.18],[p.W-.36,.46,p.D-.36]),
  member([-p.W/2,14.66,-p.D/2],[p.W,1.04,p.D]),
  member([-p.W/2+.10,15.70,-p.D/2+.10],[p.W-.20,.30,p.D-.20]),
 ]);
 // A single deep-centre bearer connects the capitals directly under the slab.
 // It is not an extra leg and leaves the entire lower opening unobstructed.
 add('concealed_longitudinal_bearer',[member([p.centers[0],12.9,-1.2],[p.centers[1]-p.centers[0],1.3,2.4])]);
 for(const [index,cx] of p.centers.entries()){
  add(`pedestal_${index}_base`,[
   member([cx-p.baseW/2,0,-p.baseD/2],[p.baseW,.55,p.baseD]),
   member([cx-(p.baseW-.4)/2,.55,-(p.baseD-.6)/2],[p.baseW-.4,.75,p.baseD-.6]),
   member([cx-(p.shaftW+1.2)/2,1.3,-(p.shaftD+1.8)/2],[p.shaftW+1.2,.55,p.shaftD+1.8]),
   member([cx-(p.shaftW+.65)/2,1.85,-(p.shaftD+.65)/2],[p.shaftW+.65,.35,p.shaftD+.65]),
  ]);
  add(`pedestal_${index}_shaft`,octagonalShaft(cx,p.shaftW,p.shaftD,2.2,8.5));
  add(`pedestal_${index}_capital`,[
   member([cx-(p.shaftW+.6)/2,10.7,-(p.shaftD+.6)/2],[p.shaftW+.6,.45,p.shaftD+.6]),
   member([cx-(p.shaftW+1.5)/2,11.15,-(p.shaftD+(p.capD-p.shaftD)*.5)/2],[p.shaftW+1.5,.65,p.shaftD+(p.capD-p.shaftD)*.5]),
   member([cx-(p.capW-.6)/2,11.8,-(p.capD-.8)/2],[p.capW-.6,1.0,p.capD-.8]),
   member([cx-p.capW/2,12.8,-p.capD/2],[p.capW,.6,p.capD]),
   member([cx-(p.capW-.3)/2,13.4,-(p.capD-.3)/2],[p.capW-.3,.8,p.capD-.3]),
   inlay(cx,12.28,-(p.capD-.8)/2-.025),inlay(cx,12.28,(p.capD-.8)/2+.001,true),
  ]);
 }
 for(const b of bones)for(let i=0;i<b.cubes.length;i++){
  const cube=b.cubes[i],c=rotateCube(cube,facing);
  if(cube.rotation){const [x,y,z]=cube.rotation;c.rotation=facing===1?[-z,y,x]:facing===2?[-x,y,-z]:facing===3?[z,y,-x]:[x,y,z];}
  b.cubes[i]=serializeCube(c);
 }
 const identifier=`geometry.altare.study_twin_pedestal_${width}x${depth}_${facing}`;
 return {doc:{format_version:'1.16.0','minecraft:geometry':[{description:{identifier,texture_width:128,texture_height:128,visible_bounds_width:Math.max(width,depth)+1,visible_bounds_height:2,visible_bounds_offset:[0,.5,0]},bones}]},profile:p,prototype:true,unregistered:true,studyRevision:2};
}
