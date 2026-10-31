import {Direction,Player,system,world} from '@minecraft/server';
import {Books,address,meaningful,report,type BookHandle} from '../infrastructure/books.ts';
import {BLOCK,ITEM,STATE} from '../infrastructure/items.ts';
import {Reader} from '../presentation/reader.ts';
import {registerDiagnostics} from '../presentation/diagnostics.ts';
import {VERSION} from '../generated/version.ts';
import {Poses} from '../presentation/pose.ts';
const books=new Books(),reader=new Reader(books),poses=new Poses();
registerDiagnostics(poses);
const interactions=new Map<string,number>();
const safe=(run:()=>void,p?:Player)=>{try{run();}catch(e){report(e,p);}};
system.beforeEvents.startup.subscribe(e=>{
 e.itemComponentRegistry.registerCustomComponent('evangeliarium:use',{onUse:({source})=>{
  if(!(source instanceof Player)||(interactions.get(source.id)??-10)>=system.currentTick-2)return;
  safe(()=>reader.open(source,books.held(source)),source);
 }});
 e.blockComponentRegistry.registerCustomComponent('evangeliarium:placed',{
  onTick:({block})=>safe(()=>books.reconcileBlock(block)),
  onBreak:({block})=>{const a=address(block);system.run(()=>safe(()=>books.broken(a)));}
 });
});
world.beforeEvents.playerInteractWithBlock.subscribe(e=>{
 const own=e.block.typeId===BLOCK,holding=e.itemStack?.typeId===ITEM;
 if(!own&&!holding)return;
 interactions.set(e.player.id,system.currentTick);
 if(!e.isFirstEvent){if(own||!meaningful(e.block))e.cancel=true;return;}
 if(!own&&meaningful(e.block))return;
 if(!own&&e.blockFace!==Direction.Up)return;
 e.cancel=true;
 const player=e.player,a=address(e.block),sneaking=player.isSneaking,slot=player.selectedSlotIndex,raw=e.itemStack?.getDynamicProperty(STATE),type=e.block.typeId;
 let captured:BookHandle|undefined;
 if(own)try{captured=books.placed(e.block);}catch(error){system.run(()=>report(error,player));return;}
 system.run(()=>safe(()=>{
  if(!player.isValid||player.dimension.id!==a.dimension)return;
  const block=player.dimension.getBlock(a.location);if(!block||block.typeId!==type)return;
  if(own){const h=captured!;if(!books.valid(player,h))return;if(sneaking){books.retrieve(player,h);reader.close(player.id);}else{if(books.canMutate(player))books.setOpen(player,h,true);reader.open(player,h);}}
  else books.place(player,a,slot,raw,!sneaking);
 },player));
});
world.beforeEvents.playerBreakBlock.subscribe(e=>{
 if(e.block.typeId!==BLOCK)return;e.cancel=true;const player=e.player;
 let captured:BookHandle;
 try{captured=books.placed(e.block);}catch(error){system.run(()=>report(error,player));return;}
 system.run(()=>safe(()=>{if(books.valid(player,captured)){books.retrieve(player,captured);reader.close(player.id);}},player));
});
world.afterEvents.playerLeave.subscribe(e=>{reader.close(e.playerId);poses.clear(e.playerId);interactions.delete(e.playerId);});
world.afterEvents.entityDie.subscribe(e=>{if(e.deadEntity instanceof Player){reader.close(e.deadEntity.id);poses.clear(e.deadEntity.id);}});
world.afterEvents.entityLoad.subscribe(e=>safe(()=>books.reconcileEntity(e.entity)));
world.afterEvents.playerSpawn.subscribe(e=>{reader.close(e.player.id);poses.clear(e.player.id);});
world.afterEvents.worldLoad.subscribe(()=>{
 books.load();console.log(`[Evangeliarium] ${VERSION} ready; 3779 verses; Brazil 2026-2027; stable APIs.`);
 system.runInterval(()=>{safe(()=>books.recover());safe(()=>reader.tick());safe(()=>poses.tick());},10);
});
