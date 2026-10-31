import { Direction, system, world } from '@minecraft/server';
import { neighbor,positionKey,isolatedTile } from '../domain/surface.ts';
import { ALTAR,TOOL,BedrockSurfacePort,tileFromBlock,tilePermutation } from '../infrastructure/surface-port.ts';
import {isAltarId} from '../domain/catalog.ts';
import { edit,sessions } from '../infrastructure/editor.ts';

const faces=[Direction.North,Direction.East,Direction.South,Direction.West];
system.beforeEvents.startup.subscribe(({blockComponentRegistry})=>{
  blockComponentRegistry.registerCustomComponent('altare:surface',{
    beforeOnPlayerPlace(event){
      // Generic modules extend the adjacent design; explicit design items retain their identity.
      if(event.permutationToPlace.type.id!==ALTAR)return;
      const port=new BedrockSurfacePort(event.dimension);
      for(let i=0;i<4;i++){
        const t=port.read(neighbor(event.block.location,i));if(!t)continue;
        event.permutationToPlace=tilePermutation(isolatedTile(t,event.block.location));
        break;
      }
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
  const i=faces.indexOf(event.blockFace),tile=tileFromBlock(event.block);
  const face=i>=0?i:tile?.facing;
  system.run(()=>{void edit(player,dimension,position,face);});
});
world.afterEvents.playerLeave.subscribe(e=>sessions.releasePlayer(e.playerId));
world.afterEvents.playerDimensionChange.subscribe(e=>sessions.releasePlayer(e.player.id));
world.afterEvents.playerSpawn.subscribe(e=>sessions.releasePlayer(e.player.id));
world.afterEvents.entityDie.subscribe(e=>sessions.releasePlayer(e.deadEntity.id));
