import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planLiturgy} from '../src/render-studio/liturgical-plan.js';
import {planEnvironment,SHAPES} from '../src/render-studio/voxel-plan.js';
import {normalizeStudioConfig} from '../src/shared/studio-contract.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../assets-src/studio/props-sources.json',import.meta.url)));
const overlap=(a,b)=>[0,2].every(i=>Math.abs(a.position[i]-b.position[i])<(a.size[i]+b.size[i])/2-.001);

test('native objects fit every supported altar size; counts, working space and supports remain valid',()=>{
 for(const candlePlacement of ['floor','mensa'])for(const furnishing of ['gold','wood'])for(const environment of ['gallery','chapel','studio'])for(let width=1;width<=16;width++)for(const depth of [1,2,8])for(const candles of [2,4,6,7]){
  const p=planLiturgy({environment,width,depth,candles,furnishing,candlePlacement},catalog);
  assert.equal(p.candleCount,candles);
  assert.ok(p.placements.filter(a=>a.role==='candle'&&a.support==='altar').every(a=>a.position[2]<0),'mensa candles face the nave, not the celebrant');
  assert.ok(p.placements.filter(a=>a.role==='candle'&&a.support!=='altar').every(a=>a.support==='platform'&&(Math.abs(a.position[0])>width/2||candles===7&&a.position[2]>=depth/2+2)));
  assert.ok(p.placements.find(a=>a.role==='crucifix').position[2]>=depth/2+6,'cross belongs to the apse');
  assert.equal(p.placements.filter(x=>x.role==='crucifix').length,1);
  for(const a of p.placements){
   assert.equal(a.scale,1);
   if(a.support==='altar'){
    assert.ok(Math.abs(a.position[0])+a.size[0]/2<=width/2,'fits altar width');
    assert.ok(Math.abs(a.position[2])+a.size[2]/2<=depth/2,'fits altar depth');
   }
   if(a.role==='candle'&&a.support==='altar')assert.ok(Math.abs(a.position[0])-a.size[0]/2>=.65,'central working surface stays free');
  }
  for(let i=0;i<p.placements.length;i++)for(let j=i+1;j<p.placements.length;j++)assert.ok(!overlap(p.placements[i],p.placements[j]),`objects overlap: ${width}x${depth} ${candles} ${environment} ${p.placements[i].id}/${p.placements[j].id}`);
 }
});

test('vessels, Gospel book and flowers follow distinct moments and seasons',()=>{
 const ready=planLiturgy({},catalog),gifts=planLiturgy({dressing:'gifts'},catalog);
 for(const textile of ['lace','floral','agnus'])assert.equal(planLiturgy({family:'classic',cloth:0,textile,color:'green'},catalog).active,true,'universal cloth must authorize the prepared scene regardless of the legacy cloth field');
 assert.ok(ready.placements.filter(p=>p.role==='vessel').every(p=>p.support==='credence'));
 assert.equal(ready.placements.filter(p=>p.id==='gospel').length,1);
 assert.ok(!gifts.placements.some(p=>p.id==='gospel'));
 assert.equal(gifts.placements.filter(p=>p.support==='corporal').length,3);
 for(const p of [ready,gifts])assert.ok(p.placements.filter(p=>p.role==='flowers').every(p=>p.support!=='altar'));
 for(const [season,n]of [['ordinary',2],['advent',1],['lent',0],['festive',2]]){
  const p=planLiturgy({season,color:'purple'},catalog);assert.equal(p.placements.filter(p=>p.role==='flowers').length,n);
 }
 for(const dimensions of [[1,1],[7,2],[16,8]]){
  const p=planLiturgy({dressing:'gifts',width:dimensions[0],depth:dimensions[1]},catalog);
  const corporal=p.linens.find(l=>l.role==='corporal');
  for(const vessel of p.placements.filter(a=>a.support==='corporal'))for(const i of [0,2])assert.ok(Math.abs(vessel.position[i]-corporal.position[i])+vessel.size[i]/2<=corporal.size[i]/2,'vessel stays fully on the corporal');
  for(let i=0;i<p.placements.length;i++)for(let j=i+1;j<p.placements.length;j++)assert.ok(!overlap(p.placements[i],p.placements[j]),'vessels must not intersect');
 }
});

test('scenery supports real objects and removes duplicate cross and flowering shrubs',()=>{
 for(const environment of ['gallery','chapel','studio']){
  const p=planLiturgy({environment,season:'lent'},catalog),scene=planEnvironment(environment,7,2,p);
  assert.ok(!scene.cells.some(c=>['gold','flowers'].includes(c.block)));
  for(const a of p.placements.filter(a=>['platform','pedestal'].includes(a.support))){
   const x=Math.floor(a.position[0]-scene.offset[0]),z=Math.floor(a.position[2]-scene.offset[2]);
   const heights=scene.cells.filter(c=>c.x===x&&c.z===z).flatMap(c=>SHAPES[c.shape].map(box=>c.y+box[4])).filter(y=>y<=a.position[1]+.001);
   assert.ok(Math.abs(Math.max(...heights)-a.position[1])<.001,`support missing: ${a.id}`);
  }
 }
});

test('bare or transparent presentations do not pretend to be a prepared liturgical altar',()=>{
 for(const config of [{dressing:'none'},{environment:'transparent'},{cloth:0},{family:'trestle',textile:'none'}])assert.equal(planLiturgy(config,{assets:[]}).active,false);
 assert.throws(()=>normalizeStudioConfig({candles:3}));assert.throws(()=>normalizeStudioConfig({season:'guess-from-color'}));
 assert.throws(()=>planLiturgy({}, {assets:[]}));
});
