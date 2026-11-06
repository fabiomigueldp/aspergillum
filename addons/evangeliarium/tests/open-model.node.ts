import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=(name:string)=>JSON.parse(fs.readFileSync(path.join(root,'packs/resource',name),'utf8'));
const model=(book:string,kind:string)=>read(`models/entity/${book}_${kind}.geo.json`)['minecraft:geometry'][0];
const animations=read('animations/book.animation.json').animations;
const opened=animations['animation.evangeliarium.open'].bones,closed=animations['animation.evangeliarium.closed'].bones;
type V=number[];
// Same canonical Bedrock coordinate conversion as viewer-3d's geometry adapter:
// X/Z angles change sign; Y is retained. Apply local scale, then X/Y/Z rotations.
function transform(point:V,pivot:V,rotation:V,scale:V):V{
 let v=point.map((value,i)=>(value-pivot[i]!)*scale[i]!);
 for(let axis=0;axis<3;axis++){
  const angle=rotation[axis]!*Math.PI/180*(axis===1?1:-1),c=Math.cos(angle),s=Math.sin(angle),[x,y,z]=v as [number,number,number];
  v=axis===0?[x,c*y-s*z,s*y+c*z]:axis===1?[c*x+s*z,y,-s*x+c*z]:[c*x-s*y,s*x+c*y,z];
 }
 return v.map((value,i)=>value+pivot[i]!);
}
function bonePoint(data:any,name:string,point:V,progress?:number):V{
 const by=new Map<string,any>(data.bones.map((bone:any)=>[bone.name,bone]));
 let p=point;
  for(let b=by.get(name);b;b=by.get(b.parent)){
   let rotation=b.rotation??[0,0,0],scale=[1,1,1];
   if(progress!==undefined&&opened[b.name]){
    rotation=rotation.map((value:number,i:number)=>value+(closed[b.name]?.rotation?.[i]??0)*(1-progress)+(opened[b.name].rotation?.[i]??0)*progress);
    scale=scale.map((_,i)=>(closed[b.name]?.scale?.[i]??1)*(1-progress)+(opened[b.name].scale?.[i]??1)*progress);
   }
   assert.ok(scale.every(value=>value>0),'No inversion or zero-scale geometry');p=transform(p,b.pivot??[0,0,0],rotation,scale);
  }
 return p;
}
function vertices(data:any,progress?:number):number[][]{
 const points:number[][]=[];
 for(const bone of data.bones)for(const cube of bone.cubes??[])for(let corner=0;corner<8;corner++){
  let p=cube.origin.map((value:number,i:number)=>value+((corner>>i)&1)*cube.size[i]);
  if(cube.rotation)p=transform(p,cube.pivot??cube.origin.map((value:number,i:number)=>value+cube.size[i]/2),cube.rotation,[1,1,1]);
  p=bonePoint(data,bone.name,p,progress);
  points.push(p);
 }
 return points;
}
for(const book of ['book','missal','pontifical']){
 test(`${book}: open/closed estáticos coincidem com os extremos da animação`,()=>{
  const animated=model(book,'animated');
  for(const [kind,progress]of [['closed',0],['open',1]] as const){
   const fixed=model(book,kind),a=vertices(animated,progress),b=vertices(fixed);assert.equal(a.length,b.length);
   for(let i=0;i<a.length;i++)for(let axis=0;axis<3;axis++)assert.ok(Math.abs(a[i]![axis]!-b[i]![axis]!)<1e-5,`${kind}: vertex ${i}, axis ${axis}`);
   for(let i=0;i<fixed.bones.length;i++)assert.deepEqual(fixed.bones[i].cubes?.map((c:any)=>c.uv),animated.bones[i].cubes?.map((c:any)=>c.uv));
  }
  for(const name of ['front_cover','binding_shell','ribbon_tips'])assert.ok(animated.bones.some((bone:any)=>bone.name===name));
 });
 test(`${book}: 51 fases mantêm apoio, bounds, faces e UVs válidos`,()=>{
  const data=model(book,'animated'),description=data.description;
  for(let step=0;step<=50;step++)for(const point of vertices(data,step/50)){
   assert.ok(point[1]!>=-1e-5,`Below support at phase ${step}: ${point}`);
   for(let axis=0;axis<3;axis++){
    const half=(axis===1?description.visible_bounds_height:description.visible_bounds_width)*8,center=description.visible_bounds_offset[axis]*16;
    assert.ok(Math.abs(point[axis]!-center)<=half+1e-5,`Outside bounds at phase ${step}`);
   }
  }
  for(const bone of data.bones)for(const cube of bone.cubes??[]){
   assert.ok(cube.size.every((n:number)=>Number.isFinite(n)&&n>0));assert.ok(Object.keys(cube.uv).length>0);
   for(const face of Object.values(cube.uv) as any[])for(let i=0;i<2;i++)assert.ok(Number.isInteger(face.uv[i])&&face.uv[i]>=0&&face.uv_size[i]>0&&face.uv[i]+face.uv_size[i]<=(i?description.texture_height:description.texture_width));
  }
  assert.deepEqual(model(book,'held').bones[0],{name:'evangeliarium_bound',pivot:[0,0,0],binding:'q.item_slot_to_bone_name(context.item_slot)'});
 });
}
// Test actual exported geometry in the page coordinate frame, so a ribbon must
// stay strictly behind the printed north face, not merely outside a text glyph.
for(const [book,count] of [['book',2],['missal',5],['pontifical',3]] as const){
 test(`${book}: fitas entre folhas não cobrem impressão e pontas permanecem ligadas em 51 fases`,()=>{
  const data=model(book,'animated');
  data.bones.find((bone:any)=>bone.name==='book_presentation').rotation=[0,0,0];
  const body=data.bones.find((bone:any)=>bone.name==='ribbons');
  const paper=data.bones.find((bone:any)=>bone.name==='right_pages').cubes[0];
  const tipBones=data.bones.filter((bone:any)=>bone.name.startsWith('ribbon_tip_')&&bone.cubes?.length);
  assert.equal(body.cubes.length,count);assert.equal(tipBones.length,count);
  for(let step=0;step<=50;step++){
   const progress=step/50;
   for(const bone of [body,...tipBones])for(const cube of bone.cubes)for(let corner=0;corner<8;corner++){
    const point=bonePoint(data,bone.name,cube.origin.map((v:number,i:number)=>v+((corner>>i)&1)*cube.size[i]),progress);
    assert.ok(point[2]!>paper.origin[2]+.01,`${bone.name}: fita sobre a superfície impressa na fase ${step}`);
   }
   for(const tip of tipBones){
    const c=tip.cubes[0],stem=body.cubes.find((b:any)=>Math.abs(b.origin[0]-c.origin[0])<1e-6);
    assert.ok(stem,`${tip.name}: corpo correspondente`);
    assert.equal(c.size[0],stem.size[0]);
    // The full width of the fold's front hinge edge stays coincident with the
    // body's bottom edge. The thickness rotates into the body, never a gap.
    for(const x of [c.origin[0],c.origin[0]+c.size[0]]){
     const tipEdge=bonePoint(data,tip.name,[x,c.origin[1]+c.size[1],c.origin[2]],progress);
     const bodyEdge=bonePoint(data,body.name,[x,stem.origin[1],stem.origin[2]],progress);
     for(let axis=0;axis<3;axis++)assert.ok(Math.abs(tipEdge[axis]!-bodyEdge[axis]!)<1e-5,`${tip.name}: ponta desligada na fase ${step}`);
    }
   }
  }
 });
}
test('Gospel: corte lateral usa tile alto com linhas na espessura, sem sobrepor atlas',async()=>{
 const {tiles,paint}=await import('../assets-src/design.mjs');const tile=tiles.edgeTall;
 for(const kind of ['held','closed','open','animated'])for(const side of ['left_pages','right_pages']){
  const paper=model('book',kind).bones.find((bone:any)=>bone.name===side).cubes[0];
  for(const face of ['east','west'])assert.deepEqual(paper.uv[face],{uv:tile.slice(0,2),uv_size:tile.slice(2)});
 }
 const rects=Object.entries(tiles).map(([id,t])=>({id,x:t[0]!-2,y:t[1]!-2,w:t[2]!+4,h:t[3]!+4}));
 for(let i=0;i<rects.length;i++){
  const a=rects[i]!;assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=256&&a.y+a.h<=256);
  for(const b of rects.slice(i+1))assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${a.id}/${b.id}`);
 }
 const mean=(x:number)=>Array.from({length:96},(_,y)=>paint('edgeTall',x,y,12,96).rgb[0]).reduce((a,b)=>a+b,0)/96;
 assert.ok(mean(1)-mean(0)>10);assert.ok(mean(2)-mean(3)>10);
});

for(const book of ['book','missal','pontifical']){
 test(`${book}: faces externas do mesmo bone não se sobrepõem no mesmo plano`,()=>{
  // A shared edge has zero area and is valid. Coincident rectangles facing the
  // same direction create z-fighting even when their materials happen to match.
  for(const kind of ['held','closed','open','animated'])for(const bone of model(book,kind).bones){
   const faces:{plane:number,axis:number,side:string,lo:number[],hi:number[],cube:number}[]=[];
   for(const [index,cube]of (bone.cubes??[]).entries()){
    assert.ok(!cube.rotation||cube.rotation.every((n:number)=>n===0),'Extend face-plane audit before introducing rotated cubes');
    for(const [side,axis,positive]of [['west',0,false],['east',0,true],['down',1,false],['up',1,true],['north',2,false],['south',2,true]] as const){
     if(!cube.uv[side])continue;
     const other=[0,1,2].filter(i=>i!==axis);
     faces.push({plane:cube.origin[axis]+(positive?cube.size[axis]:0),axis,side,lo:other.map(i=>cube.origin[i]),hi:other.map(i=>cube.origin[i]+cube.size[i]),cube:index});
    }
   }
   for(let i=0;i<faces.length;i++)for(const b of faces.slice(i+1)){
    const a=faces[i]!;
    if(a.cube===b.cube||a.axis!==b.axis||a.side!==b.side||Math.abs(a.plane-b.plane)>1e-6)continue;
    assert.ok(![0,1].every(axis=>Math.min(a.hi[axis]!,b.hi[axis]!)-Math.max(a.lo[axis]!,b.lo[axis]!)>1e-6),`${kind}/${bone.name}: cubes ${a.cube}/${b.cube} overlap on ${a.side}`);
   }
  }
 });
}

for(const book of ['book','missal','pontifical']){
 test(`${book}: pivô da lombada segue espessura e não atravessa o verso aberto`,()=>{
  for(const kind of ['held','closed','open','animated']){
   const data=model(book,kind),shell=data.bones.find((b:any)=>b.name==='binding_shell');
   const cover=data.bones.find((b:any)=>b.name==='back_cover').cubes[0];
   const outside=cover.origin[2]+cover.size[2];
   assert.ok(Math.abs(shell.pivot[2]-(outside-.18))<1e-6,`${kind}: pivô deve seguir a espessura deste livro`);
  }
  const data=model(book,'animated');
  data.bones.find((b:any)=>b.name==='book_presentation').rotation=[0,0,0];
  const shell=data.bones.find((b:any)=>b.name==='binding_shell');
  const cover=data.bones.find((b:any)=>b.name==='back_cover').cubes[0];
  const outside=cover.origin[2]+cover.size[2];
  for(const cube of shell.cubes)for(let corner=0;corner<8;corner++){
   const p=bonePoint(data,shell.name,cube.origin.map((v:number,i:number)=>v+((corner>>i)&1)*cube.size[i]),1);
   assert.ok(p[2]!<outside-1e-5,'Lombada aberta deve ficar antes do plano exterior do verso');
  }
 });
}

for(const book of ['missal','pontifical']){
 test(`${book}: nervuras conservam faces laterais expostas além da lombada`,()=>{
  const author=JSON.parse(fs.readFileSync(path.join(root,`assets-src/liturgical-books/${book}.author.json`),'utf8'));
  const cubes=author.bones.find((b:any)=>b.name==='binding_shell').cubes;
  const bands=cubes.map((c:any,i:number)=>c.name.startsWith('Raised spine band ')?i:-1).filter((i:number)=>i>=0);
  assert.equal(bands.length,4);
  for(const kind of ['held','closed','open','animated']){
   const exported=model(book,kind).bones.find((b:any)=>b.name==='binding_shell').cubes;
   for(const index of bands)assert.ok(exported[index].uv.east,`${kind}: face east exposta da nervura ${index} não pode ser omitida`);
  }
 });
}

for(const book of ['book','missal','pontifical']){
 test(`${book}: seleção acompanha cada estado nas quatro orientações com margem pequena`,()=>{
  const block=JSON.parse(fs.readFileSync(path.join(root,`packs/behavior/blocks/${book}.block.json`),'utf8'))['minecraft:block'];
  assert.equal(block.components['minecraft:collision_box'],false);
  for(const kind of ['closed','open']){
   const box=kind==='closed'?block.components['minecraft:selection_box']:block.permutations.find((p:any)=>p.condition==="q.block_state('evangeliarium:open')").components['minecraft:selection_box'];
   const points=vertices(model(book,kind));
   for(let axis=0;axis<3;axis++){
    const minimum=Math.min(...points.map(p=>p[axis]!)),maximum=Math.max(...points.map(p=>p[axis]!));
    assert.ok(minimum-box.origin[axis]>=-1e-6&&minimum-box.origin[axis]<=.15011);
    assert.ok(box.origin[axis]+box.size[axis]-maximum>=.14999&&box.origin[axis]+box.size[axis]-maximum<=.15011);
   }
   for(const direction of [0,90,180,-90]){
    const corners=Array.from({length:8},(_,c)=>transform(box.origin.map((v:number,i:number)=>v+((c>>i)&1)*box.size[i]),[0,0,0],[0,direction,0],[1,1,1]));
    for(const p of points){
     const rotated=transform(p,[0,0,0],[0,direction,0],[1,1,1]);
     for(let axis=0;axis<3;axis++)assert.ok(rotated[axis]!>=Math.min(...corners.map(c=>c[axis]!))-1e-6&&rotated[axis]!<=Math.max(...corners.map(c=>c[axis]!))+1e-6);
    }
   }
  }
  for(const [state,angle]of [[1,90],[2,180],[3,-90]])assert.deepEqual(block.permutations.find((p:any)=>p.condition===`q.block_state('evangeliarium:direction') == ${state}`).components['minecraft:transformation'].rotation,[0,angle,0]);
 });
}

test('poses específicas mantêm orientação da capa e calibração do Evangeliário',async()=>{
 const {pose,poseForBook}=await import('../assets-src/pose.mjs');
 assert.deepEqual(poseForBook('gospel'),pose);assert.deepEqual(poseForBook('book'),pose);
 assert.deepEqual(pose.rightArm,[-85,-25,-10]);assert.deepEqual(pose.leftArm,[-85,25,10]);
 for(const book of ['missal','pontifical']){
  const p=poseForBook(book);
  assert.deepEqual(p.firstRotation,pose.firstRotation);assert.deepEqual(p.firstPosition,pose.firstPosition);
  assert.equal(p.rightArm[1],-p.leftArm[1]);
  for(const axis of [[1,0,0],[0,1,0],[0,0,1]]){
   const expected=transform(transform(axis,[0,0,0],pose.presentationRotation,[1,1,1]),[0,0,0],pose.rightArm,[1,1,1]);
   const actual=transform(transform(axis,[0,0,0],p.presentationRotation,[1,1,1]),[0,0,0],p.rightArm,[1,1,1]);
   for(let i=0;i<3;i++)assert.ok(Math.abs(actual[i]!-expected[i]!)<1e-7);
  }
  const attach=read(`attachables/${book}.attachable.json`)['minecraft:attachable'].description;
  assert.equal(attach.animations.third,`animation.evangeliarium.hold.third.${book}`);
  assert.ok(animations[attach.animations.third]);assert.equal(attach.animations.first,'animation.evangeliarium.hold.first');
 }
 assert.equal(read('attachables/book.attachable.json')['minecraft:attachable'].description.animations.third,'animation.evangeliarium.hold.third');
 const carry=animations['animation.evangeliarium.player.carry'].bones;
 for(const arm of ['rightarm','leftarm'])for(const expression of carry[arm].rotation){
  assert.ok(expression.includes("q.is_item_name_any('slot.weapon.mainhand',0,'evangeliarium:missal')"));
  assert.ok(expression.includes("q.is_item_name_any('slot.weapon.mainhand',0,'evangeliarium:pontifical')"));
 }
});

for(const book of ['book','missal','pontifical']){
 test(`${book}: terminais da lombada usam couro, sem repetir estampas comprimidas`,()=>{
  for(const kind of ['held','closed','open','animated']){
   const data=model(book,kind),shell=data.bones.find((b:any)=>b.name==='binding_shell');
   // The structural core and optional crown use the vertical spine panel on
   // their long sides. Short end caps must not repeat that full-height artwork.
   const structural=shell.cubes.filter((c:any)=>c.uv.west?.uv?.[0]===2&&c.uv.west?.uv?.[1]===104);
   assert.equal(structural.length,book==='book'?1:2);
   for(const cube of structural)for(const face of ['up','down']){
    assert.deepEqual(cube.uv[face],{uv:[22,122],uv_size:[16,16]},`${kind}: ${face}`);
   }
  }
 });
}
