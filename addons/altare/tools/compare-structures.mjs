import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {readZip} from '../../../tools/lib/zip.mjs';
const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const folders=[process.argv[2]??'out/structures-before-0.4.1',process.argv[3]??`out/structures-${version}`];
const manifests=folders.map(f=>JSON.parse(fs.readFileSync(path.join(root,f,'capture-manifest.json'),'utf8')));
for(let i=0;i<2;i++){
 const m=manifests[i],archive=readZip(path.join(root,`dist/releases/Altare-${m.version}.mcaddon`));
 const entries=new Map(archive.entries.map(e=>[e.name,e]));
 for(const [file,expected]of Object.entries({...m.sourceHashes,...m.textureHashes}).filter(([file])=>file.startsWith('packs/'))){
  const entry=entries.get(file.replace('packs/behavior/','Altare_BP/').replace('packs/resource/','Altare_RP/'));assert.ok(entry,file);assert.equal(hash(entry.read()),expected,`Archive parity ${m.version} ${file}`);
 }
 for(const c of m.captures)assert.equal(hash(fs.readFileSync(path.join(root,folders[i],c.file))),c.sha256);
}
assert.deepEqual([manifests[1].width,manifests[1].height],[manifests[0].width,manifests[0].height]);
const backend=m=>m.backend?.backend??(/SwiftShader/i.test(m.renderer)?'software':undefined);
assert.ok(manifests.every(m=>backend(m)),'Unknown rendering backend: cannot claim a controlled comparison');
assert.equal(backend(manifests[0]),backend(manifests[1]),'Before and after must use the same rendering backend');
if(manifests.every(m=>m.backend?.renderer))assert.equal(manifests[0].backend.renderer,manifests[1].backend.renderer,'Before and after must use the same graphics device');
if(manifests.every(m=>m.backend?.browserVersion))assert.equal(manifests[0].backend.browserVersion,manifests[1].backend.browserVersion,'Before and after must use the same browser version');
assert.equal(manifests[0].captures.length,manifests[1].captures.length,'A controlled comparison must include the complete matching capture set');
const old=new Map(manifests[0].captures.map(c=>[c.file,c]));
const pairs=manifests[1].captures.map(c=>{const before=old.get(c.file);assert.ok(before);assert.deepEqual(c.camera,before.camera);assert.deepEqual(c.preset,before.preset);assert.deepEqual(c.view,before.view);return {file:c.file,preset:c.preset.id,view:c.view.id,profile:c.profile,before:before.sha256,after:c.sha256};});
assert.ok(pairs.length>=2);const beforeVersion=manifests[0].version;
const ornate=manifests.every(m=>m.matrix==='ornate'),pilaster=manifests.every(m=>m.matrix==='pilaster'),ogive=manifests.every(m=>m.matrix==='ogive'),title=ogive?'Ogivas · antes e depois':pilaster?'Pilastras · antes e depois':ornate?'Colunata e renda · antes e depois':'Estruturas · antes e depois';
const output=path.join(root,`out/${ogive?'ogive':pilaster?'pilaster':ornate?'colonnade':'structure'}-comparison-${version}`);fs.mkdirSync(output,{recursive:true});
const names={'trestle-bare-7':'Cavaletes 7 × 2 · sem toalha','trestle-white-7':'Cavaletes 7 × 2 · branco','trestle-single-1':'Cavaletes 1 × 1','trestle-deep-3':'Cavaletes 3 × 3 · preto','trestle-even-8':'Cavaletes 8 × 2 · rubi','pilaster-bare-7':'Pilastras 7 × 2','ogive-bare-7':'Ogivas 7 × 2 · sem toalha','ogive-white-7':'Ogivas 7 × 2 · branco'};
const label=p=>{const match=p.match(/^colonnade-(bare|lace)-(\d+)$/);return names[p]??(match?`Colunata ${match[2]} × ${match[2]==='1'?'1':'2'} · ${match[1]==='lace'?'renda':'sem toalha'}`:p);};
Object.assign(names,{'pilaster-marble-bare-7':'Pilastras 7 × 2 · mármore','pilaster-walnut-bare-5':'Pilastras 5 × 2 · nogueira','pilaster-limestone-agnus-8':'Pilastras 8 × 2 · Cordeiro','pilaster-marble-lace-7':'Pilastras 7 × 2 · renda'});
for(const [id,name] of Object.entries({...names}))if(id.startsWith('pilaster-'))names[id.replace('pilaster-','ogive-')]=name.replace('Pilastras','Ogivas');
const viewNames={front:'frente',oblique:'oblíqua',corner:'canto',detail:'detalhe',back:'trás',top:'superior',capital:'capitel',base:'base',panel:'painel',underside:'inferior',arch:'arcada',peak:'ponta da ogiva',raking:'lateral rasante'};
const changed=p=>p.profile==='classic'&&p.before!==p.after;
const preferred=[p=>ogive&&changed(p)&&p.preset==='ogive-walnut-bare-5'&&p.view==='raking',p=>changed(p)&&['ogive-walnut-bare-5','pilaster-walnut-bare-5','trestle-bare-7','colonnade-bare-3'].includes(p.preset)&&p.view==='oblique',p=>changed(p)&&p.preset==='colonnade-lace-1'&&p.view==='corner',p=>changed(p)];
const selected=preferred.map(match=>pairs.findIndex(match)).find(i=>i>=0)??0;
const options=pairs.map((p,i)=>`<option value="${i}" ${i===selected?'selected':''}>${label(p.preset)} · ${viewNames[p.view]??p.view} · ${p.profile==='classic'?'cor':'PBR'}</option>`).join('');
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>*{box-sizing:border-box}body{font:16px/1.5 system-ui;margin:32px auto;padding:0 20px;max-width:1300px;background:#edece6;color:#292d28}h1{font-size:28px}p{max-width:85ch}label{display:block;margin:14px 0 6px}select{font:inherit;padding:8px;max-width:100%}.frame{position:relative;aspect-ratio:${manifests[0].width}/${manifests[0].height};overflow:hidden;margin-top:22px;background:#deddd3}.frame img{position:absolute;width:100%;height:100%;object-fit:contain}.frame span{position:absolute;top:12px;background:#fffdf4;padding:5px 12px;border-radius:3px}.new{right:12px}.old{left:12px}#divider{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#744b1e}input{width:100%;accent-color:#744b1e}small{color:#5a6059}</style>
<h1>${title}</h1><p>À esquerda: ${beforeVersion}. À direita: ${version}. Arraste a divisão para comparar a arquitetura, as molduras e o tecido na mesma câmera. São capturas dos modelos e materiais dos arquivos distribuídos, feitas fora do Minecraft; a aparência no jogo ainda precisa de validação.</p>
<label for="view">Estrutura e vista</label><select id="view">${options}</select><div class="frame"><img id="before" alt="Antes, Altare ${beforeVersion}"><img id="after" alt="Depois, Altare ${version}"><div id="divider"></div><span class="old">${beforeVersion} · antes</span><span class="new">${version} · depois</span></div>
<label for="split">Posição da comparação</label><input id="split" type="range" min="0" max="100" value="50"><small>${pairs.length} pares de imagens, câmera e enquadramento idênticos. Use as setas do teclado no controle para ajustar a divisão.</small>
<script>const pairs=${JSON.stringify(pairs)},folders=${JSON.stringify(folders.map(f=>'../'+path.basename(f)))},view=document.querySelector('#view'),split=document.querySelector('#split'),before=document.querySelector('#before'),after=document.querySelector('#after');function update(){const p=pairs[Number(view.value)];before.src=folders[0]+'/'+p.file;after.src=folders[1]+'/'+p.file;after.style.clipPath='inset(0 0 0 '+split.value+'%)';document.querySelector('#divider').style.left=split.value+'%'}view.addEventListener('change',update);split.addEventListener('input',update);update();</script></html>`);
fs.writeFileSync(path.join(output,'comparison-manifest.json'),JSON.stringify({before:beforeVersion,after:version,folders,pairs,defaultPair:pairs[selected].file,verified:'Both image sets match their released archives; identical camera and framing; no Minecraft rendering parity implied'},null,2)+'\n');
console.log(`Compared ${pairs.length} controlled before/after pairs: ${path.join(output,'index.html')}`);
