import test from 'node:test';
import assert from 'node:assert/strict';
import {atelierGeometry} from '../assets-src/atelier/geometry.mjs';
import {pilasterArchitecture,pilasterProfile as p,pilasterBudget} from '../assets-src/atelier/pilaster-model.mjs';
import {textileProfiles} from '../assets-src/atelier/profiles.mjs';
import {garmentProfile} from '../assets-src/atelier/garment.mjs';
import {collectionMaterials} from '../tools/catalog-pack.mjs';
import {sharedDesignFor} from '../src/domain/catalog.ts';
const styles=['none','linen_short','linen_long','gold_short','gold_long','agnus','ruby','verdant','requiem','lace'];
const near=(a:number,b:number)=>Math.abs(a-b)<1e-7;
const rotate=(v:number[],rotation:number[],inverse=false)=>{
 const out=[...v];for(const axis of inverse?[2,1,0]:[0,1,2]){
  const angle=rotation[axis]!*Math.PI/180*(inverse?-1:1),j=(axis+1)%3,k=(axis+2)%3,a=out[j]!,b=out[k]!;
  out[j]=a*Math.cos(angle)-b*Math.sin(angle);out[k]=a*Math.sin(angle)+b*Math.cos(angle);
 }return out;
};

test('raking panel reveals face outward and retain both horizontal and vertical slopes in all directions',()=>{
 const normal:any={north:[0,0,-1],east:[1,0,0],south:[0,0,1],west:[-1,0,0],up:[0,1,0],down:[0,-1,0]},dirs=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]];
 for(let mask=1;mask<16;mask++)for(let side=0;side<4;side++){
  if(!(mask&(1<<side)))continue;
  const frame=pilasterArchitecture(mask,false).bones.find((b:any)=>b.name===`panel_frame_${side}`).cubes;assert.equal(frame.length,4);
  for(const c of frame){
   const dot=(v:number[])=>v.reduce((n,x,i)=>n+x*dirs[side]![i]!,0),facets=Object.keys(c.uv).map(face=>dot(rotate(normal[face],c.rotation??[0,0,0])));
   assert.equal(facets.length,1,'only the exterior reveal is needed; edges close into the bearing members');
   assert.ok(facets[0]!>.65&&facets[0]!<.995,'every reveal must slope outward toward its bearing member');
  }
 }
});

test('panel corners close monotonically into their bearing members without spikes or coincident exterior planes',()=>{
 const bars=pilasterArchitecture(15,false).bones.find((b:any)=>b.name==='panel_frame_0').cubes;
 const hit=(c:any,x:number,y:number)=>{
  const pivot=c.pivot??[0,0,0],rotation=c.rotation??[0,0,0],o=rotate([x-pivot[0],y-pivot[1],-20-pivot[2]],rotation,true).map((v,i)=>v+pivot[i]),d=rotate([0,0,1],rotation,true);
  let enter=-Infinity,leave=Infinity;
  for(let i=0;i<3;i++){
   if(Math.abs(d[i]!)<1e-9){if(o[i]!<c.origin[i]-1e-7||o[i]!>c.origin[i]+c.size[i]+1e-7)return -Infinity;continue;}
   const a=(c.origin[i]-o[i]!)/d[i]!,b=(c.origin[i]+c.size[i]-o[i]!)/d[i]!;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));
  }return enter<=leave+1e-7?20-enter:-Infinity;
 };
 for(const xSign of [-1,1])for(const top of [false,true])for(let a=.1;a<1;a+=.2)for(let b=.1;b<1;b+=.2){
  const x=xSign*(p.frameInner+a*(p.frameOuter-p.frameInner));
  const y=top?p.panelTop+b*(p.capitalTop-p.panelTop):p.panelBottom-b*(p.panelBottom-p.plinthTop);
  const front=Math.max(...bars.map((c:any)=>hit(c,x,y)));
  const expected=Math.max(p.coreEdge+a*(p.shaftOuter-p.coreEdge),p.coreEdge+b*((top?p.headFace:p.baseFace)-p.coreEdge));
  assert.ok(near(front,expected),'the diagonal junction must close continuously into the real structural profile');
 }
 for(const x of [-p.frameInner+.1,0,p.frameInner-.1])for(const y of [p.panelBottom+.1,7,p.panelTop-.1])assert.equal(Math.max(...bars.map((c:any)=>hit(c,x,y))),-Infinity,'the flat recessed field must stay unobstructed');
 const h=bars[0],v=bars[2],hn=rotate([0,0,-1],h.rotation),vn=rotate([0,0,-1],v.rotation);
 assert.ok(Math.abs(hn.reduce((n,x,i)=>n+x*vn[i]!,0))<.99,'adjacent front facets must meet along a line, never overlap in one plane');
});

