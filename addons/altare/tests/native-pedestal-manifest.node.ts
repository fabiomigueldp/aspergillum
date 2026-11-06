import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {NATIVE_BASE_POSES,NATIVE_CENTER_POSES,NATIVE_PLANS} from '../src/domain/native-pedestal-data.ts';
import {nativePoseFor,nativePoseData} from '../src/domain/native-pedestal-layout.ts';
const manifest=JSON.parse(fs.readFileSync(new URL('../assets-src/native-pedestal/poses.v1.json',import.meta.url),'utf8'));
test('authoritative pose contexts are source-versioned, complete, and agree with emitted runtime tables',()=>{
 assert.equal(manifest.schemaVersion,1);assert.equal(manifest.base.length,448);assert.equal(manifest.center.length,504);assert.deepEqual(NATIVE_CENTER_POSES,manifest.center);
 const seen=new Set<string>();for(let i=0;i<manifest.base.length;i++){
  const entry=manifest.base[i];assert.deepEqual(NATIVE_BASE_POSES[i],{facing:entry.facing,edges:entry.edges});assert.ok(entry.contexts.some((c:number[])=>c.join(',')===entry.representative.join(',')));
  for(const [w,d,f,x,z] of entry.contexts){const key=[w,d,f,x,z].join(',');assert.ok(!seen.has(key));seen.add(key);assert.equal(f,entry.facing);assert.equal(nativePoseFor(w,d,f,x,z,0,false),i);}
 }
 assert.equal(seen.size,33984);assert.equal(Object.keys(NATIVE_PLANS).length,768);
 assert.equal(nativePoseFor(1,1,0,0,0,0,false),0);assert.equal(nativePoseFor(1,1,0,0,0,1,true),0);assert.deepEqual(nativePoseData(0,true),{facing:0,edges:15,frontal:1});
});
test('persistent identity is an explicit index/context group, not the current art hash',()=>{
 for(const entry of manifest.base){assert.ok(!('hash' in entry));assert.ok(!('visualKey' in entry));assert.ok(entry.contexts.length>0);}
 const before=JSON.stringify(manifest),refinement=structuredClone(manifest);(refinement as any).artReview='Changed wood finish';assert.deepEqual(refinement.base,manifest.base);assert.deepEqual(refinement.center,manifest.center);assert.equal(JSON.stringify(manifest),before);
});
