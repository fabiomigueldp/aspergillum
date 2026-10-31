import {launchRenderBrowser} from './lib/render-browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const viewer=path.resolve(import.meta.dirname,'..'),output=path.resolve(viewer,'../out/render-studio/prop-inspection');
await fs.mkdir(output,{recursive:true});
const server=await createServer({root:viewer,configFile:path.join(viewer,'vite.config.js'),logLevel:'error',server:{host:'127.0.0.1',port:0}});let browser;
try{
 await server.listen();browser=await launchRenderBrowser(chromium);
 const page=await browser.newPage({viewport:{width:1400,height:950}});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/render-studio.html`);
 await page.waitForFunction(()=>window.__BEDROCK_STUDIO__?.ready,null,{timeout:120000});
 const entries=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),{createPropsProvider}=await import('/src/render-studio/props-provider.js');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(600,600);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const provider=await createPropsProvider(renderer);window.propInspection={THREE,renderer,provider};return provider.catalog.assets;
 });
 const records=[];
 for(const entry of entries){
  for(const view of ['front','back']){
   const result=await page.evaluate(async({id,view})=>{
    const {THREE,renderer,provider}=window.propInspection,model=await provider.instance(id,'classic');
    const scene=new THREE.Scene();scene.background=new THREE.Color(0xd9d6ce);scene.add(model,new THREE.AmbientLight(0xffffff,Math.PI));
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const span=Math.max(size.x,size.y,size.z)*1.35,camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,100);
    camera.position.copy(center).add(new THREE.Vector3(view==='front'?-.35:.35,.2,view==='front'?-1:1).normalize().multiplyScalar(15));camera.lookAt(center);renderer.render(scene,camera);
    const data=renderer.domElement.toDataURL('image/png');model.traverse(o=>o.geometry?.dispose());return {data,size:size.toArray()};
   },{id:entry.id,view});
   const file=entry.id+'-'+view+'.png';await fs.writeFile(path.join(output,file),Buffer.from(result.data.split(',')[1],'base64'));
   records.push({id:entry.id,label:entry.label,view,file,size:result.size});
  }
 }
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(records,null,2)+'\n');
 await fs.writeFile(path.join(output,'renderer.json'),JSON.stringify(browser.renderDiagnostics,null,2)+'\n');
 const cards=await Promise.all(records.filter(r=>r.view==='front').map(async r=>`<figure><img src="data:image/png;base64,${(await fs.readFile(path.join(output,r.file))).toString('base64')}"><figcaption>${r.label}<br>${r.size.map(n=>n.toFixed(2)).join(' × ')} blocos</figcaption></figure>`));
 await page.setContent(`<style>body{margin:0;background:#e6e3dd;font:16px system-ui;color:#302f2b;display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:10px}img{width:100%;display:block}figcaption{padding:6px}</style>${cards.join('')}`);
 await page.screenshot({path:path.join(output,'contact-sheet.png'),fullPage:true});
 console.log('Objetos capturados: '+records.length+' vistas em '+output);
}finally{await browser?.close();await server.close();}
