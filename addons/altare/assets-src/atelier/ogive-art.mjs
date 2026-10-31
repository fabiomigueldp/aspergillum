import {definitions} from '../textures.mjs';
import {walnutPaint} from './materials.mjs';
import {ogiveMaskAlpha} from './ogive-model.mjs';

// Only the cutout color is new. Donor color remains valid under alpha zero,
// and the original stone/wood normal and MER maps retain their byte identity.
export function ogiveDefinitions(){
 const donors=[...definitions().filter(d=>['stone_0','stone_1'].includes(d.id)),{id:'atelier_walnut',size:128,paint:walnutPaint}];
 return donors.map(d=>({id:`ogive_${d.id}`,size:128,alpha:true,mapSource:d.id,paint:(x,y)=>({...d.paint(x,y),alpha:ogiveMaskAlpha(x,y)})}));
}
