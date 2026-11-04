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

test('snapshot reports allowlisted fields only, including invalid IDs and nested metadata sentinels',()=>{
 const sentinel='PRIVATE_SNAPSHOT_SENTINEL_4d39';
 const entries=[
  {...located(raw()),position:{x:1,y:64,z:0,private:{nested:sentinel}},metadata:sentinel},
  {...located(raw()),position:{x:2,y:64,z:0},id:{private:sentinel}},
  {...located(raw()),position:{x:3,y:64,z:0},id:[sentinel]},
  {...located(raw()),position:{x:4,y:64,z:0},id:sentinel},
  {...located(raw()),position:{x:5,y:64,z:0},states:{...raw().states,private:sentinel}},
  {...located(raw()),dimension:'minecraft:nether',position:{x:6,y:64,z:0}},
  {...located(raw()),dimension:'minecraft:the_end',position:{x:7,y:64,z:0}},
 ];
 const document={...envelope(entries),private:sentinel},saved=structuredClone(document);
 const report=auditSnapshotDocument(document);
 assert.deepEqual(document,saved);assert.ok(!JSON.stringify(report).includes(sentinel));
 assert.deepEqual(report.findings.map(f=>f.id),[id,null,null,null,id,id,id]);
 assert.deepEqual(report.findings.map(f=>f.status),['representable','invalid','invalid','unassessed','invalid','representable','representable']);
 for(const finding of report.findings)assert.deepEqual(Object.keys(finding.position).sort(),['x','y','z']);
 assert.throws(()=>auditSnapshotDocument(envelope([{...located(raw()),dimension:sentinel}])),/^Error: Invalid location at entry 0$/);
});

