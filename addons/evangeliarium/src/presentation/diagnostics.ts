import {Player,system,world,type Vector2} from '@minecraft/server';
import {VERSION} from '../generated/version.ts';
import type {Poses} from './pose.ts';
import {ActionFormData,ModalFormData} from '@minecraft/server-ui';

/** Opt-in, local-player diagnostic. No inventory, block or persistent-world writes. */
export function registerDiagnostics(poses:Poses){
 const cameras=new Map<string,{player:Player;rotation:Vector2;timeout:number}>();
 const reset=(p:Player)=>{const old=cameras.get(p.id);if(!old)return;system.clearRun(old.timeout);cameras.delete(p.id);if(p.isValid){p.camera.clear();p.setRotation(old.rotation);}};
 system.afterEvents.scriptEventReceive.subscribe(e=>{
  if(e.id!=='evangeliarium:inspect'||!(e.sourceEntity instanceof Player))return;
  const p=e.sourceEntity,command=e.message.trim()||'status';
  try{
   if(command==='ui-native'){
    system.runTimeout(()=>{void new ActionFormData().title('Formulário nativo').body('Verificação de compatibilidade.').button('Campo de texto').button('Fechar').show(p).then(r=>{if(!r.canceled&&r.selection===0)system.run(()=>{void new ModalFormData().title('Campo nativo').textField('Texto','',{defaultValue:'Verificação'}).submitButton('Concluir').show(p);});});},20);return;
   }
   if(command==='reset'){reset(p);return;}
   if(command==='replay'){poses.clear(p.id);poses.tick();}
   const views:Record<string,number>={front:0,side:90,back:180,quarter:40,left:-40};
   if(command in views){
    const rotation=cameras.get(p.id)?.rotation??p.getRotation();reset(p);
    p.setRotation({x:0,y:rotation.y});
    const angle=(rotation.y+views[command]!)*Math.PI/180;
    const center={x:p.location.x,y:p.location.y+1.35,z:p.location.z};
    p.camera.setCamera('minecraft:free',{location:{x:center.x-Math.sin(angle)*2.7,y:center.y+.1,z:center.z+Math.cos(angle)*2.7},facingLocation:center});
    cameras.set(p.id,{player:p,rotation,timeout:system.runTimeout(()=>reset(p),1200)});
   }
   const state=poses.inspect(p);
   console.log('[Evangeliarium:inspect] '+JSON.stringify({version:VERSION,command,...state}));
   p.sendMessage(`Evangeliarium ${VERSION} · ${command} · porte ${state.eligible?'habilitado':'suspenso'} · observadores ${state.viewers}`);
  }catch(error){console.warn('[Evangeliarium:inspect] '+String(error));p.sendMessage('Diagnóstico: '+String(error));}
 });
 world.afterEvents.playerLeave.subscribe(e=>{const old=cameras.get(e.playerId);if(old){system.clearRun(old.timeout);cameras.delete(e.playerId);}});
 world.afterEvents.playerSpawn.subscribe(e=>reset(e.player));
}
