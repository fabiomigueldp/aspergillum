import {twinPedestalFamilyGeometry} from './twin-pedestal-family-study.mjs';
import {twinPedestalCells} from './twin-pedestal-cell-study.mjs';
import {twinPedestalCollision} from './twin-pedestal-collision-study.mjs';
import {garment,garmentProfile} from './garment.mjs';
import {rect,serializeCube} from '../block-primitives.mjs';
import {clothTexture,seamTexture} from '../../tools/universal-pack.mjs';
import {SHARED_TEXTILES,LITURGICAL_COLORS,centerRole} from '../../src/domain/catalog.ts';

// New-family-specific face budget. The octagonal shafts use one-face cube
// records; the 59-cube dressed maximum has189 quads, below existing families'
// documented300/400-quad budgets. Does not change any production validator.
export const nativePedestalStudyBudget=Object.freeze({cubes:60,quads:192,collisionBoxes:16});
export function coveredPedestalModel(source){
 const model=structuredClone(source),mensa=model.doc['minecraft:geometry'][0].bones.find(b=>b.name==='mensa');
 for(const c of mensa.cubes)if(Math.abs(c.origin[1]+c.size[1]-16)<1e-7)c.size[1]=garmentProfile.linenBottom-c.origin[1];
 model.coveredTop=true;return model;
}
export function dressPedestalCell(cell,{textile='none',color='red',facing,edges,role,collision,identifier}={}){
 const copy=structuredClone(cell),geometry=copy.doc['minecraft:geometry'][0],design={textile:textile==='floral'?'ruby':textile,palette:textile==='floral'?color:undefined},recipe=textile+(textile==='floral'?'_'+color:'');
 const materials={wood_vertical:'atelier_walnut',wood_horizontal:'joinery_walnut_horizontal',inlay:'crossbrace_inlay'};
 if(textile!=='none'){
  const cloth=garment(design.textile,edges,{facing,surface:side=>'cloth_'+side,twoSided:true});
  for(const side of ['north','east','south','west'])cloth.top.uv[side]??=rect('top');
  geometry.bones.push(...cloth.bones.map(b=>({...b,name:'garment_'+b.name,pivot:[0,0,0],cubes:b.cubes.map(serializeCube)})));
  Object.assign(materials,{top:'linen',linen:'linen',seam:seamTexture(design)});for(let side=0;side<4;side++)materials['cloth_'+side]=clothTexture(design,side===facing?role:0);
 }
 if(identifier)geometry.description.identifier=identifier;
 return Object.assign(copy,{recipe,facing,edges,textileRole:role,materials,collision});
}
export function twinPedestalRecipe(width,depth,facing=0,{textile='none',color='red',sourceModel}={}){
 if(!SHARED_TEXTILES.includes(textile)||!LITURGICAL_COLORS.includes(color))throw Error('Invalid pedestal recipe');
 const source=sourceModel??twinPedestalFamilyGeometry(width,depth,facing),wood=textile==='none'?source:coveredPedestalModel(source);
 const plan=twinPedestalCells(width,depth,facing,{uvPolicy:'module-grain',capCuts:true,sourceModel:wood}),physical=twinPedestalCollision(width,depth,facing,{sourceModel:source}),nx=facing%2?depth:width,nz=facing%2?width:depth,recipe=textile+(textile==='floral'?'_'+color:'');
 for(let i=0;i<plan.cells.length;i++){
  const cell=plan.cells[i],edges=(cell.z===0?1:0)|(cell.x===nx-1?2:0)|(cell.z===nz-1?4:0)|(cell.x===0?8:0);let index=facing%2?cell.z:cell.x;if(facing>=2)index=width-1-index;
  const role=edges&(1<<facing)?centerRole(width,index):0;
  plan.cells[i]=dressPedestalCell(cell,{textile,color,facing,edges,role,collision:physical.cells[i].nativeBoxes,identifier:`geometry.altare.study_native_${recipe}_${width}_${depth}_${facing}_${cell.x}_${cell.z}`});
 }
 return {...plan,recipe,textile,color,registered:false,sourceFamily:source.family,coveredTop:textile!=='none'};
}
