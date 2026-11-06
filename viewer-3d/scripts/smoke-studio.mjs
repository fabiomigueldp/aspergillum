import {launchRenderBrowser} from './lib/render-browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer,preview} from 'vite';
import {PNG} from 'pngjs';
const viewer=path.resolve(import.meta.dirname,'..'),output=path.resolve(viewer,'../out/studio-smoke');await fs.mkdir(output,{recursive:true});
const built=process.argv.includes('--built'),startedAt=performance.now();
const options={root:viewer,configFile:path.join(viewer,'vite.config.js'),logLevel:'error',server:{host:'127.0.0.1',port:0},preview:{host:'127.0.0.1',port:0}};
const server=await (built?preview(options):createServer(options));let browser;
try{
 if(!built)await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await launchRenderBrowser(chromium);
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('404'))errors.push(message.text());});
 await page.goto(origin+'/?tool=studio&addon=altare',{waitUntil:'commit'});
 await page.waitForFunction(()=>window.__BEDROCK_STUDIO__?.ready||window.__BEDROCK_STUDIO__?.error,null,{timeout:120000});
 assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.error),null);
 await page.waitForFunction(()=>document.body.dataset.activeTool==='studio');
 const ready=async()=>{await page.waitForFunction(()=>document.querySelector('#studio-loading').hidden);};
 // A cached request must not leave the update queue stuck on a fulfilled promise.
 await page.evaluate(async()=>{await window.__BEDROCK_STUDIO__.preset('guadalupe');await window.__BEDROCK_STUDIO__.preset('trestle');});
 assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().config.family),'trestle');
 // Real local pack objects and the ritual controls must affect the rendered scene.
 const prepared=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene());
 assert.equal(prepared.objects.arrangement.candleCount,6);assert.match(prepared.objects.sourceHash,/^[a-f0-9]{64}$/);
 await page.click('#studio-tab-scene');await page.selectOption('#studio-furnishing','wood');await ready();
 assert.ok((await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().objects.arrangement)).placements.filter(p=>p.role==='candle').every(p=>p.id==='floor-candle-1'));
 await page.selectOption('#studio-candlePlacement','mensa');await ready();
 const mensa=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().objects.arrangement);assert.equal(mensa.candlesOnAltar,true);assert.ok(mensa.placements.filter(p=>p.role==='candle').every(p=>p.position[2]<0));
 await page.selectOption('#studio-candles','7');await ready();
 await page.selectOption('#studio-season','lent');await ready();
 await page.selectOption('#studio-dressing','gifts');await ready();
 const liturgy=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().objects.arrangement);
 assert.equal(liturgy.candleCount,7);assert.ok(!liturgy.placements.some(p=>['gospel','flowers-white'].includes(p.id)));
 assert.equal(liturgy.placements.filter(p=>p.support==='corporal').length,3);
 await page.evaluate(()=>window.__BEDROCK_STUDIO__.preset('trestle'));
 await page.click('#studio-tab-altar');await page.selectOption('#studio-textile','floral');await ready();
 await page.click('[data-color="purple"]');await ready();
 await page.locator('#studio-width').fill('8');await page.locator('#studio-width').press('Tab');await ready();
 const scene=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene());
 assert.equal(scene.config.width,8);assert.equal(scene.config.color,'purple');assert.equal(scene.config.family,'trestle');assert.equal(scene.environment.blockUnit,1);

 await page.click('[data-model="ogive"]');await page.selectOption('#studio-surface','limestone');await ready();
 assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().config.family),'ogive');assert.equal(await page.locator('#studio-surface').inputValue(),'limestone');
 assert.equal(await page.locator('#studio-textile').inputValue(),'floral');
 assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().config.color),'purple');
 await page.click('[data-color="red"]');await ready();await page.selectOption('#studio-frontal','cross');await ready();
 await page.click('[data-color="green"]');await ready();assert.equal(await page.locator('#studio-frontal').isDisabled(),true);
 await page.locator('#studio-depth').fill('3');await page.locator('#studio-depth').press('Tab');await ready();
 await page.click('[data-color="red"]');await ready();assert.equal(await page.locator('#studio-frontal').inputValue(),'cross');
 await page.click('#studio-undo');await ready();assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().config.color),'green');
 await page.click('#studio-redo');await ready();assert.equal(await page.locator('#studio-frontal').inputValue(),'cross');
 await page.click('[data-model="classic"]');await ready();await page.click('[data-model="ogive"]');await ready();
 assert.equal(await page.locator('#studio-frontal').inputValue(),'cross');
 for(const family of ['coffer','baluster']){
  await page.click(`[data-model="${family}"]`);await ready();
  assert.equal(await page.locator('#studio-surface').inputValue(),'walnut');assert.equal(await page.locator('#studio-surface').isDisabled(),true);
  assert.equal(await page.locator('#studio-frontal').isVisible(),false);
  await page.selectOption('#studio-textile','floral');await ready();await page.click('[data-color="purple"]');await ready();
  const newScene=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene());
  assert.equal(newScene.config.family,family);assert.equal(newScene.config.color,'purple');assert.equal(newScene.config.frontal,'none');
  await page.click('[data-color="red"]');await ready();
 }
 await page.click('[data-model="ogive"]');await ready();
 assert.equal(await page.locator('#studio-surface').inputValue(),'limestone');assert.equal(await page.locator('#studio-frontal').inputValue(),'cross');
 // Suspended choices must survive both the exported file and browser restart.
 for(const suspension of ['color','model']){
  await page.evaluate(()=>window.__BEDROCK_STUDIO__.configure({family:'ogive',surface:'limestone',textile:'floral',color:'red',frontal:'cross'}));
  await page.click(suspension==='color'?'[data-color="purple"]':'[data-model="coffer"]');await ready();
  const suspended=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene());
  assert.equal(suspended.config.frontal,'none');assert.equal(suspended.draft.relief,'cross');assert.equal(suspended.draft.surface,'limestone');
  const download=page.waitForEvent('download');await page.click('#studio-save');
  const file=path.join(output,`suspended-${suspension}.json`);await (await download).saveAs(file);
  assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),suspended);
  await page.evaluate(()=>window.__BEDROCK_STUDIO__.preset('green'));
  await page.locator('#studio-file').setInputFiles(file);
  await page.waitForFunction(expected=>JSON.stringify(window.__BEDROCK_STUDIO__.scene().draft)===JSON.stringify(expected),suspended.draft);await ready();
  assert.deepEqual(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene()),suspended);
  await page.waitForFunction(expected=>{const saved=JSON.parse(localStorage.getItem('bedrock-studio.altare.v3'));return saved?.schema===3&&JSON.stringify(saved.draft)===JSON.stringify(expected);},suspended.draft);
  await page.reload({waitUntil:'commit'});
  await page.waitForFunction(()=>window.__BEDROCK_STUDIO__?.ready||window.__BEDROCK_STUDIO__?.error,null,{timeout:120000});
  assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.error),null);await ready();
  const reopened=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene());
  assert.deepEqual(reopened.draft,suspended.draft);assert.deepEqual(reopened.config,suspended.config);
  await page.click('#studio-tab-altar');
  await page.click(suspension==='color'?'[data-color="red"]':'[data-model="ogive"]');await ready();
  assert.equal(await page.locator('#studio-surface').inputValue(),'limestone');assert.equal(await page.locator('#studio-frontal').inputValue(),'cross');
 }
 const environmentSamples=[];
 await page.click('[data-model="colonnade"]');await ready();
 assert.equal(await page.locator('#studio-surface').inputValue(),'marble');assert.equal(await page.locator('#studio-pattern-field').isVisible(),true);
 assert.equal(await page.locator('#studio-textile').inputValue(),'floral');
 await page.selectOption('#studio-textile','lace');await ready();assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().config.textile),'lace');
 for(const family of ['classic','pilaster','ogive','trestle','coffer','baluster','colonnade','crossbrace','twin_pedestal']){
  await page.click(`[data-model="${family}"]`);await ready();assert.equal(await page.locator('#studio-textile').inputValue(),'lace');
  assert.equal(await page.locator('#studio-textile option').count(),10);
 }
 await page.selectOption('#studio-textile','linen_long');await ready();
 await page.click('[data-model="classic"]');await ready();assert.equal(await page.locator('#studio-textile').inputValue(),'linen_long');
 assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().config.cloth),2);
 await page.selectOption('#studio-textile','floral');await ready();await page.click('[data-color="green"]');await ready();
 assert.equal(await page.locator('#studio-guadalupe-field').isVisible(),true);assert.equal(await page.locator('#studio-colors').isVisible(),true);
 await page.click('[data-model="ogive"]');await ready();await page.click('[data-color="red"]');await ready();assert.equal(await page.locator('#studio-frontal').inputValue(),'cross');
 await page.click('#studio-tab-scene');
 for(const environment of ['gallery','chapel','studio','transparent']){
  await page.click(`[data-environment="${environment}"]`);await ready();
  const result=await page.evaluate(()=>window.__BEDROCK_STUDIO__.capture(512));
  const png=PNG.sync.read(Buffer.from(result.dataUrl.split(',')[1],'base64'));
  assert.equal(png.width,512);assert.equal(png.height,288);assert.equal(png.data[3],environment==='transparent'?0:255);
  assert.ok(png.data.some((v,i)=>i%4===3&&v===255),'render must contain opaque geometry');
  environmentSamples.push({environment,blockCount:result.environment.blockCount,width:png.width,height:png.height});
 }
 // Round-trip a real download through the scene-file input, including the camera.
 const saved=await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene());
 const jsonDownload=page.waitForEvent('download');await page.click('#studio-save');const jsonFile=await jsonDownload;await jsonFile.saveAs(path.join(output,'roundtrip.json'));
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(output,'roundtrip.json'),'utf8')),saved);
 await page.evaluate(()=>window.__BEDROCK_STUDIO__.preset('green'));
 await page.locator('#studio-file').setInputFiles(path.join(output,'roundtrip.json'));await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.startsWith('Cena aberta'));
 assert.deepEqual(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene()),saved);
 // Previous scene schema must keep its visible cloth when opened in the new shared selector.
 const legacyClassic={...saved,schema:1,renderer:'1.8.3',config:{...saved.config,family:'classic',cloth:4,textile:'agnus'}};
 await page.locator('#studio-file').setInputFiles({name:'legacy-classic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacyClassic))});
 await page.waitForFunction(()=>window.__BEDROCK_STUDIO__.scene().config.family==='classic'&&window.__BEDROCK_STUDIO__.scene().config.textile==='gold_long');await ready();
 assert.equal(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene().schema),3);
 const legacyColonnade={...saved,schema:1,renderer:'1.8.3',config:{...saved.config,family:'colonnade',textile:'agnus'}};
 await page.locator('#studio-file').setInputFiles({name:'legacy-colonnade.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacyColonnade))});
 await page.waitForFunction(()=>window.__BEDROCK_STUDIO__.scene().config.family==='colonnade'&&window.__BEDROCK_STUDIO__.scene().config.textile==='lace');await ready();
 await page.locator('#studio-file').setInputFiles(path.join(output,'roundtrip.json'));
 await page.waitForFunction(()=>window.__BEDROCK_STUDIO__.scene().config.family==='ogive');await ready();
 assert.deepEqual(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene()),saved);
 await page.locator('#studio-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schema":9}')});
 await page.waitForFunction(()=>!document.querySelector('#studio-error').hidden);assert.deepEqual(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene()),saved);
 const invalidCamera={...saved,config:{...saved.config,width:1},camera:{...saved.camera,position:[null,0,0]}};
 await page.locator('#studio-file').setInputFiles({name:'invalid-camera.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalidCamera))});
 await page.waitForFunction(()=>document.querySelector('#studio-error').textContent==='Câmera inválida.');assert.deepEqual(await page.evaluate(()=>window.__BEDROCK_STUDIO__.scene()),saved);
 await page.evaluate(()=>window.__BEDROCK_STUDIO__.configure({family:'trestle',surface:'walnut',textile:'none',width:16,depth:8,view:'back'}));
 const maximum=await page.evaluate(()=>window.__BEDROCK_STUDIO__.capture(960));await fs.writeFile(path.join(output,'maximum-back.png'),Buffer.from(maximum.dataUrl.split(',')[1],'base64'));
 // Ceiling cutaway, broad architecture framing and minimum dimensions are visual regressions.
 for(const [name,options]of [
  ['maximum-top',{width:16,depth:8,view:'top',ratio:'4:5'}],
  ['minimum-hero',{width:1,depth:1,view:'hero'}],
  ['chapel-wide',{environment:'chapel',view:'wide'}],
  ['gallery-back-dressed',{environment:'gallery',view:'back'}],
  ['chapel-back-dressed',{environment:'chapel',view:'back'}],
  ['garden-wide',{environment:'studio',view:'wide',candles:2}],
  ['player-eye',{environment:'gallery',view:'player'}],
 ]){
  await page.evaluate(options=>window.__BEDROCK_STUDIO__.configure(options),options);
  const capture=await page.evaluate(()=>window.__BEDROCK_STUDIO__.capture(960));
  assert.equal(capture.environment.sceneryRevision,4);
  assert.deepEqual(capture.environment.floors,{nave:-1,sanctuary:0});
  if(options.view==='back')assert.ok(capture.environment.cutaway.includes('apse'),'back view reveals altar through the rear wall');
  if(options.view==='top')assert.ok(capture.environment.cutaway.includes('roof'));
  if(options.view==='player')assert.ok(Math.abs(capture.camera.position[1]-.62)<1e-6,'player eye is 1.62 above the nave floor');
  await fs.writeFile(path.join(output,name+'.png'),Buffer.from(capture.dataUrl.split(',')[1],'base64'));
 }
 // Enhanced presentation mode stays explicit and export restores the preview's controls.
 await page.evaluate(()=>window.__BEDROCK_STUDIO__.preset('guadalupe'));await page.selectOption('#studio-lighting','shadows');await ready();
 const enhanced=await page.evaluate(()=>window.__BEDROCK_STUDIO__.capture(512));assert.equal(enhanced.config.lighting,'shadows');assert.ok(enhanced.samples===4);
 await page.click('#studio-tab-scene');await page.selectOption('#studio-lighting','classic');await ready();await page.click('#studio-tab-image');await page.selectOption('#studio-resolution','1920');
 const pngDownload=page.waitForEvent('download');await page.click('#studio-export');await (await pngDownload).saveAs(path.join(output,'export.png'));
 const exported=PNG.sync.read(await fs.readFile(path.join(output,'export.png')));assert.equal(exported.width,1920);assert.equal(exported.height,1080);assert.equal(await page.locator('#studio-export').isEnabled(),true);
 await page.click('#studio-tab-altar');await page.waitForTimeout(180);await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
 // Existing tools and studio share a page and survive parking without a navigation.
 const navigations=await page.evaluate(()=>performance.getEntriesByType('navigation').length);
 await page.click('[data-tool-link="bedrock"]');await page.waitForFunction(()=>document.body.dataset.activeTool==='bedrock');
 await page.click('[data-tool-link="studio"]');await page.waitForFunction(()=>document.body.dataset.activeTool==='studio');
 assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation').length),navigations);
 assert.equal(await page.locator('#workbench-project-select').inputValue(),'altare');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile must not overflow horizontally');
 assert.equal(await page.locator('#studio-export').isVisible(),true);
 assert.deepEqual(errors,[]);
 const report={ok:true,elapsedMs:Math.round(performance.now()-startedAt),backend:browser.renderDiagnostics,environmentSamples,liturgicalObjects:true,download:{width:exported.width,height:exported.height},errors};await fs.writeFile(path.join(output,built?'report-built.json':'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Render Studio smoke OK: live edits, queue, 4 environments, alpha, lighting, PNG download, JSON round-trip, workbench routing and mobile.');
}finally{await browser?.close();if(built)await new Promise(resolve=>server.httpServer.close(resolve));else await server.close();}
