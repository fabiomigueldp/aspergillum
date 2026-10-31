import {BLOCKS,SHAPES,blockKey} from './voxel-blocks.js';
import {sanctuaryLayout} from './scene-layout.js';
export {BLOCKS,SHAPES,blockKey} from './voxel-blocks.js';
export const SCENERY_REVISION = 4;
export const environmentBack=(width,depth)=>sanctuaryLayout(width,depth).back;

/** Authored Minecraft constructions. Every placement occupies an integer cell. */
export function planEnvironment(id,width=7,depth=2,arrangement=null) {
  if(!['gallery','chapel','studio','transparent'].includes(id))throw Error('Ambiente desconhecido.');
  if(!Number.isInteger(width)||width<1||width>16||!Number.isInteger(depth)||depth<1||depth>8)throw Error('Dimensões inválidas.');
  const cells=new Map(),details=[],chapel=id==='chapel',garden=id==='studio';
  const layout=sanctuaryLayout(width,depth),{left,right,back,height,c1,c2}=layout;
  let currentLayer='architecture';
  const put=(x,y,z,block,shape='cube',layer=currentLayer)=>{
    if(![x,y,z].every(Number.isInteger)||!BLOCKS[block]||!SHAPES[shape])throw Error('Bloco de cenário inválido.');
    cells.set(blockKey(x,y,z),{x,y,z,block,shape,layer});
  };
  const fill=(x0,x1,y0,y1,z0,z1,block,shape='cube')=>{
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)put(x,y,z,block,shape);
  };
  const column=(x,z,top=5)=>{
    put(x,-1,z,garden?'stone':chapel?'darkOak':'andesite');
    put(x,0,z,chapel?'darkOak':'chiseled');
    fill(x,x,1,top-1,z,z,chapel?'log':'pillar');
    put(x,top,z,chapel?'darkOak':'chiseled');
  };
  const arch=(x0,x1,z,spring=3,material=chapel?'darkOak':'smooth')=>{
    column(x0,z,spring-1);column(x1,z,spring-1);
    const crown=spring+Math.floor((x1-x0)/2);
    // Spandrels connect each stepped haunch to the crown; no floating diagonals.
    for(const x of [x0,x1])fill(x,x,spring,crown,z,z,material);
    for(let step=1;step<=(x1-x0)/2;step++){
      const a=x0+step,b=x1-step,y=spring+step-1;
      if(a===b)put(a,y,z,material);else{put(a,y,z,material,'archEast');put(b,y,z,material,'archWest');}
      for(const x of new Set([a,b]))fill(x,x,y+1,crown,z,z,material);
    }
    return crown;
  };
  const planter=(x,z,flowering=true)=>{
    put(x,0,z,chapel?'terracotta':'chiseled');
    put(x,1,z,flowering?'flowers':'leaf');
  };
  const windowAt=(x,z)=>{
    for(let dx=-1;dx<=1;dx++)for(let y=1;y<=4;y++){
      put(x+dx,y,z,(dx===0&&y>=2)||y===1?'amberGlass':'blueGlass','paneZ');
    }
    for(const dx of [-1,1])put(x+dx,4,z,chapel?'darkOak':'smooth',dx<0?'archEast':'archWest');
    put(x,5,z,chapel?'darkOak':'chiseled');
    fill(x-1,x+1,0,0,z-1,z-1,chapel?'darkOak':'smooth','upperSlab');
  };
  const tree=(x,z)=>{
    fill(x,x,-1,4,z,z,'log');
    for(let y=3;y<=6;y++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      if((y===6&&(Math.abs(dx)>1||Math.abs(dz)>1))||(Math.abs(dx)===2&&Math.abs(dz)===2)||(!dx&&!dz&&y<5))continue;
      put(x+dx,y,z+dz,'leaf');
    }
  };
  const result=()=>({cells:[...cells.values()],details,offset:[-width/2,0,-depth/2],background:id==='transparent'?null:0xa5c9ed,
    revision:SCENERY_REVISION,layout:{...layout,altarClearance:1},landmarks:{planters:[],lamps:[]}});
  if(id==='transparent')return result();

  // Ground has a real boundary between the building, paths and planted surroundings.
  for(let x=left-28;x<=right+28;x++)for(let z=-42;z<=back+28;z++){
    let floor='grass';
    if(x>=left&&x<=right&&z>=-16&&z<=back+2){
      floor=chapel?'spruce':garden?'stoneSlab':'sandstone';
      if(x===left||x===right||z===-16||z===back+2)floor=chapel?'darkOak':'andesite';
      if(!chapel&&!garden&&(x-left)%4===0&&(z+16)%4===0)floor='andesite';
    }
    put(x,-2,z,floor);
  }
  // A continuous sanctuary supports the altar, credence, seats and lateral candles.
  fill(left+1,right-1,-1,-1,-3,back-1,chapel?'darkOak':'andesite','slab');
  fill(left+1,right-1,-1,-1,-2,back-1,chapel?'oak':garden?'stoneSlab':'smooth');
  for(let x=left+1;x<right;x++)put(x,-1,-2,chapel?'oak':garden?'stoneSlab':'smooth','stairNorth');
  // Nosing and a narrow perimeter band articulate the raised floor without isolated pads.
  for(const x of [left+1,right-1])for(let z=-1;z<back;z++)put(x,-1,z,chapel?'darkOak':'andesite');
  for(let x=c1-1;x<=c2+1;x++)for(let z=-16;z<=-4;z++)put(x,-1,z,garden?'stoneSlab':chapel?'green':'red',garden?'slab':'carpet');

  if(!garden){
    // Enclosed apse and return walls remove the former flat wall in an empty sky.
    currentLayer='apse';
    fill(left,right,-1,height-1,back,back,chapel?'sandstone':'quartzBricks');
    for(const x of [left,right]){
      currentLayer=x===left?'wall-left':'wall-right';
      fill(x,x,-1,height-1,-16,back,chapel?'sandstone':'quartzBricks');
      fill(x,x,-1,0,-16,back,chapel?'darkOak':'stoneSlab');
      for(let z=-12;z<back;z+=4){
        fill(x,x,1,height-1,z,z,chapel?'log':'pillar');
        for(let dz=1;dz<=2;dz++)for(let y=2;y<=4;y++)put(x,y,z+dz,chapel?'amberGlass':'blueGlass','paneX');
      }
      // Recessed glowstone sits in the wall, clear of windows and the main sightline.
      for(const z of [-2,depth+4]){
        put(x,3,z,'light');put(x,2,z,chapel?'darkOak':'chiseled');put(x,4,z,chapel?'darkOak':'chiseled');
      }
    }
    currentLayer='apse';
    // A central retable and two framed windows give the altar a clear visual axis.
    fill(c1-2,c2+2,1,6,back,back,chapel?'darkOak':'redClay');
    arch(c1-3,c2+3,back-1,4);
    if(!arrangement?.active){
      fill(c1,c2,2,5,back-1,back-1,chapel?'oak':'gold');
      fill(c1-1,c2+1,4,4,back-1,back-1,chapel?'oak':'gold');
    }
    const wx=layout.windowLeft;
    windowAt(wx,back);windowAt(width-1-wx,back);
    for(const x of [left,right,c1-3,c2+3])column(x,back-1,6);
    fill(left,right,0,0,back-1,back-1,chapel?'darkOak':'stoneSlab');
    fill(left,right,7,7,back-1,back-1,chapel?'darkOak':'smooth','upperSlab');

    currentLayer='architecture';
    // Coffers in the presbytery; visible timber rafters and a pitched roof in the chapel.
    for(let x=left;x<=right;x++)for(let z=-16;z<=back;z++){
      const roofY=chapel?height+Math.floor(Math.min(x-left,right-x)/2):height;
      put(x,roofY,z,chapel?'spruce':'smooth','slab','roof');
      if(chapel){
        put(x,roofY-1,z,'spruce','cube','roof');
        if(z===back){currentLayer='apse';fill(x,x,height,roofY-2,z,z,'sandstone');currentLayer='architecture';}
      }
      if(z%4===0||x===left||x===right)put(x,roofY-(chapel?2:1),z,chapel?'log':'chiseled','cube','roof');
    }
    if(!chapel)for(let x=left+4;x<right;x+=4)for(let z=-16;z<=back;z++)put(x,height-1,z,'smooth','cube','roof');
    // Real stair-block benches frame the processional aisle in wider views.
    for(const z of [-6,-9,-12])for(const [a,b]of [[left+2,c1-3],[c2+3,right-2]]){
      fill(a,b,-1,-1,z,z,chapel?'spruce':'darkOak','stairSouth');
      put(a,-1,z,'darkOak');put(b,-1,z,'darkOak');
    }
  }else{
    // Three linked cloister arches, with side galleries and vegetation beyond the openings.
    const supports=[left,c1-3,c2+3,right];
    const crown=3+Math.floor(Math.max(...supports.slice(1).map((x,i)=>x-supports[i]))/2);
    for(let i=0;i<supports.length-1;i++){
      const top=arch(supports[i],supports[i+1],back,3);
      fill(supports[i],supports[i+1],top+1,crown,back,back,'smooth');
    }
    for(let x=left;x<=right;x++){
      put(x,-1,back,'stone');put(x,0,back,'stone');
      put(x,crown+1,back,'stoneSlab','slab');put(x,crown+1,back+1,'stoneSlab','slab');
    }
    for(const x of [left,right]){
      for(const z of [-1,3,7])column(x,z,crown);
      fill(x,x,crown+1,crown+1,-2,back,'stoneSlab','slab');
      for(let z=0;z<=depth+3;z++)if(z!==3&&z!==7){put(x,-1,z,'stone');put(x,0,z,arrangement?.active||z%2?'leaf':'flowers');}
    }
    for(const x of [left-2,right+2]){tree(x,back+4);tree(x,back+10);}
    fill(left-3,right+3,-1,0,back+6,back+6,'leaf');
    for(const x of [left+1,right-1])for(let z=0;z<=depth+3;z++)put(x,-2,z,'grass');
    // Low, framed parterres give the cloister a forecourt while keeping the axis open.
    for(const [a,b]of [[c1-5,c1-3],[c2+3,c2+5]]){
      fill(a-1,b+1,-1,-1,-12,-5,'stoneSlab','slab');
      for(let x=a;x<=b;x++)for(let z=-11;z<=-6;z++){
        put(x,-2,z,'grass');
        if(x===a||x===b||z===-11||z===-6)put(x,-1,z,'leaf');
        else cells.delete(blockKey(x,-1,z));
      }
    }
  }

  // An ambo constructed with a foot, shaft and slab head; outside the altar/candle zone.
  const [ax,az]=layout.amboCell;
  put(ax,0,az,'darkOak','amboStem');put(ax,1,az,'darkOak','amboHead');
  // Three chairs face the nave. The central back is higher, without occupying the axis.
  for(const [i,[x,z]]of layout.chairCells.entries()){
    put(x,0,z,'darkOak','chair');
    details.push({x,y:0,z,block:'red',shape:'chairCushion',layer:'furniture'});
    if(i===1)put(x,1,z,'darkOak','chairCrown');
  }

  // Decoration sits behind and outside the altar footprint, never on its working surface.
  if(arrangement?.active){
    for(const support of arrangement.supports){
      if(support.role==='flower-tray'){
        const block=chapel?'darkOak':garden?'stone':'smooth';
        for(const [dx,dz,shape]of [[-1,-1,'trayNW'],[0,-1,'trayNE'],[-1,0,'traySW'],[0,0,'traySE']])put(support.x+dx,0,support.z+dz,block,shape);
        continue;
      }
      for(let y=-1;y<support.height-1;y++)put(support.x,y,support.z,chapel?'darkOak':y===-1?'andesite':'chiseled');
      if(support.role==='image'&&!garden){
        // A framed niche replaces the empty lower bay behind the image.
        currentLayer='apse';
        const frameZ=support.z+1;
        for(const x of [support.x-1,support.x+1])fill(x,x,0,2,frameZ,frameZ,chapel?'log':'pillar');
        put(support.x-1,3,frameZ,chapel?'darkOak':'smooth','archEast');
        put(support.x+1,3,frameZ,chapel?'darkOak':'smooth','archWest');
        put(support.x,3,frameZ,chapel?'darkOak':'chiseled');
        fill(support.x-1,support.x+1,1,2,back,back,chapel?'darkOak':'redClay');
        currentLayer='architecture';
      }
    }
  }else{
    planter(-2,depth+1);planter(width+1,depth+1);
  }
  // A small garden border closes the exterior edge seen through windows and arcades.
  for(const x of [left-2,right+2])fill(x,x,-1,-1,-2,back+1,'leaf');
  const scene=result();scene.landmarks=arrangement?.active?{planters:[],lamps:[]}:{planters:[[-2,depth+1],[width+1,depth+1]],lamps:[]};
  return scene;
}
