import {rotateEdges} from './palette-layout.ts';

// Published in 0.9.0. Append only: indices are persistent block identity.
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
export const CLASSIC_TEXTILE_STATES=54*4*3;
export interface ClassicTextilePose {edges:number;frontal:number;facing:number;stone:number;textileRole?:number}
function indexFor(t:ClassicTextilePose){return CLASSIC_TEXTILE_POSES.findIndex(p=>p.edges===rotateEdges(t.edges,-t.facing)&&p.frontal===t.frontal&&p.textileRole===(t.textileRole??0));}
export function encodeClassicTextile(t:ClassicTextilePose):Record<string,number>{
 const i=indexFor(t);if(i<0||!Number.isInteger(t.facing)||t.facing<0||t.facing>3||!Number.isInteger(t.stone)||t.stone<0||t.stone>2)throw Error('configuration');
 return {'altare:shape':Math.floor(i/6),'altare:detail':i%6,'altare:facing':t.facing,'altare:stone':t.stone};
}
export function decodeClassicTextile(s:Record<string,unknown>){
 const a=Number(s['altare:shape']),b=Number(s['altare:detail']),facing=Number(s['altare:facing']),stone=Number(s['altare:stone']);
 if(![a,b,facing,stone].every(Number.isInteger)||a<0||a>8||b<0||b>5||facing<0||facing>3||stone<0||stone>2)throw Error('configuration');
 const p=CLASSIC_TEXTILE_POSES[a*6+b]!;return {...p,edges:rotateEdges(p.edges,facing),facing,stone};
}
export function repairClassicTextile(t:ClassicTextilePose){return indexFor(t)>=0?t:{...t,frontal:0,textileRole:0};}
