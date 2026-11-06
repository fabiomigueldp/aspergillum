import {decodeNeutralPalette,encodeNeutralPalette,normalizeNeutralPalette} from './neutral-palette-layout.ts';
import {decodeNative,encodeNative,nativeCentered} from './native-pedestal-layout.ts';
import {MENSA_ID,designById,SURFACES,TEXTILE_VALUES,compactLayout} from './catalog.ts';
import {decodeClassicTextile,encodeClassicTextile,normalizeClassicTextile} from './classic-textile-layout.ts';
import type {Position,Tile} from './surface.ts';
import {atelierLayout,MENSA_LAYOUT} from './pose-layout.ts';
import {decodePalette,encodePalette} from './palette-layout.ts';
export function normalizeTile(tile:Tile):Tile {
 const d=designById(tile.design);
 if(d?.codec==='neutral_palette')return normalizeNeutralPalette(tile);
 if(d?.codec==='classic_textile')return normalizeClassicTextile(tile);
 if(d?.codec==='symmetric')return {...tile,facing:0,frontal:0};
 if(d?.codec==='pose')return {...tile,...atelierLayout(d).normalize(tile)};
 return !tile.design?{...tile,...MENSA_LAYOUT.normalize(tile)}:tile;
}
export function decodeTile(id:string,position:Position,states:Record<string,unknown>):Tile|null {
 const design=designById(id);
 if(design?.codec==='native')return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),...decodeNative(states,nativeCentered(design.textile))};
 if(design?.codec==='neutral_palette')return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),...decodeNeutralPalette(states)};
 if(design?.codec==='pose')return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),...atelierLayout(design).decode(states)};
 if(design?.codec==='classic_textile')return {position:{...position},design:id,cloth:TEXTILE_VALUES.indexOf(design.textile),...decodeClassicTextile(states)};
 if(design?.codec==='symmetric'){
  const edges=Number(states['altare:edges']);if(!Number.isInteger(edges)||edges<0||edges>15)throw Error('configuration');
  return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),frontal:0,facing:0,edges};
 }
 if(design&&compactLayout(design))return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),...decodePalette(states)};
 if(design?.codec==='edges')return {position:{...position},design:id,stone:SURFACES.indexOf(design.surface),cloth:TEXTILE_VALUES.indexOf(design.textile),frontal:0,facing:Number(states['altare:facing']),edges:Number(states['altare:edges'])};
 if(design)throw Error('configuration');
 if(id!==MENSA_ID)return null;
 const stone=states['altare:stone'],cloth=states['altare:cloth'];
 if(typeof stone!=='number'||!Number.isInteger(stone)||stone<0||stone>2||typeof cloth!=='number'||!Number.isInteger(cloth)||cloth<0||cloth>4)throw Error('configuration');
 return {position:{...position},stone,cloth,...MENSA_LAYOUT.decode(states)};
}
export function encodeTile(tile:Tile):{id:string;states:Record<string,number>} {
 if(tile.design){
  const design=designById(tile.design);if(!design)throw Error('configuration');
  if(design.codec==='native')return {id:tile.design,states:encodeNative(tile,nativeCentered(design.textile))};
  if(design.codec==='neutral_palette')return {id:tile.design,states:encodeNeutralPalette(tile)};
  if(design.codec==='pose')return {id:tile.design,states:atelierLayout(design).encode(tile)};
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
  throw Error('configuration');
 }
 if(!Number.isInteger(tile.stone)||tile.stone<0||tile.stone>2||!Number.isInteger(tile.cloth)||tile.cloth<0||tile.cloth>4)throw Error('configuration');
 return {id:MENSA_ID,states:{...MENSA_LAYOUT.encode(tile),'altare:stone':tile.stone,'altare:cloth':tile.cloth}};
}
