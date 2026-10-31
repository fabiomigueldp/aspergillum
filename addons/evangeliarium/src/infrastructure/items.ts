import {EntityComponentTypes,ItemStack, type Player, type Vector3, type ItemLockMode} from '@minecraft/server';
import {decodeState,newState,type BookState} from '../domain/state.ts';
import {ReadingError} from '../domain/scripture.ts';
export const ITEM='evangeliarium:book', BLOCK='evangeliarium:book_stand', VISUAL='evangeliarium:book_visual', STATE='evangeliarium:state';
type Property=string|number|boolean|Vector3;
export interface ItemSnapshot {type:string;name?:string;lore:string[];properties:Record<string,Property>;canPlace:string[];canDestroy:string[];keepOnDeath:boolean;lockMode:ItemLockMode}
let serial=0;
export function freshState():BookState{return newState(`ev-${Date.now().toString(36)}-${Math.floor(Math.random()*0x100000000).toString(36)}-${(++serial).toString(36)}`);}
export function inventory(player:Player){const c=player.getComponent(EntityComponentTypes.Inventory)?.container;if(!c)throw new ReadingError('Inventário indisponível.');return c;}
export function itemState(item:ItemStack|undefined):BookState|undefined{return item?.typeId===ITEM?decodeState(item.getDynamicProperty(STATE)):undefined;}
export function initialize(item:ItemStack):ItemStack{
 if(item.typeId!==ITEM)throw new ReadingError('Segure o evangeliário.');
 const raw=item.getDynamicProperty(STATE);if(raw!==undefined&&!decodeState(raw))throw new ReadingError('Este livro exige outra versão do add-on.');
 if(raw===undefined)item.setDynamicProperty(STATE,JSON.stringify(freshState()));return item;
}
export function withState(item:ItemStack,state:BookState):ItemStack{const copy=item.clone();copy.setDynamicProperty(STATE,JSON.stringify(state));return copy;}
export function snapshot(item:ItemStack):ItemSnapshot{
 const properties:Record<string,Property>={};
 for(const k of item.getDynamicPropertyIds()){const v=item.getDynamicProperty(k);if(v!==undefined)properties[k]=v;}
 const value:ItemSnapshot={type:item.typeId,...(item.nameTag?{name:item.nameTag}:{}),lore:item.getLore(),properties,canPlace:item.getCanPlaceOn(),canDestroy:item.getCanDestroy(),keepOnDeath:item.keepOnDeath,lockMode:item.lockMode};
 // Worst-case UTF-8 budget stays below the world's 32 KiB string-property limit.
 if(JSON.stringify(value).length>7500)throw new ReadingError('Este livro tem dados demais para ser colocado.');return value;
}
export function restore(value:ItemSnapshot):ItemStack{
 if(value.type!==ITEM)throw new Error('Invalid snapshot type');
 const item=new ItemStack(ITEM,1);if(value.name)item.nameTag=value.name;
 item.setLore(value.lore);item.keepOnDeath=value.keepOnDeath;item.lockMode=value.lockMode;
 item.setCanPlaceOn(value.canPlace);item.setCanDestroy(value.canDestroy);
 for(const [k,v]of Object.entries(value.properties))item.setDynamicProperty(k,v);
 if(!itemState(item))throw new Error('Invalid book snapshot');return item;
}
