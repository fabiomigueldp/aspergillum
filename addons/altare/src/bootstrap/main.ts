import { Direction, system, world } from '@minecraft/server';
import { neighbor,positionKey,isolatedTile,pendingTile } from '../domain/surface.ts';
import { ALTAR,TOOL,BedrockSurfacePort,tilePermutation } from '../infrastructure/surface-port.ts';
import {isAltarId,designById} from '../domain/catalog.ts';
import {tell} from '../presentation/menu.ts';
import { edit,sessions } from '../infrastructure/editor.ts';

const faces=[Direction.North,Direction.East,Direction.South,Direction.West];
system.beforeEvents.startup.subscribe(({blockComponentRegistry})=>{
  blockComponentRegistry.registerCustomComponent('altare:surface',{
    beforeOnPlayerPlace(event){
      const id=event.permutationToPlace.type.id,native=designById(id)?.codec==='native';
      if(id!==ALTAR&&!native)return;
      const port=new BedrockSurfacePort(event.dimension);
      const neighbors=[0,1,2,3].map(i=>port.read(neighbor(event.block.location,i)));
      // Unknown is never air: do not inherit a global pose across unloaded data.
      if(neighbors.some(t=>t===undefined)){event.cancel=true;const player=event.player;if(player)system.run(()=>tell(player,'error.unloaded'));return;}
      const adjacent=neighbors.filter(t=>!!t);
      const provisional=adjacent.length>0&&(native||adjacent.some(t=>designById(t!.design)?.codec==='native'));
      if(provisional){
        event.permutationToPlace=tilePermutation(pendingTile(event.block.location));
        const player=event.player;if(player)system.run(()=>tell(player,'placement.pending'));
        return;
      }
      if(id===ALTAR&&adjacent[0])event.permutationToPlace=tilePermutation(isolatedTile(adjacent[0],event.block.location));
      // An isolated explicit native item uses the versioned 1×1/front0 default.

    },
    onPlace({block,dimension}){
      const p={...block.location};sessions.invalidate(dimension.id,positionKey(p));
      new BedrockSurfacePort(dimension).reconcileAround(p);
    },
    onBreak({block,dimension}){
      const p={...block.location};sessions.invalidate(dimension.id,positionKey(p));
      system.run(()=>new BedrockSurfacePort(dimension).reconcileAround(p));
    },
    onTick({block,dimension}){new BedrockSurfacePort(dimension).reconcile(block.location);},
  });
});

// Cancel only our explicit finishing tool. Native placement on the tabletop is untouched.
world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  if(event.cancel||!isAltarId(event.block.typeId)||event.itemStack?.typeId!==TOOL)return;
  event.cancel=true;if(!event.isFirstEvent)return;
  const player=event.player,dimension=event.block.dimension,position={...event.block.location};
  const i=faces.indexOf(event.blockFace);
  const face=i>=0?i:undefined;
  system.run(()=>{void edit(player,dimension,position,face);});
});
world.afterEvents.playerLeave.subscribe(e=>sessions.releasePlayer(e.playerId));
world.afterEvents.playerDimensionChange.subscribe(e=>sessions.releasePlayer(e.player.id));
world.afterEvents.playerSpawn.subscribe(e=>sessions.releasePlayer(e.player.id));
world.afterEvents.entityDie.subscribe(e=>sessions.releasePlayer(e.deadEntity.id));
