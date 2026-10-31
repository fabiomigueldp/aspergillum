import test from 'node:test';
import assert from 'node:assert/strict';
import {ogiveArchitecture,ogiveCurve,ogiveOpening,ogiveRecess,ogiveProfile as p,ogiveBudget,ogiveMaskAlpha,ogiveReliefFit,openingDistance} from '../assets-src/atelier/ogive-model.mjs';
import {atelierGeometry} from '../assets-src/atelier/geometry.mjs';
import {textileProfiles} from '../assets-src/atelier/profiles.mjs';
import {collectionMaterials} from '../tools/catalog-pack.mjs';
import {sharedDesignFor} from '../src/domain/catalog.ts';
import {ogiveDefinitions} from '../assets-src/atelier/ogive-art.mjs';
import {definitions} from '../assets-src/textures.mjs';
import {walnutPaint} from '../assets-src/atelier/materials.mjs';
const styles=['none','linen_short','linen_long','gold_short','gold_long','agnus','ruby','verdant','requiem','lace'];
const near=(a:number,b:number)=>Math.abs(a-b)<1e-7;
test('lancet has two symmetric circular branches, a unique pointed crown and a vertical spring',()=>{
 assert.equal(ogiveCurve.length,13);assert.deepEqual(ogiveCurve[6],[0,p.peak]);
 assert.equal(ogiveCurve.filter((v:number[])=>near(v[0],0)).length,1);
 for(let i=0;i<13;i++){assert.ok(near(ogiveCurve[i][0],-ogiveCurve[12-i][0]));assert.ok(near(ogiveCurve[i][1],ogiveCurve[12-i][1]));}
 assert.ok(ogiveCurve[1][1]>p.spring&&Math.abs(ogiveCurve[1][0]+p.halfWidth)<.3);
 for(let i=1;i<7;i++)assert.ok(ogiveCurve[i][0]>ogiveCurve[i-1][0]&&ogiveCurve[i][1]>ogiveCurve[i-1][1]);
});
test('binary facade mask shares the exact opening polygon and keeps a sub-texel lip',()=>{
 let clear=0,solid=0;
 for(let v=20;v<116;v++)for(let u=0;u<128;u++){
  const a=ogiveMaskAlpha(u,v),d=openingDistance(8-(u+.5)/8,16-(v+.5)/8);assert.ok(a===0||a===255);
  if(d>.2){assert.equal(a,0);clear++;}if(d<-.2){assert.equal(a,255);solid++;}
 }
 assert.ok(clear>2000&&solid>2000);assert.equal(ogiveMaskAlpha(64,5),0);
 for(const point of ogiveOpening)assert.ok(Math.abs(openingDistance(...point))<1e-7);
});
const rotate=(input:number[],rotation:number[],inverse=false)=>{const v=[...input];for(const axis of inverse?[2,1,0]:[0,1,2]){const a=rotation[axis]!*Math.PI/180*(inverse?-1:1),j=(axis+1)%3,k=(axis+2)%3,x=v[j]!,y=v[k]!;v[j]=x*Math.cos(a)-y*Math.sin(a);v[k]=x*Math.sin(a)+y*Math.cos(a);}return v;};
const quarter=([x,y,z]:number[],side:number)=>side===1?[-z!,y!,x!]:side===2?[-x!,y!,-z!]:side===3?[z!,y!,-x!]:[x!,y!,z!];
const point=(c:any,local:number[])=>rotate(local,c.rotation).map((v,i)=>v+c.pivot[i]);

test('raked intrados has closed front edges, inset mitres and outward normals in every world direction',()=>{
 const g=ogiveArchitecture(15,false),depth=p.face-p.coreEdge,slant=Math.hypot(depth,p.bevel);
 for(let side=0;side<4;side++){
  const wall=g.bones.find((b:any)=>b.name==='ogive_intrados_'+side).cubes;assert.equal(wall.length,14);
  for(let i=0;i<wall.length;i++){
   const c=wall[i],frontA=quarter([...ogiveOpening[i],-p.face],side),frontB=quarter([...ogiveOpening[i+1],-p.face],side);
   assert.deepEqual(Object.keys(c.uv),['down']);assert.equal(c.uv.down.material_instance,'rail');assert.ok(near(c.size[2],slant));
   for(const [actual,expected] of [[point(c,[0,0,0]),frontA],[point(c,[c.size[0],0,0]),frontB]])assert.ok(actual.every((v:number,j:number)=>near(v,expected[j]!)));
   for(const index of [i,i+1]){
    const back=quarter([...ogiveRecess[index],-p.coreEdge],side),local=rotate(back.map((v,j)=>v-c.pivot[j]),c.rotation,true);
    assert.ok(near(local[1]!,0)&&near(local[2]!,slant),'both adjacent walls must contain the same rear mitre');
    assert.ok(local[0]!>=-1e-7&&local[0]!<=c.size[0]+1e-7);
   }
   const normal=rotate([0,-1,0],c.rotation),out=quarter([0,0,-1],side),centre=point(c,[c.size[0]/2,0,slant/2]),toward=[-centre[0]!,p.spring-centre[1]!,-centre[2]!];
   assert.ok(normal.reduce((n,v,j)=>n+v*out[j]!,0)>.3,'the chamfer must face the exterior as well as the opening');
   assert.ok(normal.reduce((n,v,j)=>n+v*toward[j]!,0)>0);
  }
 }
});

