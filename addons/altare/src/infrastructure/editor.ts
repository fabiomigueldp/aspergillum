import { GameMode, system, type Player, type Dimension } from '@minecraft/server';
import { collectSurface, validateRectangle, planFinish, positionKey, type Position } from '../domain/surface.ts';
import { commitFinish } from '../application/finish.ts';
import { EditSessions } from '../application/sessions.ts';
import { BedrockSurfacePort, TOOL } from './surface-port.ts';
import { chooseFinish,tell } from '../presentation/menu.ts';
import { formatFailure } from '../presentation/diagnostic.ts';

export const sessions=new EditSessions();
export function allowed(player:Player):boolean {
  return player.isValid && (player.getGameMode()===GameMode.Creative||player.getGameMode()===GameMode.Survival);
}
export async function edit(player:Player,dimension:Dimension,position:Position,face?:number):Promise<void>{
  if(!allowed(player))return;
  const port=new BedrockSurfacePort(dimension);
  let session;
  let timer:number|undefined;
  try {
    // Opening a draft is read-only, including when another editor owns the lock.
    // Contours are repaired by planFinish inside the guarded Apply transaction.
    const before=collectSurface(position,p=>port.read(p));validateRectangle(before);
    session=sessions.acquire(player.id,dimension.id,before.map(t=>positionKey(t.position)),system.currentTick);
    if(!session){tell(player,'error.busy');return;}
    const active=session;
    timer=system.runTimeout(()=>sessions.release(active),1200);
    const selectedSlot=player.selectedSlotIndex;
    let interrupted=false;
    const finish=await chooseFinish(player,before,face??before.find(t=>t.frontal>0)?.facing??before[0]!.facing,()=>sessions.isCurrent(active,system.currentTick),callback=>sessions.onRelease(active,callback),()=>{interrupted=true;});
    if(!finish){
      if(interrupted && player.isValid)tell(player,'error.expired');
      return;
    }
    const item=player.getComponent('minecraft:inventory')?.container?.getItem(selectedSlot);
    if(!sessions.isCurrent(session,system.currentTick)||!allowed(player)||player.dimension.id!==dimension.id
      ||player.selectedSlotIndex!==selectedSlot||item?.typeId!==TOOL
      ||Math.hypot(player.location.x-position.x-0.5,player.location.y-position.y,player.location.z-position.z-0.5)>8)throw Error('expired');
    const now=collectSurface(position,p=>port.read(p));
    const keys=new Set(before.map(t=>positionKey(t.position)));
    if(now.length!==before.length||now.some(t=>!keys.has(positionKey(t.position))))throw Error('changed');
    commitFinish(port,before,planFinish(before,finish));
    tell(player,'success');
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const known=['unloaded','limit','rectangle','changed','expired'].find(v=>message===v);
    tell(player,`error.${known??'write'}`);
    if(!known)console.warn(`[Altare] ${formatFailure(error)}`);
  }finally{
    if(session)sessions.release(session);
    if(timer!==undefined)system.clearRun(timer);
  }
}
