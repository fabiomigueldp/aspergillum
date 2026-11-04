import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {encodeTile,decodeTile} from '../src/domain/block-codec.ts';
import {planFinish,positionKey,type Tile} from '../src/domain/surface.ts';
import {ATELIER_DESIGNS,LEGACY_ID} from '../src/domain/catalog.ts';
import {BASELINE_COMMIT,CLASSIC_REFERENCE_POSES,auditCartesianDomains,auditSingleBreaks,auditSnapshotDocument,diagnoseSnapshot,plannedRectangle,simulateBreak,simulatePlacement} from '../tools/lib/compact-compatibility-diagnostic.ts';

const id='altare:a_pilaster_marble_agnus_none';
const altarRoot=path.resolve(import.meta.dirname,'..');
const cli=path.join(altarRoot,'tools/audit-compact-compatibility.mjs');
const raw=(edges=5,role=1,facing=0)=>({id,states:{'altare:edges':edges,'altare:role':role,'altare:facing':facing}});
const envelope=(entries:unknown[])=>({schemaVersion:1,baselineCommit:BASELINE_COMMIT,entries});
const located=(entry:unknown)=>({dimension:'minecraft:overworld',position:{x:1,y:64,z:0},...entry as object});

test('diagnostic source fingerprints pin the c0d4310 runtime without importing a compact runtime',()=>{
 const baseline=JSON.parse(fs.readFileSync(path.join(altarRoot,'tools/fixtures/compact-diagnostic-baseline.json'),'utf8'));
 assert.equal(baseline.baselineCommit,BASELINE_COMMIT);
 for(const [file,hash] of Object.entries(baseline.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(altarRoot,file))).digest('hex'),hash,file);
 assert.equal(CLASSIC_REFERENCE_POSES.length,50);assert.equal(new Set(CLASSIC_REFERENCE_POSES.map(p=>p.join(','))).size,50);
 // Independent published research hash used objects rather than integer pairs.
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(CLASSIC_REFERENCE_POSES.map(([edges,frontal])=>({edges,frontal})))).digest('hex'),'f66361d205f1805def0943dbb0a510e0b1808bafb53fa4cb99bb2c0764dccfbd');
});

test('ordinary single breaks create incompatible decorated poses in every facing',()=>{
 for(let facing=0;facing<4;facing++){
  const original=plannedRectangle(facing%2?1:3,facing%2?3:1,facing,id),saved=structuredClone(original);
  assert.ok(original.every(t=>diagnoseSnapshot(encodeTile(t)).status==='representable'));
  const after=simulateBreak(original,original[0]!.position);
  const center=after.find(t=>t.frontal===1)!;
  assert.equal(diagnoseSnapshot(encodeTile(center)).status,'incompatible');
  assert.equal(center.frontal,1);assert.deepEqual(original,saved);
 }
 const original=plannedRectangle(3,1,0,id),after=simulateBreak(original,original[0]!.position);
 assert.deepEqual(encodeTile(after.find(t=>t.position.x===1)!).states,{'altare:edges':13,'altare:facing':0,'altare:role':1});
});

test('the same apply-break risk exists for classic Mensa, including four facings',()=>{
 for(let facing=0;facing<4;facing++){
  const original=plannedRectangle(facing%2?1:3,facing%2?3:1,facing,LEGACY_ID);
  assert.ok(original.every(t=>diagnoseSnapshot(encodeTile(t)).status==='representable'));
  const after=simulateBreak(original,original[0]!.position);
  assert.ok(after.some(t=>diagnoseSnapshot(encodeTile(t)).status==='incompatible'));
 }
});

test('break, JSON round trip, replacement and explicit reapplication remain distinct operations',()=>{
 const original=plannedRectangle(3,1,0,id),removed=original[0]!;
 const broken=simulateBreak(original,removed.position);
 const serialized=JSON.stringify(broken.map(t=>({position:t.position,...encodeTile(t)})));
 const decoded:Tile[]=JSON.parse(serialized).map((s:{id:string;position:{x:number;y:number;z:number};states:Record<string,number>})=>decodeTile(s.id,s.position,s.states)!);
 assert.ok(decoded.some(t=>diagnoseSnapshot(encodeTile(t)).status==='incompatible'));
 const replaced=simulatePlacement(decoded,decoded[0]!,removed.position);
 assert.ok(replaced.every(t=>diagnoseSnapshot(encodeTile(t)).status==='representable'));
 assert.equal(replaced.find(t=>positionKey(t.position)===positionKey(removed.position))!.frontal,0);
 const reapplied=planFinish(broken,{stone:0,cloth:1,ornamental:true,facing:0,design:id});
 assert.deepEqual(reapplied.map(t=>t.frontal).sort(),[2,3]);
 assert.ok(reapplied.every(t=>diagnoseSnapshot(encodeTile(t)).status==='representable'));
 assert.ok(broken.some(t=>diagnoseSnapshot(encodeTile(t)).status==='incompatible'),'diagnostic/reapply must not mutate the old snapshot');
});

test('multi-break surfaces retain legacy role; unknown neighbours are not treated as air',()=>{
 const original=plannedRectangle(5,2,0,id),initial=structuredClone(original);
 const first=simulateBreak(original,{x:1,y:64,z:0});
 const second=simulateBreak(first,{x:2,y:64,z:1});
 assert.ok(second.some(t=>diagnoseSnapshot(encodeTile(t)).status==='incompatible'));
 assert.deepEqual(original,initial);
 const three=plannedRectangle(3,1,0,id),removed=three[0]!,center=three[1]!;
 const unknown=simulateBreak(three,removed.position,new Set([positionKey(removed.position)]));
 assert.equal(unknown.find(t=>positionKey(t.position)===positionKey(center.position))!.edges,center.edges);
 assert.throws(()=>simulateBreak(three,{x:99,y:64,z:0}),/absent/);
 assert.throws(()=>simulatePlacement(three,center,center.position),/existing/);
});

