import { describe, it, expect } from 'vitest';
import { blockLayout, compileCompactBlock, codec } from './compact-block-layout.mjs';

const cosmetics=Array.from({length:16},(_,index)=>({index,id:index===0?'classic':`finish_${index}`}));
function evaluate(expression,states){return Function('q','math',`return (${expression});`)({block_state:key=>states[key]},{floor:Math.floor,mod:(a,b)=>a%b});}
function rows(states){return Object.entries(states).reduce((list,[key,values])=>list.flatMap(row=>values.map(value=>({...row,[key]:value}))),[{}]);}
function template(){return {description:{states:{}},components:{'minecraft:geometry':{identifier:'placeholder',bone_visibility:{resting_aspergillum:false}},'minecraft:loot':'empty.loot.json'},permutations:[]};}

describe('compiled compact block semantics',()=>{
 for(const kind of ['aspersorium','sacristan_table'])it(`preserves occupancy, material, loot and rotation for every emitted ${kind} state`,()=>{
  const contract=blockLayout(kind),block=compileCompactBlock(template(),kind,cosmetics);
  const decode=kind==='aspersorium'?codec.decodeAspersoriumContents:codec.decodeTableContents;
  let padding=0;
  for(const state of rows(block.description.states)){
   let semantic;
   try{semantic=decode(state);}catch(error){expect(error.message).toMatch(/padding/);semantic={cosmeticIndex:null};padding++;}
   const result=structuredClone(block.components),assigned=new Set();
   for(const permutation of block.permutations)if(evaluate(permutation.condition,state))for(const [name,value]of Object.entries(permutation.components)){
    expect(assigned.has(name),`overlapping ${name}`).toBe(false);assigned.add(name);result[name]=value;
   }
   const occupied=semantic.cosmeticIndex!==null,rotation=state[contract.rotation];
   expect(Boolean(evaluate(result['minecraft:geometry'].bone_visibility.resting_aspergillum,state))).toBe(occupied);
   expect(result['minecraft:geometry'].identifier).toBe(`geometry.aspergillum.${kind}.rotation_${rotation}`);
   expect(result['minecraft:material_instances']['*'].texture).toBe(occupied&&semantic.cosmeticIndex>0?`${kind}_finish_${semantic.cosmeticIndex}`:kind);
   expect(result['minecraft:loot']).toBe(occupied?`loot_tables/blocks/${kind}_${kind==='aspersorium'?'docked':'occupied'}.loot.json`:'empty.loot.json');
  }
  expect(padding).toBe(kind==='aspersorium'?80:16);
  expect(rows(block.description.states).length).toBe(kind==='aspersorium'?4704:288);
 });
});
