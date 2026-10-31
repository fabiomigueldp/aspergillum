import {rect,rotateCube} from '../block-primitives.mjs';
import {textileProfiles,hemLimit} from './profiles.mjs';

// One physical garment, shared by all altar families. Author units = 1/16 block.
export const garmentProfile=Object.freeze({top:16,linenBottom:15.91,linenHeight:.09,foldBottom:15.84,attach:15.85,outerEdge:8.4,endDepth:8.38,skin:.035});
const edge=i=>`math.mod(math.floor(q.block_state('altare:edges') / ${2**i}), 2) == 1`;
const exposed=(edges,i)=>edges===undefined||!!(edges&(1<<((i+4)%4)));
const cuboid=(origin,size,surface,faces)=>({origin,size,uv:Object.fromEntries(faces.map(f=>[f,rect(surface)]))});
export function garment(style,edges,{facing=0,surface,seam='seam',stoneEdge=8.28,cornerEnd=edges===undefined?8:8.34,twoSided=false}={}){
 const p=garmentProfile,profile=textileProfiles[style];if(!profile||style==='none')throw Error('Invalid garment');
 const bones=[],visibility={},fixed=edges!==undefined;
 const add=(name,cubes,condition)=>{bones.push({name,cubes});if(condition)visibility[name]=condition;};
 const topMaterial='top',sideNames=['north','east','south','west'];
 if(fixed){
  const x0=exposed(edges,3)?-p.outerEdge:-8,x1=exposed(edges,1)?p.outerEdge:8,z0=exposed(edges,0)?-p.outerEdge:-8,z1=exposed(edges,2)?p.outerEdge:8;
  add('top',[cuboid([x0,p.linenBottom,z0],[x1-x0,p.linenHeight,z1-z0],topMaterial,['up',...sideNames.filter((_,i)=>exposed(edges,i))])]);
 }else{
  add('top',[cuboid([-8,p.linenBottom,-8],[16,p.linenHeight,16],topMaterial,['up'])]);
  for(let i=0;i<4;i++){
   add(`linen_return_${i}`,[rotateCube(cuboid([-8,p.linenBottom,-p.outerEdge],[16,p.linenHeight,p.outerEdge-8],topMaterial,['up','north']),i)],edge(i));
   add(`linen_corner_${i}`,[rotateCube(cuboid([-p.outerEdge,p.linenBottom,-p.outerEdge],[p.outerEdge-8,p.linenHeight,p.outerEdge-8],topMaterial,['up','north','west']),i)],`(${edge(i)}) && (${edge((i+3)%4)})`);
  }
 }
 for(let side=0;side<4;side++){
  if(!exposed(edges,side))continue;
  const left=exposed(edges,side+3),right=exposed(edges,side+1),a=left?-cornerEnd:-8,b=right?cornerEnd:8,step=(b-a)/2,drape=[];
  const mat=surface?surface(side):(side===facing?'drape':'repeat'),uvHeight=profile.uvHeight??128;
  for(let i=0;i<2;i++){
   const startZ=-(i===0?p.endDepth:p.outerEdge),endZ=-(i===0?p.outerEdge:p.endDepth),cx=a+(i+.5)*step,cz=(startZ+endZ)/2,w=Math.hypot(step,endZ-startZ);
   const uv={north:rect(mat,(1-i)*64,0,64,uvHeight)};if(twoSided)uv.south=rect(mat,i*64,0,64,uvHeight);
   drape.push({origin:[cx-w/2,p.attach-profile.drop,cz],size:[w,profile.drop,p.skin],pivot:[cx,p.attach,cz],rotation:[0,-Math.atan2(endZ-startZ,step)*180/Math.PI,0],uv});
  }
  // The N/S lips own corner returns. No hidden coplanar contact faces.
  const end=side%2?stoneEdge:p.outerEdge,lo=fixed&&left?-end:-8,hi=fixed&&right?end:8,faces=['north','down'];
  if(fixed&&side%2===0){if(left)faces.push('west');if(right)faces.push('east');}
  drape.push(cuboid([lo,p.foldBottom,-p.outerEdge],[hi-lo,p.linenBottom-p.foldBottom,p.outerEdge-stoneEdge],'linen',faces));
  add(`drape_${side}`,drape.map(c=>rotateCube(c,side)),fixed?undefined:edge(side));
  if(left){
   const delta=p.endDepth-cornerEnd,c=-(p.endDepth+cornerEnd)/2,w=Math.SQRT2*delta;
   const fraction=style==='lace'?92/128:profile.uvHeight?1:hemLimit(0,style),height=profile.drop*fraction;
   const stitch={origin:[c-w/2,p.attach-height,c],size:[w,height+(fixed?0:p.linenBottom-p.attach),p.skin],pivot:[c,p.attach,c],rotation:[0,45,0],uv:{north:rect(seam,0,0,128,128)}};
   add(`fold_corner_${side}`,[rotateCube(stitch,side)],fixed?undefined:`(${edge(side)}) && (${edge((side+3)%4)})`);
  }
 }
 return {top:bones.find(b=>b.name==='top').cubes[0],bones,visibility};
}
