import { sameTile, positionKey, type Position, type Tile } from '../domain/surface.ts';
export interface SurfacePort { read(p:Position):Tile|null|undefined; prepare?(tiles:readonly Tile[]):void; write(tile:Tile):void }

/** Synchronous commit: no yield between the final preflight and the last write. */
export function commitFinish(port:SurfacePort,before:readonly Tile[],after:readonly Tile[]):void {
  if(before.length!==after.length || before.some((t,i)=>positionKey(t.position)!==positionKey(after[i]!.position)))throw Error('invalid plan');
  if(before.some(t=>!sameTile(port.read(t.position),t)))throw Error('changed');
  // Resolve both target and recovery permutations before any mutation. A
  // rejected block definition must never start a partially applied finish.
  try {port.prepare?.([...after,...before]);}
  catch(cause){throw Error('prepare failed; no blocks changed',{cause});}
  const changed:number[]=[];
  try {
    for(let i=0;i<before.length;i++){
      if(sameTile(before[i],after[i]!))continue;
      // Record before invoking the port, which may throw after publishing a write.
      changed.push(i);port.write(after[i]!);
    }
  } catch(cause) {
    const failed:string[]=[];
    for(const i of changed.reverse()){
      try {
        const current=port.read(before[i]!.position);
        if(sameTile(current,before[i]!))continue;
        if(!sameTile(current,after[i]!))throw Error('world changed');
        port.write(before[i]!);
      }catch{failed.push(positionKey(before[i]!.position));}
    }
    if(failed.length)throw Error(`rollback incomplete: ${failed.join(';')}`,{cause});
    throw Error('write failed; rolled back',{cause});
  }
}
