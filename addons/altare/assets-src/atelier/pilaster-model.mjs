import {box,rect,rotateCube} from '../block-primitives.mjs';

// A panelled altar, built as a continuous carcass with engaged Tuscan piers.
// Contour, not textile, determines the supporting members. Units = 1/16 block.
export const pilasterProfile=Object.freeze({
 top:16,coreEdge:7.05,plinthTop:1.65,shaftBottom:2.65,shaftTop:11.6,
 capitalTop:13.15,slabBottom:14.2,slabShoulder:15.35,linenBottom:15.91,
 shaftOuter:8.08,shaftInner:5.63,bevel:.42,panelFace:7.05,
 panelBottom:3.4,panelTop:11.1,frameOuter:5.63,frameInner:4.59,
 baseFace:8.16,headFace:8.18,
 outerEdge:8.28,
});
export const pilasterBudget=Object.freeze({cubes:80,quads:300});
const exposed=(mask,side)=>!!(mask&(1<<((side+4)%4)));
const faces=['north','east','south','west'];
const round=v=>Number(v.toFixed(9));
const density=v=>Math.max(1,Math.min(128,Math.round(v*8)));
function member(origin,size,surface='stone',omit=[]){
 const c=box(origin.map(round),size.map(round),surface);
 for(const uv of Object.values(c.uv))uv.uv_size=uv.uv_size.map(v=>Math.min(128,v));
 for(const f of omit)delete c.uv[f];return c;
}
function perimeter(mask,edge,y,h,surface,omit=[]){
 const x0=exposed(mask,3)?-edge:-8,x1=exposed(mask,1)?edge:8,z0=exposed(mask,0)?-edge:-8,z1=exposed(mask,2)?edge:8;
 const c=member([x0,y,z0],[x1-x0,h,z1-z0],surface,omit);
 for(let i=0;i<4;i++)if(!exposed(mask,i))delete c.uv[faces[i]];
 return c;
}
function plane(a,b,y,h,surface='stone'){
 const dx=b[0]-a[0],dz=b[1]-a[1],w=Math.hypot(dx,dz),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
 return {origin:[cx-w/2,y,cz].map(round),size:[round(w),h,.02],pivot:[cx,y,cz].map(round),rotation:[0,round(-Math.atan2(dz,dx)*180/Math.PI),0],uv:{north:rect(surface,0,0,density(w),density(h))}};
}
function mirror(c){
 const out=structuredClone(c);out.origin[0]=round(-c.origin[0]-c.size[0]);
 if(out.pivot)out.pivot[0]*=-1;
 if(out.rotation)out.rotation=[out.rotation[0],-out.rotation[1],-out.rotation[2]];
 const east=out.uv.east,west=out.uv.west;delete out.uv.east;delete out.uv.west;
 if(east)out.uv.west=east;if(west)out.uv.east=west;
 if(out.uv.north){const uv=out.uv.north;uv.uv[0]+=uv.uv_size[0];}
 return out;
}
function cornerShaft(){
 const p=pilasterProfile,lo=-p.shaftOuter,hi=-p.shaftInner,b=p.bevel,y=p.shaftBottom,h=p.shaftTop-y;
 // The inner portions enter the carcass. Only five exterior faces are emitted;
 // a true diagonal face replaces the square nose rather than covering it.
 const north=member([lo+b,y,lo],[hi-lo-b,h,hi-lo],'stone',['west','south','up','down']);
 const west=member([lo,y,lo+b],[hi-lo,h,hi-lo-b],'stone',['east','north','up','down']);
 return [north,west,plane([lo,lo+b],[lo+b,lo],y,h)];
}
function halfShaft(){
 const p=pilasterProfile,w=(p.shaftOuter-p.shaftInner)/2,lo=-p.shaftOuter,b=p.bevel,y=p.shaftBottom,h=p.shaftTop-y,back=-p.coreEdge+.02;
 const front=member([-8,y,lo],[w-b,h,back-lo],'stone',['east','west','south','up','down']);
 // Both halves sample the same full-pier UV domain at the module boundary.
 front.uv.north=rect('stone',density(b),0,density(w)-density(b),density(h));
 const flank=member([-8,y,lo+b],[w,h,back-lo-b],'stone',['north','south','west','up','down']);
 return [front,flank,plane([-8+w-b,lo],[-8+w,lo+b],y,h)];
}
const courses=Object.freeze([
 {name:'pad',outer:8.16,inner:5.2,y:1.65,h:.45,omit:['down']},
 {name:'foot',outer:8.10,inner:5.4,y:2.1,h:.55,omit:['down']},
 {name:'neck',outer:8.08,inner:5.58,y:11.6,h:.4,omit:['up']},
 {name:'echinus',outer:8.12,inner:5.3,y:12,h:.7,omit:['up']},
 {name:'abacus',outer:8.16,inner:5,y:12.7,h:.45,omit:['up']},
]);
function pier(corner){
 const p=pilasterProfile,cubes=[];
 for(const c of courses){
  const width=c.outer-c.inner;
  const cube=corner?member([-c.outer,c.y,-c.outer],[width,c.h,width],'stone',c.omit):member([-8,c.y,-c.outer],[width/2,c.h,c.outer-p.coreEdge+.02],'stone',[...c.omit,'west','south']);
  if(!corner)cube.uv.north=rect('stone',0,0,density(width/2),density(c.h));
  cubes.push(cube);
 }
 cubes.splice(2,0,...(corner?cornerShaft():halfShaft()));return cubes;
}
function panelMoulding(leftCorner,rightCorner){
 const p=pilasterProfile;
 // Four raking reveals connect the recessed field to the actual bearing
 // members. Their outer edges enter the piers, base and frieze, closing the
 // recess without protruding cut ends or a separate floating picture frame.
 // Intermediate half-piers have a narrower return and a bevel on the inner
 // nose. Meet that actual flank, rather than reusing the full corner section.
 const endpoint=corner=>corner?{x:p.shaftInner,depth:p.shaftOuter}:{x:8-(p.shaftOuter-p.shaftInner)/2,depth:p.shaftOuter-p.bevel};
 const left=endpoint(leftCorner),right=endpoint(rightCorner),x0=-left.x,x1=right.x;
 const horizontal=(innerY,outerY,edge)=>{
  const y0=Math.min(innerY,outerY),y1=Math.max(innerY,outerY),z0=y0===innerY?-p.coreEdge:-edge,z1=y1===innerY?-p.coreEdge:-edge;
  const cy=(y0+y1)/2,cz=(z0+z1)/2,h=Math.hypot(y1-y0,z1-z0);
  return {origin:[x0,cy-h/2,cz].map(round),size:[round(x1-x0),round(h),.02],pivot:[0,cy,cz],rotation:[round(Math.atan2(z1-z0,y1-y0)*180/Math.PI),0,0],uv:{north:rect('rail',0,0,density(x1-x0),density(h))}};
 };
 return [horizontal(p.panelBottom,p.plinthTop,p.baseFace),horizontal(p.panelTop,p.capitalTop,p.headFace),
  plane([x0,-left.depth],[-p.frameInner,-p.coreEdge],p.plinthTop,p.capitalTop-p.plinthTop),
  plane([p.frameInner,-p.coreEdge],[x1,-right.depth],p.plinthTop,p.capitalTop-p.plinthTop)];
}
function turnMoulding(c,side){
 const out=rotateCube(c,side),[x,y,z]=c.rotation;
 out.rotation=side===1?[-z,y,x]:side===2?[-x,y,-z]:side===3?[z,y,-x]:[x,y,z];
 return out;
}
export function pilasterArchitecture(edges,clothed){
 if(!Number.isInteger(edges)||edges<0||edges>15)throw Error('Invalid pilaster contour');
 const p=pilasterProfile,bones=[],add=(name,cubes)=>bones.push({name,cubes});
 const core=perimeter(edges,p.coreEdge,p.plinthTop,p.capitalTop-p.plinthTop,'stone',['up','down']);
 add('core',Object.keys(core.uv).length?[core]:[]);
 add('plinth',[
  perimeter(edges,8.25,0,.45,'rail'),
  perimeter(edges,8.06,.45,.7,'rail',['up','down']),
  perimeter(edges,8.16,1.15,.5,'rail'),
 ]);
 add('frieze',[perimeter(edges,8.18,p.capitalTop,.5,'rail',['up'])]);
 add('cornice',[perimeter(edges,8.23,13.65,.55,'rail',['up'])]);
 add('mensa_edge',[perimeter(edges,p.outerEdge,p.slabBottom,p.slabShoulder-p.slabBottom,'rail')]);
 add(clothed?'tabletop_base':'top',[perimeter(edges,8.18,p.slabShoulder,(clothed?p.linenBottom:p.top)-p.slabShoulder,clothed?'stone':'top',['down'])]);
 for(let side=0;side<4;side++){
  if(!exposed(edges,side))continue;
  if(exposed(edges,side+3))add(`pier_corner_${side}`,pier(true).map(c=>rotateCube(c,side)));
  else add(`pier_half_${side}_left`,pier(false).map(c=>rotateCube(c,side)));
  if(!exposed(edges,side+1))add(`pier_half_${side}_right`,pier(false).map(mirror).map(c=>rotateCube(c,side)));
  add(`panel_frame_${side}`,panelMoulding(exposed(edges,side+3),exposed(edges,side+1)).map(c=>turnMoulding(c,side)));
 }
 return {bones};
}