test('every lateral reveal joins an emitted shaft face, including the narrower intermediate half-piers',()=>{
 const faceAxis:any={north:[2,false],south:[2,true],west:[0,false],east:[0,true],down:[1,false],up:[1,true]};
 for(let mask=1;mask<16;mask+=2){
  const g=pilasterArchitecture(mask,false),bars=g.bones.find((b:any)=>b.name==='panel_frame_0').cubes.slice(2),piers=g.bones.filter((b:any)=>b.name.startsWith('pier_')).flatMap((b:any)=>b.cubes);
  const touches=(point:number[],c:any)=>{
   const pivot=c.pivot??[0,0,0],v=rotate(point.map((n,i)=>n-pivot[i]),c.rotation??[0,0,0],true).map((n,i)=>n+pivot[i]);
   return Object.keys(c.uv).some(face=>{const [axis,high]=faceAxis[face];return near(v[axis]!,c.origin[axis]+(high?c.size[axis]:0))&&v.every((n,i)=>n>=c.origin[i]-1e-7&&n<=c.origin[i]+c.size[i]+1e-7);});
  };
  for(const c of bars){
   const pivot=c.pivot,endpoints=[0,1].map(i=>rotate([c.origin[0]+i*c.size[0]-pivot[0],7-pivot[1],c.origin[2]-pivot[2]],c.rotation).map((n,j)=>n+pivot[j]));
   const outer=endpoints.sort((a,b)=>Math.abs(b[0]!)-Math.abs(a[0]!))[0]!;
   assert.ok(piers.some((pier:any)=>touches(outer,pier)),`reveal must enter the actual shaft, contour ${mask}`);
  }
 }
});

test('engaged piers share exterior corners and meet each neighboring bay without duplicate internal faces',()=>{
 for(let mask=0;mask<16;mask++){
  const g=pilasterArchitecture(mask,false),sides=[0,1,2,3].filter(i=>mask&(1<<i)),corners=sides.filter(i=>mask&(1<<((i+3)%4)));
  assert.equal(g.bones.filter((b:any)=>b.name.startsWith('pier_corner_')).length,corners.length);
  assert.equal(g.bones.filter((b:any)=>b.name.startsWith('pier_half_')).length,2*sides.length-2*corners.length);
 }
 const g=pilasterArchitecture(1,false),left=g.bones.find((b:any)=>b.name==='pier_half_0_left').cubes,right=g.bones.find((b:any)=>b.name==='pier_half_0_right').cubes;
 for(let i=0;i<left.length;i++){
  const a=left[i],b=right[i];if(a.rotation||!a.uv.north)continue;
  assert.ok(near(b.origin[0]+b.size[0],8)&&near(a.origin[0]+16,8),'half piers must butt at the cell boundary');
  assert.equal(a.uv.west,undefined);assert.equal(b.uv.east,undefined,'the join must not emit coincident internal caps');
  assert.equal(a.uv.north.uv[0]+a.uv.north.uv_size[0],b.uv.north.uv[0],'stone and grain must continue across the pier centre');
 }
});

test('the carcass and profile courses meet through internal bays without holes or double ledges',()=>{
 for(const [w,d] of [[1,1],[1,8],[3,2],[7,2],[8,2],[16,8]])for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  const mask=(z===0?1:0)|(x===w-1?2:0)|(z===d-1?4:0)|(x===0?8:0),g=pilasterArchitecture(mask,false);
  for(const name of ['plinth','frieze','cornice','mensa_edge','top'])for(const c of g.bones.find((b:any)=>b.name===name).cubes){
   if(x>0){assert.ok(near(c.origin[0],-8));assert.equal(c.uv.west,undefined);}
   if(x+1<w){assert.ok(near(c.origin[0]+c.size[0],8));assert.equal(c.uv.east,undefined);}
   if(z>0){assert.ok(near(c.origin[2],-8));assert.equal(c.uv.north,undefined);}
   if(z+1<d){assert.ok(near(c.origin[2]+c.size[2],8));assert.equal(c.uv.south,undefined);}
  }
  const core=g.bones.find((b:any)=>b.name==='core').cubes[0];
  if(core){if(x>0)assert.ok(near(core.origin[0],-8));if(x+1<w)assert.ok(near(core.origin[0]+core.size[0],8));if(z>0)assert.ok(near(core.origin[2],-8));if(z+1<d)assert.ok(near(core.origin[2]+core.size[2],8));}
 }
});

test('the shaped shafts have a real cut nose, closed bearing heads and continuous bearing heights',()=>{
 const g=pilasterArchitecture(15,false),pier=g.bones.find((b:any)=>b.name==='pier_corner_0').cubes;
 const levels=[[1.65,2.1],[2.1,2.65],[2.65,11.6],[11.6,12],[12,12.7],[12.7,13.15]];
 for(const [lo,hi] of levels){assert.ok(pier.some((c:any)=>near(c.origin[1],lo)&&near(c.origin[1]+c.size[1],hi)));}
 const shaft=pier.filter((c:any)=>near(c.origin[1],p.shaftBottom));assert.equal(shaft.length,3);
 assert.ok(shaft.some((c:any)=>near(c.rotation?.[1]??0,45)),'the bevel must replace the square nose');
 const neck=pier.find((c:any)=>near(c.origin[1],p.shaftTop));assert.ok(neck.uv.down,'the neck must close the cut shaft and its projecting margins');
 for(const lo of [12,12.7])assert.ok(pier.find((c:any)=>near(c.origin[1],lo)).uv.down,'projecting capitals need an underside');
 for(const name of ['frieze','cornice','mensa_edge'])assert.ok(g.bones.find((b:any)=>b.name===name).cubes[0].uv.down);
});

