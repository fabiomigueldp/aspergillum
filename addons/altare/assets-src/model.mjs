import {box,rect,rotateCube,serializeCube} from './block-primitives.mjs';
export * from './block-primitives.mjs';
import {garment} from './atelier/garment.mjs';
export const geometryName=(long=false,facing=0)=>`mensa_${long?'long':'short'}${facing?`_${facing}`:''}`;
export function legacyAuthorGeometry(long=false,facing=0){
 if(!Number.isInteger(facing)||facing<0||facing>3)throw Error('Invalid frontal orientation');
 const bones=[
  {name:'body',pivot:[0,0,0],cubes:[box([-8,0,-8],[16,15.875,16],'stone')]},
  {name:'bare_top',pivot:[0,0,0],cubes:[box([-8,15.875,-8],[16,.125,16],'stone')]},
  {name:'linen_top',pivot:[0,0,0],cubes:[box([-8,15.875,-8],[16,.125,16],'linen')]},
 ];
 for(let side=0;side<4;side++){
  const edge=[
   box([-8,14.25,-8.1875],[16,.625,.1875],'stone'),
   box([-8,0,-8.1875],[16,.75,.1875],'stone'),
  ];
  bones.push({name:`edge_${side}`,pivot:[0,0,0],cubes:edge.map(c=>rotateCube(c,side))});
  const curtains=[];
  for(let i=0;i<6;i++){
   const width=16/6,x=-8+i*width;
   // Restrained gravity-shaped lobes, with a small alternating fold depth.
   const sag=.24*Math.sin(Math.PI*(i+.5)/6);
   const height=(long?10.5:3.25)+sag;
   const z0=-8.16-(i%2)*.22,z1=-8.16-((i+1)%2)*.22;
   const middleX=x+width/2,middleZ=(z0+z1)/2;
   const length=Math.hypot(width,z1-z0);
   const u=Math.round(i*128/6),next=Math.round((i+1)*128/6);
   const c=box([middleX-length/2,15.875-height,middleZ-.10],[length,height,.20],'linen',{
    north:rect('hem',u,0,next-u,long?86:28),
    south:rect('hem',u,0,next-u,long?86:28),
   });
   c.pivot=[middleX,0,middleZ];c.rotation=[0,-Math.atan2(z1-z0,width)*180/Math.PI,0];
   curtains.push(rotateCube(c,side));
  }
  curtains.push(rotateCube(box([-8,15.75,-8.48],[16,.25,.48],'linen'),side));
  bones.push({name:`cloth_${side}`,pivot:[0,0,0],cubes:curtains});
  // Only one frontal direction can ever be visible. Compile that direction
  // into each variant instead of carrying three permanently hidden frames.
  if(side!==facing)continue;
  // The frontal lies below the short cloth; long cloth deliberately overlaps its upper section.
  const c=box([-8,1.125,-8.08],[16,10.5,.08],'frontal',{
   north:rect('frontal',0,0,128,128),south:rect('frontal',0,0,128,128),
  });
  const horizontalFrames=[.875,11.375].map(y=>box([-8,y,-8.25],[16,.5,.25],'frame'));
  bones.push({name:`frontal_${side}`,pivot:[0,0,0],cubes:[c,...horizontalFrames].map(c=>rotateCube(c,side))});
  // Close only the two ends of the entire frontal, never each block seam.
  bones.push({name:`frontal_left_${side}`,pivot:[0,0,0],cubes:[rotateCube(box([7.5,1.125,-8.25],[.5,10.5,.25],'frame'),side)]});
  bones.push({name:`frontal_right_${side}`,pivot:[0,0,0],cubes:[rotateCube(box([-8,1.125,-8.25],[.5,10.5,.25],'frame'),side)]});
 }
 for(let side=0;side<4;side++){
  const c=box([-8.24,15.875-(long?10.5:3.25),-8.24],[.24,long?10.5:3.25,.24],'linen');
  bones.push({name:`corner_${side}`,pivot:[0,0,0],cubes:[rotateCube(c,side)]});
 }
 return {format_version:'1.16.0','minecraft:geometry':[{description:{identifier:`geometry.altare.${geometryName(long,facing)}`,texture_width:128,texture_height:128,visible_bounds_width:2,visible_bounds_height:2,visible_bounds_offset:[0,.5,0]},bones:bones.map(b=>({...b,cubes:b.cubes.map(serializeCube)}))}]};
}
export function visibility(facing=0){
 const state=k=>`q.block_state('altare:${k}')`;
 const edge=i=>`math.mod(math.floor(${state('edges')} / ${2**i}), 2) == 1`;
 const v={tabletop_base:`${state('cloth')} != 0`,bare_top:`${state('cloth')} == 0`,linen_top:`${state('cloth')} != 0`};
 for(let i=0;i<4;i++){
  v[`linen_return_${i}`]=`(${edge(i)}) && ${state('cloth')} != 0`;
  v[`linen_corner_${i}`]=`(${edge(i)}) && (${edge((i+3)%4)}) && ${state('cloth')} != 0`;
  v[`edge_${i}`]=edge(i);
  v[`cloth_${i}`]=`(${edge(i)}) && ${state('cloth')} != 0`;
  if(i===facing){
   v[`frontal_${i}`]=`(${edge(i)}) && ${state('frontal')} != 0 && ${state('facing')} == ${i}`;
   v[`frontal_left_${i}`]=`(${v[`frontal_${i}`]}) && (${edge((i+1)%4)})`;
   v[`frontal_right_${i}`]=`(${v[`frontal_${i}`]}) && (${edge((i+3)%4)})`;
  }
  // Corner 0 joins north and west, then rotate clockwise.
  v[`corner_${i}`]=`(${edge(i)}) && (${edge((i+3)%4)}) && ${state('cloth')} != 0`;
 }
 return v;
}

export function authorGeometry(long=false,facing=0){
 const doc=legacyAuthorGeometry(long,facing),g=doc['minecraft:geometry'][0];
 g.bones=g.bones.filter(b=>!['linen_top'].includes(b.name)&&!b.name.startsWith('cloth_')&&!b.name.startsWith('corner_'));
 const cloth=garment(long?'linen_long':'linen_short',undefined,{surface:()=> 'hem',seam:'seam',stoneEdge:8.25});
 g.bones.push({name:'tabletop_base',pivot:[0,0,0],cubes:[serializeCube(box([-8,15.875,-8],[16,.035,16],'stone'))]});
 for(const b of cloth.bones){
  const name=b.name==='top'?'linen_top':b.name.replace('drape_','cloth_').replace('fold_corner_','corner_');
  g.bones.push({...b,name,pivot:[0,0,0],cubes:b.cubes.map(serializeCube)});
 }
 return doc;
}
