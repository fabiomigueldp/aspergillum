import {box,rect,rotateCube} from '../block-primitives.mjs';
import {insetOpeningPath,openingReveal} from './opening-reveal.mjs';

export const ogiveProfile=Object.freeze({top:16,plinthTop:1.5,head:13.5,slabBottom:14.2,slabShoulder:15.45,linenBottom:15.91,coreEdge:7.05,face:8.08,pierOuter:8.12,pierInner:5.85,shaftBottom:2.25,shaftTop:12.875,spring:5.25,peak:12.625,halfWidth:4.625,segments:6,bevel:.5,lip:.0625,outerEdge:8.28,reliefBottom:2,reliefTop:11.8});
export const ogiveBudget=Object.freeze({cubes:112,quads:300});
const p=ogiveProfile,round=v=>Number(v.toFixed(9));
const exposed=(mask,i)=>!!(mask&(1<<((i+4)%4))),faces=['north','east','south','west'];
const rise=p.peak-p.spring,centre=(rise*rise-p.halfWidth*p.halfWidth)/(2*p.halfWidth),radius=centre+p.halfWidth,apex=Math.atan2(rise,-centre);
const left=Array.from({length:p.segments+1},(_,i)=>{
 if(i===0)return [-p.halfWidth,p.spring];if(i===p.segments)return [0,p.peak];
 const a=Math.PI+(apex-Math.PI)*i/p.segments;return [round(centre+radius*Math.cos(a)),round(p.spring+radius*Math.sin(a))];
});
export const ogiveCurve=Object.freeze([...left,...left.slice(0,-1).reverse().map(([x,y])=>[-x,y])].map(Object.freeze));
export const ogiveOpening=Object.freeze([[-p.halfWidth,p.plinthTop],...ogiveCurve,[p.halfWidth,p.plinthTop]].map(Object.freeze));
export const ogiveRecess=Object.freeze(insetOpeningPath(ogiveOpening,p.bevel).map(Object.freeze));
export function openingDistance(x,y,polygon=ogiveOpening){
 let inside=false,distance=Infinity;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside?distance:-distance;
}
// Raster and intrados use the same polygon. The half-texel lip hides raster
// quantization at the front edge; RGB remains valid under transparent pixels.
export function ogiveMaskAlpha(u,v){
 const x=8-(u+.5)/8,y=16-(v+.5)/8;
 return y>=p.plinthTop&&y<=p.head&&openingDistance(x,y)<=p.lip?255:0;
}
export function ogiveReliefFit(width,height,cy,limit=1){
 const fits=s=>[-1,1].every(sx=>[-1,1].every(sy=>openingDistance(sx*width*s/2,cy+sy*height*s/2,ogiveRecess)>=.15));
 let lo=0,hi=limit;if(fits(hi))return hi;
 for(let i=0;i<36;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}return lo;
}
function member(origin,size,surface='stone',omit=[]){
 const c=box(origin.map(round),size.map(round),surface);for(const uv of Object.values(c.uv))uv.uv_size=uv.uv_size.map(v=>Math.min(128,v));for(const side of omit)delete c.uv[side];return c;
}
function perimeter(mask,edge,y,h,surface,omit=[]){
 const x0=exposed(mask,3)?-edge:-8,x1=exposed(mask,1)?edge:8,z0=exposed(mask,0)?-edge:-8,z1=exposed(mask,2)?edge:8;
 const c=member([x0,y,z0],[x1-x0,h,z1-z0],surface,omit);for(let i=0;i<4;i++)if(!exposed(mask,i))delete c.uv[faces[i]];return c;
}
function turn(c,side){
 const out=rotateCube(c,side);if(c.rotation){const [x,y,z]=c.rotation;out.rotation=side===1?[-z,y,x]:side===2?[-x,y,-z]:side===3?[z,y,-x]:[x,y,z];}return out;
}
function mirror(c){
 const out=structuredClone(c);out.origin[0]=round(-c.origin[0]-c.size[0]);
 const e=out.uv.east,w=out.uv.west;delete out.uv.east;delete out.uv.west;if(e)out.uv.west=e;if(w)out.uv.east=w;
 if(out.uv.north)out.uv.north.uv[0]+=out.uv.north.uv_size[0];return out;
}
function pier(corner){
 return [{outer:8.2,inner:5.55,y:p.plinthTop,h:p.shaftBottom-p.plinthTop,omit:['down']},{outer:p.pierOuter,inner:p.pierInner,y:p.shaftBottom,h:p.shaftTop-p.shaftBottom,omit:['up','down']},{outer:8.2,inner:5.5,y:p.shaftTop,h:p.head-p.shaftTop,omit:['up']}].map(c=>{
  const w=c.outer-c.inner;
  return corner?member([-c.outer,c.y,-c.outer],[w,c.h,w],'stone',c.omit):member([-8,c.y,-c.outer],[w/2,c.h,c.outer-p.coreEdge+.02],'stone',[...c.omit,'west','south']);
 });
}
export function ogiveArchitecture(edges,clothed){
 if(!Number.isInteger(edges)||edges<0||edges>15)throw Error('Invalid Ogive contour');
 const bones=[],add=(name,cubes)=>bones.push({name,cubes});
 const core=perimeter(edges,p.coreEdge,p.plinthTop,p.head-p.plinthTop,'stone',['up','down']);add('core',Object.keys(core.uv).length?[core]:[]);
 add('plinth',[perimeter(edges,8.25,0,.5,'rail'),perimeter(edges,8.12,.5,.6,'rail',['up','down']),perimeter(edges,8.2,1.1,.4,'rail')]);
 add('frieze',[perimeter(edges,8.24,p.head,p.slabBottom-p.head,'rail',['up'])]);
 add('mensa_edge',[perimeter(edges,p.outerEdge,p.slabBottom,p.slabShoulder-p.slabBottom,'rail')]);
 add(clothed?'tabletop_base':'top',[perimeter(edges,8.2,p.slabShoulder,(clothed?p.linenBottom:p.top)-p.slabShoulder,clothed?'stone':'top',['down'])]);
 for(let side=0;side<4;side++){
  if(!exposed(edges,side))continue;
  const leftCorner=exposed(edges,side+3),rightCorner=exposed(edges,side+1);
  if(leftCorner)add(`pier_corner_${side}`,pier(true).map(c=>turn(c,side)));else add(`pier_half_${side}_left`,pier(false).map(c=>turn(c,side)));
  if(!rightCorner)add(`pier_half_${side}_right`,pier(false).map(mirror).map(c=>turn(c,side)));
  add(`ogive_spandrel_${side}`,[turn({origin:[-8,p.plinthTop,-p.face],size:[16,p.head-p.plinthTop,.02],uv:{north:rect('arcade',0,20,128,96)}},side)]);
  // The reveal's local X follows the profile: the rail's grain therefore
  // follows the jamb/arch instead of turning into horizontal bands on jambs.
  add(`ogive_intrados_${side}`,openingReveal(ogiveOpening,{front:p.face,back:p.coreEdge,inset:p.bevel,side,surface:'rail'}));
  const impost=corner=>{const end=corner?p.pierInner:8-(p.pierOuter-p.pierInner)/2;return member([-end-.06,p.spring-.25,-8.22],[end+.06-p.halfWidth,.5,8.22-p.coreEdge+.02],'rail',['south']);};
  add(`ogive_impost_${side}`,[impost(leftCorner),mirror(impost(rightCorner))].map(c=>turn(c,side)));
 }
 return {bones};
}
