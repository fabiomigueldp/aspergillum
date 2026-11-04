import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

// Keep all local/domain imports behind this complete baseline check. A changed
// module can have top-level effects even when none of its exports are called.
const expectedFiles = [
 'src/domain/catalog.ts','src/domain/block-codec.ts','src/domain/palette-layout.ts',
 'src/domain/classic-textile-layout.ts','src/domain/surface.ts',
 'src/domain/frontal-layout.ts','src/infrastructure/surface-port.ts',
];
const object = v => !!v && typeof v==='object' && !Array.isArray(v);
// Never print an exception message: parsers, loaders and filesystem errors may
// contain input data or caller paths. Only these caller-independent stages exit.
let refusal='Baseline manifest is unreadable or invalid';

// stdout only. No output path, pack discovery, Minecraft API or network access.
try {
 const root=path.resolve(import.meta.dirname,'..');
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'tools/fixtures/compact-diagnostic-baseline.json'),'utf8'));
 if(!object(baseline) || baseline.baselineCommit!=='c0d4310bb787fbee5b38efe160f22f2642f71e9a' || !object(baseline.files) ||
    Object.keys(baseline.files).length!==expectedFiles.length || !expectedFiles.every(file=>
     Object.hasOwn(baseline.files,file) && typeof baseline.files[file]==='string' && /^[a-f0-9]{64}$/.test(baseline.files[file])))throw Error();
 refusal='Baseline source mismatch or unreadable; review the diagnostic before using changed sources';
 const sourceHashes={};
 for(const file of expectedFiles) {
  const expected=baseline.files[file];
  const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  if(actual!==expected)throw Error();
  sourceHashes[file]=actual;
 }
 const args=process.argv.slice(2);let report;
 const synthetic=args.length===0 || args.length===1&&args[0]==='--synthetic';
 refusal='Usage: node --experimental-strip-types tools/audit-compact-compatibility.mjs [--synthetic | --snapshot FILE]';
 if(!synthetic && !(args.length===2&&args[0]==='--snapshot'))throw Error();
 refusal='Diagnostic module could not be loaded';
 const {auditCartesianDomains,auditSingleBreaks,auditSnapshotDocument}=await import('./lib/compact-compatibility-diagnostic.ts');
 if(synthetic) {
  refusal='Synthetic diagnostic could not be completed';
  report={...auditSingleBreaks(),cartesian:auditCartesianDomains()};
 } else {
  refusal='Snapshot must be a readable regular file <=16 MiB';
  const stat=fs.statSync(args[1]);if(!stat.isFile()||stat.size>16*1024*1024)throw Error('Snapshot must be a regular file <=16 MiB');
  const bytes=fs.readFileSync(args[1]);
  if(bytes.length>16*1024*1024)throw Error('Snapshot grew beyond 16 MiB');
  refusal='Snapshot is not valid JSON';
  const document=JSON.parse(bytes.toString('utf8'));
  refusal='Snapshot envelope or location is invalid';
  report={...auditSnapshotDocument(document),inputSha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  if(Object.entries(report.counts).some(([k,n])=>k!=='representable'&&n>0))process.exitCode=2;
 }
 refusal='Diagnostic report could not be emitted';
 process.stdout.write(JSON.stringify({...report,sourceHashes},null,2)+'\n');
} catch {
 process.stderr.write(`Diagnostic refused: ${refusal}\n`);process.exitCode=1;
}
