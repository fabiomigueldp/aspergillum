import {NATIVE_BASE_POSES,NATIVE_CENTER_POSES,NATIVE_PLANS} from './native-pedestal-data.ts';

/** Stable semantic codebook indices. Never derive supports from perimeter bits. */
export const NATIVE_BASE_STATES=448;
export const NATIVE_CENTER_STATES=504;
export function nativeCentered(textile:string):boolean {return ['agnus','ruby','verdant','requiem'].includes(textile);}
export function nativePoseData(pose:number,centered:boolean):{facing:number;edges:number;frontal:number} {
 const entry=centered?NATIVE_CENTER_POSES[pose]:undefined;
 const base=NATIVE_BASE_POSES[centered?entry?.basePose??-1:pose];
 if(!Number.isInteger(pose)||pose<0||!base||centered&&!entry)throw Error('configuration');
 return {facing:base.facing,edges:base.edges,frontal:entry?.role??0};
}
export function nativePoseFor(width:number,depth:number,facing:number,x:number,z:number,role:number,centered:boolean):number {
 if(!Number.isInteger(width)||!Number.isInteger(depth)||width<1||depth<1||width>16||depth>16||Math.min(width,depth)>8||!Number.isInteger(facing)||facing<0||facing>3)throw Error('configuration');
 const nx=facing%2?depth:width,nz=facing%2?width:depth;
 if(!Number.isInteger(x)||!Number.isInteger(z)||x<0||z<0||x>=nx||z>=nz)throw Error('configuration');
 const plan=NATIVE_PLANS[`${width},${depth},${facing}`];
 const basePose=plan?.[x*nz+z];if(basePose===undefined)throw Error('configuration');
 if(!centered)return basePose;
 const pose=NATIVE_CENTER_POSES.findIndex(p=>p.basePose===basePose&&p.role===role);
 if(pose<0)throw Error('configuration');return pose;
}
export function decodeNative(states:Record<string,unknown>,centered:boolean):{nativePose:number;facing:number;edges:number;frontal:number} {
 const [r0,r1,r2]=centered?[14,12,3]:[16,14,2];
 const raw=['pose','bank','page'].map(k=>states[`altare:${k}`]);
 if(raw.some(v=>typeof v!=='number'))throw Error('configuration');
 const digits=raw as number[];
 if(digits.some((v,i)=>!Number.isInteger(v)||v<0||v>=[r0,r1,r2][i]!))throw Error('configuration');
 const nativePose=digits[0]!+r0!*(digits[1]!+r1!*digits[2]!);
 return {nativePose,...nativePoseData(nativePose,centered)};
}
export function encodeNative(tile:{nativePose?:number;facing:number;edges:number;frontal:number},centered:boolean):Record<string,number> {
 if(tile.nativePose===undefined)throw Error('configuration');
 const data=nativePoseData(tile.nativePose,centered);
 if(data.facing!==tile.facing||data.edges!==tile.edges||data.frontal!==tile.frontal)throw Error('configuration');
 const [r0,r1]=centered?[14,12]:[16,14];
 return {'altare:pose':tile.nativePose%r0!,'altare:bank':Math.floor(tile.nativePose/r0!)%r1!,'altare:page':Math.floor(tile.nativePose/(r0!*r1!))};
}
