import {BOOKS,bookByItem,bookByBlock,bookByVisual,bookDefinition,type BookId} from '../domain/catalog.ts';
import {BlockPermutation,EntityComponentTypes,GameMode,ItemStack,world,type Block,type Player,type Vector3,type Entity} from '@minecraft/server';
import {Locks,revise,sameBook,decodeState,selectionAllowed,type BookState,type Selection} from '../domain/state.ts';
import {ReadingError} from '../domain/scripture.ts';
import {transfer} from '../application/transfer.ts';
import {STATE,inventory,itemState,initialize,withState,snapshot,restore,freshState,type ItemSnapshot} from './items.ts';
export interface Address {dimension:string;location:Vector3}
export type BookHandle=({kind:'held';slot:number}|{kind:'placed';address:Address})&{book:BookId;state:BookState};
interface Record extends Address {schema:1;phase:'placing'|'placed'|'taking'|'dropping';owner?:string;slot?:number;snapshot:ItemSnapshot;open:boolean;direction:number}
const PREFIX='evangeliarium:placed_';
export function address(block:Block):Address{return{dimension:block.dimension.id,location:{...block.location}};}
export function addressKey(a:Address){return PREFIX+a.dimension.replace('minecraft:','')+'_'+a.location.x+'_'+a.location.y+'_'+a.location.z;}
export function action(player:Player,text:string){if(player.isValid)player.onScreenDisplay.setActionBar(text);}
export function report(error:unknown,player?:Player){if(player&&error instanceof ReadingError)action(player,error.message);else console.warn('[Evangeliarium] '+String(error));}
export function meaningful(block:Block):boolean{
 if(!block.typeId.startsWith('minecraft:'))return true;
 return /(?:chest|barrel|shulker|door|fence_gate|button|lever|crafting|furnace|smoker|lectern|enchanting|anvil|bed$|beacon|brewing|jukebox|note_?block|loom|stonecutter|cartography|smithing|grindstone|composter|cauldron|campfire|bell|hopper|dispenser|dropper|command_block|structure_block|jigsaw|respawn_anchor)/.test(block.typeId);
}
export function supportAllowed(block:Block|undefined):boolean{
 if(!block||block.isAir||block.isLiquid||meaningful(block))return false;
 // Start with full vanilla cubes; custom shapes need a separately authored placement policy.
 if(!block.typeId.startsWith('minecraft:')||/(?:slab|stairs|fence|wall|pane|carpet|snow_layer|leaves|glass$|path|farmland|cactus|bamboo|rail|trapdoor|chain|lantern|sculk_sensor|sculk_shrieker|honey_block|light_block)/.test(block.typeId))return false;
 return /(?:^|_)(?:stone|cobblestone|granite|diorite|andesite|deepslate|tuff|calcite|basalt|blackstone|obsidian|bedrock|dirt|grass_block|grass|podzol|mycelium|nylium|sand|gravel|clay|bricks|brick_block|terracotta|concrete|concrete_powder|wool|planks|log|wood|stem|hyphae|ore|block)$/.test(block.typeId.slice(10));
}
function mutable(player:Player){const mode=player.getGameMode();if(mode!==GameMode.Survival&&mode!==GameMode.Creative)throw new ReadingError('Apenas leitura neste modo de jogo.');}
function closeEnough(player:Player,a:Address){return player.dimension.id===a.dimension&&Math.hypot(player.location.x-a.location.x-.5,player.location.y-a.location.y,player.location.z-a.location.z-.5)<=6;}
export class Books {
 private records=new Map<string,Record>();private locks=new Locks();private cursor=0;
 load(){for(const k of world.getDynamicPropertyIds())if(k.startsWith(PREFIX)){try{const value=JSON.parse(String(world.getDynamicProperty(k)));if(value.schema===1&&bookByItem(value.snapshot?.type)){this.stateOf(value);this.records.set(k,value);}else console.warn('[Evangeliarium] Unsupported registry record retained: '+k);}catch(e){report(e);}}}
 private save(key:string,r:Record){world.setDynamicProperty(key,JSON.stringify(r));this.records.set(key,r);}
 private erase(key:string){world.setDynamicProperty(key,undefined);this.records.delete(key);}
 private getBlock(a:Address):Block|undefined{try{return world.getDimension(a.dimension).getBlock(a.location);}catch{return undefined;}}
 private definition(r:Record){const book=bookByItem(r.snapshot.type);if(!book)throw new ReadingError('Livro indisponível.');return book;}
 private blockPermutation(r:Record,visual=false){return BlockPermutation.resolve(this.definition(r).blockId,{'evangeliarium:open':r.open,'evangeliarium:visual':visual,'evangeliarium:direction':r.direction});}
 private stateOf(r:Record):BookState{const s=decodeState(r.snapshot.properties[STATE]);if(!s||!selectionAllowed(this.definition(r).bookId,s.selection))throw new ReadingError('Livro indisponível.');return s;}
 private assertHeld(player:Player,h:Extract<BookHandle,{kind:'held'}>){if(player.selectedSlotIndex!==h.slot||inventory(player).getItem(h.slot)?.typeId!==bookDefinition(h.book).id||!sameBook(itemState(inventory(player).getItem(h.slot)),h.state))throw new ReadingError('O livro mudou de lugar.');}
 held(player:Player):Extract<BookHandle,{kind:'held'}>{
  if(player.getGameMode()===GameMode.Spectator)throw new ReadingError('Ação indisponível neste modo de jogo.');
  const c=inventory(player),slot=player.selectedSlotIndex,item=c.getItem(slot);const definition=bookByItem(item?.typeId);if(!item||!definition)throw new ReadingError('Segure um livro litúrgico.');
  const raw=item.getDynamicProperty(STATE);initialize(item);let s=itemState(item)!;
  // Creative copy and duplicated inventory instances receive a new identity, preserving the bookmark.
  let duplicate=[...this.records.values()].some(r=>r.phase==='placed'&&this.stateOf(r).instanceId===s.instanceId);
  if(!duplicate)for(const other of world.getAllPlayers()){
   const inv=inventory(other);
   for(let i=0;i<inv.size;i++)if((other.id<player.id||other.id===player.id&&i<slot)&&itemState(inv.getItem(i))?.instanceId===s.instanceId){duplicate=true;break;}
   if(duplicate)break;
  }
  if(duplicate){s={...s,instanceId:freshState().instanceId};item.setDynamicProperty(STATE,JSON.stringify(s));}
  if(raw!==item.getDynamicProperty(STATE))c.setItem(slot,item);
  return{kind:'held',slot,book:definition.bookId,state:s};
 }
 placed(block:Block):Extract<BookHandle,{kind:'placed'}>{
  const a=address(block),r=this.records.get(addressKey(a));if(!r||r.phase!=='placed'||block.typeId!==this.definition(r).blockId)throw new ReadingError('Livro indisponível.');
  return{kind:'placed',address:a,book:this.definition(r).bookId,state:this.stateOf(r)};
 }
 valid(player:Player,h:BookHandle):boolean{
  try{if(!player.isValid||player.getGameMode()===GameMode.Spectator||player.getComponent(EntityComponentTypes.Health)?.currentValue===0)return false;
   if(h.kind==='held'){this.assertHeld(player,h);return true;}
   const r=this.records.get(addressKey(h.address));return closeEnough(player,h.address)&&r?.phase==='placed'&&this.getBlock(h.address)?.typeId===bookDefinition(h.book).blockId&&this.definition(r).bookId===h.book&&sameBook(this.stateOf(r),h.state);
  }catch{return false;}
 }
 private validate(player:Player,h:BookHandle){if(!this.valid(player,h))throw new ReadingError('O livro mudou de lugar.');}
 place(player:Player,base:Address,slot:number,expectedRaw:unknown,open:boolean,expectedType?:string){
  mutable(player);if(player.selectedSlotIndex!==slot)return;
  const current=inventory(player).getItem(slot);if(!bookByItem(current?.typeId)||!current||expectedType!==undefined&&current.typeId!==expectedType||expectedRaw!==undefined&&current.getDynamicProperty(STATE)!==expectedRaw)return;
  const h=this.held(player);const a={dimension:base.dimension,location:{x:base.location.x,y:base.location.y+1,z:base.location.z}};const key=addressKey(a);
  this.locks.run(['p:'+player.id,key],()=>{
   const c=inventory(player),item=c.getItem(slot)!,snap=snapshot(item);
   const r:Record={...a,schema:1,phase:'placing',owner:player.id,slot,snapshot:snap,open,direction:((Math.round(player.getRotation().y/90)%4)+4)%4};
   const b=this.getBlock(a),support=this.getBlock(base);
   transfer({validate:()=>{this.assertHeld(player,h);if(!closeEnough(player,a)||!b?.isAir||!supportAllowed(support)||this.records.has(key)||world.getDynamicProperty(key)!==undefined)throw new ReadingError('Use uma superfície livre e plana.');},
    prepare:()=>this.save(key,r),removeSource:()=>c.setItem(slot,undefined),writeDestination:()=>b!.setPermutation(this.blockPermutation(r)),commit:()=>this.save(key,{...r,phase:'placed'}),
    clearDestination:()=>{if(b?.typeId===this.definition(r).blockId)b.setType('minecraft:air');},restoreSource:()=>{if(c.getItem(slot))throw Error('Rollback slot occupied; journal retained');c.setItem(slot,item);},abort:()=>this.erase(key)});
   this.reconcileBlock(b!);this.sound(player,'item.book.put');
   try{player.playAnimation('animation.evangeliarium.player.place',{blendOutTime:.15});}catch{}
  });
 }
 retrieve(player:Player,h:BookHandle){
  if(h.kind!=='placed')return;mutable(player);this.validate(player,h);const key=addressKey(h.address);
  this.locks.run(['p:'+player.id,key],()=>{
   this.validate(player,h);const r=this.records.get(key)!,b=this.getBlock(h.address)!,c=inventory(player);
   let slot=c.getItem(player.selectedSlotIndex)===undefined?player.selectedSlotIndex:-1;
   if(slot<0)for(let i=0;i<c.size;i++)if(c.getItem(i)===undefined){slot=i;break;}
   if(slot<0)throw new ReadingError('Inventário cheio.');
   const item=restore(r.snapshot);
   transfer({validate:()=>this.validate(player,h),prepare:()=>this.save(key,{...r,phase:'taking',owner:player.id,slot}),removeSource:()=>b.setType('minecraft:air'),writeDestination:()=>{if(c.getItem(slot))throw Error('Destination occupied');c.setItem(slot,item);},commit:()=>this.erase(key),
    clearDestination:()=>{if(itemState(c.getItem(slot))?.instanceId===h.state.instanceId)c.setItem(slot,undefined);},restoreSource:()=>{if(!b.isAir&&b.typeId!==this.definition(r).blockId)throw Error('Rollback target occupied; journal retained');b.setPermutation(this.blockPermutation(r));},abort:()=>this.save(key,r)});
   this.removeVisuals(h.address);this.sound(player,'item.book.put');
  });
 }
 select(player:Player,h:BookHandle,selection:Selection):BookHandle{
  mutable(player);this.validate(player,h);if(!selectionAllowed(h.book,selection))throw new ReadingError('Seleção inválida para este livro.');const updated=revise(h.state,selection);
  const result=this.locks.run(['p:'+player.id,h.kind==='placed'?addressKey(h.address):'i:'+h.state.instanceId],()=>{
   this.validate(player,h);
   if(h.kind==='held'){const c=inventory(player);c.setItem(h.slot,withState(c.getItem(h.slot)!,updated));}
   else{const k=addressKey(h.address),r=this.records.get(k)!;this.save(k,{...r,snapshot:snapshot(withState(restore(r.snapshot),updated))});}
   return{...h,state:updated};
  });
  if(!result)throw new ReadingError('Tente novamente.');return result;
 }
 setOpen(player:Player,h:BookHandle,open:boolean):BookHandle{
  if(h.kind!=='placed')return h;this.validate(player,h);mutable(player);
  const key=addressKey(h.address),r=this.records.get(key)!;
  this.save(key,{...r,open});const b=this.getBlock(h.address)!;b.setPermutation(BlockPermutation.resolve(this.definition(r).blockId,{...b.permutation.getAllStates(),'evangeliarium:open':open}));this.reconcileBlock(b);this.sound(player,'item.book.page_turn');return h;
 }
 isOpen(h:BookHandle){return h.kind==='placed'&&this.records.get(addressKey(h.address))?.open===true;}
 canMutate(player:Player){return player.getGameMode()===GameMode.Creative||player.getGameMode()===GameMode.Survival;}
 private visuals(a:Address):Entity[]{return BOOKS.flatMap(book=>world.getDimension(a.dimension).getEntities({type:book.visualId,location:{x:a.location.x+.5,y:a.location.y,z:a.location.z+.5},maxDistance:2})).filter(e=>e.isValid&&e.getDynamicProperty('evangeliarium:anchor')===addressKey(a));}
 private removeVisuals(a:Address){try{for(const e of this.visuals(a))e.remove();}catch(e){report(e);}}
 reconcileBlock(block:Block){
  const definition=bookByBlock(block.typeId);if(!definition)return;const a=address(block),key=addressKey(a);let r=this.records.get(key);
  if(!r){
   if(world.getDynamicProperty(key)!==undefined)throw new ReadingError('Registro de outra versão preservado.');
   // A block made with /setblock starts a new physical book; no generated loot template.
   const item=initialize(new ItemStack(definition.id));r={...a,schema:1,phase:'placed',snapshot:snapshot(item),open:Boolean(block.permutation.getAllStates()['evangeliarium:open']),direction:Number(block.permutation.getAllStates()['evangeliarium:direction'])};this.save(key,r);
  }
  if(r.phase!=='placed'||this.definition(r).blockId!==block.typeId)return;
  if(!supportAllowed(this.getBlock({...a,location:{...a.location,y:a.location.y-1}}))){this.drop(key,r);return;}
  try{
   const entities=this.visuals(a);for(const wrong of entities.filter(e=>e.typeId!==definition.visualId))wrong.remove();let e=entities.find(e=>e.isValid);if(e)entities.splice(entities.indexOf(e),1);for(const duplicate of entities)if(duplicate.isValid)duplicate.remove();
   if(!e){e=block.dimension.spawnEntity(definition.visualId,{x:a.location.x+.5,y:a.location.y,z:a.location.z+.5});e.setDynamicProperty('evangeliarium:anchor',key);e.setRotation({x:0,y:r.direction*90});}
   e.setProperty('evangeliarium:open',r.open);
   if(block.permutation.getAllStates()['evangeliarium:visual']!==true)block.setPermutation(BlockPermutation.resolve(definition.blockId,{...block.permutation.getAllStates(),'evangeliarium:visual':true}));
  }catch(error){if(block.permutation.getAllStates()['evangeliarium:visual']===true)block.setPermutation(BlockPermutation.resolve(definition.blockId,{...block.permutation.getAllStates(),'evangeliarium:visual':false}));report(error);}
 }
 private drop(key:string,r:Record){
  this.locks.run([key],()=>{
   const b=this.getBlock(r);if(!b)return;
   this.save(key,{...r,phase:'dropping'});
   if(b.typeId===this.definition(r).blockId)b.setType('minecraft:air');
   const dimension=world.getDimension(r.dimension),location={x:r.location.x+.5,y:r.location.y+.12,z:r.location.z+.5};
   const existing=dimension.getEntities({type:'minecraft:item',location,maxDistance:4}).some(e=>itemState(e.getComponent(EntityComponentTypes.Item)?.itemStack)?.instanceId===this.stateOf(r).instanceId);
   if(!existing)dimension.spawnItem(restore(r.snapshot),location);
   this.erase(key);this.removeVisuals(r);
  });
 }
 recover(){
  const entries=[...this.records.entries()];
  for(let i=0;i<Math.min(entries.length,16);i++){
   const [key,r]=entries[this.cursor++%entries.length]!;
   try{
    const b=this.getBlock(r);if(!b)continue;
    if(r.phase==='placed'){if(b.typeId===this.definition(r).blockId)this.reconcileBlock(b);else this.drop(key,r);continue;}
    if(r.phase==='dropping'){this.drop(key,r);continue;}
    const owner=world.getAllPlayers().find(p=>p.id===r.owner);if(!owner)continue;
    const c=inventory(owner),id=this.stateOf(r).instanceId;let found=false;
    for(let s=0;s<c.size;s++)if(itemState(c.getItem(s))?.instanceId===id){found=true;break;}
    if(found){if(b.typeId===this.definition(r).blockId)b.setType('minecraft:air');this.erase(key);this.removeVisuals(r);}
    else if(b.isAir||b.typeId===this.definition(r).blockId){b.setPermutation(this.blockPermutation(r));this.save(key,{...r,phase:'placed'});this.reconcileBlock(b);}
    else this.drop(key,r);
   }catch(e){report(e);}
  }
 }
 reconcileEntity(e:Entity){
  // A queued load event may outlive a visual removed during reconciliation.
  if(!e.isValid||!bookByVisual(e.typeId))return;const key=e.getDynamicProperty('evangeliarium:anchor');
  // An interrupted spawn without an anchor is disposable; the block recreates it.
  if(typeof key!=='string'||!this.records.has(key)){e.remove();return;}
  const r=this.records.get(key)!;const b=this.getBlock(r);if(b&&(b.typeId!==this.definition(r).blockId||e.typeId!==this.definition(r).visualId))e.remove();
 }
 broken(a:Address){const key=addressKey(a),r=this.records.get(key);if(r?.phase==='placed')this.drop(key,r);}
 sound(player:Player,sound:string){try{player.playSound(sound,{volume:.35,pitch:1});}catch{}}
}
