import { BlockPermutation, type Block, type Dimension } from '@minecraft/server';
import { edgeMask, neighbor, withEdges, positionKey, type Position, type Tile } from '../domain/surface.ts';
import type { SurfacePort } from '../application/finish.ts';
import {isAltarId,designById} from '../domain/catalog.ts';
import {decodeTile,encodeTile} from '../domain/block-codec.ts';

export const ALTAR='altare:mensa';
export const TOOL='altare:finish_tool';
export function tileFromBlock(block:Block):Tile|null {
  return decodeTile(block.typeId,block.location,block.permutation.getAllStates());
}
export function tilePermutation(tile:Tile):BlockPermutation {
  const {id,states}=encodeTile(tile);
  try{return BlockPermutation.resolve(id,states);}
  catch(cause){throw Error(`cannot resolve ${id} states=${JSON.stringify(states)}`,{cause});}
}
export class BedrockSurfacePort implements SurfacePort {
  private prepared=new Map<string,BlockPermutation>();
  constructor(readonly dimension:Dimension){}
  prepare(tiles:readonly Tile[]):void {
    const ready=new Map<string,BlockPermutation>();
    for(const tile of tiles){const key=JSON.stringify(encodeTile(tile));if(!ready.has(key))ready.set(key,tilePermutation(tile));}
    this.prepared=ready;
  }
  read(position:Position):Tile|null|undefined {
    try {const block=this.dimension.getBlock(position);return block?tileFromBlock(block):undefined;}catch{return undefined;}
  }
  write(tile:Tile):void {
    const block=this.dimension.getBlock(tile.position);
    if(!block || !isAltarId(block.typeId))throw Error('changed');
    const encoded=encodeTile(tile),permutation=this.prepared.get(JSON.stringify(encoded))??tilePermutation(tile);
    try{block.setPermutation(permutation);}
    catch(cause){throw Error(`cannot write ${encoded.id} at ${positionKey(tile.position)}`,{cause});}
  }
  reconcile(position:Position):void {
    const tile=this.read(position);if(!tile||designById(tile.design)?.codec==='native')return;
    const connected=[0,1,2,3].map(i=>{const t=this.read(neighbor(position,i));return t===undefined?undefined:t!==null;});
    const edges=edgeMask(connected,tile.edges);
    if(edges!==tile.edges)this.write(withEdges(tile,edges));
  }
  reconcileAround(position:Position):void {
    for(const p of [position,...[0,1,2,3].map(i=>neighbor(position,i))])this.reconcile(p);
  }
}
