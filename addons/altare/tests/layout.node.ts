import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSurface, planFinish, edgeMask, positionKey, LIMIT, type Tile, type Position } from '../src/domain/surface.ts';
import { commitFinish } from '../src/application/finish.ts';
import { EditSessions } from '../src/application/sessions.ts';

const tile = (x: number, z: number, y = 4): Tile => ({ position: {x,y,z}, stone: 0, cloth: 1, frontal: 0, facing: 0, edges: 15 });
function grid(w: number, d: number) {
  const values = Array.from({length:w*d},(_,i)=>tile(i%w,Math.floor(i/w)));
  return new Map(values.map(t=>[positionKey(t.position),t]));
}
const config = { stone: 1, cloth: 3, ornamental: true, facing: 0 } as const;

test('before generation: rectangular surfaces have only exterior cloth, including 1×1 and long narrow altars',()=>{
  for (const [w,d] of [[1,1],[1,8],[3,2],[4,2],[7,3],[16,8]]) {
    const m=grid(w!,d!);
    const surface=collectSurface({x:0,y:4,z:0},p=>m.get(positionKey(p))??null);
    const plan=planFinish(surface,config);
    assert.equal(plan.length,w!*d!);
    let edges=0;
    for(const t of plan) for(let bit=1;bit<=8;bit*=2) if(t.edges&bit) edges++;
    assert.equal(edges,2*(w!+d!));
    assert.deepEqual([...m.values()].map(t=>t.cloth),Array(w!*d!).fill(1),'planning does not mutate the world');
  }
});
test('odd and even fronts have a single centered ornament in all four orientations',()=>{
  for(const [w,d] of [[3,2],[4,2],[1,1],[2,1],[5,5]]) for(let facing=0;facing<4;facing++) {
    const plan=planFinish([...grid(w!,d!).values()],{...config,facing});
    const front=plan.filter(t=>t.frontal>0);
    const width=facing%2===0?w!:d!;
    assert.equal(front.length,width);
    assert.equal(front.filter(t=>t.frontal===2).length,width%2);
    assert.equal(front.filter(t=>t.frontal===3).length,width%2===0?1:0);
    assert.equal(front.filter(t=>t.frontal===4).length,width%2===0?1:0);
    assert.ok(front.every(t=>(t.edges & (1<<facing))!==0));
  }
});
test('disconnected, holed, oversized and unloaded surfaces are rejected without partial plans',()=>{
  const hole=grid(3,3);hole.delete('1,4,1');
  assert.throws(()=>planFinish([...hole.values()],config),/rectangle/);
  assert.throws(()=>planFinish([tile(0,0),tile(2,0)],config),/rectangle/);
  const tooBig=grid(17,8);
  assert.throws(()=>collectSurface({x:0,y:4,z:0},p=>tooBig.get(positionKey(p))??null),/limit/);
  assert.throws(()=>collectSurface({x:0,y:4,z:0},p=>p.x===-1?undefined:tile(p.x,p.z)),/unloaded/);
  assert.throws(()=>planFinish([...grid(1,1).values()],{...config,cloth:99}),/configuration/);
  assert.equal(LIMIT,128);
});
test('neighbors on another level do not join the mensa; unresolved neighbors keep their previous edge',()=>{
  const m=new Map([tile(0,0),tile(1,0,5)].map(t=>[positionKey(t.position),t]));
  assert.equal(collectSurface({x:0,y:4,z:0},p=>m.get(positionKey(p))??null).length,1);
  assert.equal(edgeMask([false,true,false,true]),5);
  assert.equal(edgeMask([undefined,true,false,false],14),12);
});
test('style changes preserve the support position and do not write blocks above the altar',()=>{
  const before=[...grid(5,2).values()];
  const planned=planFinish(before,{...config,cloth:4});
  assert.deepEqual(planned.map(t=>t.position),before.map(t=>t.position));
  assert.equal(planned.length,before.length);
});
test('transaction preflights the entire surface and rolls back a failed write',()=>{
  const original=grid(3,2);const before=[...original.values()];const after=planFinish(before,config);
  let writes=0;const world=new Map(original);
  const port={ read:(p:Position)=>world.get(positionKey(p))??null, write:(t:Tile)=>{if(++writes===3)throw Error('injected');world.set(positionKey(t.position),t);} };
  assert.throws(()=>commitFinish(port,before,after),/write failed/);
  assert.deepEqual([...world.values()],before);
  world.delete(positionKey(before[4]!.position));writes=0;
  assert.throws(()=>commitFinish(port,before,after),/changed/);
  assert.equal(writes,0);
});
test('rollback failure is explicit and successful writes change only style/edge states',()=>{
  const before=[...grid(2,1).values()],after=planFinish(before,config);
  let calls=0;const world=new Map(before.map(t=>[positionKey(t.position),t]));
  const port={read:(p:Position)=>world.get(positionKey(p))??null,write:(t:Tile)=>{if(++calls>1)throw Error('unloaded');world.set(positionKey(t.position),t);}};
  assert.throws(()=>commitFinish(port,before,after),/rollback incomplete/);
});
test('sessions lock every cell, have one editor per player, expire, and release on lifecycle cancellation',()=>{
  const sessions=new EditSessions();const positions=[...grid(3,2).values()].map(t=>positionKey(t.position));
  const a=sessions.acquire('alice','overworld',positions,0);
  assert.ok(a);
  assert.equal(sessions.acquire('bob','overworld',[positions[3]!],1),undefined);
  assert.equal(sessions.acquire('alice','overworld',['other'],1),undefined);
  assert.ok(sessions.acquire('bob','nether',positions,1));
  assert.equal(sessions.isCurrent(a!,1200),false);
  sessions.releasePlayer('alice');
  assert.ok(sessions.acquire('carol','overworld',positions,1201));
  sessions.invalidate('overworld',positions[0]!);
  assert.ok(sessions.acquire('dave','overworld',positions,1202));
  sessions.release(a!); // an old callback must not release a newer owner
  assert.equal(sessions.acquire('eve','overworld',positions,1203),undefined);
});
