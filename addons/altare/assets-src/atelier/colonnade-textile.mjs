import {garment,garmentProfile} from './garment.mjs';
export const colonnadeTextileProfile=Object.freeze({...garmentProfile,stoneEdge:8.27,cornerEnd:8.34,drop:4.5,hemAtSeam:92,hemAmplitude:34,repeat:32,textureDomain:128});
export function colonnadeTextile(edges){
 const cloth=garment('lace',edges,{surface:()=> 'lace',seam:'linen',stoneEdge:8.27,cornerEnd:8.34});
 return {top:cloth.top,bones:cloth.bones.filter(b=>b.name!=='top')};
}
