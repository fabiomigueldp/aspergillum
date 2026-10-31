import test from 'node:test';
import assert from 'node:assert/strict';
import {commitFinish} from '../src/application/finish.ts';
import {planFinish,positionKey,type Tile,type Position} from '../src/domain/surface.ts';
import {designFor} from '../src/domain/catalog.ts';
import {formatFailure} from '../src/presentation/diagnostic.ts';

test('unregistered target permutations are rejected before any altar cell is written',()=>{
 const before:Tile[]=Array.from({length:14},(_,i)=>({position:{x:i%7,y:4,z:Math.floor(i/7)},stone:0,cloth:1,frontal:0,facing:0,edges:15}));
 const after=planFinish(before,{stone:0,cloth:0,ornamental:false,facing:0,design:designFor('trestle','walnut','agnus','none').id});
 const world=new Map(before.map(t=>[positionKey(t.position),t]));let writes=0;
 const rootCause=Error('Unknown block altare:a_trestle_walnut_agnus_none');
 const port={read:(p:Position)=>world.get(positionKey(p)),prepare:(tiles:readonly Tile[])=>{assert.deepEqual(tiles,[...after,...before]);throw rootCause;},write:(t:Tile)=>{writes++;world.set(positionKey(t.position),t);}};
 assert.throws(()=>commitFinish(port,before,after),(error:Error)=>error.message==='prepare failed; no blocks changed'&&error.cause===rootCause);
 assert.equal(writes,0);assert.deepEqual([...world.values()],before);
});

test('Content Log diagnostics preserve the real cause and bound cyclic/large errors',()=>{
 const cause=Error('Unknown block altare:a_trestle_walnut_agnus_none');
 const error=Error('prepare failed; no blocks changed',{cause});
 assert.match(formatFailure(error),/prepare failed.*Unknown block altare:a_trestle_walnut_agnus_none/);
 cause.cause=error;assert.ok(formatFailure(error).length<400);
 assert.ok(formatFailure(Error('x'.repeat(5000))).length<=1200);
 assert.equal(formatFailure('bad\nline'),'bad line');
});
