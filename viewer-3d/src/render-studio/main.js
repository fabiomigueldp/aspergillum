import {StudioStage} from './stage.js';
import {createAltareProvider} from './altare-provider.js';
import {createPropsProvider} from './props-provider.js';
import {planLiturgy} from './liturgical-plan.js';
import {composeLiturgy,disposeDressing} from './liturgical-scene.js';
import {STUDIO_VERSION,STUDIO_PRESETS,STUDIO_ENVIRONMENTS,STUDIO_VIEWS,DEFAULT_STUDIO_CONFIG,normalizeStudioConfig,studioDimensions,studioFilename} from '../shared/studio-contract.js';
import {studioCustomization,studioAppearance,changeCustomization,customizationCapabilities,createStudioHistory} from '../shared/altar-customization.js';
import {syncAppearanceControls} from './control-presentation.js';
import {createStudioSceneState,restoreStudioSceneState,readStudioSceneFile} from '../shared/studio-persistence.js';
const elements=new Map([...document.querySelectorAll('[id^="studio-"]')].map(element=>[element.id,element]));
const $=id=>elements.get('studio-'+id),root=$('main');
$('save').disabled=$('open').disabled=true;
const fields=['family','surface','textile','frontal','stone','ornamental','width','depth','lighting','exposure','light','projection','quality','dressing','candles','season','furnishing','candlePlacement'];
const colors=[['white','Branco','#e9e4d8'],['red','Vermelho','#8b2334'],['green','Verde','#234c39'],['purple','Roxo','#593859'],['rose','Róseo','#c98a99'],['black','Preto','#282c2b'],['gold','Dourado','#b79951'],['silver','Prateado','#a9b2af']];
let config={...DEFAULT_STUDIO_CONFIG},provider,props,stage,selection='guadalupe',pending=null,drain=null,lastModelKey='',lastDressingKey='',exporting=false,saveTimer;
let editorDraft=studioCustomization(config),intent=null;const history=createStudioHistory();
const api={version:STUDIO_VERSION,ready:false,error:null};window.__BEDROCK_STUDIO__=api;
function status(message){$('status').textContent=message;}
function failure(error){const message=error instanceof Error?error.message:String(error);$('error').textContent=message;$('error').hidden=false;status('Não foi possível concluir');return message;}
function remember(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('bedrock-studio.altare',JSON.stringify({...createStudioSceneState(config,editorDraft),renderer:STUDIO_VERSION,camera:stage.cameraState()}));}catch{}},250);}
function panel(id,focus=false){for(const button of root.querySelectorAll('[data-panel]')){const active=button.dataset.panel===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$('panel-'+button.dataset.panel).hidden=!active;if(active&&focus)button.focus();}}
for(const button of root.querySelectorAll('[data-panel]')){button.addEventListener('click',()=>panel(button.dataset.panel));button.addEventListener('keydown',event=>{const ids=['altar','scene','image'],i=ids.indexOf(button.dataset.panel);if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();panel(ids[event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3],true);}});}
function appearance(patch){if(exporting)return;selection=null;const next=changeCustomization(intent?.draft??editorDraft,patch);return request({...(intent?.config??config),...studioAppearance(next)},false,{draft:next}).catch(error=>{syncUI();failure(error);});}
for(const [id,label]of [['classic','Clássico'],['pilaster','Pilastras'],['ogive','Ogivas'],['trestle','Cavaletes'],['coffer','Arca'],['baluster','Balaústres'],['colonnade','Colunata']]){const button=document.createElement('button');button.type='button';button.dataset.model=id;button.setAttribute('aria-pressed','false');const img=document.createElement('img');img.src=new URL(`studio-models/${id}.png`,document.baseURI).href;img.alt='';img.addEventListener('error',()=>{img.hidden=true;},{once:true});const text=document.createElement('span');text.textContent=label;button.append(img,text);button.addEventListener('click',()=>appearance({model:id}));$('models').append(button);}
async function travel(direction){if(exporting||drain)return;const state=history[direction]();if(!state)return;selection=state.selection;await request(state.config,true,{draft:state.draft,record:false});}
$('undo').addEventListener('click',()=>travel('undo').catch(failure));$('redo').addEventListener('click',()=>travel('redo').catch(failure));
root.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&!event.target.matches('input,select,textarea')){const key=event.key.toLowerCase();if(key==='z'||key==='y'){event.preventDefault();travel(key==='y'||event.shiftKey?'redo':'undo').catch(failure);}}});
function createButtons(container,items,key){for(const item of items){const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset[key]=item.id;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{if(exporting)return;if(key==='view'){config={...config,view:item.id};stage.setView(item.id);syncUI();remember();}else request({...(intent?.config??config),[key]:item.id},['ratio','environment'].includes(key),{draft:intent?.draft??editorDraft}).catch(failure);});container.append(button);}}
createButtons($('views'),STUDIO_VIEWS,'view');createButtons($('environments'),STUDIO_ENVIRONMENTS,'environment');createButtons($('ratios'),['16:9','4:3','1:1','4:5'].map(id=>({id,label:id})),'ratio');
for(const [index,button]of [...$('environments').children].entries())button.style.setProperty('--env-color',['#bbb4a3','#4d5144','#343b37','#f0eee7'][index]);
for(const [id,label,value]of colors){const button=document.createElement('button');button.type='button';button.style.setProperty('--swatch',value);button.dataset.color=id;button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{appearance({color:id});});$('swatches').append(button);}
for(const preset of STUDIO_PRESETS){const button=document.createElement('button');button.type='button';button.dataset.preset=preset.id;button.title=preset.description;button.setAttribute('aria-pressed','false');const image=document.createElement('img');image.alt='';image.src=new URL(`studio-gallery/${preset.id}.png`,document.baseURI).href;image.addEventListener('error',()=>{image.hidden=true;},{once:true});const label=document.createElement('strong');label.textContent=preset.name;button.append(image,label);button.addEventListener('click',()=>{if(exporting)return;selection=preset.id;request({...DEFAULT_STUDIO_CONFIG,...preset,ratio:config.ratio,quality:config.quality},true).catch(failure);});$('presets').append(button);}
function syncUI(){
 for(const key of fields){if(key==='ornamental')$(key).checked=config[key];else $(key).value=config[key];}
 syncAppearanceControls($,editorDraft,customizationCapabilities(editorDraft));
 for(const button of root.querySelectorAll('[data-model]'))button.setAttribute('aria-pressed',String(button.dataset.model===config.family));
 $('undo').disabled=!history.canUndo||Boolean(drain);$('redo').disabled=!history.canRedo||Boolean(drain);
 $('ritual-fields').hidden=config.dressing==='none';$('direction-field').hidden=config.lighting==='classic';
 $('dimensions').textContent=`${config.width} × ${config.depth} × 1`;
 for(const key of ['view','environment','ratio','color','preset'])for(const button of root.querySelectorAll(`[data-${key}]`))button.setAttribute('aria-pressed',String(button.dataset[key]===(key==='preset'?selection:key==='color'?editorDraft.color:config[key])));
 $('color-label').textContent=colors.find(c=>c[0]===editorDraft.color)[1];$('exposure-value').textContent=config.exposure.toFixed(2).replace('.',',');$('light-value').textContent=config.light+'°';
 $('light').disabled=config.lighting==='classic';$('light').title=config.lighting==='classic'?'Ative sombras para alterar a direção da luz.':'';
 $('environment-label').textContent=STUDIO_ENVIRONMENTS.find(e=>e.id===config.environment).label.toLocaleUpperCase('pt-BR');
 $('selection-label').textContent=selection?STUDIO_PRESETS.find(p=>p.id===selection).name:({classic:config.ornamental?'Guadalupe':'Clássico',trestle:'Mesa com cavaletes',pilaster:'Moldura com pilastras',ogive:'Arcadas ogivais',coffer:'Arca em nogueira',baluster:'Mesa balaustrada',colonnade:'Colunata dourada'}[config.family]);
 const dimensions=studioDimensions(config.ratio,Number($('resolution').value));$('output-size').textContent=`${dimensions.width} × ${dimensions.height} · PNG`;
 resize();
}
function resize(){if(!stage||stage.exporting||!root.isConnected)return;const wrap=$('frame-wrap'),[w,h]=config.ratio.split(':').map(Number),width=Math.max(1,Math.min(wrap.clientWidth,wrap.clientHeight*w/h));$('frame').style.width=width+'px';$('frame').style.aspectRatio=`${w}/${h}`;stage.resize(width,width*h/w);}
async function request(raw,fit=false,options={}){
 const normalized=normalizeStudioConfig(raw);pending={config:normalized,fit:fit||pending?.fit,draft:options.draft??studioCustomization(normalized),record:options.record!==false};intent=pending;
 if(!drain)drain=(async()=>{
  // Yield before draining: even a cached, synchronous scene must clear the assigned promise.
  await Promise.resolve();
  $('export').disabled=true;$('save').disabled=true;$('loading').hidden=false;$('error').hidden=true;status('Atualizando cena');
  try{while(pending){const job=pending;pending=null;
   const modelKey=JSON.stringify(['family','surface','textile','frontal','color','stone','ornamental','width','depth','lighting'].map(k=>job.config[k]));
   if(modelKey!==lastModelKey){const model=await provider.compose(job.config);if(pending){pending.fit=job.fit||pending.fit;model.traverse(m=>m.geometry?.dispose());continue;}stage.setModel(model);lastModelKey=modelKey;}
   const dressingKey=JSON.stringify([modelKey,job.config.environment,job.config.dressing,job.config.candles,job.config.season,job.config.furnishing,job.config.candlePlacement]);
   if(dressingKey!==lastDressingKey){
    const plan=planLiturgy(job.config,props.catalog),model=await composeLiturgy(plan,job.config,props,provider);
    if(pending){pending.fit=job.fit||pending.fit;disposeDressing(model);continue;}
    stage.setDressing(model);lastDressingKey=dressingKey;
   }
   config=job.config;editorDraft=job.draft;if(job.record)history.record({config,draft:editorDraft,selection});syncUI();stage.configure(config,job.fit);remember();
  }const notes=stage.arrangement.notes.join(' ');$('dressing-note').textContent=notes;$('dressing-note').hidden=!notes;status('Cena pronta');}
  finally{$('loading').hidden=true;$('export').disabled=false;$('save').disabled=false;drain=null;intent=null;syncUI();}
 })();return drain;
}
for(const key of fields){const element=$(key);element.addEventListener('change',()=>{if(exporting)return;selection=null;const value=key==='ornamental'?element.checked:['stone','cloth','width','depth'].includes(key)?Number(element.value):element.value;const draftKey={family:'model',surface:'surface',textile:'textile',frontal:'relief',stone:'stone',cloth:'cloth',ornamental:'ornamental'}[key];if(draftKey){appearance({[draftKey]:value});return;}request({...(intent?.config??config),[key]:value},['width','depth','projection','dressing','candles','season','furnishing','candlePlacement'].includes(key),{draft:intent?.draft??editorDraft}).catch(error=>{syncUI();failure(error);});});}
for(const key of ['exposure','light'])$(key).addEventListener('input',()=>{$(key+'-value').textContent=key==='light'?$(key).value+'°':Number($(key).value).toFixed(2).replace('.',',');});
$('resolution').addEventListener('change',syncUI);$('fit').addEventListener('click',()=>{stage.setView(config.view);remember();});
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function sceneFile(){return {...createStudioSceneState(config,editorDraft),renderer:STUDIO_VERSION,addon:'altare',addonVersion:provider.catalog.version,sourceHash:provider.catalog.sourceHash,environment:{sourceHash:stage.vanilla.manifest.sourceHash,revision:stage.vanilla.manifest.revision,sceneryRevision:stage.stage.revision,blockCount:stage.stage.blockCount,blockUnit:1,floors:stage.stage.layout.floor,cutaway:[...(stage.stage.cutaway??[])]},objects:{sourceHash:props.catalog.sourceHash,arrangement:stage.arrangement},camera:stage.cameraState()};}
$('save').addEventListener('click',()=>{if(!api.ready||drain||exporting)return;try{download(new Blob([JSON.stringify(sceneFile(),null,2)],{type:'application/json'}),studioFilename(config)+'.json');}catch(error){failure(error);}});
$('open').addEventListener('click',()=>$('file').click());$('file').addEventListener('change',async()=>{try{const file=$('file').files[0];if(!file)return;if(file.size>32768)throw Error('A cena excede o limite de 32 KB.');const saved=JSON.parse(await file.text());const next=readStudioSceneFile(saved);selection=null;await request(next.config,true,{draft:next.draft});stage.restoreCamera(next.camera);remember();status(saved.sourceHash!==provider.catalog.sourceHash?'Cena aberta com a versão atual dos modelos':'Cena aberta');}catch(error){failure(error);}finally{$('file').value='';}});
async function capture(longEdge){await drain;exporting=true;status('Renderizando imagem');const controls=[...root.querySelectorAll('input,select,button')],previous=controls.map(e=>e.disabled);controls.forEach(e=>e.disabled=true);
 try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const result=await stage.capture(longEdge);status(`Imagem pronta · ${result.width} × ${result.height}`);return {...result,...sceneFile()};}
 finally{exporting=false;controls.forEach((e,i)=>e.disabled=previous[i]);}}
