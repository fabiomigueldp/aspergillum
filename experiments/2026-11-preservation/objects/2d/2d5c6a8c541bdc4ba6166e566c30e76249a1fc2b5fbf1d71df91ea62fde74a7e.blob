import {twinPedestalGeometry,pedestalDimensions} from './twin-pedestal-prototype.mjs';
import {serializeCube,rotateCube} from '../block-primitives.mjs';
// Separate architecture candidate: reuse approved compact, chapel and long
// proportions. Width families1/3/7; depth families1/2/3. Never edits the source.
export function twinPedestalFamilyGeometry(width,depth,facing=0,{depthCap=3,alignToEndCell=false,regularWidth,maxSupportDepth=Infinity}={}){
 if(!Number.isInteger(width)||!Number.isInteger(depth)||width<1||depth<1||width>16||depth>16||Math.min(width,depth)>8)throw Error('Native dimensions must fit a rotated16 by8 rectangle');
 if(![2,3].includes(depthCap)||regularWidth!==undefined&&![3,7].includes(regularWidth)||!(maxSupportDepth>=12))throw Error('Invalid family profile option');
 if(!Number.isInteger(facing)||facing<0||facing>3)throw Error('Invalid facing');
 const familyWidth=width===1?1:regularWidth??(width<=4?3:7),familyDepth=Math.min(depth,depthCap),base=twinPedestalGeometry(familyWidth,familyDepth,0),old=base.profile,W=width*16,D=depth*16,inset=alignToEndCell&&width>1?8:old.W/2-old.centers[1],centers=[-W/2+inset,W/2-inset];
 const capD=Math.min(old.capD,maxSupportDepth),baseD=Math.min(old.baseD,maxSupportDepth);
 const doc=structuredClone(base.doc),g=doc['minecraft:geometry'][0];
 for(const bone of g.bones)for(let i=0;i<bone.cubes.length;i++){
  let c=serializeCube(bone.cubes[i]);
  if(bone.name.endsWith('_base')&&i<2){const d=i===0?baseD:baseD-.6;c.origin[2]=-d/2;c.size[2]=d;}
  if(bone.name.endsWith('_capital')){
   if(i<5){const d=[old.shaftD+.6,old.shaftD+(capD-old.shaftD)*.5,capD-.8,capD,capD-.3][i];c.origin[2]=-d/2;c.size[2]=d;}
   else {const dz=(old.capD-capD)/2*(i===5?1:-1);c.origin[2]+=dz;if(c.pivot)c.pivot[2]+=dz;}
  }
  if(bone.name==='mensa'){c.origin[0]-=(W-old.W)/2;c.origin[2]-=(D-old.D)/2;c.size[0]+=W-old.W;c.size[2]+=D-old.D;}
  else if(bone.name==='concealed_longitudinal_bearer'){c.origin[0]=centers[0];c.size[0]=centers[1]-centers[0];}
  else {const index=Number(bone.name.match(/^pedestal_(\d)_/)[1]),dx=centers[index]-old.centers[index];c.origin[0]+=dx;if(c.pivot)c.pivot[0]+=dx;}
  const turned=rotateCube(c,facing);if(c.rotation){const [x,y,z]=c.rotation;turned.rotation=facing===1?[-z,y,x]:facing===2?[-x,y,-z]:facing===3?[z,y,-x]:[x,y,z];}bone.cubes[i]=serializeCube(turned);
 }
 g.description.identifier=`geometry.altare.study_twin_family_${width}x${depth}_${facing}`;g.description.visible_bounds_width=Math.max(width,depth)+1;
 return {doc,profile:{...old,W,D,centers,capD,baseD},family:{width:familyWidth,depth:familyDepth},prototype:true,unregistered:true,studyRevision:3};
}
