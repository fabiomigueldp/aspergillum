import test from 'node:test';import assert from 'node:assert/strict';
import {buildNativePedestalStudy,appendOnlyManifest,encodePose,decodePose} from '../assets-src/atelier/twin-pedestal-codebook-study.mjs';
test('native build-time proof preserves every cell semantic state through persistence',()=>{
 const book=buildNativePedestalStudy();assert.equal(book.registered,false);assert.equal(book.stats.configurations,512);assert.equal(book.stats.instances,19584);assert.equal(book.stats.semanticProfiles,1216);assert.equal(book.stats.visualProfiles,995);assert.equal(book.declaredStates,1280);assert.equal(book.padding,64);assert.equal(book.stats.maxCubes,42);assert.equal(book.stats.maxBoxes,16);assert.deepEqual(book.missingPrevious,[]);
 for(const plan of book.plans)for(const cell of plan.cells){
  const index=decodePose(JSON.parse(JSON.stringify(cell.state)),book.stateDigits.page);assert.equal(index,cell.index);const record=book.records[book.manifest[index]];assert.equal(record.facing,plan.facing);assert.ok(book.visuals[record.visualKey]);
  const nx=plan.facing%2?plan.depth:plan.width,nz=plan.facing%2?plan.width:plan.depth,edges=(cell.z===0?1:0)|(cell.x===nx-1?2:0)|(cell.z===nz-1?4:0)|(cell.x===0?8:0);assert.equal(record.edges,edges);
 }
});
test('fixed-radix digits and append-only manifests never silently renumber old poses',()=>{
 for(let i=0;i<4096;i++)assert.equal(decodePose(encodePose(i),16),i);
 const previous=['z','a','r'];assert.deepEqual(appendOnlyManifest(['d','a','b'],previous),['z','a','r','b','d']);assert.deepEqual(previous,['z','a','r']);
 assert.throws(()=>appendOnlyManifest([],['a','a']),/Duplicate/);assert.throws(()=>encodePose(-1));assert.throws(()=>encodePose(4096));assert.throws(()=>decodePose({pose:0,bank:0,page:5},5));
});