$('export').addEventListener('click',async()=>{try{const result=await capture(Number($('resolution').value));const blob=await (await fetch(result.dataUrl)).blob();download(blob,studioFilename(config)+'.png');}catch(error){failure(error);}});
$('canvas').addEventListener('studio:cutaway',event=>{const layers=event.detail;$('cutaway').hidden=!layers.length;$('cutaway').textContent=layers.some(l=>l!=='roof')?'Parede em corte':'Teto em corte';});
window.addEventListener('aspergillum:toolchange',event=>{if(stage){stage.active=event.detail.tool==='studio';if(stage.active)resize();}});
new ResizeObserver(resize).observe($('frame-wrap'));
$('canvas').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(event.key)||exporting)return;event.preventDefault();if(event.key==='Home'){stage.setView(config.view);return;}const offset=stage.camera.position.clone().sub(stage.controls.target);if(event.key==='+'||event.key==='-')offset.multiplyScalar(event.key==='+'?.9:1.1);else{const a=.1*(event.key==='ArrowLeft'||event.key==='ArrowDown'?-1:1);if(event.key==='ArrowLeft'||event.key==='ArrowRight'){const x=offset.x;offset.x=x*Math.cos(a)+offset.z*Math.sin(a);offset.z=-x*Math.sin(a)+offset.z*Math.cos(a);}else offset.y=Math.max(.15,offset.y+a*offset.length());}stage.camera.position.copy(stage.controls.target).add(offset);stage.controls.update();});
try{
 stage=new StudioStage($('canvas'),remember);[,provider,props]=await Promise.all([stage.prepare(),createAltareProvider(stage.renderer),createPropsProvider(stage.renderer)]);$('pack-version').textContent='v'+provider.catalog.version;
 let saved;try{saved=JSON.parse(localStorage.getItem('bedrock-studio.altare')??'null');}catch{}
 try{if(saved){const restored=restoreStudioSceneState(saved,{allowLegacySchema:true});config=restored.config;editorDraft=restored.draft;}}catch{saved=null;}
 if(saved)selection=null;await request(config,true,{draft:editorDraft});if(saved?.camera&&saved.renderer===STUDIO_VERSION){try{stage.restoreCamera(saved.camera);}catch{}}
 api.configure=async options=>{selection=null;await request(normalizeStudioConfig(options),true);return sceneFile();};
 api.preset=async id=>{const preset=STUDIO_PRESETS.find(p=>p.id===id);if(!preset)throw Error('Composição desconhecida.');selection=id;await request({...DEFAULT_STUDIO_CONFIG,...preset},true);return sceneFile();};
 api.capture=capture;api.scene=sceneFile;api.setView=id=>{if(!STUDIO_VIEWS.some(v=>v.id===id))throw Error('Vista desconhecida.');stage.setView(id);config={...config,view:id};syncUI();};api.ready=true;$('open').disabled=false;
}catch(error){api.error=failure(error);$('loading').hidden=true;}
