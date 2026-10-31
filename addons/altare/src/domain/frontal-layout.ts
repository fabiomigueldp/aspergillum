// Published values 0..5 retain their meaning. New roles are append-only.
export const FRONTAL_STATES:readonly number[]=Object.freeze([0,1,2,3,4,5,6,7,8,9,10,11]);
/** index follows the existing local world traversal; visual left is width - 1. */
export function frontalRole(width:number,index:number):number {
 if(!Number.isInteger(width)||width<1||width>16||!Number.isInteger(index)||index<0||index>=width)throw Error('frontal dimensions');
 const first=Math.floor((width-1)/2),last=Math.ceil((width-1)/2);
 if(first===last&&index===first)return 2;
 if(first!==last&&index===first)return 3;
 if(first!==last&&index===last)return 4;
 if(width<=4)return index===0?11:10;
 if(index===0)return 7;
 if(index===width-1)return 6;
 if(index===first-1)return 9;
 if(index===last+1)return 8;
 return 1;
}
