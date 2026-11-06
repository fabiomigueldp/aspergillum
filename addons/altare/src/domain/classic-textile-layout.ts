import {rotateEdges} from './palette-layout.ts';

// Authored local poses; runtime removes only redundant blank-facing copies.
// Local front=N. Entries combine the independent cloth and Guadalupe roles.
export const CLASSIC_TEXTILE_POSES=Object.freeze([
 [15,0,0],[0,0,0],[1,0,0],[2,0,0],[3,0,0],[4,0,0],[5,0,0],[6,0,0],
 [7,0,0],[8,0,0],[9,0,0],[10,0,0],[11,0,0],[12,0,0],[13,0,0],[14,0,0],
 [15,0,1],[15,2,1],[11,0,1],[11,2,1],[5,0,1],[5,2,1],[1,0,1],[1,2,1],
 [13,0,2],[13,3,2],[7,0,3],[7,4,3],[9,0,2],[9,3,2],[3,0,3],[3,4,3],
 [13,11,0],[7,10,0],[5,0,2],[5,3,2],[5,0,3],[5,4,3],[9,11,0],[3,10,0],
 [1,0,2],[1,3,2],[1,0,3],[1,4,3],[13,7,0],[5,9,0],[5,8,0],[7,6,0],
 [9,7,0],[1,9,0],[1,8,0],[3,6,0],[5,1,0],[1,1,0],
].map(([edges,frontal,textileRole])=>Object.freeze({edges:edges!,frontal:frontal!,textileRole:textileRole!})));
export const CLASSIC_TEXTILE_VISUAL_POSES=Object.freeze([
 ...CLASSIC_TEXTILE_POSES.slice(0,16).map(p=>({...p,facing:0})),
 ...CLASSIC_TEXTILE_POSES.slice(16).flatMap(p=>Array.from({length:4},(_,facing)=>({...p,edges:rotateEdges(p.edges,facing),facing}))),
].map(p=>Object.freeze(p)));
export const CLASSIC_TEXTILE_STATE_VALUES=Object.freeze({'altare:pose':Array.from({length:14},(_,i)=>i),'altare:part':Array.from({length:12},(_,i)=>i),'altare:stone':[0,1,2]});
export const CLASSIC_TEXTILE_STATES=168*3;
export interface ClassicTextilePose {edges:number;frontal:number;facing:number;stone:number;textileRole?:number}
const valid=(v:unknown,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=max;
export function normalizeClassicTextile<T extends ClassicTextilePose>(t:T):T {
 if(!valid(t.edges,15)||!valid(t.frontal,11)||!valid(t.facing,3)||!valid(t.stone,2)||!valid(t.textileRole??0,3))throw Error('configuration');
 return t.frontal||(t.textileRole??0)?t:{...t,facing:0};
}
function indexFor(t:ClassicTextilePose){const p=normalizeClassicTextile(t);return CLASSIC_TEXTILE_VISUAL_POSES.findIndex(v=>v.edges===p.edges&&v.frontal===p.frontal&&v.textileRole===(p.textileRole??0)&&v.facing===p.facing);}
export function encodeClassicTextile(t:ClassicTextilePose):Record<string,number>{
 const i=indexFor(t);if(i<0)throw Error('configuration');
 return {'altare:pose':i%14,'altare:part':Math.floor(i/14),'altare:stone':t.stone};
}
export function decodeClassicTextile(s:Record<string,unknown>){
 const pose=s['altare:pose'],part=s['altare:part'],stone=s['altare:stone'];
 if(!valid(pose,13)||!valid(part,11)||!valid(stone,2))throw Error('configuration');
 return {...CLASSIC_TEXTILE_VISUAL_POSES[pose+part*14]!,stone};
}
export function repairClassicTextile(t:ClassicTextilePose){return normalizeClassicTextile(indexFor(t)>=0?t:{...t,frontal:0,textileRole:0});}
