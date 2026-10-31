import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),manager=path.resolve(root,'../..');
const require=createRequire(path.join(manager,'viewer-3d/package.json'));const {chromium}=require('playwright');
const server=http.createServer((req,res)=>{
 const filename=path.resolve(manager,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!filename.startsWith(manager+path.sep)){res.writeHead(403);res.end();return;}
 try{const type={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png'}[path.extname(filename)]??'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(filename));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1000,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('CONTEXT_LOST'))errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/addons/evangeliarium/tools/pose-viewer.html`);
 await page.waitForFunction(()=>window.poseReady);
 const output=path.join(root,'out/poses');fs.mkdirSync(output,{recursive:true});const manifest=[];
 for(const model of ['wide','slim'])for(const [view,direction]of [['front',[0,.15,-1]],['three-quarter',[.7,.25,-1]],['side',[1,.1,0]]]){
  const capture=await page.evaluate(([m,d])=>window.capturePose(m,d),[model,direction]);
  const {image,...data}=capture;const name=`${model}-${view}.png`;fs.writeFileSync(path.join(output,name),Buffer.from(image.split(',')[1],'base64'));manifest.push({model,view,file:name,...data});
 }
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Six static rig captures written to out/poses.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
