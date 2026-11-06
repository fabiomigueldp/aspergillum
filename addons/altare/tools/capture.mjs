import {launchRenderBrowser} from '../../../viewer-3d/scripts/lib/render-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {startPreviewServer} from './preview-server.mjs';
import {planFinish} from '../src/domain/surface.ts';
import {designFor,liturgicalDesign,LITURGICAL_COLORS,sharedDesignFor} from '../src/domain/catalog.ts';
import {encodeTile} from '../src/domain/block-codec.ts';
const root=path.resolve(import.meta.dirname,'..'),manager=path.resolve(root,'../..');
const readVersion=kind=>JSON.parse(fs.readFileSync(path.join(root,`packs/${kind}/manifest.json`),'utf8')).header.version.join('.');
const packVersion=readVersion('behavior');
if(readVersion('resource')!==packVersion||JSON.parse(fs.readFileSync(path.join(root,'out/build-manifest.json'),'utf8')).version!==packVersion)throw Error('Capture requires a complete, matching generated BP/RP build.');
const require=createRequire(path.join(manager,'viewer-3d/package.json'));
const {chromium}=require('playwright');
const block=JSON.parse(fs.readFileSync(path.join(root,'packs/behavior/blocks/mensa.block.json'),'utf8'))['minecraft:block'];
const blockDocs=new Map(fs.readdirSync(path.join(root,'packs/behavior/blocks')).map(file=>{const b=JSON.parse(fs.readFileSync(path.join(root,'packs/behavior/blocks',file),'utf8'))['minecraft:block'];return [b.description.identifier,b];}));
const atlas=JSON.parse(fs.readFileSync(path.join(root,'packs/resource/textures/terrain_texture.json'),'utf8')).texture_data;
const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const output=path.resolve(root,option('--output','out/captures'));fs.mkdirSync(output,{recursive:true});
const profiles=option('--profiles','classic,pbr').split(',');
if(profiles.some(p=>!['classic','pbr'].includes(p)))throw Error('Unknown material profile');
const width=Number(option('--width','1600')),height=Number(option('--height','1000'));
if(!Number.isInteger(width)||!Number.isInteger(height)||width<320||height<240||width>3840||height>2160)throw Error('Invalid capture dimensions');
const presets=option('--matrix','materials')==='sizes'?[1,2,3,4,5,6,7,8,9,12,16].map(w=>({id:`size-${w}`,w,d:2,stone:0,cloth:3,ornamental:true,facing:0})):option('--matrix','materials')==='orientations'?[0,1,2,3].flatMap(facing=>[7,8].map(width=>({id:`front-${facing}-${width}`,w:facing%2?2:width,d:facing%2?width:2,stone:0,cloth:3,ornamental:true,facing}))):[
 {id:'guadalupe-7x2',w:7,d:2,stone:0,cloth:3,ornamental:true,facing:0},
 {id:'guadalupe-8x2',w:8,d:2,stone:0,cloth:3,ornamental:true,facing:0},
 {id:'guadalupe-long-7x2',w:7,d:2,stone:0,cloth:4,ornamental:true,facing:0},
 {id:'guadalupe-5x2',w:5,d:2,stone:0,cloth:3,ornamental:true,facing:0},
 {id:'guadalupe-4x2',w:4,d:2,stone:0,cloth:3,ornamental:true,facing:0},
 {id:'linen-3x2',w:3,d:2,stone:1,cloth:2,ornamental:false,facing:0},
 {id:'bare-1x1',w:1,d:1,stone:2,cloth:0,ornamental:false,facing:0},
 {id:'linen-east-2x3',w:2,d:3,stone:0,cloth:4,ornamental:false,facing:1},
];
const collectionPresets=[
 ['pilaster-ruby-7','pilaster','marble','ruby','cross',7,0],
 ['ogive-agnus-7','ogive','limestone','agnus','none',7,0],
 ['trestle-white-5','trestle','walnut','agnus','none',5,0],
 ['pilaster-green-7','pilaster','marble','verdant','agnus',7,0],
 ['ogive-black-7','ogive','marble','requiem','cross',7,0],
 ['trestle-bare-4','trestle','walnut','none','cross',4,0],
 ['pilaster-ruby-8','pilaster','limestone','ruby','cross',8,0],
 ['trestle-green-3','trestle','walnut','verdant','none',3,1],
 ['ogive-white-4','ogive','marble','agnus','agnus',4,2],
 ['pilaster-black-3','pilaster','limestone','requiem','cross',3,3],
 ['trestle-single-1','trestle','walnut','none','none',1,0,1],
 ['pilaster-green-16','pilaster','limestone','verdant','none',16,0],
].map(([id,s,m,c,f,w,facing,depth=2])=>({id,w:facing%2?depth:w,d:facing%2?w:depth,stone:0,cloth:0,ornamental:false,facing,design:designFor(s,m,c,f).id}));
const palettePresets=[
 ...LITURGICAL_COLORS.map(color=>({id:`palette-${color}-7`,w:7,d:2,facing:0,design:liturgicalDesign('pilaster','marble',color).id})),
 {id:'palette-purple-8',w:2,d:8,facing:1,design:liturgicalDesign('ogive','limestone','purple').id},
 {id:'palette-rose-4',w:4,d:2,facing:2,design:liturgicalDesign('trestle','walnut','rose').id},
 {id:'palette-white-1',w:1,d:1,facing:3,design:liturgicalDesign('trestle','walnut','white').id},
 {id:'palette-green-3',w:2,d:3,facing:3,design:liturgicalDesign('trestle','walnut','green').id},
].map(p=>({...p,stone:0,cloth:0,ornamental:false}));
const structurePresets=[
 ['trestle-bare-7','trestle','walnut','none','none',7,2,0],
 ['trestle-white-7','trestle','walnut','agnus','none',7,2,0],
 ['trestle-single-1','trestle','walnut','none','none',1,1,3],
 ['trestle-deep-3','trestle','walnut','requiem','none',3,3,2],
 ['trestle-even-8','trestle','walnut','ruby','cross',8,2,1],
 ['pilaster-bare-7','pilaster','marble','none','cross',7,2,0],
 ['ogive-bare-7','ogive','limestone','none','none',7,2,0],
 ['ogive-white-7','ogive','marble','agnus','none',7,2,0],
].map(([id,s,m,c,f,w,d,facing])=>({id,w:facing%2?d:w,d:facing%2?w:d,stone:0,cloth:0,ornamental:false,facing,design:designFor(s,m,c,f).id}));
const catalogPresets=[
 {id:'crossbrace',w:3,d:2,stone:0,cloth:0,ornamental:false,facing:0,design:sharedDesignFor('crossbrace','walnut','none','none').id},
 {id:'twin_pedestal',w:3,d:2,stone:0,cloth:0,ornamental:false,facing:0,design:sharedDesignFor('twin_pedestal','walnut','none','none').id},
 {id:'classic',w:3,d:2,stone:0,cloth:0,ornamental:false,facing:0},
 ...['pilaster','ogive','trestle','coffer','baluster','colonnade'].map(structure=>({id:structure,w:3,d:2,stone:0,cloth:0,ornamental:false,facing:0,design:designFor(structure,['trestle','coffer','baluster'].includes(structure)?'walnut':'marble','none','none').id})),
];
const joineryPresets=['coffer','baluster'].flatMap(s=>[
 ...[1,3,7,8,16].map(w=>({id:`${s}-bare-${w}`,w,d:w===1?1:2,stone:0,cloth:0,ornamental:false,facing:0,design:designFor(s,'walnut','none','none').id})),
 ...[0,1,2,3].map(facing=>({id:`${s}-white-${facing}`,w:facing%2?2:7,d:facing%2?7:2,stone:0,cloth:0,ornamental:false,facing,design:designFor(s,'walnut','agnus','none').id})),
 {id:`${s}-purple-8`,w:8,d:2,stone:0,cloth:0,ornamental:false,facing:0,design:liturgicalDesign(s,'walnut','purple').id},
]);
const ornatePresets=[1,3,7,8,16].flatMap(w=>[false,true].map(lace=>({id:`colonnade-${lace?'lace':'bare'}-${w}`,w,d:w===1?1:2,stone:0,cloth:0,ornamental:false,facing:0,design:designFor('colonnade','marble',lace?'agnus':'none','none').id})));
const universalPresets=[
 ...['classic','pilaster','ogive','trestle','coffer','baluster','colonnade'].map(structure=>({id:`${structure}-lace-7`,w:7,d:2,stone:0,cloth:0,ornamental:structure==='classic',facing:0,design:sharedDesignFor(structure,['trestle','coffer','baluster'].includes(structure)?'walnut':'marble','lace','none').id})),
 ...['linen_short','linen_long','gold_short','gold_long','agnus','verdant','requiem'].map(textile=>({id:`colonnade-${textile}-7`,w:7,d:2,stone:0,cloth:0,ornamental:false,facing:0,design:sharedDesignFor('colonnade','marble',textile,'none').id})),
 ...LITURGICAL_COLORS.map(color=>({id:`colonnade-floral-${color}-8`,w:2,d:8,stone:0,cloth:0,ornamental:false,facing:1,design:sharedDesignFor('colonnade','marble','floral','none',color).id})),
 {id:'classic-floral-green-7',w:7,d:2,stone:2,cloth:0,ornamental:true,facing:0,design:sharedDesignFor('classic','marble','floral','none','green').id},
 ...[1,3,8,16].map(w=>({id:`trestle-lace-${w}`,w,d:w===1?1:2,stone:0,cloth:0,ornamental:false,facing:0,design:sharedDesignFor('trestle','walnut','lace','none').id})),
];
const pilasterPresets=[
 ...[1,3,7,8,16].map(w=>({id:`pilaster-marble-bare-${w}`,w,d:w===1?1:2,surface:'marble',textile:'none',frontal:'none',facing:0})),
 {id:'pilaster-walnut-bare-5',w:5,d:2,surface:'walnut',textile:'none',frontal:'none',facing:0},
 {id:'pilaster-limestone-agnus-8',w:8,d:2,surface:'limestone',textile:'agnus',frontal:'agnus',facing:0},
 ...['linen_short','linen_long','gold_short','gold_long','agnus','verdant','requiem','lace'].map(textile=>({id:`pilaster-marble-${textile}-7`,w:7,d:2,surface:'marble',textile,frontal:textile==='lace'?'cross':'none',facing:0})),
 ...[0,1,2,3].map(facing=>({id:`pilaster-purple-8-front-${facing}`,w:facing%2?2:8,d:facing%2?8:2,surface:'limestone',textile:'floral',color:'purple',frontal:'none',facing})),
 {id:'pilaster-narrow-lace-1x8',w:1,d:8,surface:'marble',textile:'lace',frontal:'none',facing:0},
 {id:'pilaster-maximum-16x8',w:16,d:8,surface:'marble',textile:'none',frontal:'none',facing:0},
].map(p=>({...p,stone:0,cloth:0,ornamental:false,design:sharedDesignFor('pilaster',p.surface,p.textile,p.frontal,p.color??'red').id}));
const selectedPresets=option('--matrix','materials')==='pilaster'?pilasterPresets:option('--matrix','materials')==='universal'?universalPresets:option('--matrix','materials')==='ornate'?ornatePresets:option('--matrix','materials')==='joinery'?joineryPresets:option('--matrix','materials')==='catalog'?catalogPresets:option('--matrix','materials')==='structures'?structurePresets:option('--matrix','materials')==='palette'?palettePresets:option('--matrix','materials')==='collection'?collectionPresets:presets;
const ogivePresets=[...pilasterPresets.map(p=>({...p,id:p.id.replaceAll('pilaster','ogive'),design:sharedDesignFor('ogive',p.surface,p.textile,p.frontal,p.color??'red').id})),
 ...['none','gold_long'].map(textile=>({id:`ogive-odd-relief-${textile}-7`,w:7,d:2,surface:'marble',textile,frontal:'agnus',facing:0,stone:0,cloth:0,ornamental:false,design:sharedDesignFor('ogive','marble',textile,'agnus').id})),
];
const nativePresets=[['bare',3,2,'none',0],['lace',7,2,'lace',0],['agnus',8,2,'agnus',1],['single',1,1,'none',0]].map(([id,w,d,textile,facing])=>({id:`twin-${id}`,w:facing%2?d:w,d:facing%2?w:d,stone:0,cloth:0,ornamental:false,facing,design:sharedDesignFor('twin_pedestal','walnut',textile,'none').id}));
const activePresets=option('--matrix','materials')==='native'?nativePresets:option('--matrix','materials')==='ogive'?ogivePresets:selectedPresets;
const views=[{id:'front',direction:[0,.08,-1],zoom:1.15},{id:'oblique',direction:[-.45,.38,-1],zoom:1.35},{id:'back',direction:[.4,.35,1],zoom:1.35},{id:'top',direction:[0,1,-.01],zoom:1.4},
 {id:'detail',direction:[0,.06,-1],zoom:1,focus:{anchor:'front',height:.82,extent:.85}},
 {id:'corner',direction:[-.65,.32,-1],zoom:1,focus:{anchor:'corner',height:.82,extent:1.15}},
 {id:'capital',direction:[-.55,.16,-1],zoom:1,focus:{anchor:'corner',height:.79,extent:.65}},
 {id:'base',direction:[-.55,.18,-1],zoom:1,focus:{anchor:'corner',height:.16,extent:.55}},
 {id:'panel',direction:[-.3,.12,-1],zoom:1,focus:{anchor:'front',height:.48,extent:1.15}},
 {id:'underside',direction:[-.4,-.22,-1],zoom:1.35},
 {id:'arch',direction:[-.15,.12,-1],zoom:1,focus:{anchor:'front',height:.47,extent:1.2}},
 {id:'peak',direction:[-.25,.12,-1],zoom:1,focus:{anchor:'front',height:.76,extent:.65}},
 {id:'raking',direction:[-1,.12,-.15],zoom:1,focus:{anchor:'front',height:.55,extent:1.2}}];