test('the rectangular reveal faces form the continuous nearest-wall envelope, with no exposed mitre spikes',()=>{
 const walls=ogiveArchitecture(15,false).bones.find((b:any)=>b.name==='ogive_intrados_0').cubes;
 const hit=(c:any,x:number,y:number)=>{
  const o=rotate([x-c.pivot[0],y-c.pivot[1],-20-c.pivot[2]],c.rotation,true),d=rotate([0,0,1],c.rotation,true);
  if(Math.abs(d[1]!)<1e-9)return Infinity;const t=-o[1]!/d[1]!,s=o[0]!+t*d[0]!,v=o[2]!+t*d[2]!;
  return s>=-1e-7&&s<=c.size[0]+1e-7&&v>=-1e-7&&v<=c.size[2]+1e-7?-20+t:Infinity;
 };
 for(let y=p.plinthTop+.13;y<p.peak;y+=.17)for(let x=-p.halfWidth;x<p.halfWidth;x+=.13){
  if(openingDistance(x,y)<.13)continue;
  const distances=ogiveOpening.slice(1).map((b:number[],i:number)=>{const a=ogiveOpening[i]!,dx=b[0]!-a[0]!,dy=b[1]!-a[1]!,l=Math.hypot(dx,dy);return ((x-a[0]!)*dy-(y-a[1]!)*dx)/l;});
  const expected=-p.face+Math.min(1,Math.min(...distances)/p.bevel)*(p.face-p.coreEdge),actual=Math.min(-p.coreEdge,...walls.map((c:any)=>hit(c,x,y)));
  assert.ok(Math.abs(actual-expected)<1e-6,'ray envelope must match the inset polygon, including facets and the pointed crown');
 }
});
test('arcades dress only exposed sides and share corner piers with neighboring bays',()=>{
 for(let mask=0;mask<16;mask++){
  const g=ogiveArchitecture(mask,false),sides=[0,1,2,3].filter(i=>mask&(1<<i)),corners=sides.filter(i=>mask&(1<<((i+3)%4)));
  assert.equal(g.bones.filter((b:any)=>b.name.startsWith('ogive_spandrel_')).length,sides.length);
  assert.equal(g.bones.filter((b:any)=>b.name.startsWith('pier_corner_')).length,corners.length);
  assert.equal(g.bones.filter((b:any)=>b.name.startsWith('pier_half_')).length,2*sides.length-2*corners.length);
  assert.ok(g.bones.find((b:any)=>b.name==='top').cubes.every((c:any)=>near(c.origin[1]+c.size[1],16)));
 }
});
test('whole reliefs fit the pointed field without clipping their upper corners',()=>{
 for(const [w,h]of [[8,6.6],[5.4,5.3]])for(const cy of [3.5,6.25]){
  const scale=ogiveReliefFit(w,h,cy,cy===3.5?.4:1);assert.ok(scale>0&&scale<=1);
  for(const sx of [-1,1])for(const sy of [-1,1])assert.ok(openingDistance(sx*w*scale/2,cy+sy*h*scale/2,ogiveRecess)>=.15-1e-7);
 }
});

test('universal cloths keep the same architecture, support height and direction of the central embroidery',()=>{
 for(let mask=0;mask<16;mask++){
  const body=(style:string)=>atelierGeometry('ogive',style,'none',0,mask).doc['minecraft:geometry'][0].bones.filter((b:any)=>!['top','tabletop_base'].includes(b.name)&&!b.name.startsWith('drape_')&&!b.name.startsWith('fold_corner_'));
  const bare=body('none');for(const style of styles){
   assert.deepEqual(body(style),bare);
   const g=atelierGeometry('ogive',style,'none',0,mask).doc['minecraft:geometry'][0],top=g.bones.find((b:any)=>b.name==='top').cubes[0];assert.ok(near(top.origin[1]+top.size[1],16));
   if(style!=='none'){
    const base=g.bones.find((b:any)=>b.name==='tabletop_base').cubes[0];assert.ok(near(base.origin[1]+base.size[1],top.origin[1]));
    assert.equal(g.bones.filter((b:any)=>b.name.startsWith('drape_')).length,[0,1,2,3].filter(i=>mask&(1<<i)).length);
   }
  }
 }
 for(const surface of ['marble','limestone','walnut'] as const)for(let f=0;f<4;f++){
  const m=collectionMaterials(sharedDesignFor('ogive',surface,'floral','none','purple'),2,f);
  assert.equal(m.arcade.texture,`altare_ogive_${m.stone.texture.replace('altare_','')}`);
  assert.equal(m.rail.texture,surface==='walnut'?'altare_joinery_walnut_horizontal':m.stone.texture);
  for(let side=0;side<4;side++)assert.equal(m[`cloth_${side}`].texture,`altare_textile_ruby_${side===f?2:0}_purple`);
 }
});

