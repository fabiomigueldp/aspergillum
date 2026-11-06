import path from 'node:path';
import {buildSync} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..');
// Bundle the same pure TypeScript contract used by the runtime. Node 20 remains supported.
const compiled=buildSync({entryPoints:[path.join(root,'src/domain/block-state-layout.ts')],bundle:true,write:false,format:'esm',platform:'node'});
export const codec=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
export function blockLayout(kind){
 if(!['aspersorium','sacristan_table'].includes(kind))throw Error(`Unknown compact block ${kind}`);
 const layout=kind==='aspersorium'?codec.ASPERSORIUM_LAYOUT:codec.TABLE_LAYOUT;
 const rotation=kind==='aspersorium'?'aspergillum:rotation':'aspergillum:table_rotation';
 const n='('+layout.keys.map((key,i)=>`${layout.radices.slice(0,i).reduce((a,b)=>a*b,1)} * q.block_state('${key}')`).join(' + ')+')';
 const safe=`(${n} < ${layout.semanticCount} ? ${n} : 0)`;
 const occupancy=kind==='aspersorium'?`math.mod(${safe}, 17)`:safe;
 const occupied=`(${occupancy} > 0)`;
 const cosmetic=`(${occupancy} > 0 ? ${occupancy} - 1 : 0)`;
 return {layout,rotation,states:{...codec.compactStateDefinitions(layout),[rotation]:Array.from({length:16},(_,i)=>i)},index:n,occupied,cosmetic};
}
export function compileCompactBlock(block,kind,cosmetics){
 const contract=blockLayout(kind);
 const permittedComponents=new Set(['minecraft:loot','minecraft:geometry','minecraft:material_instances']);
 for(const p of block.permutations??[])if(Object.keys(p.components??{}).some(k=>!permittedComponents.has(k)))throw Error(`Refusing to discard unrecognized ${kind} permutation components`);
 const previousVisibility=block.components['minecraft:geometry'].bone_visibility??{};
 if(Object.keys(previousVisibility).some(k=>k!=='resting_aspergillum'))throw Error(`Unexpected ${kind} visibility contract`);
 block.description.states=contract.states;
 const visibility={resting_aspergillum:contract.occupied};
 block.components['minecraft:geometry']={...block.components['minecraft:geometry'],identifier:`geometry.aspergillum.${kind}.rotation_0`,bone_visibility:visibility};
 block.components['minecraft:material_instances']={'*':{texture:kind,render_method:'opaque'}};
 block.permutations=[{condition:contract.occupied,components:{'minecraft:loot':`loot_tables/blocks/${kind}_${kind==='aspersorium'?'docked':'occupied'}.loot.json`}}];
 for(const cosmetic of cosmetics.slice(1))block.permutations.push({condition:`${contract.cosmetic} == ${cosmetic.index}`,components:{'minecraft:material_instances':{'*':{texture:`${kind}_${cosmetic.id}`,render_method:'opaque'}}}});
 for(let rotation=1;rotation<16;rotation++)block.permutations.push({condition:`q.block_state('${contract.rotation}') == ${rotation}`,components:{'minecraft:geometry':{identifier:`geometry.aspergillum.${kind}.rotation_${rotation}`,uv_lock:false,bone_visibility:visibility}}});
 return block;
}
