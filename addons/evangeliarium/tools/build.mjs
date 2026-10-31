import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {PNG} from 'pngjs';
import {geometry,tiles,paint,ATLAS} from '../assets-src/design.mjs';
import {pose} from '../assets-src/pose.mjs';
import {compileContent} from './content.mjs';
import {buildUi} from './build-ui.mjs';
const root=path.resolve(import.meta.dirname,'..');
const meta=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const version=meta.version.split('.').map(Number), ids=meta.addonManager.publicIdentity;
const write=(p,s)=>{const dest=path.join(root,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s);};
const json=(p,s)=>write(p,JSON.stringify(s,null,2)+'\n');
buildUi(write,json);
compileContent(root,write);
write('src/generated/version.ts',`export const VERSION=${JSON.stringify(meta.version)};\n`);
const color=new PNG({width:ATLAS,height:ATLAS}),mer=new PNG({width:ATLAS,height:ATLAS}),normal=new PNG({width:ATLAS,height:ATLAS});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
for(const [id,[u,v,w,h]]of Object.entries(tiles))for(let y=-2;y<h+2;y++)for(let x=-2;x<w+2;x++){
 const s=paint(id,clamp(x,0,w-1),clamp(y,0,h-1),w,h), i=((v+y)*ATLAS+u+x)*4;
 color.data.set([...s.rgb.map(Math.round),255],i);mer.data.set([s.metal,0,s.rough,255],i);
 const dx=(paint(id,clamp(x-1,0,w-1),clamp(y,0,h-1),w,h).height-paint(id,clamp(x+1,0,w-1),clamp(y,0,h-1),w,h).height)*.35;
 const dy=(paint(id,clamp(x,0,w-1),clamp(y-1,0,h-1),w,h).height-paint(id,clamp(x,0,w-1),clamp(y+1,0,h-1),w,h).height)*.35;
 const n=Math.hypot(dx,dy,1);normal.data.set([Math.round(127.5+127.5*dx/n),Math.round(127.5+127.5*dy/n),Math.round(127.5+127.5/n),255],i);
}
for(const [suffix,png]of [['',color],['_mer',mer],['_normal',normal]])write(`packs/resource/textures/entity/book${suffix}.png`,PNG.sync.write(png));
json('packs/resource/textures/entity/book.texture_set.json',{format_version:'1.16.100','minecraft:texture_set':{color:'book',normal:'book_normal',metalness_emissive_roughness:'book_mer'}});
for(const kind of ['held','closed','open','animated'])json(`packs/resource/models/entity/book_${kind}.geo.json`,geometry(kind));
// Bedrock rejects a zero-cube geometry's undefined bounds. Keep a bounded hidden bone.
json('packs/resource/models/blocks/empty.geo.json',{format_version:'1.16.0','minecraft:geometry':[{description:{identifier:'geometry.evangeliarium.empty',texture_width:16,texture_height:16},bones:[{name:'root',pivot:[0,0,0],cubes:[{origin:[-.5,0,-.5],size:[1,1,1],uv:[0,0]}]}]}]});
for(const resource of [false,true]){
 const p=resource?'resource':'behavior';
 json(`packs/${p}/manifest.json`,{format_version:2,header:{name:'pack.name',description:'pack.description',uuid:resource?ids.resourceUuid:ids.behaviorUuid,version,min_engine_version:[1,26,50]},
 modules:resource?[{type:'resources',uuid:'f626b7a5-41b1-44f8-94f0-fc64422c749b',version}]:[{type:'data',uuid:'9203df42-8c12-45de-8dc2-41f053cb0a99',version},{type:'script',language:'javascript',uuid:'b7739230-fb9d-430b-8328-ae99c777137f',version,entry:'scripts/main.js'}],
 ...(resource?{capabilities:['pbr']}:{dependencies:[{uuid:ids.resourceUuid,version},{module_name:'@minecraft/server',version:'2.10.0'},{module_name:'@minecraft/server-ui',version:'2.2.0'}]}),metadata:{authors:['Evangeliarium Project'],product_type:'addon'}});
 json(`packs/${p}/texts/languages.json`,['pt_BR','en_US']);
 for(const lang of ['pt_BR','en_US'])write(`packs/${p}/texts/${lang}.lang`,`pack.name=Evangeliário ${resource?'— Recursos':'— Comportamento'}\npack.description=Evangelhos, calendário brasileiro e livro cerimonial.\nitem.evangeliarium:book.name=Evangeliário\ntile.evangeliarium:book_stand.name=Evangeliário\naction.interact.evangeliarium.read=Ler\n`);
 // Attribution is shipped in the reader and script. Arbitrary root .txt files fail Creator Tools.
 const obsolete=path.join(root,`packs/${p}/COPYING.txt`);if(fs.existsSync(obsolete))fs.unlinkSync(obsolete);
}
json('packs/behavior/items/book.item.json',{format_version:'1.26.50','minecraft:item':{description:{identifier:'evangeliarium:book',menu_category:{category:'equipment'}},components:{'minecraft:display_name':{value:'item.evangeliarium:book.name'},'minecraft:max_stack_size':1,'minecraft:icon':{textures:{default:'evangeliarium_book'}},'minecraft:hand_equipped':false,'minecraft:allow_off_hand':false,'minecraft:can_destroy_in_creative':false,'minecraft:interact_button':'action.interact.evangeliarium.read','evangeliarium:use':{}}}});
json('packs/resource/textures/item_texture.json',{resource_pack_name:'evangeliarium',texture_name:'atlas.items',texture_data:{evangeliarium_book:{textures:['textures/items/book']}}});
json('packs/resource/textures/terrain_texture.json',{resource_pack_name:'evangeliarium',texture_name:'atlas.terrain',padding:8,num_mip_levels:4,texture_data:{evangeliarium_book:{textures:['textures/entity/book']}}});
json('packs/resource/blocks.json',{format_version:[1,1,0],'evangeliarium:book_stand':{sound:'wood'}});
const materials={'*':{texture:'evangeliarium_book',render_method:'alpha_test',ambient_occlusion:1.0,face_dimming:true}};
json('packs/behavior/blocks/book.block.json',{format_version:'1.26.50','minecraft:block':{description:{identifier:'evangeliarium:book_stand',states:{'evangeliarium:open':[false,true],'evangeliarium:visual':[false,true],'evangeliarium:direction':[0,1,2,3]}},components:{'minecraft:geometry':'geometry.evangeliarium.closed','minecraft:material_instances':materials,'minecraft:collision_box':false,'minecraft:selection_box':{origin:[-5.5,0,-4.5],size:[11,2,9]},'minecraft:destructible_by_mining':{seconds_to_destroy:.4},'minecraft:destructible_by_explosion':false,'minecraft:movable':{movement_type:'immovable'},'minecraft:light_dampening':0,'minecraft:loot':'loot_tables/empty.json','minecraft:tick':{interval_range:[20,20],looping:true},'evangeliarium:placed':{}},permutations:[
 {condition:"q.block_state('evangeliarium:open')",components:{'minecraft:geometry':'geometry.evangeliarium.open'}},
 {condition:"q.block_state('evangeliarium:visual')",components:{'minecraft:geometry':{identifier:'geometry.evangeliarium.empty',bone_visibility:{root:'0.0'}}}},
 ...[1,2,3].map(d=>({condition:`q.block_state('evangeliarium:direction') == ${d}`,components:{'minecraft:transformation':{rotation:[0,d===3?-90:d*90,0]}}}))
 ]}});
