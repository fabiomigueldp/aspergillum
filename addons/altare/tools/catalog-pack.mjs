import {decodeNeutralPalette,NEUTRAL_PALETTE_STATE_VALUES} from '../src/domain/neutral-palette-layout.ts';
import {compileNativePedestals} from './native-pedestal-pack.mjs';
import {posePermutations} from './pose-permutations.mjs';
import {compileUniversal,clothTexture,seamTexture} from './universal-pack.mjs';
import {ATELIER_DESIGNS,PALETTE_DESIGNS,JOINERY_DESIGNS,JOINERY_STRUCTURES,ORNATE_DESIGNS,ROLE_STATES,STRUCTURES,TEXTILES,FRONTALS,designFor} from '../src/domain/catalog.ts';
import {atelierLayout} from '../src/domain/pose-layout.ts';
import {decodePalette} from '../src/domain/palette-layout.ts';
import {atelierGeometry,atelierGeometryName,structureCollision} from '../assets-src/atelier/geometry.mjs';
import {ornateGeometry,ornateGeometryName} from '../assets-src/atelier/ornate.mjs';
const material=texture=>({texture:`altare_${texture}`,render_method:'alpha_test',ambient_occlusion:1,face_dimming:true});
const detailed=structure=>['pilaster','ogive'].includes(structure);
export function collectionMaterials(d,role=0,facing=0){
 const body={marble:'stone_0',limestone:'stone_1',walnut:'atelier_walnut'}[d.surface];
 const cloth=clothTexture(d,role);
 const authoredCodec=d.codec&&d.codec!=='pose',carved=detailed(d.structure),rail=material(d.surface==='walnut'?'joinery_walnut_horizontal':body);
 const cards=carved?Object.fromEntries(Array.from({length:4},(_,i)=>[`cloth_${i}`,material(clothTexture(d,i===facing?role:0))])):{};
 return {'*':material(body),stone:material(body),top:material(d.textile==='none'?((authoredCodec||carved&&d.surface==='walnut')?'joinery_walnut_horizontal':body):'linen'),linen:material('linen'),seam:material(seamTexture(d)),drape:material(cloth),repeat:material(clothTexture(d,0)),metal:material('frontal_frame'),plaque:material('atelier_agnus'),...(authoredCodec?{wood_cross:material('joinery_walnut_horizontal')}:{}),...(carved?{rail,...cards}:{}),...(d.structure==='crossbrace'?{joinery_inlay:material('crossbrace_inlay')}:{}),...(d.structure==='ogive'?{arcade:material(`ogive_${body}`)}:{})};
}
export function compileCollection(){
 const models={},blocks={},sounds={};
 for(const structure of STRUCTURES)for(const textile of TEXTILES)for(const frontal of FRONTALS)for(let facing=0;facing<4;facing++){
  const name=atelierGeometryName(structure,textile,frontal,facing);models[name]=atelierGeometry(structure,textile,frontal,facing);
  if(detailed(structure)&&(frontal!=='none'||facing===0))for(let edges=0;edges<16;edges++){const name=atelierGeometryName(structure,textile,frontal,facing,edges);models[name]=atelierGeometry(structure,textile,frontal,facing,edges);}
 }
 for(const d of ATELIER_DESIGNS){
  const geom=(facing,edges)=>{const name=atelierGeometryName(d.structure,d.textile,d.frontal,detailed(d.structure)&&d.frontal==='none'&&edges!==undefined?0:facing,edges);return {identifier:`geometry.altare.${name}`,bone_visibility:models[name].visibility};};
  const layout=atelierLayout(d);
  const componentsForPose=pose=>{
   const geometry=geom(pose.facing,detailed(d.structure)?pose.edges:undefined);
   const q={block_state:k=>({'altare:edges':pose.edges,'altare:role':pose.frontal,'altare:facing':pose.facing})[k]},math={floor:Math.floor,mod:(a,b)=>a%b};
   const visible=Object.fromEntries(Object.entries(geometry.bone_visibility).map(([name,expr])=>[name,Boolean(Function('q','math',`return ${expr}`)(q,math))]));
   return {'minecraft:geometry':{...geometry,bone_visibility:visible},'minecraft:material_instances':collectionMaterials(d,pose.frontal,pose.facing),'minecraft:collision_box':structureCollision(d.structure,pose.edges,pose.facing)};
  };
  const permutations=posePermutations(layout,componentsForPose);
  blocks[d.id]={format_version:'1.26.30','minecraft:block':{
   description:{identifier:d.id,states:layout.states},
   components:{'minecraft:geometry':geom(0,detailed(d.structure)?15:undefined),'minecraft:material_instances':collectionMaterials(d),'minecraft:collision_box':structureCollision(d.structure,15,0),'minecraft:selection_box':true,
    'minecraft:destructible_by_mining':{seconds_to_destroy:1.5},'minecraft:destructible_by_explosion':{explosion_resistance:6},'minecraft:movable':{movement_type:'immovable'},'minecraft:map_color':'#c6b59b','minecraft:light_dampening':d.structure==='trestle'?0:15,'minecraft:tick':{interval_range:[80,120],looping:true},'altare:surface':{},...componentsForPose(layout.decode(layout.stateAt(0)))},permutations}};
  sounds[d.id]={sound:d.surface==='walnut'?'wood':'stone'};
 }
 // Palette blocks publish only reachable rectangular roles; resolve the same
 // geometry conditions at build time so they never query legacy states.
 for(const d of PALETTE_DESIGNS){
  const permutations=[];
  const states=d.codec==='neutral_palette'?NEUTRAL_PALETTE_STATE_VALUES:{'altare:shape':[0,1,2,3,4,5,6],'altare:detail':[0,1,2,3],'altare:facing':[0,1,2,3]};
  const rows=Object.entries(states).reduce((rows,[k,values])=>rows.flatMap(r=>values.map(v=>({...r,[k]:v}))),[{}]);
  for(const state of rows){
   const pose=d.codec==='neutral_palette'?decodeNeutralPalette(state):decodePalette(state),facing=pose.facing;
   const name=atelierGeometryName(d.structure,'ruby','none',detailed(d.structure)?0:facing,detailed(d.structure)?pose.edges:undefined),model=models[name];
   const q={block_state:k=>({'altare:edges':pose.edges,'altare:role':pose.frontal,'altare:facing':facing})[k]},math={floor:Math.floor,mod:(a,b)=>a%b};
   const visible=Object.fromEntries(Object.entries(model.visibility).map(([name,expr])=>[name,Boolean(Function('q','math',`return ${expr}`)(q,math))]));
   permutations.push({condition:Object.entries(state).map(([k,v])=>`q.block_state('${k}') == ${v}`).join(' && '),components:{'minecraft:geometry':{identifier:`geometry.altare.${name}`,bone_visibility:visible},'minecraft:material_instances':collectionMaterials(d,pose.frontal,pose.facing),'minecraft:collision_box':structureCollision(d.structure,pose.edges,facing)}});
  }
  const doc=structuredClone(blocks[designFor(d.structure,d.surface,'ruby','none').id]);
  const block=doc['minecraft:block'];block.description={identifier:d.id,states};
  Object.assign(block.components,permutations[0].components);block.permutations=permutations;
  blocks[d.id]=doc;sounds[d.id]={sound:d.surface==='walnut'?'wood':'stone'};
 }
 for(const structure of JOINERY_STRUCTURES.filter(s=>!['baluster','crossbrace'].includes(s)))for(const textile of TEXTILES)for(let facing=0;facing<4;facing++){
  const name=atelierGeometryName(structure,textile,'none',facing);models[name]=atelierGeometry(structure,textile,'none',facing);
 }
 for(const d of JOINERY_DESIGNS){
  const compact=d.codec==='compact';
  const states=d.codec==='symmetric'?{'altare:edges':[15,...Array.from({length:15},(_,i)=>i)]}:compact?{'altare:shape':[0,1,2,3,4,5,6],'altare:detail':[0,1,2,3],'altare:facing':[0,1,2,3]}:{'altare:edges':[15,...Array.from({length:15},(_,i)=>i)],'altare:facing':[0,1,2,3]};
  const rows=Object.entries(states).reduce((rows,[k,values])=>rows.flatMap(r=>values.map(v=>({...r,[k]:v}))),[{}]);
  const permutations=rows.map(state=>{
   const pose=compact?decodePalette(state):{edges:state['altare:edges'],frontal:0,facing:state['altare:facing']??0};
   const edgeVariant=['baluster','crossbrace'].includes(d.structure)?pose.edges:undefined;
   const name=atelierGeometryName(d.structure,d.textile,'none',pose.facing,edgeVariant);
   const model=models[name]??(models[name]=atelierGeometry(d.structure,d.textile,'none',pose.facing,edgeVariant));
   const q={block_state:k=>({'altare:edges':pose.edges,'altare:role':pose.frontal,'altare:facing':pose.facing})[k]},math={floor:Math.floor,mod:(a,b)=>a%b};
   const visible=Object.fromEntries(Object.entries(model.visibility).map(([name,expr])=>[name,Boolean(Function('q','math',`return ${expr}`)(q,math))]));
   return {condition:Object.entries(state).map(([k,v])=>`q.block_state('${k}') == ${v}`).join(' && '),components:{'minecraft:geometry':{identifier:`geometry.altare.${name}`,bone_visibility:visible},'minecraft:material_instances':collectionMaterials(d,pose.frontal,pose.facing),'minecraft:collision_box':structureCollision(d.structure,pose.edges,pose.facing)}};
  });
  const doc=structuredClone(blocks[designFor('trestle','walnut','none','none').id]),block=doc['minecraft:block'];
  block.description={identifier:d.id,states};block.permutations=permutations;
  Object.assign(block.components,permutations[0].components,{'minecraft:light_dampening':['baluster','crossbrace'].includes(d.structure)?0:15});
  blocks[d.id]=doc;sounds[d.id]={sound:'wood'};
 }
 for(const d of ORNATE_DESIGNS){
  const lace=d.textile!=='none',permutations=[];
  const materials={'*':material('stone_0'),stone:material('stone_0'),panel:material('ornate_panel'),gilt:material('ornate_gilt'),lace:material('ornate_lace'),linen:material('linen'),top:material(lace?'linen':'stone_0'),column:material('ornate_column'),moulding:material('ornate_moulding')};
  for(const edges of [15,...Array.from({length:15},(_,i)=>i)]){
   const name=ornateGeometryName(lace,edges);models[name]=ornateGeometry(lace,edges);
   permutations.push({condition:`q.block_state('altare:edges') == ${edges}`,components:{'minecraft:geometry':{identifier:`geometry.altare.${name}`,bone_visibility:{}}}});
  }
  const doc=structuredClone(blocks[designFor('pilaster','marble','none','none').id]),block=doc['minecraft:block'];
  block.description={identifier:d.id,states:{'altare:edges':[15,...Array.from({length:15},(_,i)=>i)]}};
  Object.assign(block.components,permutations[0].components,{'minecraft:material_instances':materials});
  block.permutations=permutations;blocks[d.id]=doc;sounds[d.id]={sound:'stone'};
 }
 compileUniversal({models,blocks,sounds},collectionMaterials);
 compileNativePedestals({models,blocks,sounds});
 return {models,blocks,sounds};
}
