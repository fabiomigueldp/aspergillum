import {LEGACY_ID,designById,SURFACES,TEXTILE_VALUES,compactLayout} from './catalog.ts';
import {decodeClassicTextile,encodeClassicTextile} from './classic-textile-layout.ts';
import type {Position,Tile} from './surface.ts';
import {decodePalette,encodePalette} from './palette-layout.ts';
const fields=['stone','cloth','frontal','facing','edges'] as const;
export function decodeTile(id:string,position:Position,states:Record<string,unknown>):Tile|null {
 const design=designById(id);
 if(design?.codec==='classic_textile')return {position:{...position},design:id,cloth:TEXTILE_VALUES.indexOf(design.textile),...decodeClassicTextile(states)};
 if(design?.codec==='symmetric'){
  const edges=Number(states['altare:edges']);if(!Number.isInteger(edges)||edges<0||edges>15)throw Error('configuration');
  return {position:{...position},design:id,stone:0,cloth:TEXTILE_VALUES.indexOf(design.textile),frontal:0,facing:0,edges};
 }
 if(design&&compactLayout(design))return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),...decodePalette(states)};
 if(design?.codec==='edges')return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),frontal:0,facing:Number(states['altare:facing']),edges:Number(states['altare:edges'])};
 if(design)return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),frontal:Number(states['altare:role']),facing:Number(states['altare:facing']),edges:Number(states['altare:edges'])};
 if(id!==LEGACY_ID)return null;
 return {position:{...position},...Object.fromEntries(fields.map(k=>[k,Number(states[`altare:${k}`])]))} as Tile;
}
export function encodeTile(tile:Tile):{id:string;states:Record<string,number>} {
 if(tile.design){
  const design=designById(tile.design);if(!design)throw Error('configuration');
  if(design.codec==='classic_textile')return {id:tile.design,states:encodeClassicTextile(tile)};
  if(design.codec==='symmetric'){
   if(tile.facing!==0||tile.frontal!==0||!Number.isInteger(tile.edges)||tile.edges<0||tile.edges>15)throw Error('configuration');
   return {id:tile.design,states:{'altare:edges':tile.edges}};
  }
  if(compactLayout(design))return {id:tile.design,states:encodePalette(tile)};
  if(design.codec==='edges'){
   if(tile.frontal!==0)throw Error('configuration');
   return {id:tile.design,states:{'altare:edges':tile.edges,'altare:facing':tile.facing}};
  }
  return {id:tile.design,states:{'altare:edges':tile.edges,'altare:facing':tile.facing,'altare:role':tile.frontal}};
 }
 return {id:LEGACY_ID,states:Object.fromEntries(fields.map(k=>[`altare:${k}`,tile[k]]))};
}
