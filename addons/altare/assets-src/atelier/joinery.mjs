import {box,rotateCube} from '../model.mjs';

// N/S rails own the corner; E/W rails stop against them. Internal module
// boundaries always reach ±8. End-grain cannot project beyond a return rail.
export function joineryRails(side,edges=0){
 const left=!!(edges&(1<<((side+3)%4))),right=!!(edges&(1<<((side+1)%4)));
 const upper=side%2?6:7.5,lower=side%2?5.5:6.5;
 const a=left?-upper:-8,b=right?upper:8,c=left?-lower:-8,d=right?lower:8;
 return [box([a,11.9,-7.5],[b-a,2.3,1.5],'wood_cross'),box([c,2.65,-6.5],[d-c,.9,1],'wood_cross')];
}

// Authored in 1/16-block units. These members never depend on the cloth.
// Each exposed module is a complete structural bay, including at width 1.
export function joineryMembers(structure,add,turn,edge,edges){
 if(structure==='coffer'){
  add('case_core',[
   box([-7.1,1.1,-7.1],[14.2,13.1,14.2],'stone'),
   box([-8,0,-8],[16,1.1,16],'wood_cross'),
  ]);
  for(let i=0;i<4;i++){
   add(`case_join_${i}`,[turn(box([-7.1,1.1,-8],[14.2,13.1,.9],'stone'),i)],`!(${edge(i)})`);
   // Stiles stand proud of the recessed panel. The rails stop at the stiles,
   // so no coincident front faces or overlapping frame corners are emitted.
   const frame=[
    box([-8,1.1,-8],[1.3,13.1,.9],'stone'),
    box([6.7,1.1,-8],[1.3,13.1,.9],'stone'),
    box([-6.7,1.1,-8],[13.4,1.65,.9],'wood_cross'),
    box([-6.7,12.55,-8],[13.4,1.65,.9],'wood_cross'),
   ];
   add(`case_frame_${i}`,frame.map(c=>turn(c,i)),edge(i));
  }
 }else if(structure==='baluster'){
  for(let i=0;i<4;i++){
   // A square foot, lower neck, faceted collar and long upper neck form a
   // restrained turned silhouette. Repeated bays prevent unsupported spans.
   const upright=[
    box([-1.6,0,-7.6],[3.2,1.15,3.2],'stone'),
    box([-.85,1.15,-6.85],[1.7,3.5,1.7],'stone'),
    box([-1.3,4.65,-7.3],[2.6,2.3,2.6],'stone'),
    box([-.85,6.95,-6.85],[1.7,7.25,1.7],'stone'),
   ];
   upright[2].pivot=[0,5.8,-6];upright[2].rotation=[0,45,0];
   add(`baluster_${i}`,upright.map(c=>turn(c,i)),edge(i));
   add(`joinery_rail_${i}`,joineryRails(i,edges).map(c=>turn(c,i)),edge(i));
  }
 }
}

// Conservative collision envelopes consolidate the four turned segments into
// one post. The void between posts remains open; decorative cloth is omitted.
export function joineryCollision(structure,edges){
 if(structure!=='baluster')return true;
 const result=[{origin:[-8,14.2,-8],size:[16,1.8,16]}];
 for(let i=0;i<4;i++)if(edges&(1<<i)){
  const boxes=i%2===0?[
   {origin:[-1.85,0,i===0?-7.85:4.15],size:[3.7,14.2,3.7]},
  ]:[
   {origin:[i===1?4.15:-7.85,0,-1.85],size:[3.7,14.2,3.7]},
  ];
  boxes.push(...joineryRails(i,edges).map(c=>{const {origin,size}=rotateCube(c,i);return {origin,size};}));
  result.push(...boxes);
 }
 return result;
}
