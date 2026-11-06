/** Original Missal / Pontifical source adapter. Geometry and paint follow the Gospel contract.
 * Generated .author.json and .palette.json originate in build_assets.py; do not retouch exports.
 */
import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
export const ATLAS=256;
const specs=Object.fromEntries(['missal','pontifical','lectionary'].map(key=>[key,read(`${key}.author.json`)]));
export const tiles=specs.missal.tiles;
const palettes=Object.fromEntries(['missal','pontifical','lectionary'].map(key=>[key,inflateSync(Buffer.from(read(`${key}.palette.json`).data,'base64'))]));
export function paint(id,x,y,w,h,bookId='missal'){
 const p=palettes[bookId];if(!p)throw Error(`Unknown liturgical model ${bookId}`);
 const t=tiles[id];if(!t)throw Error(`Unknown tile ${id}`);
 x=Math.max(0,Math.min(t[2]-1,Math.floor(x)));y=Math.max(0,Math.min(t[3]-1,Math.floor(y)));
 const i=((t[1]+y)*ATLAS+t[0]+x)*5;
 return{rgb:[p[i],p[i+1],p[i+2]],metal:p[i+3],rough:p[i+4],height:0};
}
export function authorBook(bookId='missal'){
 const spec=specs[bookId];if(!spec)throw Error(`Unknown liturgical model ${bookId}`);
 return structuredClone(spec.bones);
}
export function geometry(kind,bookId='missal'){
 if(!['held','closed','open','animated'].includes(kind))throw Error(`Unknown pose ${kind}`);
 const config=specs[bookId].configuration;
 const held=kind==='held',offset=held?[-6,24,1]:[0,config.thickness/2+.08,-config.height/2],shift=v=>v.map((n,i)=>Math.round((n+offset[i])*1e6)/1e6);
 const source=authorBook(bookId);
 if(kind==='open'){const shell=source.find(b=>b.name==='binding_shell');for(const c of shell.cubes){c.origin[0]=shell.pivot[0]+(c.origin[0]-shell.pivot[0])*.3;c.size[0]*=.3;}}
 const bones=source.map(b=>({...b,pivot:shift(b.pivot),cubes:b.cubes.map(c=>({origin:shift(c.origin),size:c.size.map(n=>Math.round(n*1e6)/1e6),uv:Object.fromEntries(['north','south','east','west','up','down'].filter(f=>!c.omit?.includes(f)).map(f=>{const t=tiles[c.faces?.[f]??c.surface];return[f,{uv:t.slice(0,2),uv_size:t.slice(2)}];}))}))}));
 if(held)bones.unshift({name:'evangeliarium_bound',pivot:[0,0,0],binding:'q.item_slot_to_bone_name(context.item_slot)'},{name:'book_presentation',parent:'evangeliarium_bound',pivot:offset},{name:'book_action',parent:'book_presentation',pivot:offset});
 else{
  bones.unshift({name:'book_presentation',pivot:offset,rotation:[-90,0,0]},{name:'book_action',parent:'book_presentation',pivot:offset});
  if(kind==='open')for(const [name,rotation] of [['front_cover',[0,177,0]],['binding_shell',[0,90,0]],['ribbon_tips',[0,0,0]]])bones.find(b=>b.name===name).rotation=rotation;
  if(kind==='open')for(const b of bones)if(b.name.startsWith('ribbon_tip_'))b.rotation=[18,0,0];
 }
 return{format_version:'1.16.0','minecraft:geometry':[{description:{identifier:`geometry.evangeliarium.${bookId}.${kind}`,texture_width:ATLAS,texture_height:ATLAS,visible_bounds_width:2,visible_bounds_height:2.5,visible_bounds_offset:[0,held?1.7:.5,0]},bones}]};
}
