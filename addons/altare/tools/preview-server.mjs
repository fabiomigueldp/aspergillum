import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';

// These diagnostic modules are already browser ESM. A static loopback server
// avoids a dependency-transform pipeline and serves the exact inspected files.
export async function startPreviewServer(manager){
 const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png'};
 const allowed=/^(addons\/altare\/(tools|packs\/resource)\/|viewer-3d\/(node_modules\/three\/|src\/shared\/))/;
 // Software frames can keep the browser busy longer than Node's default idle
 // connection window. Keep the read-only local session alive between frames.
 const server=createServer({keepAliveTimeout:60000,keepAliveTimeoutBuffer:5000},async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(manager,'.'+pathname),relative=path.relative(manager,file).replaceAll('\\','/');
   if(!allowed.test(relative)||!types[path.extname(file)]||!['GET','HEAD'].includes(req.method)){
    res.writeHead(404);res.end();return;
   }
   const bytes=await readFile(file);
   res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','Content-Length':bytes.length});
   res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end();}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
