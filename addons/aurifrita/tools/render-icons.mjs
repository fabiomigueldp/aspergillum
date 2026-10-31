// Render the actual Bedrock geometry at native icon resolution, using the shared renderer.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
const root=path.resolve(import.meta.dirname,'..');
const manager=path.resolve(root,'../..');
const viewer=path.join(manager,'viewer-3d');
const require=createRequire(path.join(viewer,'package.json'));
const {chromium}=require('playwright');
const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
const synced=spawnSync(process.execPath,[path.join(viewer,'scripts/sync-assets.mjs')],{cwd:manager,stdio:'inherit',windowsHide:true});
if(synced.status!==0)process.exit(synced.status??1);
const output=path.join(root,'assets-src/branding');fs.mkdirSync(output,{recursive:true});
const {version}=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const server=await createServer({root:viewer,configFile:path.join(viewer,'vite.config.js'),logLevel:'error',server:{host:'127.0.0.1',port:0}});
let browser;
try{
  await server.listen();
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bedrock-renderer.html?addon=aurifrita`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__BEDROCK_CAPTURE__?.ready||window.__BEDROCK_CAPTURE__?.error);
  const captures=[];
  for(const preset of [
    {file:'item-64.png',size:64,transparent:true,material:'classic'},
    {file:'pack-256.png',size:256,transparent:false,material:'classic'},
    {file:'mitra-hero.png',size:1600,transparent:false,material:'pbr'},
  ]){
    await page.setViewportSize({width:preset.size,height:preset.size});
    const configuration=await page.evaluate(p=>window.__BEDROCK_CAPTURE__.configure({model:'aurifrita:mitra',pose:'neutral',material:p.material,transparent:p.transparent,background:'#111b20',lighting:'neutral'}),preset);
    const capture=await page.evaluate(()=>window.__BEDROCK_CAPTURE__.capture('back-right',{direction:[0.72,0.38,-1],distanceScale:0.93}));
    const bytes=Buffer.from(capture.dataUrl.split(',')[1],'base64');
    const im=PNG.sync.read(bytes);
    if(im.width!==preset.size||im.height!==preset.size)throw new Error(`Native resolution mismatch: ${preset.file} ${im.width}x${im.height}`);
    fs.writeFileSync(path.join(output,preset.file),bytes);
    captures.push({...preset,configuration,camera:capture.camera,target:capture.target,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  if(errors.length)throw new Error(errors.join('\n'));
  const sources=['models/entity/mitra.geo.json','textures/entity/mitra.png','textures/entity/mitra_normal.png','textures/entity/mitra_mer.png'];
  const sourceHashes=Object.fromEntries(sources.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'packs/resource',p))).digest('hex')]));
  fs.writeFileSync(path.join(output,'render-manifest.json'),JSON.stringify({version,sourceHashes,renderer:'shared __BEDROCK_CAPTURE__ v4, native pixel dimensions',captures,limitation:'Three.js preview, not proof of Minecraft parity'},null,2)+'\n');
  console.log('Native model icons and hero rendered.');
}finally{await browser?.close();await server.close();}