test('all cloths leave the same architecture and free support plane at y=16',()=>{
 for(let mask=0;mask<16;mask++){
  const structure=(style:string)=>atelierGeometry('pilaster',style,'none',0,mask).doc['minecraft:geometry'][0].bones.filter((b:any)=>!['top','tabletop_base'].includes(b.name)&&!b.name.startsWith('drape_')&&!b.name.startsWith('fold_corner_'));
  // Linen top returns are compiled into one top volume for this contour.
  const bare=structure('none');for(const style of styles)assert.deepEqual(structure(style),bare,`${style}/${mask}`);
  for(const style of styles){
   const g=atelierGeometry('pilaster',style,'none',0,mask).doc['minecraft:geometry'][0],top=g.bones.find((b:any)=>b.name==='top').cubes[0];
   assert.ok(near(top.origin[1]+top.size[1],16));
   if(style!=='none'){
    const base=g.bones.find((b:any)=>b.name==='tabletop_base').cubes[0];assert.ok(near(base.origin[1]+base.size[1],top.origin[1]));
    assert.equal(g.bones.filter((b:any)=>b.name.startsWith('drape_')).length,[0,1,2,3].filter(i=>mask&(1<<i)).length);
    assert.ok(p.outerEdge<garmentProfile.endDepth-garmentProfile.skin,'the structural envelope must clear the drape');
   }
  }
 }
});

test('odd reliefs bear on the recessed field and split reliefs on the shared pier, above the lower frame',()=>{
 const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 for(const style of styles)for(const frontal of ['cross','agnus'])for(let facing=0;facing<4;facing++){
  const g=atelierGeometry('pilaster',style,frontal,facing,15).doc['minecraft:geometry'][0];
  for(const b of g.bones.filter((b:any)=>b.name.startsWith('applique_'))){
   const role=Number(b.name.slice(-1)),support=role===1?p.panelFace:p.shaftOuter;
   for(const c of b.cubes){
    const x=-(c.origin[0]+c.size[0]),z=c.origin[2],distances=[x,x+c.size[0]].flatMap(X=>[z,z+c.size[2]].map(Z=>X*dirs[facing]![0]!+Z*dirs[facing]![1]!));
    assert.ok(Math.min(...distances)<=support+1e-7&&Math.max(...distances)>support,'a relief must enter its support instead of floating');
    assert.ok(c.origin[1]>=p.panelBottom+.15-1e-7);
    const ceiling=Math.min(p.panelTop-.15,style==='none'?14:15.85-textileProfiles[style].drop-.35);assert.ok(c.origin[1]+c.size[1]<=ceiling+1e-7,'full relief must fit below the cloth');
   }
   if(frontal==='cross'){
    const depths=b.cubes.map((c:any)=>facing%2?c.origin[0]:c.origin[2]);assert.notEqual(depths[0],depths[1],'cross arms must not have coincident front faces');
   }
  }
 }
});

test('materials keep vertical piers and horizontal rails, and the directional textile uses the selected face',()=>{
 for(const surface of ['marble','limestone','walnut'] as const)for(let facing=0;facing<4;facing++){
  const d=sharedDesignFor('pilaster',surface,'floral','none','purple'),m=collectionMaterials(d,2,facing);
  assert.equal(m.rail.texture,surface==='walnut'?'altare_joinery_walnut_horizontal':m.stone.texture);
  for(let side=0;side<4;side++)assert.equal(m[`cloth_${side}`].texture,`altare_textile_ruby_${side===facing?2:0}_purple`);
 }
});

test('all baked contours, reliefs and garments remain inside their bounded diagnostic mesh budget',()=>{
 for(const style of styles)for(const frontal of ['none','cross','agnus'])for(let f=0;f<4;f++)for(let mask=0;mask<16;mask++){
  const g=atelierGeometry('pilaster',style,frontal,f,mask).doc['minecraft:geometry'][0],cubes=g.bones.flatMap((b:any)=>b.cubes);
  assert.ok(cubes.length<=pilasterBudget.cubes);
  assert.ok(cubes.reduce((n:number,c:any)=>n+Object.values(c.uv).filter(Boolean).length,0)<=pilasterBudget.quads);
  for(const c of cubes){assert.ok(c.origin[1]>=0&&c.origin[1]+c.size[1]<=16+1e-7);for(const u of Object.values(c.uv) as any[])assert.ok(u.uv.every((v:number,i:number)=>Number.isInteger(v)&&v>=0&&v+u.uv_size[i]<=128));}
 }
});
