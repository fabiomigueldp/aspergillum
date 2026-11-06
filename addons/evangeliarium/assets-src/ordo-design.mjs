/** Original pixel-authored sacristy desk calendar. No date is painted: world Ordo owns time. */
import {PNG} from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
export const ATLAS=128;
export const tiles={wood:[2,2,40,40],paper:[46,2,40,48],edge:[90,2,16,16],red:[90,22,16,16],brass:[110,2,12,12],pageSide:[2,54,4,40],pageEnd:[10,54,40,4]};
const faces=['north','south','east','west','up','down'];
// Four atlas texels per Bedrock pixel on timber, including thin end faces.
// Reusing the full wood tile on every face stretches grain by up to 30×.
const uv=(tile,size,face)=>{
 const axes=face==='up'||face==='down'?[0,2]:face==='east'||face==='west'?[2,1]:[0,1];
 const density=tile==='wood'?axes.map(i=>Math.max(1,size[i]*4))
  :tile==='pageSide'?[Math.max(1,size[2]*8),size[1]*4]
  :tile==='pageEnd'?[size[0]*4,Math.max(1,size[2]*8)]:tiles[tile].slice(2);
 return {uv:tiles[tile].slice(0,2),uv_size:density};
};
const cube=(origin,size,tile,overrides={})=>({origin,size,uv:Object.fromEntries(faces.map(f=>[f,uv(overrides[f]??tile,size,f)]))});
const paperEdges={east:'pageSide',west:'pageSide',up:'pageEnd',down:'pageEnd'};
export function geometry(){return {format_version:'1.16.0','minecraft:geometry':[{description:{identifier:'geometry.ordo_calendar',texture_width:ATLAS,texture_height:ATLAS,visible_bounds_width:1.4,visible_bounds_height:1,visible_bounds_offset:[0,.4,0]},bones:[
{name:'root',pivot:[0,0,0],cubes:[cube([-5,0,-3],[10,.9,6],'wood'),cube([-4.7,.9,-2.7],[9.4,.35,5.4],'wood'),{...cube([-3.2,1.25,1.5],[6.4,5.4,.55],'wood'),pivot:[0,1.25,1.5],rotation:[19,0,0]}]},
{name:'calendar',parent:'root',pivot:[0,1.25,-1.1],rotation:[-10,0,0],cubes:[
 cube([-4.3,1.25,-1.1],[8.6,9.6,.55],'wood'),
 // A thin printed leaf sits on the slightly revealed pad, rather than one slab.
 cube([-4,1.6,-1.44],[8,8.9,.08],'edge',{...paperEdges,north:'paper'}),
 cube([-4.05,1.55,-1.36],[8.1,8.95,.25],'edge',paperEdges),
 cube([-2.75,10.15,-1.61],[.35,.65,.63],'brass'),cube([2.4,10.15,-1.61],[.35,.65,.63],'brass'),
 cube([2.8,1.3,-1.53],[.7,3.1,.12],'red'),
]}
]}]};}
const letters={O:['111','101','101','101','111'],R:['110','101','110','101','101'],D:['110','101','101','101','110']};
function painted(tile,x,y){
 if(tile==='wood'){
  // Quiet lengthwise grain, without full-width bands or repeating diagonal checks.
  const strand=[3,12,23,34].some((line,i)=>x===line+((Math.floor((y+i*5)/13)%3)===1?1:0));
  const grain=(strand?-6:0)+((x*7+y*11)%23===0?2:0);
  return[79+grain,57+grain*.7,40+grain*.4];
 }
 if(tile==='edge')return[231,222,198];
 // Strata follow page depth: vertical on the sides, horizontal at top/bottom.
 if(tile==='pageSide'||tile==='pageEnd')return(tile==='pageSide'?x:y)%2===0?[233,225,204]:[202,190,163];
 if(tile==='red')return x<3?[121,26,34]:[159,37,43];
 if(tile==='brass')return x<3||y<2?[204,173,95]:[157,124,61];
 let c=[242,235,214];
 // Printed ruled header and deliberately non-date-specific calendar cells.
 if(y===12&&x>=4&&x<36)c=[153,44,44];
 for(let l=0;l<4;l++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(letters['ORDO'[l]][row][col]==='1'&&x===12+l*4+col&&y===5+row)c=[92,65,48];
 if(y>=18&&y<=37&&x>=6&&x<=34){if((x-6)%4===0||[18,23,28,33,37].includes(y))c=[181,164,133];else if((x-6)%4===2&&[21,26,31,35].includes(y))c=x<10?[153,44,44]:[126,113,90];}
 if(y===42&&x>=11&&x<=28)c=[191,177,150];
 return c;
}
export function buildOrdoAssets(write,json){
 const maps={color:new PNG({width:ATLAS,height:ATLAS}),mer:new PNG({width:ATLAS,height:ATLAS}),normal:new PNG({width:ATLAS,height:ATLAS})};
 // Opaque gutter padding prevents dark seams at mip transitions.
 for(let y=0;y<ATLAS;y++)for(let x=0;x<ATLAS;x++){const i=(y*ATLAS+x)*4;maps.color.data.set([79,57,40,255],i);maps.mer.data.set([0,0,220,255],i);maps.normal.data.set([128,128,255,255],i);}
 for(const [name,[u,v,w,h]]of Object.entries(tiles))for(let y=-2;y<h+2;y++)for(let x=-2;x<w+2;x++){
 const i=((v+y)*ATLAS+u+x)*4;maps.color.data.set([...painted(name,Math.max(0,Math.min(w-1,x)),Math.max(0,Math.min(h-1,y))).map(Math.round),255],i);
 maps.mer.data.set([name==='brass'?185:0,0,name==='brass'?140:name==='paper'?235:210,255],i);
 }
 json('packs/resource/models/blocks/ordo_calendar.geo.json',geometry());
 for(const [name,suffix]of [['color',''],['mer','_mer'],['normal','_normal']])write(`packs/resource/textures/blocks/ordo_calendar${suffix}.png`,PNG.sync.write(maps[name]));
 json('packs/resource/textures/blocks/ordo_calendar.texture_set.json',{format_version:'1.16.100','minecraft:texture_set':{color:'ordo_calendar',normal:'ordo_calendar_normal',metalness_emissive_roughness:'ordo_calendar_mer'}});
 const icon=path.join(import.meta.dirname,'ordo/item-64.png');
 if(!fs.existsSync(icon))throw new Error('Missing authored Ordo icon; render with tools/render-ordo-blender.py.');
 write('packs/resource/textures/items/ordo.png',fs.readFileSync(icon));
}
