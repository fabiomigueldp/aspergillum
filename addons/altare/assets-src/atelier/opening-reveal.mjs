import {rect} from '../block-primitives.mjs';

const round=v=>Number(v.toFixed(9));
const density=v=>Math.max(1,Math.min(128,Math.round(v*8)));
const normal=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<1e-8)throw Error('Repeated opening vertex');return [dy/l,-dx/l];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const quarter=([x,y,z],side)=>side===1?[-z,y,x]:side===2?[-x,y,-z]:side===3?[z,y,-x]:[x,y,z];

// An open clockwise path: left foot -> crown -> right foot. The floor stays
// level. Offset line intersections close the raked walls at true mitres.
export function insetOpeningPath(path,width){
 if(path.length<3||!Number.isFinite(width)||width<=0)throw Error('Invalid opening inset');
 const normals=path.slice(1).map((p,i)=>normal(path[i],p));
 return path.map((p,i)=>{
  const a=normals[Math.max(0,i-1)],b=normals[Math.min(normals.length-1,i)],denominator=1+a[0]*b[0]+a[1]*b[1];
  if(denominator<1e-8)throw Error('Opening doubles back');
  return p.map((v,j)=>round(v+width*(a[j]+b[j])/denominator));
 });
}

// Matrix columns are local X/Y/Z. Converting the full frame avoids swapping
// Euler channels after a compound rotation, which changes the physical plane.
function euler(x,y,z){
 const ry=Math.asin(Math.max(-1,Math.min(1,-x[2]))),cy=Math.cos(ry);
 const rx=Math.abs(cy)>1e-8?Math.atan2(y[2],z[2]):0;
 const rz=Math.abs(cy)>1e-8?Math.atan2(x[1],x[0]):Math.atan2(-y[0],y[1]);
 return [rx,ry,rz].map(a=>round(a*180/Math.PI));
}

export function openingReveal(path,{front,back,inset,side=0,surface='stone'}){
 if(!Number.isInteger(side)||side<0||side>3||front<=back||inset<=0)throw Error('Invalid reveal frame');
 const depth=front-back,slant=Math.hypot(depth,inset),cubes=[];
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),n=normal(a,b);
  const x=quarter([dx/l,dy/l,0],side),z=quarter([n[0]*inset/slant,n[1]*inset/slant,depth/slant],side),y=cross(z,x);
  const pivot=quarter([a[0],a[1],-front],side).map(round);
  // Adjacent rectangles intersect at non-coplanar mitres. Their excess is
  // inside the solid surround; the exterior is the nearest-wall envelope.
  cubes.push({origin:[...pivot],pivot:[...pivot],size:[round(l),.02,round(slant)],rotation:euler(x,y,z),uv:{down:rect(surface,0,0,density(l),density(slant))}});
 }
 return cubes;
}
