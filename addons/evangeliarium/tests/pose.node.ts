import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'out/tests/pose.mjs');
fs.mkdirSync(path.dirname(output),{recursive:true});
await build({stdin:{contents:`export * from './src/presentation/pose.ts';export * from './tests/minecraft-mock.mjs';`,resolveDir:root},outfile:output,bundle:true,platform:'node',format:'esm',alias:{'@minecraft/server':path.join(root,'tests/minecraft-mock.mjs')}});
const {Poses,Player,ItemStack,world,reset,system}:any=await import(pathToFileURL(output).href);
beforeEach(()=>{reset();system.currentTick=100;});
function setup(){const p=new Player('carrier',world.dimension),calls:any[]=[];p.inventory.setItem(0,new ItemStack('evangeliarium:book'));p.playAnimation=(...args:any[])=>calls.push(args);world.players.push(p);return{p,poses:new Poses(),calls};}
test('porte envia uma vez, inclui novo observador e reinicia após troca de item',()=>{
 const {p,poses,calls}=setup();poses.tick();poses.tick();assert.equal(calls.length,1);
 const viewer=new Player('viewer',world.dimension);world.players.push(viewer);poses.tick();assert.equal(calls.length,2);assert.deepEqual(calls[1][1].players,[viewer]);
 p.selectedSlotIndex=1;poses.tick();assert.equal(poses.inspect(p).eligible,false);p.selectedSlotIndex=0;poses.tick();assert.equal(calls.length,3);
});
test('suspende porte nos estados incompatíveis e não emite em espectador',()=>{
 const {p,poses,calls}=setup();
 for(const state of ['isSwimming','isGliding','isSleeping','isEmoting']){p[state]=true;poses.tick();assert.equal(poses.inspect(p).eligible,false);p[state]=false;}
 p.mode='Spectator';poses.tick();assert.equal(calls.length,0);p.mode='Survival';poses.tick();assert.equal(calls.length,1);
});
test('falha da API é registrada, deduplicada e recuperada em nova tentativa',()=>{
 const {p,poses}=setup(),warnings:string[]=[];const warn=console.warn;
 console.warn=(text:string)=>warnings.push(text);
 try{p.playAnimation=()=>{throw Error('animation dispatch failed');};poses.tick();poses.tick();assert.equal(warnings.length,1);assert.match(poses.inspect(p).lastError,/dispatch failed/);p.playAnimation=()=>{};poses.tick();assert.equal(poses.inspect(p).lastError,undefined);assert.equal(poses.inspect(p).viewers,1);}finally{console.warn=warn;}
});
test('reconexão do observador e mudança de dimensão recebem nova pose',()=>{
 const {p,poses,calls}=setup();const viewer=new Player('viewer',world.dimension);world.players.push(viewer);poses.tick();poses.clear(viewer.id);poses.tick();assert.equal(calls.length,2);assert.deepEqual(calls[1][1].players,[viewer]);
 p.dimension={id:'minecraft:nether'};poses.tick();assert.equal(calls.length,3);assert.deepEqual(calls[2][1].players,[p]);
});
test('renova envio perdido durante carregamento sem depender de reentrada no slot',()=>{
 const {poses,calls}=setup();poses.tick();system.currentTick+=59;poses.tick();assert.equal(calls.length,1);system.currentTick++;poses.tick();assert.equal(calls.length,2);assert.equal(calls[0][1].controller,calls[1][1].controller);
});
