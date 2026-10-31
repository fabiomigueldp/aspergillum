import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),manager=path.resolve(root,'../..'),viewer=path.join(manager,'viewer-3d');
const require=createRequire(path.join(viewer,'package.json'));
const {chromium}=require('playwright'),{createServer}=await import(pathToFileURL(require.resolve('vite')).href);
for(const command of [path.join(root,'tools/register-viewer.mjs'),path.join(viewer,'scripts/sync-assets.mjs')]){
 const r=spawnSync(process.execPath,[command],{cwd:manager,stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Viewer synchronization failed');
}
const output=path.join(root,'assets-src/branding');fs.mkdirSync(output,{recursive:true});
const server=await createServer({root:viewer,configFile:path.join(viewer,'vite.config.js'),logLevel:'error',server:{host:'127.0.0.1',port:0}});
let browser;
try{
 await server.listen();browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({deviceScaleFactor:1});
 // Generic catalog resolves attachables; bind block/entity previews to their actual RP texture.
 const manifestPath=path.join(viewer,'public/asset-library/projects/evangeliarium/manifest.json');
 const previewManifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const entity=JSON.parse(fs.readFileSync(path.join(root,'packs/resource/entity/book_visual.entity.json'),'utf8'));
 const actualTexture=entity['minecraft:client_entity'].description.textures.default+'.png';
 for(const model of previewManifest.models)if(model.geometries.some(g=>g.identifier.startsWith('geometry.evangeliarium.')&&!g.identifier.endsWith('.empty')))model.texture=actualTexture;
 await page.route('**/asset-library/projects/evangeliarium/manifest.json',route=>route.fulfill({json:previewManifest}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('CONTEXT_LOST'))errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bedrock-renderer.html?addon=evangeliarium`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__BEDROCK_CAPTURE__?.ready||window.__BEDROCK_CAPTURE__?.error);
 const captures=[];
 for(const preset of [
  {file:'item-64.png',size:64,transparent:true,model:'geometry.evangeliarium.held',direction:[.55,.22,-1]},
  {file:'pack-256.png',size:256,transparent:false,model:'geometry.evangeliarium.held',direction:[.55,.22,-1]},
  {file:'book-closed.png',size:1200,transparent:false,model:'geometry.evangeliarium.held',direction:[.65,.22,-1]},
  {file:'book-open.png',size:1200,transparent:false,model:'geometry.evangeliarium.open',direction:[.3,1,-.6]},
 ]){
  await page.setViewportSize({width:preset.size,height:preset.size});
  const configuration=await page.evaluate(p=>window.__BEDROCK_CAPTURE__.configure({model:p.model,pose:'neutral',material:'classic',transparent:p.transparent,background:'#25232a',lighting:'neutral'}),preset);
  const capture=await page.evaluate(p=>window.__BEDROCK_CAPTURE__.capture('front-right',{direction:p.direction,distanceScale:.98}),preset);
  const bytes=Buffer.from(capture.dataUrl.split(',')[1],'base64');fs.writeFileSync(path.join(output,preset.file),bytes);
  captures.push({...preset,configuration,camera:capture.camera,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 if(errors.length)throw Error(errors.join('\n'));
 const sourceFiles=['models/entity/book_held.geo.json','models/entity/book_open.geo.json','textures/entity/book.png','textures/entity/book_mer.png','textures/entity/book_normal.png'];
 const sourceHashes=Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'packs/resource',f))).digest('hex')]));
 fs.writeFileSync(path.join(output,'render-manifest.json'),JSON.stringify({version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,renderer:'shared Bedrock Renderer / Three.js / SwiftShader',sourceHashes,textureBinding:actualTexture,limitation:'Diagnostic, not Minecraft rendering parity',captures},null,2)+'\n');
 console.log('Rendered model, open book, native 64px inventory icon and 256px pack icon.');
}finally{await browser?.close();await server.close();}
