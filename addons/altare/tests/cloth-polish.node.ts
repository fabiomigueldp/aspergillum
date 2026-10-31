import test from 'node:test';
import assert from 'node:assert/strict';
import {textilePaint,textileArtDomain} from '../assets-src/atelier/materials.mjs';
import {textileProfiles} from '../assets-src/atelier/profiles.mjs';
import {atelierGeometry} from '../assets-src/atelier/geometry.mjs';

test('the green orphrey has a straight upper border independently of the scallop phase',()=>{
 const border:number[]=[];
 for(const x of [4,12,20,28,36,44,52,60]){
  for(let y=0;y<50;y+=.25){const {rgb:[r,g,b]}=textilePaint(x,y,'verdant');if(g>r*1.3&&g>b*1.4){border.push(y);break;}}
 }
 assert.equal(border.length,8);assert.ok(Math.max(...border)-Math.min(...border)<=1,`border wanders ${border}`);
});

test('emblems fit above every scallop and silver embroidery has its own non-emissive metal response',()=>{
 for(const theme of ['agnus','ruby','verdant','requiem']){
  const d=textileArtDomain(theme);assert.ok(d.top>0&&d.bottom<.98-textileProfiles[theme].scallop);
  const logicalHeight=(d.bottom-d.top)/d.sourceBottom;
  const sourcePixelX=textileProfiles[theme].drop*logicalHeight*d.aspect/757;
  const sourcePixelY=textileProfiles[theme].drop*logicalHeight/245;
  assert.ok(Math.abs(sourcePixelX-sourcePixelY)<1e-10,'anisotropic emblem sampling');
 }
 let threads=0,cloth=0;
 for(let x=0;x<128;x+=2)for(let y=6;y<100;y+=2){
  const s=textilePaint(x,y,'requiem');
  if(Math.min(...s.rgb)>160&&Math.max(...s.rgb)-Math.min(...s.rgb)<20){assert.ok(s.metal>60&&s.rough<225);threads++;}
  if(Math.max(...s.rgb)<35){assert.equal(s.metal,0);cloth++;}
 }
 assert.ok(threads>30&&cloth>500);
 const d=textileArtDomain('requiem'),dividerY=128*(d.top+(d.bottom-d.top)/d.sourceBottom*.96);
 for(let x=0;x<128;x+=2)for(const role of [0,1,2,3])assert.ok(Math.max(...textilePaint(x,dividerY,'requiem',role).rgb)<50,'atlas divider leaked below the embroidery');
 const ruby=textileArtDomain('ruby'),span=(ruby.bottom-ruby.top)/ruby.sourceBottom;
 for(const color of ['white','red','green','purple','rose','black','gold','silver'])for(const sign of [-1,1]){
  const x=64+sign*.14*textileProfiles.ruby.drop*8*span*ruby.aspect,y=128*(ruby.top+span*.9);
  assert.deepEqual(textilePaint(x,y,'ruby',1,color),textilePaint(x,y,'ruby',0,color),'rectangular donor patch outside the oval cartouche');
 }
 for(const x of [60,64,68])assert.ok(Math.min(...textilePaint(x,128*(ruby.top+span*.95),'ruby',1,'white').rgb)>170,'red atlas rule below the pale floral cartouche');
 const agnus=textileArtDomain('agnus'),agnusSpan=(agnus.bottom-agnus.top)/agnus.sourceBottom;
 for(const sign of [-1,1]){
  const x=64+sign*.14*textileProfiles.agnus.drop*8*agnusSpan*agnus.aspect,y=128*(agnus.top+agnusSpan*.9);
  assert.deepEqual(textilePaint(x,y,'agnus',1),textilePaint(x,y,'agnus',0),'cropped donor ornament outside the Agnus oval');
 }
 for(const x of [55,64,73])assert.ok(Math.min(...textilePaint(x,128*(agnus.top+agnusSpan*.977),'agnus',1).rgb)>180,'atlas divider below the Agnus fringe');
});

const faceNames=['north','east','south','west'];
// Transform the actual serialized face endpoints back into authored world space.
function endpoints(c:any,face:string,t:number):number[][] {
 const o=[-(c.origin[0]+c.size[0]),c.origin[1],c.origin[2]],s=c.size;
 const fixed=face==='north'?[[0,0],[1,0]]:face==='south'?[[0,1],[1,1]]:face==='west'?[[0,0],[0,1]]:[[1,0],[1,1]];
 const pivot=c.pivot?[-c.pivot[0],c.pivot[1],c.pivot[2]]:[0,0,0],r=c.rotation?[-c.rotation[0],-c.rotation[1],c.rotation[2]]:[0,0,0];
 return fixed.map(([x,z])=>{
  let v=[o[0]+s[0]*x!,o[1]+s[1]*t,o[2]+s[2]*z!].map((n,i)=>n-pivot[i]);
  for(let axis=0;axis<3;axis++){const a=r[axis]*Math.PI/180,j=(axis+1)%3,k=(axis+2)%3,x=v[j]!,y=v[k]!;v[j]=x*Math.cos(a)-y*Math.sin(a);v[k]=x*Math.sin(a)+y*Math.cos(a);}
  return v.map((n,i)=>n+pivot[i]);
 });
}
const distance=(a:number[],b:number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
test('cloth facets and stitched corners meet at each shared physical height in all directions',()=>{
 for(const theme of ['agnus','ruby','verdant','requiem'])for(let facing=0;facing<4;facing++){
  const g=atelierGeometry('pilaster',theme,'none',facing).doc['minecraft:geometry'][0];
  for(const fraction of [0,.25,.5,.75,.98])for(let side=0;side<4;side++){
   const y=15.85-textileProfiles[theme].drop*fraction,face=faceNames[side]!;
   const at=(c:any,f:string)=>endpoints(c,f,(y-c.origin[1])/c.size[1]);
   const strip=g.bones.find(b=>b.name===`drape_${side}`)!.cubes.slice(0,2).map(c=>at(c,face));
   assert.ok(Math.min(...strip[0]!.flatMap(a=>strip[1]!.map(b=>distance(a,b))))<1e-6);
   const corner=g.bones.find(b=>b.name===`fold_corner_${side}`)!.cubes[0]!,previous=(side+3)%4;
   const prev=g.bones.find(b=>b.name===`drape_${previous}`)!.cubes.slice(0,2).flatMap(c=>at(c,faceNames[previous]!));
   for(const p of at(corner,face))assert.ok(Math.min(...[...strip.flat(),...prev].map(q=>distance(p,q)))<1e-6,`${theme} corner ${side} at y=${y}`);
  }
 }
});
