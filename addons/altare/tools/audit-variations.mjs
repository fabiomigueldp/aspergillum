import fs from 'node:fs';
import path from 'node:path';
import {DESIGNS} from '../src/domain/catalog.ts';
const root=path.resolve(import.meta.dirname,'..');
const groups=new Map(),byId=new Map(DESIGNS.map(d=>[d.id,d]));
for(const file of fs.readdirSync(path.join(root,'packs/behavior/blocks'))){
 const b=JSON.parse(fs.readFileSync(path.join(root,'packs/behavior/blocks',file),'utf8'))['minecraft:block'];
 const family=byId.get(b.description.identifier)?.structure??'classic',states=b.description.states??{};
 const combinations=Object.values(states).reduce((n,v)=>n*v.length,1),group=groups.get(family)??{family,blocks:0,permutations:0};
 group.blocks++;group.permutations+=combinations;groups.set(family,group);
}
const families=[...groups.values()].sort((a,b)=>b.permutations-a.permutations),total=families.reduce((n,g)=>n+g.permutations,0);
const report={version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,unit:'Declared block-state combinations, not crafting recipes or placed altar count',families,total,reference:65536,policy:'0.9.0 diagnostic exception: Altare <=80000 and known combined packs <=90000. The Microsoft reference 65536 is exceeded; native profiling and non-Marketplace status remain explicit.',otherAddons:'Not included in this family breakdown'};
fs.writeFileSync(path.join(root,'out/variation-audit.json'),JSON.stringify(report,null,2)+'\n');
console.table(families);console.log(`Altare: ${total} declared combinations. Creative mode does not change this count.`);
