import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
const version=process.argv[2]??'0.4.1';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const folders=['out/cloth-review-before-0.4.0',`out/cloth-review-${version}`];
const manifests=folders.map(f=>JSON.parse(fs.readFileSync(path.join(root,f,'capture-manifest.json'),'utf8')));
for(let i=0;i<2;i++){
 const m=manifests[i],archive=readZip(path.join(root,`dist/releases/Altare-${m.version}.mcaddon`));
 const entries=new Map(archive.entries.map(e=>[e.name,e]));
 for(const [file,expected]of Object.entries({...m.sourceHashes,...m.textureHashes}).filter(([file])=>file.startsWith('packs/'))){
  const entry=entries.get(file.replace('packs/behavior/','Altare_BP/').replace('packs/resource/','Altare_RP/'));assert.ok(entry,file);assert.equal(hash(entry.read()),expected,`Archive parity ${m.version} ${file}`);
 }
 for(const c of m.captures)assert.equal(hash(fs.readFileSync(path.join(root,folders[i],c.file))),c.sha256);
}
assert.deepEqual(manifests.map(m=>[m.width,m.height]),[[2000,1000],[2000,1000]]);
const old=new Map(manifests[0].captures.map(c=>[c.file,c]));
const pairs=manifests[1].captures.map(c=>{const before=old.get(c.file);assert.ok(before);assert.deepEqual(c.camera,before.camera);assert.deepEqual(c.preset,before.preset);assert.deepEqual(c.view,before.view);return {file:c.file,preset:c.preset.id,view:c.view.id,profile:c.profile,before:before.sha256,after:c.sha256};});
assert.equal(pairs.length,16);
const output=path.join(root,`out/cloth-comparison-${version}`);fs.mkdirSync(output,{recursive:true});
const names={'pilaster-ruby-7':'Floral rubi','pilaster-green-7':'Faixa verde / IHS','ogive-agnus-7':'Branco / Cordeiro','ogive-black-7':'Preto / cruzes'};
const options=pairs.map((p,i)=>`<option value="${i}" ${p.preset==='pilaster-green-7'&&p.view==='detail'&&p.profile==='classic'?'selected':''}>${names[p.preset]} · ${p.view==='detail'?'centro':'canto'} · ${p.profile==='classic'?'cor':'PBR'}</option>`).join('');
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Altare · revisão das toalhas</title>
<style>*{box-sizing:border-box}body{font:16px/1.5 system-ui;margin:32px auto;padding:0 20px;max-width:1300px;background:#edece6;color:#292d28}h1{font-size:28px}p{max-width:85ch}label{display:block;margin:14px 0 6px}select{font:inherit;padding:8px;max-width:100%}.frame{position:relative;aspect-ratio:2;overflow:hidden;margin-top:22px;background:#deddd3}.frame img{position:absolute;width:100%;height:100%;object-fit:contain}.frame span{position:absolute;top:12px;background:#fffdf4;padding:5px 12px;border-radius:3px}.new{right:12px}.old{left:12px}#divider{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#744b1e}input{width:100%;accent-color:#744b1e}small{color:#5a6059}</style>
<h1>Toalhas · antes e depois</h1><p>À esquerda: 0.4.0. À direita: ${version}. Arraste a divisão para comparar desenhos, encontros e bordas na mesma câmera. São capturas dos modelos e materiais dos arquivos distribuídos, feitas fora do Minecraft; a aparência no jogo ainda precisa de validação.</p>
<label for="view">Toalha e vista</label><select id="view">${options}</select><div class="frame"><img id="before" alt="Antes, Altare 0.4.0"><img id="after" alt="Depois, Altare ${version}"><div id="divider"></div><span class="old">0.4.0 · antes</span><span class="new">${version} · depois</span></div>
<label for="split">Posição da comparação</label><input id="split" type="range" min="0" max="100" value="50"><small>16 pares de imagens, câmera e enquadramento idênticos. Use as setas do teclado no controle para ajustar a divisão.</small>
<script>const pairs=${JSON.stringify(pairs)},folders=${JSON.stringify(folders.map(f=>'../'+path.basename(f)))},view=document.querySelector('#view'),split=document.querySelector('#split'),before=document.querySelector('#before'),after=document.querySelector('#after');function update(){const p=pairs[Number(view.value)];before.src=folders[0]+'/'+p.file;after.src=folders[1]+'/'+p.file;after.style.clipPath='inset(0 0 0 '+split.value+'%)';document.querySelector('#divider').style.left=split.value+'%'}view.addEventListener('change',update);split.addEventListener('input',update);update();</script></html>`);
fs.writeFileSync(path.join(output,'comparison-manifest.json'),JSON.stringify({before:'0.4.0',after:version,folders,pairs,verified:'Both image sets match their released archives; identical camera and framing; no Minecraft rendering parity implied'},null,2)+'\n');
console.log(`Compared ${pairs.length} controlled before/after pairs: ${path.join(output,'index.html')}`);
