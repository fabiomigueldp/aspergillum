import fs from 'node:fs';import path from 'node:path';
import {NATIVE_DESIGNS,textileOf} from '../src/domain/catalog.ts';
import {nativeCentered} from '../src/domain/native-pedestal-layout.ts';
import {collectNativePoses,emitNativeDomainData,cubesOf,digest} from './native-pedestal-poses.mjs';
import {dressPedestalCell,nativePedestalStudyBudget} from '../assets-src/atelier/twin-pedestal-recipe-study.mjs';
const root=path.resolve(import.meta.dirname,'..'),material=texture=>({texture:'altare_'+texture,render_method:'alpha_test',ambient_occlusion:1,face_dimming:true});
const values=n=>Array.from({length:n},(_,i)=>i);
export function compileNativePedestals({models,blocks,sounds}){
 const collected=collectNativePoses();emitNativeDomainData(collected);
 const {profiles,manifest}=collected;let geometries=0,permutations=0,maxCubes=0,maxQuads=0,maxCondition=0;
 for(const design of NATIVE_DESIGNS){
  const centered=nativeCentered(design.textile),entries=centered?manifest.center:profiles.map((_,basePose)=>({basePose,role:0})),radices=centered?[14,12,3]:[16,14,2],states=Object.fromEntries(['pose','bank','page'].map((k,i)=>['altare:'+k,values(radices[i])])),rows=[];
  for(const {basePose,role} of entries){
   const p=profiles[basePose],cell=dressPedestalCell(design.textile==='none'?p.bare:p.covered,{textile:textileOf(design),color:design.palette??'red',facing:p.facing,edges:p.edges,role,collision:p.collision}),cubes=cubesOf(cell),quads=cubes.reduce((n,c)=>n+Object.keys(c.uv).length,0);
   maxCubes=Math.max(maxCubes,cubes.length);maxQuads=Math.max(maxQuads,quads);if(cubes.length>nativePedestalStudyBudget.cubes||quads>nativePedestalStudyBudget.quads||p.collision.length>16)throw Error('Native pedestal complexity budget');
   const name='native_twin_'+digest(cubes).slice(0,24);
   if(!models[name]){models[name]={name,visibility:{},doc:{format_version:'1.16.0','minecraft:geometry':[{description:{identifier:'geometry.altare.'+name,texture_width:128,texture_height:128,visible_bounds_width:2,visible_bounds_height:2,visible_bounds_offset:[0,.5,0]},bones:[{name:'body',pivot:[0,0,0],cubes}]}]}};geometries++;}
   const materials=Object.fromEntries(Object.entries(cell.materials).map(([k,v])=>[k,material(v)]));materials['*']=material('atelier_walnut');
   rows.push({'minecraft:geometry':{identifier:'geometry.altare.'+name,bone_visibility:{}},'minecraft:material_instances':materials,'minecraft:collision_box':p.collision});
  }
  const index=`(q.block_state('altare:pose') + ${radices[0]} * q.block_state('altare:bank') + ${radices[0]*radices[1]} * q.block_state('altare:page'))`,perms=[];
  // Intern equal component payloads independently. Bound each OR expression;
  // do not build a single huge material/collision condition for hundreds of states.
  for(const component of ['minecraft:geometry','minecraft:material_instances','minecraft:collision_box']){
   const groups=new Map();for(let i=0;i<rows.length;i++){const k=digest(rows[i][component]);if(!groups.has(k))groups.set(k,{value:rows[i][component],indices:[]});groups.get(k).indices.push(i);}
   if(groups.size===1)continue;
   for(const {value,indices} of groups.values())for(let offset=0;offset<indices.length;offset+=12){
    const condition=indices.slice(offset,offset+12).map(i=>index+' == '+i).join(' || ');maxCondition=Math.max(maxCondition,condition.length);perms.push({condition,components:{[component]:value}});
   }
  }
  const components={...rows[0],'minecraft:selection_box':true,'minecraft:destructible_by_mining':{seconds_to_destroy:1.5},'minecraft:destructible_by_explosion':{explosion_resistance:6},'minecraft:movable':{movement_type:'immovable'},'minecraft:map_color':'#59402c','minecraft:light_dampening':0,'minecraft:tick':{interval_range:[80,120],looping:true},'altare:surface':{}};
  blocks[design.id]={format_version:'1.26.30','minecraft:block':{description:{identifier:design.id,states},components,permutations:perms}};sounds[design.id]={sound:'wood'};permutations+=perms.length;
 }
 const report={...collected.stats,recipes:NATIVE_DESIGNS.length,states:NATIVE_DESIGNS.reduce((n,d)=>n+(nativeCentered(d.textile)?504:448),0),geometries,componentPermutations:permutations,maxCubes,maxQuads,maxConditionLength:maxCondition,installed:false,minecraftTest:false};
 fs.mkdirSync(path.join(root,'out'),{recursive:true});fs.writeFileSync(path.join(root,'out/native-pedestal-build.json'),JSON.stringify(report,null,2)+'\n');return report;
}