const server=await startPreviewServer(manager);
let browser;
try{
 browser=await launchRenderBrowser(chromium);
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',request=>console.error(`Capture request failed: ${request.url()} ${request.failure()?.errorText}`));
 await page.goto(`${server.origin}/addons/altare/tools/preview.html`,{waitUntil:'commit',timeout:30000});
 // Module execution includes the initial environment bake. Wait on
 // our actual readiness signal rather than DOMContentLoaded, which it delays.
 console.log('Preview document loaded; preparing the verified renderer.');
 await page.waitForFunction(()=>window.captureReady,undefined,{timeout:120000});
 console.log('Renderer ready.');
 const captures=[],layouts=[];
 for(const preset of activePresets.filter(p=>!option('--presets','')||option('--presets','').split(',').includes(p.id))){
  const tiles=planFinish(Array.from({length:preset.w*preset.d},(_,i)=>({position:{x:i%preset.w,y:0,z:Math.floor(i/preset.w)},stone:0,cloth:1,frontal:0,facing:0,edges:15})),preset).map(tile=>{
   const encoded=encodeTile(tile),doc=blockDocs.get(encoded.id),q={block_state:key=>encoded.states[key]},math={floor:Math.floor,mod:(a,b)=>a%b};
   const matches=doc.permutations.filter(p=>Function('q',`return ${p.condition}`)(q));
   const components=Object.assign({},doc.components,...matches.map(p=>p.components));
   const materials=components['minecraft:material_instances'];
   const geometryRules=matches.filter(p=>p.components['minecraft:geometry']);
   if(geometryRules.length!==1)throw Error('Ambiguous geometry selection');
   const geometry=geometryRules[0].components['minecraft:geometry'].identifier;
   const visibleBones=Object.fromEntries(Object.entries(components['minecraft:geometry'].bone_visibility).map(([name,expr])=>[name,Function('q','math',`return ${expr}`)(q,math)]));
   return {...tile,geometry,visibleBones,renderMethods:Object.fromEntries(Object.entries(materials).map(([name,m])=>[name,m.render_method])),textures:Object.fromEntries(Object.entries(materials).map(([name,m])=>[name,atlas[m.texture].textures[0]]))};
  });
  layouts.push({preset:preset.id,tiles:tiles.map(t=>({position:t.position,edges:t.edges,frontal:t.frontal,facing:t.facing,geometry:t.geometry,textures:t.textures,visibleBones:t.visibleBones}))});
  for(const profile of profiles)for(const sourceView of views.filter(v=>!option('--views','')||option('--views','').split(',').includes(v.id))){
   const view=structuredClone(sourceView);
   if(view.focus)view.focus.facing=preset.facing;
   if(['orientations','collection','palette','structures','joinery','universal','pilaster','ogive','native'].includes(option('--matrix','materials')))for(let i=0;i<preset.facing;i++){const [x,y,z]=view.direction;view.direction=[-z,y,x];}
   const config={tiles,pbr:profile==='pbr',width,height,...view};
   const {dataUrl,...evidence}=await page.evaluate(c=>window.captureAltare(c),config);
   const bytes=Buffer.from(dataUrl.split(',')[1],'base64'),file=`${preset.id}-${view.id}-${profile}.png`;
   fs.writeFileSync(path.join(output,file),bytes);captures.push({file,preset,view,profile,...evidence,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 const sourceFiles=[...fs.readdirSync(path.join(root,'packs/behavior/blocks')).sort().map(f=>`packs/behavior/blocks/${f}`),...fs.readdirSync(path.join(root,'packs/resource/models/blocks')).sort().map(f=>`packs/resource/models/blocks/${f}`),...fs.readdirSync(path.join(root,'packs/resource/textures/blocks')).filter(f=>f.endsWith('.texture_set.json')).sort().map(f=>`packs/resource/textures/blocks/${f}`),'packs/resource/textures/terrain_texture.json','tools/preview.mjs','tools/block-preview-basis.mjs'];
 const sourceHashes=Object.fromEntries(sourceFiles.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
 const built=JSON.parse(fs.readFileSync(path.join(root,'out/build-manifest.json'),'utf8'));
 if(readVersion('behavior')!==packVersion||readVersion('resource')!==packVersion||built.version!==packVersion)throw Error('Packs changed version during capture; repeat against one completed build.');
 const manifest={version:packVersion,width,height,matrix:option('--matrix','materials'),renderer:'Shared Bedrock geometry adapter + block import basis / Three.js',backend:browser.renderDiagnostics,limitation:'Diagnostic evidence only; classic means color-only material, not Minecraft shader parity; Molang visibility approximated in JS.',sourceHashes,textureHashes:built.textureHashes,layouts,captures};
 fs.writeFileSync(path.join(output,'capture-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><meta charset="utf-8"><title>Altare ${manifest.version} · diagnóstico</title><style>body{font:16px system-ui;background:#deddd3;color:#29312b;max-width:1100px;margin:40px auto}img{width:100%}figure{margin:32px 0}p{max-width:72ch}</style><h1>Altare · estudo modular</h1><p>Geometria e texturas reais do pacote. Capturas diagnósticas; não representam aprovação dentro do Minecraft. classic = material sem mapas PBR; pbr = normal e MER ativos.</p>${captures.map(c=>`<figure><img src="${c.file}" alt="${c.preset.id}, ${c.view.id}, ${c.profile}"><figcaption>${c.preset.id} · ${c.view.id} · ${c.profile}</figcaption></figure>`).join('')}`);
 console.log(`Captured ${captures.length} views with actual generated geometry/materials at ${output}`);
}finally{await browser?.close();await server.close();}
