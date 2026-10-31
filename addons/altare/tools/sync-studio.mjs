import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {build} from 'esbuild';

/** Read-only product adapter: generated studio files never enter the packs. */
export async function syncAltareStudio(projectRoot,projectOutput){
 const output=path.join(projectOutput,'studio');await fs.mkdir(path.join(output,'blocks'),{recursive:true});
 const sourceHashes={},blocks={};
 const read=async relative=>{const bytes=await fs.readFile(path.join(projectRoot,relative));sourceHashes[relative]=crypto.createHash('sha256').update(bytes).digest('hex');return bytes;};
 const locale=Object.fromEntries((await read('packs/resource/texts/pt_BR.lang')).toString().split(/\r?\n/).filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
 for(const file of (await fs.readdir(path.join(projectRoot,'packs/behavior/blocks'))).sort()){
  const doc=JSON.parse(await read(`packs/behavior/blocks/${file}`))['minecraft:block'];
  const visual=c=>Object.fromEntries(Object.entries(c).filter(([key])=>['minecraft:geometry','minecraft:material_instances'].includes(key)));
  const appearance={description:doc.description,components:visual(doc.components),permutations:doc.permutations.filter(p=>Object.keys(visual(p.components)).length).map(p=>({...p,components:visual(p.components)}))};
  blocks[doc.description.identifier]=`studio/blocks/${file}`;
  await fs.writeFile(path.join(output,'blocks',file),JSON.stringify(appearance));
 }
 for(const folder of ['models/blocks','textures/blocks'])for(const file of (await fs.readdir(path.join(projectRoot,'packs/resource',folder))).sort())await read(`packs/resource/${folder}/${file}`);
 const atlas=JSON.parse(await read('packs/resource/textures/terrain_texture.json')).texture_data;
 const bundle=await build({entryPoints:[path.join(projectRoot,'tools/studio-domain.ts')],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false});
 const {DESIGNS}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
 sourceHashes['studio/domain.js']=crypto.createHash('sha256').update(bundle.outputFiles[0].contents).digest('hex');
 await fs.writeFile(path.join(output,'domain.js'),bundle.outputFiles[0].contents);
 await fs.copyFile(path.join(projectRoot,'tools/block-preview-basis.mjs'),path.join(output,'block-basis.js'));
 for(const file of ['tools/studio-domain.ts','tools/block-preview-basis.mjs','src/domain/surface.ts','src/domain/catalog.ts','src/domain/customization.ts','src/domain/block-codec.ts','src/domain/frontal-layout.ts','src/domain/palette-layout.ts'])await read(file);
 const version=JSON.parse(await fs.readFile(path.join(projectRoot,'package.json'),'utf8')).version;
 const sourceHash=crypto.createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex');
 const catalog={schema:1,version,sourceHash,sourceHashes,blocks,atlas,designs:DESIGNS,labels:locale};
 await fs.writeFile(path.join(output,'catalog.json'),JSON.stringify(catalog));
 return {version,sourceHash,designs:DESIGNS.length};
}
