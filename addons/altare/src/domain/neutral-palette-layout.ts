import {PALETTE_SHAPES,rotateEdges,type PaletteLayout} from './palette-layout.ts';

// Decorative directions remain explicit. A blank symmetric cell only needs its
// world-space outline, rather than four copies of the same rendered surface.
export const NEUTRAL_PALETTE_POSES=Object.freeze([
 ...PALETTE_SHAPES.slice(0,16).map(p=>({...p,facing:0})),
 ...PALETTE_SHAPES.slice(16).flatMap(p=>Array.from({length:4},(_,facing)=>({...p,edges:rotateEdges(p.edges,facing),facing}))),
].map(p=>Object.freeze(p)));
export const NEUTRAL_PALETTE_STATES=64;
export const NEUTRAL_PALETTE_STATE_VALUES=Object.freeze({'altare:pose':Array.from({length:16},(_,i)=>i),'altare:part':[0,1,2,3]});
const valid=(v:unknown,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=max;
export function normalizeNeutralPalette<T extends PaletteLayout>(pose:T):T {
 if(!valid(pose.edges,15)||!valid(pose.frontal,3)||!valid(pose.facing,3))throw Error('configuration');
 return pose.frontal?pose:{...pose,facing:0};
}
export function encodeNeutralPalette(pose:PaletteLayout):Record<string,number> {
 const p=normalizeNeutralPalette(pose),index=NEUTRAL_PALETTE_POSES.findIndex(v=>v.edges===p.edges&&v.frontal===p.frontal&&v.facing===p.facing);
 if(index<0)throw Error('configuration');
 return {'altare:pose':index%16,'altare:part':Math.floor(index/16)};
}
export function decodeNeutralPalette(states:Record<string,unknown>):PaletteLayout {
 const pose=states['altare:pose'],part=states['altare:part'];if(!valid(pose,15)||!valid(part,3))throw Error('configuration');
 return {...NEUTRAL_PALETTE_POSES[pose+part*16]!};
}
