import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const artifact=path.join(root,'dist/releases',`Altare-${version}.mcaddon`);
const entries=readZip(artifact).entries.filter(e=>!e.name.endsWith('/'));
for(const entry of entries){
 const file=entry.name.replace(/^Altare_BP\//,'packs/behavior/').replace(/^Altare_RP\//,'packs/resource/');
 assert.equal(hash(entry.read()),hash(fs.readFileSync(path.join(root,file))),`Archive differs: ${file}`);
}
const directories=process.argv.slice(2);
if(!directories.length)throw Error('Pass at least one capture directory');
let captures=0;
for(const directory of directories){
 const folder=path.resolve(root,directory),manifest=JSON.parse(fs.readFileSync(path.join(folder,'capture-manifest.json'),'utf8'));
 assert.equal(manifest.version,version);
 for(const [file,expected] of Object.entries({...manifest.sourceHashes,...manifest.textureHashes}))assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,`Stale source: ${file}`);
 for(const capture of manifest.captures){assert.equal(hash(fs.readFileSync(path.join(folder,capture.file))),capture.sha256);captures++;}
}
const evidence={version,artifactSha256:hash(fs.readFileSync(artifact)),archiveFiles:entries.length,captures,directories,status:'byte-for-byte archive/source/capture parity; in-game QA still required'};
fs.writeFileSync(path.join(root,'dist/validation',version,'capture-parity.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
