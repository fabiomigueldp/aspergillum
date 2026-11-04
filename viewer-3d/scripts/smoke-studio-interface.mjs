// Component smoke: actual HTML/CSS and control presenter, without assets or a 3D scene.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {launchRenderBrowser} from './lib/render-browser.mjs';

const root=path.resolve(import.meta.dirname,'..'),output=path.resolve(root,'../out/studio-interface');
const html=(await fs.readFile(path.join(root,'render-studio.html'),'utf8'))
 .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,'');
const presenter=await fs.readFile(path.join(root,'src/render-studio/control-presentation.js'),'utf8');
// An already installed system Chromium can be selected without changing the shared launcher.
const launcher=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
 ?{launch:options=>chromium.launch({...options,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE})}:chromium;
let browser;
try{
 browser=await launchRenderBrowser(launcher);
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(html);await page.addStyleTag({path:path.join(root,'src/render-studio/styles.css')});
 await page.addScriptTag({type:'module',content:presenter+'\nwindow.syncAppearanceControls=syncAppearanceControls;'});
 await page.waitForFunction(()=>typeof window.syncAppearanceControls==='function');
 await page.evaluate(()=>{document.querySelector('#studio-loading').hidden=true;document.querySelector('#studio-status').textContent='Interface pronta';});
 const show=capabilities=>page.evaluate(c=>{
  window.syncAppearanceControls(id=>document.querySelector('#studio-'+id),{textile:'floral',relief:'cross'},c);
 },capabilities);
 const architectural={architectural:true,material:true,color:true,relief:true,joinery:false,ornate:false};
 await show({...architectural,material:false,relief:false,joinery:true});
 assert.equal(await page.locator('#studio-surface').isVisible(),false);
 assert.equal(await page.locator('#studio-fixed-material').textContent(),'Material: nogueira');
 assert.equal(await page.locator('#studio-frontal-title').isVisible(),false);
 await show({...architectural,relief:false});
 assert.equal(await page.locator('#studio-frontal').isVisible(),false);
 assert.equal(await page.locator('#studio-relief-limit').isVisible(),true);
 await show(architectural);
 assert.equal(await page.locator('#studio-frontal').inputValue(),'cross');
 assert.equal(await page.locator('#studio-relief-limit').isVisible(),false);
 await fs.mkdir(output,{recursive:true});
 const layouts=[];
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:1000});
  const status=await page.locator('#studio-status').ariaSnapshot();
  assert.match(status,/Interface pronta/);
  const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,statusDisplay:getComputedStyle(document.querySelector('#studio-status')).display}));
  assert.notEqual(layout.statusDisplay,'none');assert.ok(layout.scrollWidth<=width,`Horizontal overflow at ${width}px`);
  layouts.push({...layout,status});await page.screenshot({path:path.join(output,`controls-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#studio-canvas').focus();await page.keyboard.press('ArrowLeft');
 const focus=await page.locator('#studio-canvas').evaluate(canvas=>({visible:canvas.matches(':focus-visible'),offset:getComputedStyle(canvas).outlineOffset,width:getComputedStyle(canvas).outlineWidth,description:document.getElementById(canvas.getAttribute('aria-describedby'))?.textContent}));
 assert.equal(focus.visible,true);assert.equal(focus.offset,'-4px');assert.equal(focus.width,'2px');assert.match(focus.description,/setas.*Home/);
 await page.screenshot({path:path.join(output,'keyboard-focus.png'),fullPage:true});assert.deepEqual(errors,[]);
 const report={ok:true,scope:'HTML/CSS and control presenter only; no full 3D app, screen reader or Minecraft validation',renderer:browser.renderDiagnostics,layouts,focus,errors};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();}
