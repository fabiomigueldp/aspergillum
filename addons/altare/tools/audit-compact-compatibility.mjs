import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {auditCartesianDomains,auditSingleBreaks,auditSnapshotDocument} from './lib/compact-compatibility-diagnostic.ts';

// stdout only. No output path, pack discovery, Minecraft API or network access.
try {
 const root=path.resolve(import.meta.dirname,'..');
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'tools/fixtures/compact-diagnostic-baseline.json'),'utf8'));
 for(const [file,expected] of Object.entries(baseline.files)) {
  const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  if(actual!==expected)throw Error(`Baseline source mismatch: ${file}; review the diagnostic before using it with changed sources`);
 }
 const args=process.argv.slice(2);let report;
 if(args.length===0 || args.length===1&&args[0]==='--synthetic') {
  report={...auditSingleBreaks(),cartesian:auditCartesianDomains()};
 } else if(args.length===2 && args[0]==='--snapshot') {
  const stat=fs.statSync(args[1]);if(!stat.isFile()||stat.size>16*1024*1024)throw Error('Snapshot must be a regular file <=16 MiB');
  const bytes=fs.readFileSync(args[1]);
  if(bytes.length>16*1024*1024)throw Error('Snapshot grew beyond 16 MiB');
  report={...auditSnapshotDocument(JSON.parse(bytes.toString('utf8'))),inputSha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  if(Object.entries(report.counts).some(([k,n])=>k!=='representable'&&n>0))process.exitCode=2;
 } else throw Error('Usage: node --experimental-strip-types tools/audit-compact-compatibility.mjs [--synthetic | --snapshot FILE]');
 process.stdout.write(JSON.stringify({...report,sourceHashes:baseline.files},null,2)+'\n');
} catch(error) {
 process.stderr.write(`Diagnostic refused: ${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;
}
