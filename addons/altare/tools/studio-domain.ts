import {planFinish,type Tile} from '../src/domain/surface.ts';
import {encodeTile} from '../src/domain/block-codec.ts';
import {DESIGNS} from '../src/domain/catalog.ts';
export {DESIGNS};
export * from '../src/domain/customization.ts';
export function compose({width,depth,design,stone=0,cloth=3,ornamental=true}:{width:number;depth:number;design?:string;stone?:number;cloth?:number;ornamental?:boolean}) {
  if(!Number.isInteger(width)||width<1||width>16||!Number.isInteger(depth)||depth<1||depth>8)throw Error('Dimensões inválidas: frente 1–16, profundidade 1–8.');
  const tiles:Tile[]=Array.from({length:width*depth},(_,i)=>({position:{x:i%width,y:0,z:Math.floor(i/width)},stone:0,cloth:0,frontal:0,facing:0,edges:15}));
  return planFinish(tiles,{stone,cloth,ornamental,facing:0,...(design?{design}:{})}).map(tile=>({...tile,...encodeTile(tile)}));
}