test('CLI does not echo input sentinels in reports, parser errors, locations or filesystem failures',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'altare-sanitized-'));
 const sentinel='PRIVATE_INPUT_SENTINEL_7f82';
 try {
  const input=path.join(temp,'snapshot.json');
  const run=()=>spawnSync(process.execPath,['--experimental-strip-types',cli,'--snapshot',input],{cwd:temp,encoding:'utf8',timeout:10_000});
  const cases=[
   {bytes:JSON.stringify(envelope([{...located(raw()),position:{x:1,y:64,z:0,nested:{private:sentinel}},id:{private:sentinel}}])),code:2,stderr:''},
   {bytes:`${sentinel} { not JSON`,code:1,stderr:'Diagnostic refused: Snapshot is not valid JSON\n'},
   {bytes:JSON.stringify(envelope([{...located(raw()),dimension:sentinel}])),code:1,stderr:'Diagnostic refused: Snapshot envelope or location is invalid\n'},
   {bytes:JSON.stringify(envelope([{...located(raw()),position:{x:sentinel,y:64,z:0}}])),code:1,stderr:'Diagnostic refused: Snapshot envelope or location is invalid\n'},
  ];
  for(const example of cases){
   fs.writeFileSync(input,example.bytes);const before=fs.readdirSync(temp),result=run();
   assert.equal(result.status,example.code,result.stderr);assert.equal(result.stderr,example.stderr);
   assert.ok(!result.stdout.includes(sentinel));assert.ok(!result.stderr.includes(sentinel));
   if(example.code===1)assert.equal(result.stdout,'');
   assert.equal(fs.readFileSync(input,'utf8'),example.bytes);assert.deepEqual(fs.readdirSync(temp),before);
  }
  const missing=spawnSync(process.execPath,['--experimental-strip-types',cli,'--snapshot',path.join(temp,sentinel)],{encoding:'utf8',timeout:10_000});
  assert.equal(missing.status,1);assert.equal(missing.stdout,'');
  assert.equal(missing.stderr,'Diagnostic refused: Snapshot must be a readable regular file <=16 MiB\n');
  assert.ok(!missing.stderr.includes(sentinel));assert.ok(!missing.stderr.includes(temp));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('CLI verifies the complete baseline before executing any local module, even when tampered code has side effects',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'altare-preimport-'));
 const sentinel='MUST_NOT_EXECUTE_SENTINEL_933a';
 try {
  const fixture='tools/fixtures/compact-diagnostic-baseline.json';
  const baseline=JSON.parse(fs.readFileSync(path.join(altarRoot,fixture),'utf8'));
  const files=[...Object.keys(baseline.files),fixture,'tools/audit-compact-compatibility.mjs','tools/lib/compact-compatibility-diagnostic.ts'];
  for(const file of files){const target=path.join(temp,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(altarRoot,file),target);}
  fs.writeFileSync(path.join(temp,'package.json'),' {"type":"module"} ');
  const marker=path.join(temp,'sentinel-executed');
  const effect=`\nprocess.stderr.write(${JSON.stringify(sentinel)}); (await import('node:fs')).writeFileSync(${JSON.stringify(marker)},'executed');\n`;
  // A marker in the diagnostic module also detects premature imports when the
  // changed source is the adapter, which the pure library never imports.
  fs.appendFileSync(path.join(temp,'tools/lib/compact-compatibility-diagnostic.ts'),effect);
  const run=()=>spawnSync(process.execPath,['--experimental-strip-types',path.join(temp,'tools/audit-compact-compatibility.mjs'),'--snapshot',path.join(temp,'unused.json')],{cwd:temp,encoding:'utf8',timeout:10_000});
  const refused=()=>{
   const result=run();assert.equal(result.status,1);assert.equal(result.stdout,'');
   assert.equal(result.stderr,'Diagnostic refused: Baseline source mismatch or unreadable; review the diagnostic before using changed sources\n');
   assert.ok(!result.stderr.includes(sentinel));assert.ok(!fs.existsSync(marker),'unverified module was executed');
  };
  for(const file of Object.keys(baseline.files)){
   const target=path.join(temp,file),original=fs.readFileSync(target);
   fs.appendFileSync(target,effect);refused();assert.equal(fs.readFileSync(target,'utf8'),original.toString()+effect);
   fs.writeFileSync(target,original);
  }
  fs.rmSync(path.join(temp,'src/domain/catalog.ts'));refused();
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('CLI rejects partial, malformed or expanded baseline manifests without imports or raw error leakage',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'altare-manifest-'));
 const sentinel='PRIVATE_MANIFEST_SENTINEL_b1c0';
 try {
  const baseline=JSON.parse(fs.readFileSync(path.join(altarRoot,'tools/fixtures/compact-diagnostic-baseline.json'),'utf8'));
  fs.mkdirSync(path.join(temp,'tools/fixtures'),{recursive:true});fs.mkdirSync(path.join(temp,'tools/lib'),{recursive:true});
  fs.copyFileSync(cli,path.join(temp,'tools/audit-compact-compatibility.mjs'));
  fs.writeFileSync(path.join(temp,'package.json'),' {"type":"module"} ');
  const marker=path.join(temp,'sentinel-executed');
  fs.writeFileSync(path.join(temp,'tools/lib/compact-compatibility-diagnostic.ts'),`process.stderr.write(${JSON.stringify(sentinel)}); (await import('node:fs')).writeFileSync(${JSON.stringify(marker)},'executed');`);
  const partial=structuredClone(baseline);delete partial.files['src/domain/catalog.ts'];
  const corrupt=structuredClone(baseline);corrupt.files['src/domain/catalog.ts']=sentinel;
  const expanded=structuredClone(baseline);expanded.files[sentinel]='0'.repeat(64);
  for(const bytes of [sentinel,JSON.stringify(null),JSON.stringify({}),JSON.stringify({...baseline,baselineCommit:sentinel}),JSON.stringify({...baseline,files:{}}),JSON.stringify(partial),JSON.stringify(corrupt),JSON.stringify(expanded)]){
   const input=path.join(temp,'tools/fixtures/compact-diagnostic-baseline.json');fs.writeFileSync(input,bytes);
   const result=spawnSync(process.execPath,['--experimental-strip-types',path.join(temp,'tools/audit-compact-compatibility.mjs'),'--synthetic'],{encoding:'utf8',timeout:10_000});
   assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(result.stderr,'Diagnostic refused: Baseline manifest is unreadable or invalid\n');
   assert.ok(!result.stderr.includes(sentinel));assert.ok(!fs.existsSync(marker));assert.equal(fs.readFileSync(input,'utf8'),bytes);
  }
  // Even after a valid baseline, a loader exception must not expose its source
  // snippet, full path or raw stack. The corrupted module cannot be evaluated.
  for(const file of Object.keys(baseline.files)){const target=path.join(temp,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(altarRoot,file),target);}
  fs.writeFileSync(path.join(temp,'tools/fixtures/compact-diagnostic-baseline.json'),JSON.stringify(baseline));
  fs.writeFileSync(path.join(temp,'tools/lib/compact-compatibility-diagnostic.ts'),`export const ${sentinel} = ;`);
  const loadFailure=spawnSync(process.execPath,['--experimental-strip-types',path.join(temp,'tools/audit-compact-compatibility.mjs'),'--synthetic'],{encoding:'utf8',timeout:10_000});
  assert.equal(loadFailure.status,1);assert.equal(loadFailure.stdout,'');assert.equal(loadFailure.stderr,'Diagnostic refused: Diagnostic module could not be loaded\n');
  assert.ok(!loadFailure.stderr.includes(sentinel));assert.ok(!loadFailure.stderr.includes(temp));assert.ok(!fs.existsSync(marker));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
