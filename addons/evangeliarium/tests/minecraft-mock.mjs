export const EntityComponentTypes={Inventory:'inventory',Health:'health',Item:'item',Equippable:'equippable',Riding:'riding'};
export const GameMode={Survival:'Survival',Creative:'Creative',Adventure:'Adventure',Spectator:'Spectator'};
export const EquipmentSlot={Offhand:'Offhand'};
export class ItemStack{
 constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.props={};this.lore=[];this.place=[];this.destroy=[];this.keepOnDeath=false;this.lockMode='none';}
 clone(){const out=new ItemStack(this.typeId,this.amount);Object.assign(out,structuredClone(this));return out;}
 getDynamicProperty(k){return this.props[k];}getDynamicPropertyIds(){return Object.keys(this.props);}setDynamicProperty(k,v){if(v===undefined)delete this.props[k];else this.props[k]=v;}
 getLore(){return this.lore;}setLore(v){this.lore=v;}getCanPlaceOn(){return this.place;}setCanPlaceOn(v){this.place=v;}getCanDestroy(){return this.destroy;}setCanDestroy(v){this.destroy=v;}
}
export class BlockPermutation{
 constructor(type,states={}){this.type=type;this.states=states;}
 static resolve(type,states={}){return new BlockPermutation(type,states);}
 getAllStates(){return{...this.states};}
}
export class Container{
 size=9;slots=new Map();failNextWrite=false;
 getItem(i){return this.slots.get(i)?.clone();}
 setItem(i,item){if(this.failNextWrite){this.failNextWrite=false;throw Error('injected inventory write failure');}if(item)this.slots.set(i,item.clone());else this.slots.delete(i);}
}
class Block{
 constructor(dimension,location){this.dimension=dimension;this.location=location;this.permutation=BlockPermutation.resolve('minecraft:air');}
 get typeId(){return this.permutation.type;}get isAir(){return this.typeId==='minecraft:air';}get isLiquid(){return this.typeId==='minecraft:water';}
 setType(type){this.permutation=BlockPermutation.resolve(type);}
 setPermutation(p){if(this.failNextWrite){this.failNextWrite=false;throw Error('injected block write failure');}this.permutation=p;}
}
class Entity{
 isValid=true;props={};
 constructor(typeId,location,item){this.typeId=typeId;this.location=location;this.item=item;}
 getComponent(id){if(id==='item')return{itemStack:this.item};}
 getDynamicProperty(k){return this.props[k];}setDynamicProperty(k,v){this.props[k]=v;}setProperty(k,v){this.props[k]=v;}setRotation(v){this.rotation=v;}remove(){this.isValid=false;}
}
export class Player{
 isValid=true;selectedSlotIndex=0;inventory=new Container();location={x:0,y:1,z:0};mode=GameMode.Survival;messages=[];
 onScreenDisplay={setActionBar:t=>this.messages.push(t)};
 constructor(id,dimension){this.id=id;this.dimension=dimension;}
 getComponent(id){return id==='inventory'?{container:this.inventory}:id==='health'?{currentValue:20}:undefined;}
 getGameMode(){return this.mode;}getRotation(){return{x:0,y:0};}playAnimation(){}playSound(){}
}
class Dimension{
 blocks=new Map();entities=[];loaded=true;id='minecraft:overworld';
 getBlock(p){if(!this.loaded)return undefined;const key=JSON.stringify(p);if(!this.blocks.has(key))this.blocks.set(key,new Block(this,{...p}));return this.blocks.get(key);}
 spawnEntity(type,location){const e=new Entity(type,location);this.entities.push(e);return e;}
 spawnItem(item,location){const e=new Entity('minecraft:item',location,item.clone());this.entities.push(e);return e;}
 getEntities(q){return this.entities.filter(e=>e.isValid&&(!q.type||q.type===e.typeId)&&(!q.location||Math.hypot(e.location.x-q.location.x,e.location.y-q.location.y,e.location.z-q.location.z)<=q.maxDistance));}
}
export const world={props:new Map(),players:[],dimension:new Dimension(),getAllPlayers(){return this.players;},getDimension(){return this.dimension;},getDynamicPropertyIds(){return[...this.props.keys()];},getDynamicProperty(k){return this.props.get(k);},setDynamicProperty(k,v){if(v===undefined)this.props.delete(k);else this.props.set(k,v);}};
export const system={currentTick:0,run(fn){queueMicrotask(fn);}};
export function reset(){world.props.clear();world.players=[];world.dimension=new Dimension();}
