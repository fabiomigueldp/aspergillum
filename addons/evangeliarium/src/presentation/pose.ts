import {EntityComponentTypes,EquipmentSlot,GameMode,system,world,type Player} from '@minecraft/server';
import {ITEM,inventory} from '../infrastructure/items.ts';

const stop="!q.is_item_name_any('slot.weapon.mainhand',0,'evangeliarium:book') || (q.get_equipped_item_name('off_hand') != '' && q.get_equipped_item_name('off_hand') != 'air') || q.is_swimming || q.is_gliding || q.is_riding || q.is_sleeping || q.is_emoting";
interface Carry {viewers:Set<string>;dimension:string;sentAt:number}
export class Poses {
 private active=new Map<string,Carry>();
 private failures=new Map<string,string>();
 clear(id:string){this.active.delete(id);this.failures.delete(id);for(const value of this.active.values())value.viewers.delete(id);}
 inspect(p:Player){
  const offhand=p.getComponent(EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Offhand)?.typeId;
  const item=inventory(p).getItem(p.selectedSlotIndex)?.typeId;
  const gates={book:item===ITEM,offhand:!!offhand,spectator:p.getGameMode()===GameMode.Spectator,swimming:p.isSwimming,gliding:p.isGliding,sleeping:p.isSleeping,emoting:p.isEmoting,riding:!!p.getComponent(EntityComponentTypes.Riding),alive:(p.getComponent(EntityComponentTypes.Health)?.currentValue??0)>0};
  const eligible=gates.book&&!gates.offhand&&!gates.spectator&&!gates.swimming&&!gates.gliding&&!gates.sleeping&&!gates.emoting&&!gates.riding&&gates.alive;
  const active=this.active.get(p.id);
  return {eligible,gates,item,offhand,dimension:p.dimension.id,location:p.location,rotation:p.getRotation(),tick:system.currentTick,lastDispatch:active?.sentAt,viewers:active?.viewers.size??0,lastError:this.failures.get(p.id)};
 }
 tick(){
  const players=world.getAllPlayers();
  for(const p of players)try{
   if(!this.inspect(p).eligible){this.active.delete(p.id);continue;}
   const viewers=players.filter(v=>v.dimension.id===p.dimension.id&&Math.hypot(v.location.x-p.location.x,v.location.y-p.location.y,v.location.z-p.location.z)<64);
   const old=this.active.get(p.id);
   // The client can still be loading when the first packet succeeds on the server.
   // Refresh the same controller without a time-dependent blend (no repeated arm lift).
   const fresh=old?.dimension===p.dimension.id&&system.currentTick-old.sentAt<60?viewers.filter(v=>!old.viewers.has(v.id)):viewers;
   if(fresh.length)p.playAnimation('animation.evangeliarium.player.carry',{players:fresh,controller:'evangeliarium:carry',blendOutTime:.2,stopExpression:stop});
   this.active.set(p.id,{viewers:new Set(viewers.map(v=>v.id)),dimension:p.dimension.id,sentAt:fresh.length?system.currentTick:old!.sentAt});
   this.failures.delete(p.id);
  }catch(error){
   this.active.delete(p.id);const message=String(error);
   if(this.failures.get(p.id)!==message)console.warn('[Evangeliarium:pose] '+message);
   this.failures.set(p.id,message);
  }
  for(const id of this.active.keys())if(!players.some(p=>p.id===id))this.clear(id);
 }
}
