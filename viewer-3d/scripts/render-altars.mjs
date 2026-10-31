import {launchRenderBrowser} from './lib/render-browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {STUDIO_PRESETS,STUDIO_VERSION,studioDimensions,normalizeStudioConfig,studioFilename} from '../src/shared/studio-contract.js';
const viewer=path.resolve(import.meta.dirname,'..'),project=path.resolve(viewer,'..');
const args=process.argv.slice(2),option=(flag,fallback)=>{const i=args.indexOf(flag);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error(`${flag} exige valor.`);return args[i+1];};
if(args.includes('--help')){console.log('npm run render:altars -- --presets all|colonnade,coffer,baluster,guadalupe,trestle,green,gothic,requiem,wood,rose,purple --size 2560 --output out/altar-renders/<pasta> [--environment gallery|chapel|studio|transparent] [--view hero|front|back|top|detail|player|wide] [--lighting classic|shadows] [--ratio 16:9|4:3|1:1|4:5] [--quality high|draft] [--dressing none|ready|gifts] [--candles 2|4|6|7] [--season ordinary|advent|lent|festive] [--furnishing gold|wood] [--candlePlacement floor|mensa]');process.exit(0);}
for(let i=0;i<args.length;i+=2)if(!['--presets','--size','--output','--environment','--view','--ratio','--quality','--lighting','--dressing','--candles','--season','--furnishing','--candlePlacement'].includes(args[i]))throw Error(`Opção desconhecida: ${args[i]}`);
const size=Number(option('--size','2560')),ids=option('--presets','all'),presets=ids==='all'?STUDIO_PRESETS:ids.split(',').map(id=>{const preset=STUDIO_PRESETS.find(p=>p.id===id);if(!preset)throw Error(`Composição desconhecida: ${id}`);return preset;});
const overrides=Object.fromEntries(['environment','view','ratio','quality','lighting','dressing','candles','season','furnishing','candlePlacement'].filter(k=>args.includes('--'+k)).map(k=>[k,option('--'+k)]));
studioDimensions(overrides.ratio??'16:9',size);normalizeStudioConfig(overrides);
const output=path.resolve(project,option('--output','out/altar-renders/'+new Date().toISOString().replace(/[:.]/g,'-')));await fs.mkdir(output,{recursive:true});
const server=await createServer({root:viewer,configFile:path.join(viewer,'vite.config.js'),logLevel:'error',server:{host:'127.0.0.1',port:0}});let browser;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
try{
 await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await launchRenderBrowser(chromium);
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/render-studio.html',{waitUntil:'commit'});await page.waitForFunction(()=>window.__BEDROCK_STUDIO__?.ready||window.__BEDROCK_STUDIO__?.error,null,{timeout:120000});
 const error=await page.evaluate(()=>window.__BEDROCK_STUDIO__.error);if(error)throw Error(error);
 const renders=[];
 for(const preset of presets){
  await page.evaluate(async({preset,overrides})=>{await window.__BEDROCK_STUDIO__.preset(preset.id);const current=window.__BEDROCK_STUDIO__.scene();await window.__BEDROCK_STUDIO__.configure({...current.config,...overrides});},{preset,overrides});
  const capture=await page.evaluate(size=>window.__BEDROCK_STUDIO__.capture(size),size),{dataUrl,...metadata}=capture,bytes=Buffer.from(dataUrl.split(',')[1],'base64'),file=studioFilename(capture.config)+'.png';
  assert.deepEqual(capture.config,normalizeStudioConfig({...preset,...overrides}),'A captura deve corresponder exatamente à composição solicitada.');
  await fs.writeFile(path.join(output,file),bytes);await fs.writeFile(path.join(output,file.replace('.png','.json')),JSON.stringify(metadata,null,2)+'\n');
  renders.push({id:preset.id,name:preset.name,file,bytes:bytes.length,sha256:hash(bytes),...metadata});
  if(!Object.keys(overrides).length){
   const thumbnail=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();const canvas=document.createElement('canvas');canvas.width=400;canvas.height=225;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,400,225);return canvas.toDataURL('image/png');},dataUrl);
   await fs.mkdir(path.join(viewer,'public/studio-gallery'),{recursive:true});await fs.writeFile(path.join(viewer,'public/studio-gallery',preset.id+'.png'),Buffer.from(thumbnail.split(',')[1],'base64'));
  }
  console.log(`${preset.name}: ${capture.width} × ${capture.height}, ${capture.samples} amostras, ${file}`);
 }
 if(errors.length)throw Error(errors.join('\n'));
 if(!Object.keys(overrides).length&&STUDIO_PRESETS.every(p=>renders.some(r=>r.id===p.id))){
  await fs.writeFile(path.join(viewer,'public/studio-gallery/catalog.json'),JSON.stringify({renderer:STUDIO_VERSION,presets:renders.map(r=>r.id)})+'\n');
 }
 const sourceFiles=['src/render-studio/altare-provider.js','src/render-studio/environments.js','src/render-studio/voxel-blocks.js','src/render-studio/voxel-plan.js','src/render-studio/voxel-mesh.js','assets-src/studio/vanilla-sources.json','src/render-studio/props-provider.js','src/render-studio/liturgical-plan.js','src/render-studio/liturgical-scene.js','assets-src/studio/props-sources.json','src/shared/studio-prop-geometry.js','src/shared/mesh-batch.js','src/render-studio/scene-layout.js','src/render-studio/camera-framing.js','src/render-studio/stage.js','src/render-studio/main.js','src/shared/studio-contract.js','src/shared/bedrock-geometry.js','src/shared/bedrock-uv.js'];
 const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,hash(await fs.readFile(path.join(viewer,file)))])));
 await fs.writeFile(path.join(output,'render-manifest.json'),JSON.stringify({schema:1,renderer:STUDIO_VERSION,backend:browser.renderDiagnostics,createdAt:new Date().toISOString(),sourceHashes,renders,limitations:'External renderer, not a Minecraft screenshot. Vanilla texture hashes and one-block grid are preserved; classic face shading and voxel AO approximate Bedrock. Optional shadow/PBR lighting is presentation only. Actual addon geometry and UVs are preserved.'},null,2)+'\n');
 await fs.writeFile(path.join(output,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Altare · coleção</title><style>*{box-sizing:border-box}body{font:15px/1.5 system-ui;background:#eeece5;color:#30352e;max-width:1480px;margin:48px auto;padding:0 28px}h1{font-weight:550;font-size:36px;letter-spacing:-1px}p{color:#62665c;max-width:75ch}main{display:grid;grid-template-columns:1fr 1fr;gap:32px}figure{margin:0}img{display:block;width:100%;background:#d3d0c5}figcaption{display:flex;justify-content:space-between;gap:10px;padding:12px 0 28px}a{color:inherit}small{color:#62665c}@media(max-width:700px){main{grid-template-columns:1fr}}</style><h1>Altare</h1><p>Composições com os modelos e materiais reais do addon. Cenários construídos em blocos, com texturas vanilla. Prévia externa ao Minecraft. Clique em uma imagem para abrir o PNG completo.</p><main>${renders.map(r=>`<figure><a href="${r.file}"><img src="${r.file}" alt="${r.name}"></a><figcaption><strong>${r.name}</strong><small>${r.width} × ${r.height} · <a href="${r.file}" download>PNG</a></small></figcaption></figure>`).join('')}</main></html>`);
 console.log(`Galeria: ${path.join(output,'index.html')}`);
}finally{await browser?.close();await server.close();}