test('odd reliefs enter the recessed field and fit its pointed roof; even halves bear on the shared pier',()=>{
 const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 for(const style of styles)for(const frontal of ['cross','agnus'])for(let f=0;f<4;f++){
  const g=atelierGeometry('ogive',style,frontal,f,15).doc['minecraft:geometry'][0];
  for(const b of g.bones.filter((b:any)=>b.name.startsWith('applique_'))){
   const r=Number(b.name.slice(-1)),support=r===1?p.coreEdge:p.pierOuter;
   for(const c of b.cubes){
    const x=-(c.origin[0]+c.size[0]),z=c.origin[2],distances=[x,x+c.size[0]].flatMap(X=>[z,z+c.size[2]].map(Z=>X*dirs[f]![0]!+Z*dirs[f]![1]!));
    assert.ok(Math.min(...distances)<=support+1e-7&&Math.max(...distances)>support,'the plate must enter its physical backing');
    assert.ok(c.origin[1]>=p.reliefBottom-1e-7);
    assert.ok(c.origin[1]+c.size[1]<=Math.min(p.reliefTop,style==='none'?14:15.85-textileProfiles[style].drop-.35)+1e-7);
    if(r===1){
     const axis=f%2?2:0;for(const u of [c.origin[axis],c.origin[axis]+c.size[axis]])for(const y of [c.origin[1],c.origin[1]+c.size[1]])assert.ok(openingDistance(u,y,ogiveRecess)>=.15-1e-7);
    }
   }
  }
 }
});

test('rotated intrados and all dressed contours respect the support, exterior envelope and mesh ceilings',()=>{
 for(const style of styles)for(const frontal of ['none','cross','agnus'])for(let f=0;f<4;f++)for(let mask=0;mask<16;mask++){
  const g=atelierGeometry('ogive',style,frontal,f,mask).doc['minecraft:geometry'][0],cubes=g.bones.flatMap((b:any)=>b.cubes);
  assert.ok(cubes.length<=ogiveBudget.cubes);assert.ok(cubes.reduce((n:number,c:any)=>n+Object.values(c.uv).filter(Boolean).length,0)<=ogiveBudget.quads);
  for(const c of cubes){
   for(const uv of Object.values(c.uv) as any[])assert.ok(uv.uv.every((v:number,i:number)=>Number.isInteger(v)&&v>=0&&v+uv.uv_size[i]<=128));
   const pivot=c.pivot?[-c.pivot[0],c.pivot[1],c.pivot[2]]:[0,0,0],rotation=c.rotation?[-c.rotation[0],-c.rotation[1],c.rotation[2]]:[0,0,0];
   for(const ix of [0,1])for(const iy of [0,1])for(const iz of [0,1]){
    const v=c.origin.map((n:number,i:number)=>n+c.size[i]*[ix,iy,iz][i]!);v[0]*=-1;for(let i=0;i<3;i++)v[i]-=pivot[i];
    for(let axis=0;axis<3;axis++){const a=rotation[axis]*Math.PI/180,j=(axis+1)%3,k=(axis+2)%3,x=v[j],y=v[k];v[j]=x*Math.cos(a)-y*Math.sin(a);v[k]=x*Math.sin(a)+y*Math.cos(a);}
    for(let i=0;i<3;i++)v[i]+=pivot[i];assert.ok(v[1]>=-1e-6&&v[1]<=16+1e-6&&Math.abs(v[0])<=8.5&&Math.abs(v[2])<=8.5);
   }
  }
 }
});

test('cutout colors retain donor RGB under transparent pixels and borrow only their existing PBR maps',()=>{
 const donors=new Map([...definitions(),{id:'atelier_walnut',paint:walnutPaint}].map(d=>[d.id,d]));
 const defs=ogiveDefinitions();assert.equal(defs.length,3);
 for(const d of defs){
  assert.ok(d.alpha);assert.equal(d.size,128);assert.equal(d.id,`ogive_${d.mapSource}`);
  const donor=donors.get(d.mapSource)!;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const color=d.paint(x,y),base=donor.paint(x,y);assert.deepEqual({...color,alpha:255},{...base,alpha:255});assert.equal(color.alpha,ogiveMaskAlpha(x,y));
  }
 }
});
