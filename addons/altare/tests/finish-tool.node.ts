import test from 'node:test';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
// @ts-ignore Authored asset module is JavaScript, like the other production art.
import {createFinishToolIcon,FINISH_TOOL_PALETTE} from '../assets-src/finish-tool.mjs';

test('finishing tool is deterministic 32 px pixel art with safe transparent padding',()=>{
 const icon=createFinishToolIcon();
 assert.equal(icon.width,32);assert.equal(icon.height,32);
 assert.deepEqual(PNG.sync.write(icon),PNG.sync.write(createFinishToolIcon()));
 const palette=new Set(Object.values(FINISH_TOOL_PALETTE).map((hex:any)=>hex.toLowerCase()));
 let opaque=0;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const i=(y*32+x)*4,alpha=icon.data[i+3];assert.ok(alpha===0||alpha===255);
  if(!alpha){assert.deepEqual([...icon.data.subarray(i,i+3)],[0,0,0]);continue;}
  opaque++;assert.ok(x>=2&&y>=2&&x<30&&y<30);
  assert.ok(palette.has('#'+[...icon.data.subarray(i,i+3)].map(v=>v.toString(16).padStart(2,'0')).join('')));
 }
 assert.ok(opaque>300&&opaque<650,'recognizable silhouette with breathing room');
});

test('needle and cloth form one connected sprite without floating decorative pixels',()=>{
 const {data}=createFinishToolIcon();
 const pixels=new Set<number>();for(let i=0;i<1024;i++)if(data[i*4+3])pixels.add(i);
 const pending=[pixels.values().next().value!],visited=new Set<number>();
 while(pending.length){const p=pending.pop()!;if(visited.has(p))continue;visited.add(p);
  const x=p%32,y=Math.floor(p/32);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,ny=y+dy,n=ny*32+nx;
   if(nx>=0&&nx<32&&ny>=0&&ny<32&&pixels.has(n)&&!visited.has(n))pending.push(n);
  }
 }
 assert.equal(visited.size,pixels.size);
});

test('linen, liturgical swatches and brass remain distinct material families',()=>{
 const {data}=createFinishToolIcon();
 const rgb=(x:number,y:number)=>'#'+[...data.subarray((y*32+x)*4,(y*32+x)*4+3)].map(v=>v.toString(16).padStart(2,'0')).join('');
 assert.equal(rgb(6,15),FINISH_TOOL_PALETTE.green);
 assert.equal(rgb(11,9),FINISH_TOOL_PALETTE.red);
 assert.equal(rgb(25,20),FINISH_TOOL_PALETTE.linen);
 assert.equal(rgb(20,18),FINISH_TOOL_PALETTE.gold);
 assert.equal(rgb(25,4),FINISH_TOOL_PALETTE.eye);
});
