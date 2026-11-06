import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {launchRenderBrowser} from '../../../viewer-3d/scripts/lib/render-browser.mjs';
const root=path.resolve(import.meta.dirname,'..'),manager=path.resolve(root,'../..'),viewer=path.join(manager,'viewer-3d');
const require=createRequire(path.join(viewer,'package.json'));
const {chromium}=require('playwright'),{createServer}=await import(pathToFileURL(require.resolve('vite')).href);
for(const command of [path.join(root,'tools/register-viewer.mjs'),path.join(viewer,'scripts/sync-assets.mjs')]){const r=spawnSync(process.execPath,[command],{cwd:manager,stdio:'inherit'});if(r.status!==0)throw Error('Viewer sync failed');}
const output=path.join(root,'assets-src/ordo');fs.mkdirSync(output,{recursive:true});
const server=await createServer({root:viewer,configFile:path.join(viewer,'vite.config.js'),logLevel:'error',server:{host:'127.0.0.1',port:0}});
let browser;
try{
 await server.listen();browser=await launchRenderBrowser(process.env.ASPERGILLUM_CHROMIUM_PATH?{launch:opts=>chromium.launch({...opts,executablePath:process.env.ASPERGILLUM_CHROMIUM_PATH})}:chromium);const page=await browser.newPage({deviceScaleFactor:1});
 const manifest=JSON.parse(fs.readFileSync(path.join(viewer,'public/asset-library/projects/evangeliarium/manifest.json'),'utf8'));
 for(const model of manifest.models)if(model.geometries.some(g=>g.identifier==='geometry.ordo_calendar'))model.texture='textures/blocks/ordo_calendar.png';
 await page.route('**/asset-library/projects/evangeliarium/manifest.json',route=>route.fulfill({json:manifest}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bedrock-renderer.html?addon=evangeliarium`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__BEDROCK_CAPTURE__?.ready||window.__BEDROCK_CAPTURE__?.error);
 const captures=[];
 for(const preset of [
 {file:'item-64.png',size:64,transparent:true,direction:[.5,.3,-1]},
 {file:'front.png',size:768,direction:[0,.16,-1]},
 {file:'three-quarter.png',size:768,direction:[.7,.4,-1]},
 {file:'back.png',size:768,direction:[.5,.3,1]},
 {file:'side.png',size:768,direction:[1,.1,0]},
 {file:'top.png',size:768,direction:[0,1,-.01]},
 {file:'bottom.png',size:768,direction:[0,-1,-.01]},
 ]){
 await page.setViewportSize({width:preset.size,height:preset.size});
 const configuration=await page.evaluate(p=>window.__BEDROCK_CAPTURE__.configure({model:'geometry.ordo_calendar',pose:'neutral',material:'classic',transparent:!!p.transparent,background:'#28282b',lighting:'neutral'}),preset);
 const capture=await page.evaluate(p=>window.__BEDROCK_CAPTURE__.capture('front-right',{direction:p.direction,distanceScale:1.08}),preset);
 const bytes=Buffer.from(capture.dataUrl.split(',')[1],'base64');fs.writeFileSync(path.join(output,preset.file),bytes);
 captures.push({...preset,configuration,camera:capture.camera,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(output,'render-manifest.json'),JSON.stringify({renderer:browser.renderDiagnostics,limitation:'Diagnostic only; Minecraft imported-pack validation remains required.',captures},null,2)+'\n');
}finally{await browser?.close();await server.close();}
