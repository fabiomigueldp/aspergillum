/** Compact visual poses. Blank faces carry no ornamental direction. */
export interface VisualPose { edges:number; frontal:number; facing:number }
const masks=[15,...Array.from({length:15},(_,i)=>i)];
const rotate=(edges:number,facing:number)=>((edges<<facing)|(edges>>(4-facing)))&15;
const key=(p:VisualPose)=>`${p.edges}:${p.frontal}:${p.facing}`;
const valid=(v:number,max:number)=>Number.isInteger(v)&&v>=0&&v<=max;

function layout(maxRole:number,neutralDirections:1|4) {
 const poses:VisualPose[]=[];
 for(let facing=0;facing<neutralDirections;facing++)for(const edges of masks)poses.push({edges,frontal:0,facing});
 for(let frontal=1;frontal<=maxRole;frontal++)for(let facing=0;facing<4;facing++)for(let local=1;local<16;local+=2)poses.push({edges:rotate(local,facing),frontal,facing});
 const parts=poses.length<=256?Math.ceil(poses.length/16):8,layers=Math.ceil(poses.length/(16*parts));
 // All dimensions stay within Bedrock's sixteen-values-per-state limit.
 const states:Record<string,readonly number[]>={'altare:pose':Array.from({length:16},(_,i)=>i)};
 if(parts>1)states['altare:part']=Array.from({length:parts},(_,i)=>i);
 if(layers>1)states['altare:layer']=Array.from({length:layers},(_,i)=>i);
 const size=16*parts*layers,byPose=new Map(poses.map((pose,index)=>[key(pose),index]));
 function normalize(p:VisualPose):VisualPose {
  if(!valid(p.edges,15)||!valid(p.facing,3)||!valid(p.frontal,maxRole===0?3:maxRole))throw Error('configuration');
  // Covering the front removes its ornament; breaking any other neighbour does
  // not. Never discard a visible centre merely because the outline is irregular.
  const frontal=maxRole>0&&(p.edges&(1<<p.facing))?p.frontal:0;
  return {edges:p.edges,frontal,facing:frontal||neutralDirections===4?p.facing:0};
 }
 function stateAt(index:number):Record<string,number> {
  if(!valid(index,size-1))throw Error('configuration');
  return {'altare:pose':index%16,...(parts>1?{'altare:part':Math.floor(index/16)%parts}:{}),...(layers>1?{'altare:layer':Math.floor(index/(16*parts))}:{})};
 }
 function encode(p:VisualPose):Record<string,number> {
  const index=byPose.get(key(normalize(p)));if(index===undefined)throw Error('configuration');return stateAt(index);
 }
 function decode(s:Record<string,unknown>):VisualPose {
  if(Object.keys(s).some(k=>k.startsWith('altare:')&&!['altare:stone','altare:cloth',...Object.keys(states)].includes(k)))throw Error('configuration');
  for(const [field,values] of Object.entries(states))if(typeof s[field]!=='number'||!values.includes(s[field] as number))throw Error('configuration');
  const index=(s['altare:pose'] as number)+Number(s['altare:part']??0)*16+Number(s['altare:layer']??0)*16*parts;
  // Radix padding aliases the safe isolated default, never an invalid state.
  return {...(poses[index]??poses[0])!};
 }
 return Object.freeze({poses:Object.freeze(poses.map(p=>Object.freeze(p))),states:Object.freeze(states),size,normalize,stateAt,encode,decode});
}
export const ATELIER_POSES=layout(3,1); // 112 visual poses
export const TRESTLE_POSES=layout(3,4); // Keep all four structural/UV directions.
export const BARE_POSES=layout(0,1);
export const BARE_TRESTLE_POSES=layout(0,4);
export const MENSA_LAYOUT=layout(11,1); // 368 poses, 384 registered radix entries.
export const MENSA_STATES=MENSA_LAYOUT.size*3*5;
export function atelierLayout(d:{structure:string;textile:string;frontal:string}) {
 const bare=d.textile==='none'&&d.frontal==='none';
 return d.structure==='trestle'?(bare?BARE_TRESTLE_POSES:TRESTLE_POSES):(bare?BARE_POSES:ATELIER_POSES);
}
