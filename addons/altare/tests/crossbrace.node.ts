import test from 'node:test';
import assert from 'node:assert/strict';
import {crossbraceArchitecture,crossbraceCollision} from '../assets-src/atelier/crossbrace-model.mjs';
import {atelierGeometry} from '../assets-src/atelier/geometry.mjs';
import {DESIGNS,JOINERY_DESIGNS,CATALOG_PERMUTATIONS,NATIVE_PERMUTATIONS,sharedDesignFor,SHARED_TEXTILES} from '../src/domain/catalog.ts';
import {planFinish,type Tile} from '../src/domain/surface.ts';
import {encodeTile,decodeTile} from '../src/domain/block-codec.ts';
import {customizationFromFinish,customizationFinish,customizationCapabilities,changeCustomization} from '../src/domain/customization.ts';
import {collectionMaterials} from '../tools/catalog-pack.mjs';
import {crossbraceInlay} from '../assets-src/atelier/materials.mjs';
const grid=(w:number,d:number):Tile[]=>Array.from({length:w*d},(_,i)=>({position:{x:i%w,y:0,z:Math.floor(i/w)},stone:0,cloth:0,frontal:0,facing:0,edges:15}));
function points(c:any){
 const p=c.pivot??[0,0,0],r=(c.rotation??[0,0,0]).map((v:number)=>v*Math.PI/180),result:number[][]=[];
 for(const x of [0,1])for(const y of [0,1])for(const z of [0,1]){
  let v=c.origin.map((n:number,i:number)=>n+c.size[i]*[x,y,z][i]!-p[i]);
  for(let axis=0;axis<3;axis++){const j=(axis+1)%3,k=(axis+2)%3,a=v[j],b=v[k];v[j]=a*Math.cos(r[axis])-b*Math.sin(r[axis]);v[k]=a*Math.sin(r[axis])+b*Math.cos(r[axis]);}
  result.push(v.map((n:number,i:number)=>n+p[i]));
 }return result;
}
test('Cruzeta adds seventeen finishes without relaxing either state ceiling',()=>{
 assert.equal(DESIGNS.filter(d=>d.structure==='crossbrace').length,17);
 assert.equal(NATIVE_PERMUTATIONS,8232);assert.ok(CATALOG_PERMUTATIONS+9744<=65536);assert.ok(CATALOG_PERMUTATIONS<=65536);
 const bare=JOINERY_DESIGNS.find(d=>d.id==='altare:j_crossbrace_none')!;assert.equal(bare.codec,'symmetric');
 for(let facing=0;facing<4;facing++)for(const [w,d] of [[1,1],[7,2],[8,2],[16,8]]){
  for(const t of planFinish(grid(w!,d!),{stone:0,cloth:0,ornamental:false,facing,design:bare.id})){
   const e=encodeTile(t);assert.deepEqual(Object.keys(e.states),['altare:edges']);assert.equal(t.stone,2);assert.equal(t.facing,0);assert.deepEqual(decodeTile(e.id,t.position,e.states),t);
  }
 }
});
test('Cruzeta carpentry does not change with textile, dye or front direction',()=>{
 for(let edges=0;edges<16;edges++){
  const bare=atelierGeometry('crossbrace','none','none',0,edges).doc['minecraft:geometry'][0];
  const structure=(g:any)=>g.bones.filter((b:any)=>b.name.startsWith('crossbrace_'));
  for(let facing=0;facing<4;facing++)for(const textile of SHARED_TEXTILES){
   const g=atelierGeometry('crossbrace',textile==='floral'?'ruby':textile,'none',facing,edges).doc['minecraft:geometry'][0];
   assert.deepEqual(structure(g),structure(bare));assert.ok(g.bones.flatMap((b:any)=>b.cubes).length<=50);
   assert.ok(g.bones.find((b:any)=>b.name==='top').cubes.every((c:any)=>Math.abs(c.origin[1]+c.size[1]-16)<1e-9));
   if(textile!=='none')for(const b of g.bones.filter((b:any)=>b.name.startsWith('drape_')))assert.ok(b.cubes.slice(0,2).every((c:any)=>c.uv.north&&c.uv.south||c.uv.east&&c.uv.west),'open frame cloth has a visible reverse');
  }
 }
});
test('Cruzeta compiled contours share corner posts and keep diagonal support inside collision bounds',()=>{
 for(let edges=0;edges<16;edges++){
  const bones=crossbraceArchitecture(edges).bones,collision=crossbraceCollision(edges);
  assert.ok(collision.length<=5);assert.ok(!collision.some((b:any)=>[0,7,0].every((v,i)=>v>b.origin[i]&&v<b.origin[i]+b.size[i])));
  for(const c of bones.flatMap((b:any)=>b.cubes))for(const p of points(c)){
   assert.ok(p[0]!>=-8-1e-8&&p[0]!<=8+1e-8&&p[1]!>=0&&p[1]!<=14.2+1e-8&&p[2]!>=-8-1e-8&&p[2]!<=8+1e-8);
   assert.ok(collision.some((b:any)=>p.every((v,i)=>v>=b.origin[i]-1e-7&&v<=b.origin[i]+b.size[i]+1e-7)),`uncovered wood vertex ${p}`);
  }
  assert.equal(bones.filter((b:any)=>b.name.startsWith('crossbrace_bay_')).length,[0,1,2,3].filter(s=>edges&(1<<s)).length);
 }
 const isolated=crossbraceArchitecture(15).bones;assert.equal(isolated.filter((b:any)=>b.name.includes('_corner_')).length,4);assert.ok(!isolated.some((b:any)=>b.name.includes('_half_')));
 const continuous=crossbraceArchitecture(1).bones;assert.equal(continuous.filter((b:any)=>b.name.includes('_half_')).length,2);
 const laps=isolated.find((b:any)=>b.name==='crossbrace_bay_0')!.cubes.slice(2,4);assert.equal(laps[0]!.origin[2]+laps[0]!.size[2],laps[1]!.origin[2]);
});
test('Cruzeta materials preserve wood, receive all shared cloths, and have no metallic body or extra relief',()=>{
 for(const textile of SHARED_TEXTILES){const d=sharedDesignFor('crossbrace','walnut',textile,'none');const m=collectionMaterials(d);assert.equal(m.stone.texture,'altare_atelier_walnut');assert.equal(m.joinery_inlay.texture,'altare_crossbrace_inlay');}
 assert.throws(()=>atelierGeometry('crossbrace','none','cross',0,15),/no applied relief/);
});

