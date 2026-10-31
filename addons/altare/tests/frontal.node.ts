import test from 'node:test';
import assert from 'node:assert/strict';
import {frontalRole,FRONTAL_STATES} from '../src/domain/frontal-layout.ts';
import {planFinish} from '../src/domain/surface.ts';
import {authorGeometry,visibility} from '../assets-src/model.mjs';
import {panelColor,panelPaint} from '../assets-src/guadalupe/panels.mjs';

test('seven-block frontal preserves the reference programme in visual left-to-right order',()=>{
 const visual=Array.from({length:7},(_,i)=>frontalRole(7,6-i));
 assert.deepEqual(visual,[6,1,8,2,9,1,7]);
});

test('raised frame closes exactly the two outer ends, never internal module seams',()=>{
 for(const width of [1,3,7,8,16])for(let facing=0;facing<4;facing++){
  const expressions=visibility(facing),bones=authorGeometry(false,facing)['minecraft:geometry'][0].bones;
  const w=facing%2?2:width,d=facing%2?width:2;
  const tiles=Array.from({length:w*d},(_,i)=>({position:{x:i%w,y:0,z:Math.floor(i/w)},stone:0,cloth:3,frontal:0,facing:0,edges:15}));
  const plan=planFinish(tiles,{stone:0,cloth:3,ornamental:true,facing});let ends=0;
  for(const t of plan)for(const b of bones.filter(b=>/^frontal_(left|right)_/.test(b.name))){
   const shown=Function('q','math',`return ${expressions[b.name]}`)({block_state:(key:string)=>(t as any)[key.split(':')[1]!]},{floor:Math.floor,mod:(a:number,b:number)=>a%b});
   if(shown)ends++;
  }
  assert.equal(ends,2,`width ${width}, facing ${facing}`);
 }
});

test('background meets continuously at seams and material masks keep enamel nonmetallic',()=>{
 for(let y=4;y<80;y+=2){
  const left=panelColor(.001,y,1),right=panelColor(127.999,y,1);
  assert.ok(left.every((v:number,i:number)=>Math.abs(v-right[i])<.15));
 }
 let red=0,silver=0;
 for(let y=8;y<76;y+=.5)for(let x=29;x<100;x+=.5){
  const p=panelPaint(x,y,2),[r,g,b]=p.rgb;
  if(r>g*1.6&&r>b*1.3){assert.equal(p.metal,0);red++;}
  const m=panelPaint(x,y,6);if(m.metal===175)silver++;
 }
 assert.ok(red>250,'the red enamel must remain legible');assert.ok(silver>250,'moon retains a distinct silver material');
});
test('widths 1..16 keep exactly one whole or split centre, with compact compositions at 3/4',()=>{
 for(let w=1;w<=16;w++){
  const roles=Array.from({length:w},(_,i)=>frontalRole(w,i));
  assert.ok(roles.every(r=>FRONTAL_STATES.includes(r)));
  assert.equal(roles.filter(r=>r===2).length,w%2);
  assert.equal(roles.filter(r=>r===3).length,w%2?0:1);
  assert.equal(roles.filter(r=>r===4).length,w%2?0:1);
  if(w>=5)for(const role of [6,7,8,9])assert.equal(roles.filter(r=>r===role).length,1);
  if(w===3||w===4){assert.equal(roles[0],11);assert.equal(roles.at(-1),10);}
 }
 assert.deepEqual(FRONTAL_STATES.slice(0,6),[0,1,2,3,4,5]);
 assert.throws(()=>frontalRole(17,0));assert.throws(()=>frontalRole(7,7));
});
test('seven-block layout has the same iconographic order in all four orientations',()=>{
 for(let facing=0;facing<4;facing++){
  const w=facing%2?2:7,d=facing%2?7:2;
  const tiles=Array.from({length:w*d},(_,i)=>({position:{x:i%w,y:5,z:Math.floor(i/w)},stone:0,cloth:1,frontal:5,facing:0,edges:15}));
  const plan=planFinish(tiles,{stone:0,cloth:3,ornamental:true,facing});
  const front=plan.filter(t=>t.frontal>0).sort((a,b)=>facing%2?a.position.z-b.position.z:a.position.x-b.position.x);
  if(facing<2)front.reverse();
  assert.deepEqual(front.map(t=>t.frontal),[6,1,8,2,9,1,7]);
  assert.deepEqual(plan.map(t=>t.position),tiles.map(t=>t.position));
 }
});