json('packs/behavior/loot_tables/empty.json',{pools:[]});
json('packs/behavior/entities/book_visual.entity.json',{format_version:'1.26.50','minecraft:entity':{description:{identifier:'evangeliarium:book_visual',is_spawnable:false,is_summonable:true,is_experimental:false,properties:{'evangeliarium:open':{type:'bool',default:false,client_sync:true}}},components:{'minecraft:persistent':{},'minecraft:cannot_be_attacked':{},'minecraft:physics':{has_gravity:false,has_collision:false},'minecraft:collision_box':{width:0,height:0}}}});
const renderer={geometry:'Geometry.default',materials:[{'*':'Material.default'}],textures:['Texture.default'],uv_anim:{offset:[0,0],scale:[1,1]}};
json('packs/resource/render_controllers/book.render_controllers.json',{format_version:'1.8.0',render_controllers:{'controller.render.evangeliarium.book':renderer}});
json('packs/resource/entity/book_visual.entity.json',{format_version:'1.10.0','minecraft:client_entity':{description:{identifier:'evangeliarium:book_visual',materials:{default:'entity_alphatest'},textures:{default:'textures/entity/book'},geometry:{default:'geometry.evangeliarium.animated'},animations:{open:'animation.evangeliarium.open',closed:'animation.evangeliarium.closed',state:'controller.animation.evangeliarium.open'},scripts:{animate:['state']},render_controllers:['controller.render.evangeliarium.book']}}});
json('packs/resource/animation_controllers/book.animation_controllers.json',{format_version:'1.10.0',animation_controllers:{'controller.animation.evangeliarium.open':{initial_state:'closed',states:{closed:{animations:['closed'],transitions:[{open:"q.property('evangeliarium:open')"}],blend_transition:.4},open:{animations:['open'],transitions:[{closed:"!q.property('evangeliarium:open')"}],blend_transition:.4}}}}});
const unsafe="q.is_swimming || q.is_gliding || q.is_riding || q.is_sleeping || q.is_emoting";
const off="q.get_equipped_item_name('off_hand') != '' && q.get_equipped_item_name('off_hand') != 'air'";
const animations={
 'animation.evangeliarium.open':{loop:true,bones:{front_cover:{rotation:[0,177,0]}}},
 'animation.evangeliarium.closed':{loop:true,bones:{front_cover:{rotation:[0,0,0]}}},
 'animation.evangeliarium.hold.first':{loop:true,bones:{book_presentation:{rotation:pose.firstRotation,position:pose.firstPosition}}},
 'animation.evangeliarium.hold.third':{loop:true,bones:{book_presentation:{rotation:pose.presentationRotation.map((n,i)=>`${unsafe} || ${off} ? ${i===0?15:0} : ${n}`),position:pose.engineCalibration.map((n,i)=>`${unsafe} || ${off} ? ${n} : ${n+pose.gripOffset[i]}`)}}},
 'animation.evangeliarium.player.carry':{loop:true,animation_length:1,override_previous_animation:true,blend_weight:1,bones:{
  rightarm:{rotation:pose.rightArm.map((angle,i)=>`v.is_first_person ? ${pose.firstRightRotation[i]} : ${angle}${i===0?' + math.sin(q.life_time*80)*0.6':''}`),position:pose.firstRightPosition.map(v=>`v.is_first_person ? ${v} : 0`)},
  leftarm:{rotation:pose.leftArm.map((angle,i)=>`v.is_first_person ? ${pose.firstLeftRotation[i]} : ${angle}${i===0?' + math.sin(q.life_time*80)*0.6':''}`),position:pose.firstLeftPosition.map(v=>`v.is_first_person ? ${v} : 0`)}
 }},
 'animation.evangeliarium.player.place':{animation_length:.42,bones:{rightarm:{rotation:{'0':[0,0,0],'0.18':[12,0,-3],'0.42':[0,0,0]}},leftarm:{rotation:{'0':[0,0,0],'0.18':[12,0,3],'0.42':[0,0,0]}}}},
 'animation.evangeliarium.player.release':{animation_length:.2,bones:{rightarm:{rotation:[0,0,0]},leftarm:{rotation:[0,0,0]}}}
};
json('packs/resource/animations/book.animation.json',{format_version:'1.10.0',animations});
json('packs/resource/attachables/book.attachable.json',{format_version:'1.10.0','minecraft:attachable':{description:{identifier:'evangeliarium:book',materials:{default:'entity_alphatest'},textures:{default:'textures/entity/book'},geometry:{default:'geometry.evangeliarium.held'},animations:{first:'animation.evangeliarium.hold.first',third:'animation.evangeliarium.hold.third'},scripts:{animate:[{first:'context.is_first_person == 1.0'},{third:'context.is_first_person == 0.0'}]},render_controllers:['controller.render.evangeliarium.book']}}});
// The native first-person controller otherwise hides both custom-item arms.
// Extend this ONE controller; do not replace player.entity or any vanilla animation controller.
const sample=path.join(root,'assets-src/native-first-person.json');
const bridge=JSON.parse(fs.readFileSync(sample,'utf8')).controller;
bridge.uv_anim={offset:[0,0],scale:[1,1]};
const holding="q.is_item_name_any('slot.weapon.mainhand', 0, 'evangeliarium:book')";
for(const row of bridge.part_visibility)for(const bone of Object.keys(row))if(bone!=='*')row[bone]=`(${row[bone]}) || (${holding}${bone.startsWith('left')?` && !(${off}) && !(${unsafe})`:''})`;
json('packs/resource/render_controllers/book_first_person_bridge.json',{format_version:'1.8.0',render_controllers:{'controller.render.player.first_person':bridge}});
write('packs/behavior/functions/evangeliarium/dev_kit.mcfunction','give @s evangeliarium:book 1\n');
json('packs/behavior/recipes/book.recipe.json',{format_version:'1.20.10','minecraft:recipe_shaped':{description:{identifier:'evangeliarium:book'},tags:['crafting_table'],unlock:[{item:'minecraft:book'}],pattern:['GGG','RBR','GLG'],key:{G:{item:'minecraft:gold_nugget'},R:{item:'minecraft:red_dye'},B:{item:'minecraft:book'},L:{item:'minecraft:leather'}},result:{item:'evangeliarium:book',count:1}}});
// Bootstrap icon; render.mjs replaces it with a reproducible view of the actual geometry.
const icon=new PNG({width:64,height:64});
for(let y=6;y<58;y++)for(let x=15;x<49;x++){const s=paint('front',Math.floor((x-15)*64/34),Math.floor((y-6)*96/52),64,96);icon.data.set([...s.rgb.map(Math.round),255],(y*64+x)*4);}
const promoted=path.join(root,'assets-src/branding/item-64.png');
write('packs/resource/textures/items/book.png',fs.existsSync(promoted)?fs.readFileSync(promoted):PNG.sync.write(icon));
const packIcon=path.join(root,'assets-src/branding/pack-256.png');
for(const p of ['behavior','resource'])write(`packs/${p}/pack_icon.png`,fs.existsSync(packIcon)?fs.readFileSync(packIcon):PNG.sync.write(icon));
if(fs.existsSync(path.join(root,'src/bootstrap/main.ts')))await build({entryPoints:[path.join(root,'src/bootstrap/main.ts')],outfile:path.join(root,'packs/behavior/scripts/main.js'),bundle:true,format:'esm',platform:'neutral',external:['@minecraft/server','@minecraft/server-ui'],target:'es2022',charset:'utf8',legalComments:'inline'});
console.log(`Evangeliarium ${meta.version}: assets, 3779 verses, 730 dates, stable Script API.`);
