import {renderSettings} from './lib/render-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const viewer=path.resolve(import.meta.dirname,'..'),root=path.resolve(viewer,'../addons/altare');
const output=path.join(viewer,'public/studio-models');
const models=['classic','pilaster','ogive','trestle','coffer','baluster','colonnade'];
// The model selector uses actual product renders, with its own source hash.
const inputs=['assets-src/model.mjs','assets-src/block-primitives.mjs','assets-src/atelier/garment.mjs','assets-src/atelier/geometry.mjs','assets-src/atelier/joinery.mjs','assets-src/atelier/ornate.mjs','assets-src/atelier/pilaster-model.mjs','assets-src/atelier/ogive-model.mjs','assets-src/atelier/opening-reveal.mjs','assets-src/atelier/ogive-art.mjs','assets-src/atelier/colonnade-model.mjs','assets-src/atelier/colonnade-textile.mjs','assets-src/atelier/structure-profiles.mjs','tools/preview.mjs','tools/capture.mjs','out/build-manifest.json'];
const hashes=Object.fromEntries(inputs.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
hashes['renderer-policy']=crypto.createHash('sha256').update(fs.readFileSync(path.join(viewer,'scripts/lib/render-browser.mjs'))).update(JSON.stringify(renderSettings())).digest('hex');
const sourceHash=crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
let previous;try{previous=JSON.parse(fs.readFileSync(path.join(output,'catalog.json'),'utf8'));}catch{}
if(previous?.sourceHash!==sourceHash||models.some(id=>!fs.existsSync(path.join(output,id+'.png')))){
 const result=spawnSync(process.execPath,[path.join(root,'tools/capture.mjs'),'--matrix','catalog','--views','oblique','--profiles','classic','--width','800','--height','500','--output','out/studio-models'],{cwd:root,stdio:'inherit',windowsHide:true});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
 fs.mkdirSync(output,{recursive:true});
 for(const id of models)fs.copyFileSync(path.join(root,`out/studio-models/${id}-oblique-classic.png`),path.join(output,id+'.png'));
 fs.writeFileSync(path.join(output,'catalog.json'),JSON.stringify({sourceHash,hashes,models})+'\n');
}
