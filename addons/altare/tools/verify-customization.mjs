import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..'),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const previous=readZip(path.join(root,'dist/releases/Altare-0.4.2.mcaddon')).entries.filter(e=>!e.name.endsWith('/'));
const current=readZip(path.join(root,`dist/releases/Altare-${version}.mcaddon`)).entries.filter(e=>!e.name.endsWith('/'));
const before=new Map(previous.map(e=>[e.name,e])),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.deepEqual(current.map(e=>e.name).sort(),previous.map(e=>e.name).sort());
const changed=[];
for(const entry of current){
 if(hash(entry.read())===hash(before.get(entry.name).read()))continue;
 assert.ok(/^(Altare_BP\/scripts\/main.js|Altare_(BP|RP)\/(manifest.json|texts\/(pt_BR|en_US).lang)|Altare_RP\/models\/blocks\/atelier_ogive_.+\.geo.json)$/.test(entry.name),`Unexpected distributed change: ${entry.name}`);
 changed.push(entry.name);
}
const report={version,baseline:'0.4.2',files:current.length,changed,preserved:'All block definitions, collision components, textures, IDs, state arrays, classic assets and non-ogive models are byte-identical.',inGame:'Pending'};
fs.writeFileSync(path.join(root,'dist/validation',version,'customization-delta.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Verified ${current.length} distributed files; ${changed.length} permitted changes.`);
