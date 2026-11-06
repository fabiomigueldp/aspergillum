import {box,rect,rotateCube} from '../block-primitives.mjs';

// Cruzeta: an open walnut frame. A bay is a frame, never a solid chest.
// The contour is compiled, so internal faces/posts are not merely hidden.
export const crossbraceProfile=Object.freeze({top:16,slabBottom:14.2,outer:7.8,inner:6.2,railBottom:1.45,railTop:12.15,braceBottom:2.38,braceTop:12.26});
const exposed=(mask,side)=>!!(mask&(1<<((side+4)%4)));
const round=v=>Number(v.toFixed(9));
// One 1.6-unit motif per post; rails keep a nearly constant texel/world scale even
// when a corner shortens a bay. Eight periods fit the largest 14.4-unit rail.
const inlayScale=8.75,inlayPeriod=14;
function inlay(width,center=72){
 // Crop whole rail periods, never half a diamond at a butt joint.
 const periods=Math.round(width/1.8);
 if(width>1.6)return rect('joinery_inlay',0,0,periods*16,128);
 const pixels=Math.round(width*inlayScale);
 return rect('joinery_inlay',center-pixels/2,0,pixels,128);
}
function peg(x,y){
 const c=member([x-.17,y-.17,-7.56],[.34,.34,1.12],'wood_cross');
 c.pivot=[x,y,-7];c.rotation=[0,0,45];
 // A tiny maple end-grain insert, sampled from the same opaque wood atlas.
 for(const f of ['north','south'])c.uv[f]=rect('joinery_inlay',0,18,1,1);
 return c;
}
function member(origin,size,surface='stone'){
 const c=box(origin.map(round),size.map(round),surface);
 for(const uv of Object.values(c.uv))uv.uv_size=uv.uv_size.map(v=>Math.min(128,v));return c;
}
function turn(c,side){
 const out=rotateCube(c,side);
 if(c.rotation){const [x,y,z]=c.rotation;out.rotation=side===1?[-z,y,x]:side===2?[-x,y,-z]:side===3?[z,y,-x]:[x,y,z];}
 return out;
}
function brace(a,b,z){
 const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const c=member([x-length/2,y-.42,z],[length,.84,.48],'wood_cross');
 c.pivot=[x,y,z+.24];c.rotation=[0,0,round(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI)];return c;
}
function post(corner){
 const x=corner?-7.8:-8,w=corner?1.6:.8,z=-7.8,d=1.6;
 const shaft=member([x+(corner?.12:0),1.4,z+.12],[w-(corner?.24:.12),10.75,d-.24]);
 const foot=member([x,0,z],[w,1.4,d],'wood_cross');
 const cap=member([x,12.15,z],[w,2.05,d],'wood_cross');
 // A single diamond on a capital; feet retain only the two quiet filets.
 // Shared half posts crop complementary halves of one complete motif.
 for(const f of ['north','south','east','west']){
  foot.uv[f]=rect('joinery_inlay',0,0,1,128);
  shaft.uv[f]=rect('stone',0,0,12,86);
  cap.uv[f]=inlay(1.6);
 }
 if(!corner){
  cap.uv.north=inlay(.8,72-inlayPeriod/4);cap.uv.south=inlay(.8,72+inlayPeriod/4);
  shaft.uv.north=rect('stone',0,0,6,86);shaft.uv.south=rect('stone',6,0,6,86);
  // The face at the module cut is internal, so emit neither duplicate cap.
  for(const c of [foot,shaft,cap])delete c.uv.west;
 }
 return [foot,shaft,cap];
}
function mirror(c){
 const out=structuredClone(c);out.origin[0]=round(-c.origin[0]-c.size[0]);
 const e=out.uv.east,w=out.uv.west;delete out.uv.east;delete out.uv.west;if(e)out.uv.west=e;if(w)out.uv.east=w;
 // Reflection exchanges the front/back UV halves; the complete shared post
 // matches a corner's continuous grain/motif rather than repeating a half.
 const n=out.uv.north,s=out.uv.south;if(n)out.uv.south=n;if(s)out.uv.north=s;
 return out;
}
export function crossbraceArchitecture(edges=15){
 if(!Number.isInteger(edges)||edges<0||edges>15)throw Error('Invalid Cruzeta contour');
 const bones=[],add=(name,cubes)=>bones.push({name,cubes});
 for(let side=0;side<4;side++){
  if(!exposed(edges,side))continue;
  const left=exposed(edges,side+3),right=exposed(edges,side+1);
  if(left)add(`crossbrace_corner_${side}`,post(true).map(c=>turn(c,side)));
  else add(`crossbrace_half_${side}_left`,post(false).map(c=>turn(c,side)));
  if(!right)add(`crossbrace_half_${side}_right`,post(false).map(mirror).map(c=>turn(c,side)));
  const a=left?-6.2:-7.2,b=right?6.2:7.2;
  const top=member([a,12.15,-7.62],[b-a,2.05,1.24],'wood_cross');
  const bottom=member([a-.12,1.45,-7.5],[b-a+.24,1.05,1],'wood_cross');
  top.uv.north=inlay(b-a,64);top.uv.south=inlay(b-a,64);
  // Two offset half-depth members meet at a common plane and are joined
  // with a through-peg. This is a pegged double-layer X, not a local half-lap.
  const inset=.14,lo=crossbraceProfile.braceBottom,hi=crossbraceProfile.braceTop;
  const diagonalA=brace([a-inset,lo],[b+inset,hi],-7.48);
  const diagonalB=brace([a-inset,hi],[b+inset,lo],-7);
  add(`crossbrace_bay_${side}`,[top,bottom,diagonalA,diagonalB,peg((a+b)/2,(lo+hi)/2)].map(c=>turn(c,side)));
 }
 return {bones};
}
export function crossbraceCollision(edges){
 // One narrow perimeter frame envelope per exposed face, plus the slab.
 // Unlike a full cube, the centre of the table is free. AABB envelopes are
 // deliberately conservative across the diagonal openings, like trestles.
 const result=[{origin:[-8,14.2,-8],size:[16,1.8,16]}];
 for(let side=0;side<4;side++)if(exposed(edges,side)){
  const c=rotateCube({origin:[-8,0,-7.8],size:[16,14.2,1.6],uv:{}},side);
  result.push({origin:c.origin,size:c.size});
 }
 return result;
}
