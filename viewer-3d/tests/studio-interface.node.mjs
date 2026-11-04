import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {syncAppearanceControls} from '../src/render-studio/control-presentation.js';
import {locales} from '../../addons/altare/assets-src/locales.mjs';

const html=await readFile(new URL('../render-studio.html',import.meta.url),'utf8');
const css=await readFile(new URL('../src/render-studio/styles.css',import.meta.url),'utf8');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/shared/altar-customization.js',import.meta.url))],bundle:true,format:'esm',platform:'neutral',write:false});
const {studioCustomization,studioAppearance,changeCustomization,customizationCapabilities,MODELS,CLOTHS}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const initial=studioCustomization({family:'ogive',surface:'limestone',textile:'floral',color:'red',frontal:'cross',stone:1,cloth:0,ornamental:false});
function controls(){const nodes=new Map();return id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:'',textContent:''});return nodes.get(id);};}

test('studio labels distinguish width, ornament and fixed material without false choices',()=>{
 assert.match(html,/<label>Largura<input id="studio-width"/);
 assert.match(html,/> Imagem de Guadalupe<\/label>/);
 assert.match(html,/id="studio-fixed-material"[^>]*hidden/);
 assert.match(html,/Para usar relevo nesta toalha, escolha vermelho\./);
 assert.match(html,/<h2>Detalhes<\/h2>/);
});

test('keyboard camera help is associated with the focusable preview',()=>{
 assert.match(html,/<canvas[^>]*aria-describedby="studio-camera-help"[^>]*tabindex="0"/);
 assert.match(html,/id="studio-camera-help"[^>]*>[^<]*setas[^<]*Home/);
 assert.match(css,/#studio-canvas:focus-visible\s*\{[^}]*outline-offset:\s*-4px/);
});

test('compact layouts keep the live status in the accessibility tree',()=>{
 assert.match(html,/id="studio-status"[^>]*role="status"[^>]*aria-atomic="true"/);
 assert.doesNotMatch(css,/#studio-status\s*\{\s*display:\s*none/);
 assert.match(css,/#studio-status\s*\{[^}]*clip-path:\s*inset\(50%\)/);
});

test('all models, cloths and colors expose one material and no empty details section',()=>{
 for(const model of MODELS)for(const textile of CLOTHS)for(const color of ['white','red','green','purple','rose','black','gold','silver']){
  const draft=Object.freeze(changeCustomization(initial,{model,textile,color})),before={...draft},get=controls();
  syncAppearanceControls(get,draft,customizationCapabilities(draft));
  assert.equal(['classic','architectural','fixed-material'].filter(id=>!get(id).hidden).length,1,`${model}/${textile}/${color}`);
  assert.equal(!get('frontal-title').hidden,['guadalupe-field','frontal-field','relief-limit'].some(id=>!get(id).hidden));
  assert.equal(get('frontal').value,studioAppearance(draft).frontal);
  assert.deepEqual(draft,before);
 }
});

test('fixed material labels match native wording while hidden choices survive a return',()=>{
 for(const [model,key]of [['coffer','menu.material_walnut'],['baluster','menu.material_walnut'],['colonnade','menu.material_marble']]){
  const get=controls(),draft=changeCustomization(initial,{model});
  syncAppearanceControls(get,draft,customizationCapabilities(draft));
  assert.equal(get('fixed-material').textContent,locales.pt_BR[`altare.${key}`]);
  assert.equal(get('architectural').hidden,true);
  const restored=changeCustomization(draft,{model:'ogive'});
  syncAppearanceControls(get,restored,customizationCapabilities(restored));
  assert.equal(get('fixed-material').hidden,true);assert.equal(get('architectural').hidden,false);
  assert.deepEqual(studioAppearance(restored),studioAppearance(initial));
 }
 const get=controls(),purple=changeCustomization(initial,{color:'purple'});
 syncAppearanceControls(get,purple,customizationCapabilities(purple));
 assert.equal(get('frontal-field').hidden,true);assert.equal(get('relief-limit').hidden,false);
 const red=changeCustomization(purple,{color:'red'});
 syncAppearanceControls(get,red,customizationCapabilities(red));
 assert.equal(get('frontal').value,'cross');assert.equal(get('frontal-field').hidden,false);assert.equal(get('relief-limit').hidden,true);
});
