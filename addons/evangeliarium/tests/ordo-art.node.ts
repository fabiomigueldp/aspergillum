import test from 'node:test';
import assert from 'node:assert/strict';
import {geometry,ATLAS,tiles,buildOrdoAssets} from '../assets-src/ordo-design.mjs';
import {geometryVertices} from '../tools/geometry-bounds.mjs';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs') as {PNG:{sync:{read:(bytes:Buffer)=>{data:Buffer}}}};
type Tile=[number,number,number,number];
test('Ordo calendar has closed solids, six noncollapsed UV faces, bounded placement and readable north face',()=>{
 const geo=geometry()['minecraft:geometry'][0]!;
 assert.equal(geo.description.identifier,'geometry.ordo_calendar');
 let count=0;
 for(const bone of geo.bones)for(const cube of bone.cubes??[]){
 count++;assert(cube.size.every((n:number)=>n>0));
 assert.deepEqual(Object.keys(cube.uv).sort(),['down','east','north','south','up','west']);
 for(const face of Object.values(cube.uv)){assert(face.uv_size.every((n:number)=>n>=1));for(let i=0;i<2;i++)assert(face.uv[i]>=0&&face.uv[i]+face.uv_size[i]<=ATLAS);}
 }
 assert.equal(count,9);
 for(const p of geometryVertices(geo)){assert(p[0]>=-5&&p[0]<=5);assert(p[1]>=0&&p[1]<=12);assert(p[2]>=-3&&p[2]<=3);}
 const paper=geo.bones[1]!.cubes![1]!;assert.deepEqual(paper.uv.north!.uv,tiles.paper.slice(0,2));
 assert(paper.origin[2]<geo.bones[1]!.cubes![0]!.origin[2]);
 assert.equal(geo.bones[1]!.rotation![0],-10);
 // The rear brace must never punch through the printed front plane.
 const support=geo.bones[0]!.cubes![2]!;
 for(const p of geometryVertices({bones:[{name:'support',cubes:[support]}]})){
  const a=-10*Math.PI/180;
  const panelZ=Math.sin(a)*(p[1]!-1.25)+Math.cos(a)*(p[2]!+1.1)-1.1;
  assert(panelZ>paper.origin[2]!,'Rear support crosses the printed paper face');
 }
});

test('Paper is a thin printed leaf on a revealed pad, with clips and marker still attached',()=>{
 const [backing,paper,pad,leftClip,rightClip,marker]=geometry()['minecraft:geometry'][0]!.bones[1]!.cubes!;
 assert(backing&&paper&&pad&&leftClip&&rightClip&&marker);
 const end=(c:any,axis:number)=>c.origin[axis]+c.size[axis];
 assert(paper.size[2]<pad.size[2]);
 assert(Math.abs(end(paper,2)-pad.origin[2])<1e-10,'Leaf and pad must touch without overlap');
 assert(pad.origin[0]<paper.origin[0]&&end(pad,0)>end(paper,0),'Pad is visible at both edges');
 assert(pad.origin[1]<paper.origin[1]);
 assert(end(pad,2)<=backing.origin[2]&&backing.origin[2]-end(pad,2)<.02);
 for(const clip of [leftClip,rightClip]){
  assert(clip.origin[2]<paper.origin[2]&&end(clip,2)>backing.origin[2],'Clip must span paper and backing');
  assert(clip.origin[1]<end(paper,1)&&end(clip,1)>end(paper,1));
 }
 assert(marker.origin[2]<paper.origin[2]&&end(marker,2)>paper.origin[2]);
 assert(end(marker,2)<end(paper,2),'Marker must not punch through the pad');
 assert(marker.origin[1]<paper.origin[1]);
});

