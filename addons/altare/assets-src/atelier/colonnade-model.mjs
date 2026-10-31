import {box,rect,rotateCube,serializeCube} from '../model.mjs';
import {colonnadeTextile,colonnadeTextileProfile} from './colonnade-textile.mjs';

// Authoring dimensions, in sixteenths of a block. Published IDs and states
// remain in catalog.ts; this file only builds the visible architecture.
export const colonnadeProfile=Object.freeze({
 top:colonnadeTextileProfile.top,bodyEdge:6.9,plinth:1.55,baseTop:2.35,shaftTop:11.85,
 capitalTop:12.95,slabBottom:14.2,linenBottom:colonnadeTextileProfile.linenBottom,
 columnX:6.65,columnZ:-7.55,columnRadius:.5,cornerColumn:7.35,cornerRadius:.66,
 footCollar:2.17,neckCollar:12.02,
});
// An isolated four-sided piece is the expensive case. Shaft facets carry
// just one quad each; count faces as well as the cube records that hold them.
export const colonnadeBudget=Object.freeze({cubes:112,quads:400});
export const ornateGeometryName=(lace,edges)=>`ornate_colonnade_${lace?'lace':'bare'}_e${edges}`;
const exposed=(mask,side)=>!!(mask&(1<<((side+4)%4)));
const round=v=>Number(v.toFixed(9));
function turn(c,side){
 const out=rotateCube(c,side);
 if(c.rotation){const [x,y,z]=c.rotation;out.rotation=side===1?[-z,y,x]:side===2?[-x,y,-z]:side===3?[z,y,-x]:[x,y,z];}
 return out;
}
function member(origin,size,surface='stone',omit=[]){
 const c=box(origin,size,surface,Object.fromEntries(['north','east','south','west','up','down'].map(f=>[f,rect(surface)])));
 for(const face of omit)delete c.uv[face];return c;
}
function perimeter(mask,edge,y,h,surface,omit=[]){
 const loX=exposed(mask,3)?-edge:-8,hiX=exposed(mask,1)?edge:8;
 const loZ=exposed(mask,0)?-edge:-8,hiZ=exposed(mask,2)?edge:8;
 const c=member([loX,y,loZ],[hiX-loX,h,hiZ-loZ],surface,omit);
 for(const [i,f] of ['north','east','south','west'].entries())if(!exposed(mask,i))delete c.uv[f];
 return c;
}
function shaft(x,z=colonnadeProfile.columnZ,r=colonnadeProfile.columnRadius){
 const {baseTop:y,shaftTop}=colonnadeProfile,cubes=[];
 const points=Array.from({length:8},(_,i)=>{const a=(-112.5+i*45)*Math.PI/180;return [x+r*Math.cos(a),z+r*Math.sin(a)];});
 for(let i=0;i<4;i++){
  const a=points[i],b=points[(i+1)%8],w=Math.hypot(b[0]-a[0],b[1]-a[1]),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
  // Each record carries two opposite facets. Their shared prism has no
  // side/top/bottom UVs; overlap inside the shaft produces no extra faces.
  // Four records close the eight facets; corner columns are shared by two
  // facades instead of duplicating a shaft beside each side of the corner.
  const angle=-Math.atan2(b[1]-a[1],b[0]-a[0]),depth=2*r*Math.cos(Math.PI/8);
  const centerX=cx+Math.sin(angle)*depth/2,centerZ=cz+Math.cos(angle)*depth/2;
  cubes.push({origin:[round(centerX-w/2),y,round(centerZ-depth/2)],size:[round(w),round(shaftTop-y),round(depth)],pivot:[round(centerX),y,round(centerZ)],rotation:[0,round(angle*180/Math.PI),0],uv:{north:rect('column'),south:rect('column')}});
 }
 return cubes;
}
function frameBar(cx,cy,length,angle){
 const outer=member([cx-length/2,cy-.25,-7.42],[length,.5,.52],'moulding',['south']);
 // A separate fine bead projects beyond the stone moulding. This is real
 // relief, visible in the color-only renderer as well as with normal maps.
 const beadLength=length+(Math.abs(angle)===90?.12:-.66);
 const bead=member([cx-beadLength/2,cy-.19,-7.57],[beadLength,.11,.15],'gilt',['south',...(Math.abs(angle)===90?['east','west']:[])]);
 for(const c of [outer,bead]){c.pivot=[cx,cy,-7.16];c.rotation=[0,0,angle];}
 return [outer,bead];
}
export function ornateGeometry(lace,edges){
 if(!Number.isInteger(edges)||edges<0||edges>15)throw Error('Invalid colonnade contour');
 const p=colonnadeProfile,bones=[],add=(name,cubes)=>bones.push({name,pivot:[0,0,0],cubes});
 const core=member([-p.bodyEdge,p.plinth,-p.bodyEdge],[p.bodyEdge*2,p.capitalTop-p.plinth,p.bodyEdge*2],'panel',['up','down']);
 for(let side=0;side<4;side++)if(!exposed(edges,side))delete core.uv[['north','east','south','west'][side]];
 add('core',[core]);
 add('plinth',[
  perimeter(edges,8.2,0,.45,'moulding',['down']),
  perimeter(edges,7.9,.45,.65,'stone',['up','down']),
  perimeter(edges,8.05,1.1,.45,'moulding'),
 ]);
 add('tabletop_bevel',[perimeter(edges,8.03,p.slabBottom,.45,'moulding',['up'])]);
 const upper=perimeter(edges,colonnadeTextileProfile.stoneEdge,14.65,(lace?p.linenBottom:p.top)-14.65,lace?'stone':'top');
 if(lace){
  add('tabletop_base',[upper]);
  const garment=colonnadeTextile(edges);add('top',[garment.top]);
  for(const b of garment.bones)add(b.name,b.cubes);
 }
 else add('top',[upper]);
 const supports=new Set();
 for(let side=0;side<4;side++){
  if(!exposed(edges,side)){
   add(`core_join_${side}`,[turn(member([-p.bodyEdge,p.plinth,-8],[p.bodyEdge*2,p.capitalTop-p.plinth,8-p.bodyEdge],'stone',['up','down','south']),side)]);continue;
  }
  const columns=[];
  for(const [index,x] of [-p.columnX,p.columnX].entries()){
   const adjacent=(side+(index===0?3:1)+4)%4;
   if(exposed(edges,adjacent)){
    const corner=index===0?side:(side+1)%4,key=`corner_${corner}`;
    if(!supports.has(key)){
     const center=-p.cornerColumn;
     add(`columns_${key}`,shaft(center,center,p.cornerRadius).map(c=>turn(c,corner)));
     add(`base_${key}`,[
      member([center-.85,p.plinth,center-.85],[1.7,.48,1.7],'moulding'),
      member([center-.7,2.03,center-.7],[1.4,p.footCollar-2.03,1.4],'gilt',['down']),
      member([center-.65,p.footCollar,center-.65],[1.3,p.baseTop-p.footCollar,1.3],'moulding',['down']),
     ].map(c=>turn(c,corner)));
     add(`capital_${key}`,[
      member([center-.65,p.shaftTop,center-.65],[1.3,p.neckCollar-p.shaftTop,1.3],'gilt',['up']),
      member([center-.74,p.neckCollar,center-.74],[1.48,12.25-p.neckCollar,1.48],'moulding',['up']),
      member([center-.91,12.25,center-.91],[1.82,.7,1.82],'moulding'),
     ].map(c=>turn(c,corner)));
     add(`corner_stile_${corner}`,[turn(member([-7.1,p.plinth,-7.1],[1.4,p.capitalTop-p.plinth,1.4],'stone',['up','down','east','south']),corner)]);
     supports.add(key);
    }
   }else{
    columns.push(...shaft(x));
    add(`base_${side}_${index}`,[
     member([x-.85,p.plinth,-8.2],[1.7,.48,1.3],'moulding'),
     member([x-.66,2.03,p.columnZ-.58],[1.32,p.footCollar-2.03,1.16],'gilt',['down']),
     member([x-.56,p.footCollar,p.columnZ-.52],[1.12,p.baseTop-p.footCollar,1.04],'moulding',['down']),
    ].map(c=>turn(c,side)));
    add(`capital_${side}_${index}`,[
     member([x-.56,p.shaftTop,p.columnZ-.52],[1.12,p.neckCollar-p.shaftTop,1.04],'gilt',['up']),
     member([x-.71,p.neckCollar,p.columnZ-.6],[1.42,12.25-p.neckCollar,1.2],'moulding',['up']),
     member([x-.85,12.25,p.columnZ-.71],[1.7,.7,1.42],'moulding'),
    ].map(c=>turn(c,side)));
   }
  }
  add(`columns_${side}`,columns.map(c=>turn(c,side)));
  add(`panel_frame_${side}`,[
   ...frameBar(0,2.6,11.4,180),...frameBar(0,11.4,11.4,0),
   ...frameBar(-5.45,7,8.3,90),...frameBar(5.45,7,8.3,-90),
  ].map(c=>turn(c,side)));
  // N/S own the corner returns; E/W end against them. Module joints reach
  // exactly ±8 and carry no decorative end caps inside a continuous front.
  const left=exposed(edges,side+3),right=exposed(edges,side+1);
  const band=(edge,y,h,depth,surface)=>{
   const end=side%2?edge-depth:edge,a=left?-end:-8,b=right?end:8;
   const c=member([a,y,-edge],[b-a,h,depth],surface,['south',...(y===p.capitalTop?['up']:[])]);
   if(!left||side%2)delete c.uv.west;if(!right||side%2)delete c.uv.east;
   return turn(c,side);
  };
  add(`architrave_${side}`,[band(8.1,p.capitalTop,.55,1.2,'moulding'),band(8.22,13.5,.7,1.32,'moulding')]);
 }
 return {doc:{format_version:'1.16.0','minecraft:geometry':[{description:{identifier:`geometry.altare.${ornateGeometryName(lace,edges)}`,texture_width:128,texture_height:128,visible_bounds_width:2,visible_bounds_height:2,visible_bounds_offset:[0,.5,0]},bones:bones.map(b=>({...b,cubes:b.cubes.map(serializeCube)}))}]},visibility:{}};
}
