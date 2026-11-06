import {OrdoController} from '../presentation/ordo.ts';
import {ORDO,ordo} from '../infrastructure/ordo.ts';
import {bookByBlock,bookByItem} from '../domain/catalog.ts';
import {Direction,Player,system,world} from '@minecraft/server';
import {Books,address,meaningful,report,type BookHandle} from '../infrastructure/books.ts';
import {STATE} from '../infrastructure/items.ts';
import {Reader} from '../presentation/reader.ts';
import {registerDiagnostics} from '../presentation/diagnostics.ts';
import {VERSION} from '../generated/version.ts';
import {Poses} from '../presentation/pose.ts';
const books=new Books(),reader=new Reader(books),poses=new Poses(),ordoUi=new OrdoController(ordo);
registerDiagnostics(poses);
const interactions=new Map<string,number>();
const safe=(run:()=>void,p?:Player)=>{try{run();}catch(e){report(e,p);}};
system.beforeEvents.startup.subscribe(e=>{
 e.itemComponentRegistry.registerCustomComponent('evangeliarium:ordo_use',{onUse:({source})=>{
  if(!(source instanceof Player)||(interactions.get(source.id)??-10)>=system.currentTick-2)return;
  const slot=source.selectedSlotIndex,dimension=source.dimension.id;reader.close(source.id);
  safe(()=>ordoUi.open(source,()=>source.selectedSlotIndex===slot&&source.dimension.id===dimension&&source.getComponent('minecraft:inventory')?.container?.getItem(slot)?.typeId===ORDO),source);
 }});
 e.itemComponentRegistry.registerCustomComponent('evangeliarium:use',{onUse:({source})=>{
  if(!(source instanceof Player)||(interactions.get(source.id)??-10)>=system.currentTick-2)return;
  ordoUi.close(source.id);safe(()=>reader.open(source,books.held(source)),source);
 }});
 e.blockComponentRegistry.registerCustomComponent('evangeliarium:placed',{
  onTick:({block})=>safe(()=>books.reconcileBlock(block)),
  onBreak:({block})=>{const a=address(block);system.run(()=>safe(()=>books.broken(a)));}
 });
});
world.beforeEvents.playerInteractWithBlock.subscribe(e=>{
 if(e.block.typeId===ORDO){
  interactions.set(e.player.id,system.currentTick);e.cancel=true;if(!e.isFirstEvent)return;
  const player=e.player,block=e.block,dimension=player.dimension.id,location=block.location;
  system.run(()=>safe(()=>{reader.close(player.id);ordoUi.open(player,()=>player.dimension.id===dimension&&player.dimension.getBlock(location)?.typeId===ORDO&&Math.hypot(player.location.x-location.x,player.location.y-location.y,player.location.z-location.z)<8);},player));return;
 }
 if(e.itemStack?.typeId===ORDO){
  interactions.set(e.player.id,system.currentTick);if(e.player.isSneaking)return;e.cancel=true;if(!e.isFirstEvent)return;
  const player=e.player,slot=player.selectedSlotIndex,dimension=player.dimension.id;
  system.run(()=>safe(()=>{reader.close(player.id);ordoUi.open(player,()=>player.selectedSlotIndex===slot&&player.dimension.id===dimension&&player.getComponent('minecraft:inventory')?.container?.getItem(slot)?.typeId===ORDO);},player));return;
 }
 const own=!!bookByBlock(e.block.typeId),holding=!!bookByItem(e.itemStack?.typeId);
 if(!own&&!holding)return;
 interactions.set(e.player.id,system.currentTick);
 if(!e.isFirstEvent){if(own||!meaningful(e.block))e.cancel=true;return;}
 if(!own&&meaningful(e.block))return;
 if(!own&&e.blockFace!==Direction.Up)return;
 e.cancel=true;
 const player=e.player,a=address(e.block),sneaking=player.isSneaking,slot=player.selectedSlotIndex,raw=e.itemStack?.getDynamicProperty(STATE),type=e.block.typeId,itemType=e.itemStack?.typeId;
 let captured:BookHandle|undefined;
 if(own)try{captured=books.placed(e.block);}catch(error){system.run(()=>report(error,player));return;}
 system.run(()=>safe(()=>{
  if(!player.isValid||player.dimension.id!==a.dimension)return;
  const block=player.dimension.getBlock(a.location);if(!block||block.typeId!==type)return;
  if(own){const h=captured!;if(!books.valid(player,h))return;if(sneaking){books.retrieve(player,h);reader.close(player.id);}else{if(books.canMutate(player))books.setOpen(player,h,true);ordoUi.close(player.id);reader.open(player,h);}}
  else books.place(player,a,slot,raw,!sneaking,itemType);
 },player));
});
world.beforeEvents.playerBreakBlock.subscribe(e=>{
 if(!bookByBlock(e.block.typeId))return;e.cancel=true;const player=e.player;
 let captured:BookHandle;
 try{captured=books.placed(e.block);}catch(error){system.run(()=>report(error,player));return;}
 system.run(()=>safe(()=>{if(books.valid(player,captured)){books.retrieve(player,captured);reader.close(player.id);}},player));
});
world.afterEvents.playerLeave.subscribe(e=>{ordoUi.close(e.playerId);reader.close(e.playerId);poses.clear(e.playerId);interactions.delete(e.playerId);});
world.afterEvents.entityDie.subscribe(e=>{if(e.deadEntity instanceof Player){ordoUi.close(e.deadEntity.id);reader.close(e.deadEntity.id);poses.clear(e.deadEntity.id);}});
world.afterEvents.entityLoad.subscribe(e=>safe(()=>books.reconcileEntity(e.entity)));
world.afterEvents.playerSpawn.subscribe(e=>{ordoUi.close(e.player.id);reader.close(e.player.id);poses.clear(e.player.id);});
world.afterEvents.worldLoad.subscribe(()=>{
 books.load();safe(()=>ordo.read());console.log(`[Evangeliarium] ${VERSION} ready; 4 books + Ordo; 3779 verses; Brazil 2026-2035; stable APIs.`);
 system.runInterval(()=>{safe(()=>books.recover());safe(()=>reader.tick());safe(()=>ordoUi.tick());safe(()=>poses.tick());},10);
});
