import test from 'node:test';
import assert from 'node:assert/strict';
import {ATELIER_POSES,TRESTLE_POSES,MENSA_LAYOUT,type VisualPose} from '../src/domain/pose-layout.ts';
import {posePermutations} from '../tools/pose-permutations.mjs';

test('component grouping preserves each value in every declared state, including radix aliases',()=>{
 for(const layout of [ATELIER_POSES,TRESTLE_POSES,MENSA_LAYOUT]){
  const components=(p:VisualPose)=>({geometry:{edges:p.edges,facing:p.facing,visible:!!p.frontal},materials:{role:p.frontal},collision:true});
  const rules=posePermutations(layout,components);
  assert.ok(rules.length<layout.size*3);
  assert.equal(rules.filter((r:any)=>'collision' in r.components).length,1);
  assert.equal(rules.find((r:any)=>'collision' in r.components).condition,'1');
  assert.ok(rules.every((r:any)=>r.condition.length<4096));
  for(let i=0;i<layout.size;i++){
   const state=layout.stateAt(i),matches=rules.filter((r:any)=>Function('q',`return ${r.condition}`)({block_state:(key:string)=>state[key]}));
   assert.equal(matches.length,3);assert.deepEqual(Object.assign({},...matches.map((r:any)=>r.components)),components(layout.decode(state)));
  }
 }
});

test('grouped pose conditions preserve additional style predicates',()=>{
 const rules=posePermutations(ATELIER_POSES,()=>({geometry:'fixed'}),"q.block_state('altare:cloth') == 1");
 assert.equal(rules.length,1);
 for(const cloth of [0,1,2]){
  const matches=rules.filter((r:any)=>Function('q',`return ${r.condition}`)({block_state:()=>cloth}));
  assert.equal(matches.length,cloth===1?1:0);
 }
});