test('Paper strata track depth without stretching the edge tile over broad faces',()=>{
 const [,paper,pad]=geometry()['minecraft:geometry'][0]!.bones[1]!.cubes!;
 assert(paper&&pad);
 for(const c of [paper,pad]){
  for(const f of ['east','west']){
   assert.deepEqual(c.uv[f]!.uv,tiles.pageSide.slice(0,2));
   assert.deepEqual(c.uv[f]!.uv_size,[Math.max(1,c.size[2]*8),c.size[1]*4]);
  }
  for(const f of ['up','down']){
   assert.deepEqual(c.uv[f]!.uv,tiles.pageEnd.slice(0,2));
   assert.deepEqual(c.uv[f]!.uv_size,[c.size[0]*4,Math.max(1,c.size[2]*8)]);
  }
 }
});

test('Every UV remains inside its own non-overlapping padded tile',()=>{
 const entries=Object.values(tiles) as Tile[];
 for(const [i,a]of entries.entries()){
  assert(a[0]>=2&&a[1]>=2&&a[0]+a[2]+2<=ATLAS&&a[1]+a[3]+2<=ATLAS);
  for(const b of entries.slice(i+1))assert(a[0]+a[2]+4<=b[0]||b[0]+b[2]+4<=a[0]||a[1]+a[3]+4<=b[1]||b[1]+b[3]+4<=a[1],'Padded atlas tiles overlap');
 }
 for(const b of geometry()['minecraft:geometry'][0]!.bones)for(const c of b.cubes??[])for(const uv of Object.values(c.uv)){
  const tile=entries.find(t=>t[0]===uv.uv[0]&&t[1]===uv.uv[1]);assert(tile);
  assert(uv.uv_size[0]<=tile[2]&&uv.uv_size[1]<=tile[3]);
 }
});

test('Generated paper keeps a readable grid, opaque padding and directional strata',()=>{
 const buffers=new Map<string,Buffer>();
 buildOrdoAssets((file:string,bytes:Buffer)=>buffers.set(file,bytes),()=>{});
 const png=PNG.sync.read(buffers.get('packs/resource/textures/blocks/ordo_calendar.png')!);
 const rgb=(tile:number[],x:number,y:number):number[]=>{
  const i=((tile[1]!+y)*ATLAS+tile[0]!+x)*4;
  return[png.data[i]!,png.data[i+1]!,png.data[i+2]!];
 };
 for(let i=3;i<png.data.length;i+=4)assert.equal(png.data[i],255);
 for(const tile of Object.values(tiles) as Tile[]){
  for(let y=-2;y<tile[3]+2;y++)for(let x=-2;x<tile[2]+2;x++){
   if(x>=0&&x<tile[2]&&y>=0&&y<tile[3])continue;
   assert.deepEqual(rgb(tile,x,y),rgb(tile,Math.max(0,Math.min(tile[2]-1,x)),Math.max(0,Math.min(tile[3]-1,y))));
  }
 }
 const paper=rgb(tiles.paper,0,0),grid=rgb(tiles.paper,6,18);
 assert(paper.every((n,i)=>n-grid[i]!>=50),'Grid must remain distinct from paper');
 assert.deepEqual(rgb(tiles.pageSide,0,2),rgb(tiles.pageSide,0,30));
 assert.notDeepEqual(rgb(tiles.pageSide,0,2),rgb(tiles.pageSide,1,2));
 assert.deepEqual(rgb(tiles.pageEnd,2,0),rgb(tiles.pageEnd,30,0));
 assert.notDeepEqual(rgb(tiles.pageEnd,2,0),rgb(tiles.pageEnd,2,1));
});

test('Timber UV density stays consistent across broad and thin faces',()=>{
 const geo=geometry()['minecraft:geometry'][0]!;
 for(const bone of geo.bones)for(const cube of bone.cubes??[])for(const [face,uv]of Object.entries(cube.uv)){
  if(uv.uv[0]!==tiles.wood[0]||uv.uv[1]!==tiles.wood[1])continue;
  const axes=face==='up'||face==='down'?[0,2]:face==='east'||face==='west'?[2,1]:[0,1];
  assert.deepEqual(uv.uv_size,axes.map(i=>Math.max(1,cube.size[i]!*4)));
  for(let i=0;i<2;i++)assert(uv.uv_size[i]!<=tiles.wood[i+2]!,'Wood UV escapes its padded tile');
 }
});