test('symmetric Cruzeta hides direction while preserving the draft for a later cloth',()=>{
 const d=changeCustomization(customizationFromFinish({stone:0,cloth:0,ornamental:false,facing:3}),{model:'crossbrace',textile:'none'});
 assert.equal(customizationCapabilities(d).directional,false);assert.equal(customizationFinish(d).facing,0);assert.equal(d.facing,3);
 const clothed=changeCustomization(d,{textile:'agnus'});assert.equal(customizationCapabilities(clothed).directional,true);assert.equal(customizationFinish(clothed).facing,3);
});

test('Cruzeta inlay retains physical scale and shared posts reconstruct a complete motif',()=>{
 const epsilon=1e-7;
 for(let edges=1;edges<16;edges++){
  const bones=crossbraceArchitecture(edges).bones;
  for(const b of bones.filter((b:any)=>b.name.startsWith('crossbrace_bay_'))){
   const c=b.cubes[0],uv=Object.values(c.uv).find((f:any)=>f.material_instance==='joinery_inlay') as any;
   assert.ok(Math.abs(uv.uv_size[0]/Math.max(c.size[0],c.size[2])-8.75)<.4);
   assert.ok(uv.uv[0]>=0&&uv.uv[0]+uv.uv_size[0]<=128+epsilon);
   assert.equal(uv.uv[0]%16,0);assert.equal(uv.uv_size[0]%16,0);
  }
 }
 const full=crossbraceArchitecture(15).bones.find((b:any)=>b.name==='crossbrace_corner_0')!.cubes;
 const halves=crossbraceArchitecture(1).bones.filter((b:any)=>b.name.startsWith('crossbrace_half_0'));
 const [left,right]=halves.map((b:any)=>b.cubes[2].uv.north);
 assert.ok(Math.abs(left.uv[0]+left.uv_size[0]-right.uv[0])<epsilon);
 assert.ok(Math.abs(left.uv[0]-full[2].uv.north.uv[0])<epsilon);
 assert.ok(Math.abs(left.uv_size[0]+right.uv_size[0]-full[2].uv.north.uv_size[0])<epsilon);
 assert.equal(halves[0].cubes.every((c:any)=>!c.uv.west),true);
 assert.equal(halves[1].cubes.every((c:any)=>!c.uv.east),true);
});

test('Cruzeta square recessed shafts meet lower rails and every X has one contained through-peg',()=>{
 const bones=crossbraceArchitecture(15).bones,post=bones.find((b:any)=>b.name==='crossbrace_corner_0')!.cubes;
 assert.ok(Math.abs(post[1].size[0]-1.36)<1e-9);assert.ok(Math.abs(post[1].size[2]-1.36)<1e-9);
 const low=bones.find((b:any)=>b.name==='crossbrace_bay_0')!.cubes[1];
 assert.ok(Math.abs(low.origin[0]-(post[1].origin[0]+post[1].size[0]))<1e-9);
 for(let edges=0;edges<16;edges++)for(const b of crossbraceArchitecture(edges).bones.filter((b:any)=>b.name.startsWith('crossbrace_bay_'))){
  assert.equal(b.cubes.length,5);
  const [a,c,pin]=b.cubes.slice(2),center=(box:any)=>box.pivot;
  assert.ok(Math.abs(Math.hypot(...center(a).map((n:number,i:number)=>n-center(pin)[i]))-.24)<1e-8);
  assert.ok(Math.abs(Math.hypot(...center(c).map((n:number,i:number)=>n-center(pin)[i]))-.24)<1e-8);
  assert.equal(Object.values(pin.uv).filter((f:any)=>f.material_instance==='joinery_inlay').length,2);
 }
});


test('Cruzeta marquetry repeats on whole texture pixels without uneven broken diamonds',()=>{
 const light=(x:number,y:number)=>crossbraceInlay(2*x+.5,2*y+.5).rgb[0]===181;
 for(let y=0;y<64;y++)for(let x=0;x<8;x++)for(let period=1;period<8;period++)assert.equal(light(x,y),light(x+period*8,y));
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const p=crossbraceInlay(2*x+.5,2*y+.5);assert.equal(p.metal,0);assert.equal(p.alpha??255,255);}
});