test('every legacy Cartesian combination is classified, without silently normalizing bare roles',()=>{
 assert.deepEqual(auditCartesianDomains(),{
  atelier:{representable:14688,'normalization-required':1728,incompatible:18144,invalid:0,unassessed:0},
  classic:{representable:3000,'normalization-required':0,incompatible:8520,invalid:0,unassessed:0},
 });
 const bare={...raw(),id:'altare:a_pilaster_marble_none_none'},saved=structuredClone(bare);
 assert.equal(diagnoseSnapshot(bare).status,'normalization-required');assert.deepEqual(bare,saved);
});

test('all 135 Atelier recipes have representable or explicit-normalization poses across the 512 rectangular layouts',()=>{
 for(const d of ATELIER_DESIGNS)for(let width=1;width<=16;width++)for(let depth=1;depth<=8;depth++)for(let facing=0;facing<4;facing++){
  for(const tile of plannedRectangle(width,depth,facing,d.id)){
   const result=diagnoseSnapshot(encodeTile(tile));
   assert.notEqual(result.status,'incompatible',`${d.id} ${width}x${depth} facing ${facing}`);
   assert.ok(['representable','normalization-required'].includes(result.status));
  }
 }
});

test('single-break audit records witnesses and never presents simulation as migration approval',()=>{
 const report=auditSingleBreaks([id,LEGACY_ID],4,2);
 assert.equal(report.migrationApproved,false);
 assert.match(report.coverage,/1\.\.4 by 1\.\.2/);
 assert.throws(()=>auditSingleBreaks([id],0,2),/scope/);
 assert.throws(()=>auditSingleBreaks(['unknown'],4,2),/scope/);
 for(const family of report.families){
  assert.equal(family.rectangles,32);assert.ok(family.after.incompatible>0);assert.ok(family.examples.length>0);
  assert.equal(Object.values(family.after).reduce((a,b)=>a+b,0),family.affectedTiles);
  assert.equal(family.before.incompatible,0);
 }
});

test('snapshot audit refuses malformed schemas, coercions and mixed old/new keys',()=>{
 for(const states of [null,[],{'altare:edges':'5','altare:role':1,'altare:facing':0}, {...raw().states,extra:0}, {...raw().states,'altare:shape':1}, {'altare:edges':5,'altare:role':1}, {...raw().states,'altare:role':4}, {...raw().states,'altare:edges':NaN}, {...raw().states,'altare:facing':Infinity}])assert.equal(diagnoseSnapshot({id,states}).status,'invalid');
 assert.equal(diagnoseSnapshot({id:'altare:u_classic_agnus',states:{}}).status,'unassessed');
 assert.throws(()=>auditSnapshotDocument({schemaVersion:1,baselineCommit:'other',entries:[]}),/baselineCommit/);
 assert.throws(()=>auditSnapshotDocument(envelope([located(raw()),located(raw())])),/Duplicate/);
 assert.throws(()=>auditSnapshotDocument(envelope([{...located(raw()),position:{x:0.5,y:64,z:0}}])),/location/);
 const document=envelope([located(raw(13)),{...located(raw()),position:{x:2,y:64,z:0}}]),copy=structuredClone(document);
 const report=auditSnapshotDocument(document);
 assert.deepEqual(document,copy);assert.equal(report.counts.incompatible,1);assert.equal(report.counts.representable,1);
 assert.equal(report.worldCoverageVerified,false);assert.equal(report.migrationApproved,false);
 for(const finding of report.findings)assert.deepEqual(Object.keys(finding).sort(),['dimension','id','index','localEdges','position','reason','role','status']);
});

test('CLI reads one supplied file, preserves its bytes and directory, and uses diagnostic exit codes',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'altare-readonly-'));
 try {
  const input=path.join(temp,'snapshot.json'),bytes=JSON.stringify(envelope([located(raw(13))]));
  fs.writeFileSync(input,bytes);const before=fs.readdirSync(temp);
  const result=spawnSync(process.execPath,['--experimental-strip-types',cli,'--snapshot',input],{cwd:temp,encoding:'utf8'});
  assert.equal(result.status,2,result.stderr);const report=JSON.parse(result.stdout);
  assert.equal(report.counts.incompatible,1);assert.equal(report.inputSha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(fs.readdirSync(temp),before);assert.equal(fs.readFileSync(input,'utf8'),bytes);
  fs.writeFileSync(input,JSON.stringify(envelope([located(raw())])));
  const accepted=spawnSync(process.execPath,['--experimental-strip-types',cli,'--snapshot',input],{encoding:'utf8'});
  assert.equal(accepted.status,0,accepted.stderr);assert.equal(JSON.parse(accepted.stdout).migrationApproved,false);
  fs.writeFileSync(input,'{');
  const invalid=spawnSync(process.execPath,['--experimental-strip-types',cli,'--snapshot',input],{encoding:'utf8'});
  assert.equal(invalid.status,1);assert.equal(invalid.stdout,'');
  const unknown=spawnSync(process.execPath,['--experimental-strip-types',cli,'--write',input],{encoding:'utf8'});
  assert.equal(unknown.status,1);assert.equal(unknown.stdout,'');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
