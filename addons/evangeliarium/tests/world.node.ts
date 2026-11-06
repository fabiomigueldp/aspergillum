import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'out/tests/world.mjs');fs.mkdirSync(path.dirname(output),{recursive:true});
await build({stdin:{contents:`export * from './src/infrastructure/books.ts';export * from './src/infrastructure/items.ts';export * from './tests/minecraft-mock.mjs';`,resolveDir:root},outfile:output,bundle:true,platform:'node',format:'esm',alias:{'@minecraft/server':path.join(root,'tests/minecraft-mock.mjs')}});
const m:any=await import(pathToFileURL(output).href);
const {Books,Player,ItemStack,world,reset,ITEM,BLOCK,STATE,itemState,snapshot,initialize,address}=m;
function setup(){const player=new Player('p1',world.dimension);world.players.push(player);player.inventory.setItem(0,new ItemStack(ITEM));const base=world.dimension.getBlock({x:0,y:0,z:0});base.setType('minecraft:stone');const target=world.dimension.getBlock({x:0,y:1,z:0});const books=new Books();books.load();return{player,base,target,books};}
beforeEach(()=>reset());
test('entidade visual expirada não lê propriedades nem impede a recuperação do livro',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);
 const handle=books.placed(target),expired=world.dimension.getEntities({type:m.VISUAL})[0];expired.remove();
 expired.getDynamicProperty=()=>{throw Error('InvalidEntityError: removed visual');};
 assert.doesNotThrow(()=>books.reconcileEntity(expired));
 const liveQuery=world.dimension.getEntities.bind(world.dimension);
 world.dimension.getEntities=(query:any)=>query.type===m.VISUAL?[expired,...liveQuery(query)]:liveQuery(query);
 books.reconcileBlock(target);
 assert.equal(liveQuery({type:m.VISUAL}).length,1);
 assert.equal(target.permutation.getAllStates()['evangeliarium:visual'],true);
 assert.equal(books.placed(target).state.instanceId,handle.state.instanceId);
 assert.equal(liveQuery({type:'minecraft:item'}).length,0);
});
test('colocar e retirar conserva identidade, marcação, nome e propriedades',()=>{
 const {player,base,target,books}=setup();let h=books.held(player);h=books.select(player,h,{mode:'passage',reference:'Jo 3,16-21'});
 const item=player.inventory.getItem(0);item.nameTag='Livro da capela';item.setLore(['Exemplar 1']);item.setDynamicProperty('example:value',42);player.inventory.setItem(0,item);
 books.place(player,address(base),0,item.getDynamicProperty(STATE),true);assert.equal(player.inventory.getItem(0),undefined);assert.equal(target.typeId,BLOCK);
 const placed=books.placed(target);assert.equal(placed.state.instanceId,h.state.instanceId);assert.equal(placed.state.selection.reference,'Jo 3,16-21');
 books.retrieve(player,placed);const restored=player.inventory.getItem(0);assert.equal(target.typeId,'minecraft:air');assert.equal(restored.nameTag,'Livro da capela');assert.deepEqual(restored.getLore(),['Exemplar 1']);assert.equal(restored.getDynamicProperty('example:value'),42);assert.equal(itemState(restored).instanceId,h.state.instanceId);assert.equal(world.props.size,0);
});
test('inventário cheio conserva o livro colocado e permite ler',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const h=books.placed(target);
 for(let i=0;i<9;i++)player.inventory.setItem(i,new ItemStack('minecraft:stone'));
 assert.throws(()=>books.retrieve(player,h),/Inventário cheio/);assert.equal(target.typeId,BLOCK);assert.equal(books.valid(player,h),true);
});
test('troca de slot antes do callback não coloca o item errado',()=>{
 const {player,base,target,books}=setup();player.selectedSlotIndex=1;books.place(player,address(base),0,undefined,true);assert.equal(target.typeId,'minecraft:air');assert.equal(player.inventory.getItem(0).typeId,ITEM);
});
test('duas retiradas do mesmo exemplar produzem somente um item',()=>{
 const {player,base,target,books}=setup();const other=new Player('p2',world.dimension);world.players.push(other);books.place(player,address(base),0,undefined,true);const h=books.placed(target);
 books.retrieve(player,h);assert.throws(()=>books.retrieve(other,h));assert.equal(other.inventory.slots.size,0);assert.equal(player.inventory.slots.size,1);
});
test('ação capturada antes da substituição não recolhe outro livro na mesma coordenada',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const captured=books.placed(target);books.retrieve(player,captured);
 player.inventory.setItem(1,player.inventory.getItem(0));player.inventory.setItem(0,new ItemStack(ITEM));books.place(player,address(base),0,undefined,true);const replacement=books.placed(target);
 assert.notEqual(replacement.state.instanceId,captured.state.instanceId);assert.equal(books.valid(player,captured),false);assert.throws(()=>books.retrieve(player,captured));assert.equal(books.placed(target).state.instanceId,replacement.state.instanceId);
});
test('falha de escrita do bloco devolve o item e limpa o diário',()=>{
 const {player,base,target,books}=setup();const before=books.held(player);target.failNextWrite=true;
 assert.throws(()=>books.place(player,address(base),0,undefined,true));assert.equal(target.typeId,'minecraft:air');assert.equal(itemState(player.inventory.getItem(0)).instanceId,before.state.instanceId);assert.equal(world.props.size,0);
});
test('falha na entrega restaura o bloco e sua referência',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const h=books.placed(target);player.inventory.failNextWrite=true;
 assert.throws(()=>books.retrieve(player,h));assert.equal(target.typeId,BLOCK);assert.equal(books.placed(target).state.instanceId,h.state.instanceId);assert.equal(player.inventory.slots.size,0);
});
test('perda de suporte recupera um único exemplar com dados',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const id=books.placed(target).state.instanceId;base.setType('minecraft:air');books.recover();books.recover();
 const drops=world.dimension.getEntities({type:'minecraft:item'});assert.equal(drops.length,1);assert.equal(itemState(drops[0].item).instanceId,id);assert.equal(target.typeId,'minecraft:air');
});
test('reinício restaura registro; chunks não carregados não causam drops',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const id=books.placed(target).state.instanceId;
 const restarted=new Books();restarted.load();world.dimension.loaded=false;restarted.recover();assert.equal(world.dimension.getEntities({type:'minecraft:item'}).length,0);world.dimension.loaded=true;restarted.recover();assert.equal(restarted.placed(target).state.instanceId,id);
});
test('Criativo move o exemplar; Aventura e Espectador não alteram blocos',()=>{
 const {player,base,target,books}=setup();for(const mode of ['Adventure','Spectator']){player.mode=mode;assert.throws(()=>books.place(player,address(base),0,undefined,true));assert.equal(target.typeId,'minecraft:air');}
 player.mode='Creative';books.place(player,address(base),0,undefined,true);assert.equal(player.inventory.slots.size,0);assert.equal(target.typeId,BLOCK);
});
test('cópia do Criativo recebe identidade distinta sem perder a marcação',()=>{
 const {player,books}=setup();let first=books.held(player);first=books.select(player,first,{mode:'passage',reference:'Mt 5,1-12'});player.inventory.setItem(1,player.inventory.getItem(0));player.selectedSlotIndex=1;const second=books.held(player);assert.notEqual(second.state.instanceId,first.state.instanceId);assert.deepEqual(second.state.selection,first.state.selection);
});
test('diário interrompido privilegia o item que já chegou ao inventário',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const key=[...world.props.keys()][0],r=JSON.parse(world.props.get(key));r.phase='taking';r.owner=player.id;r.slot=0;world.props.set(key,JSON.stringify(r));player.inventory.setItem(0,m.restore(r.snapshot));
 const restarted=new Books();restarted.load();restarted.recover();assert.equal(target.typeId,'minecraft:air');assert.equal(world.props.size,0);assert.equal(player.inventory.slots.size,1);
});
test('diário sem entrega recupera o livro, sem sobrescrever inventário',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const key=[...world.props.keys()][0],r=JSON.parse(world.props.get(key));r.phase='taking';r.owner=player.id;r.slot=0;world.props.set(key,JSON.stringify(r));target.setType('minecraft:air');player.inventory.setItem(0,new ItemStack('minecraft:diamond'));
 const restarted=new Books();restarted.load();restarted.recover();assert.equal(target.typeId,BLOCK);assert.equal(player.inventory.getItem(0).typeId,'minecraft:diamond');
});
for(const book of ['missal','pontifical','lectionary'])test(`${book}: tipo, marca, visual e identidade sobrevivem a colocação, reinício e retirada`,()=>{
 const {player,base,target,books}=setup();player.inventory.setItem(0,new ItemStack('evangeliarium:'+book));let handle=books.held(player);
 assert.equal(handle.book,book);assert.equal(handle.state.selection.mode,book==='pontifical'?'index':'today');handle=books.select(player,handle,{mode:'section',sectionId:'rito-inicial',page:4});
 const original=player.inventory.getItem(0);original.nameTag='Exemplar da comunidade';player.inventory.setItem(0,original);
 books.place(player,address(base),0,original.getDynamicProperty(STATE),true,original.typeId);assert.equal(target.typeId,'evangeliarium:'+book+'_stand');
 assert.equal(world.dimension.getEntities({type:'evangeliarium:'+book+'_visual'}).length,1);assert.equal(world.dimension.getEntities({type:m.VISUAL}).length,0);
 const restarted=new Books();restarted.load();restarted.recover();const placed=restarted.placed(target);assert.equal(placed.book,book);assert.equal(placed.state.instanceId,handle.state.instanceId);
 restarted.retrieve(player,placed);const returned=player.inventory.getItem(0);assert.equal(returned.typeId,'evangeliarium:'+book);assert.equal(returned.nameTag,'Exemplar da comunidade');assert.deepEqual(itemState(returned).selection,{mode:'section',sectionId:'rito-inicial',page:4});assert.equal(world.props.size,0);
});
test('tipo capturado impede colocar outro livro no mesmo slot antes do callback',()=>{
 const {player,base,target,books}=setup();player.inventory.setItem(0,new ItemStack('evangeliarium:missal'));books.place(player,address(base),0,undefined,true,ITEM);assert.equal(target.typeId,'minecraft:air');assert.equal(player.inventory.getItem(0).typeId,'evangeliarium:missal');
});
test('marca do Evangelho não é aplicada ao Missal e vice-versa',()=>{
 const {player,books}=setup();assert.throws(()=>books.select(player,books.held(player),{mode:'index'}),/Seleção inválida/);
 player.inventory.setItem(0,new ItemStack('evangeliarium:missal'));assert.throws(()=>books.select(player,books.held(player),{mode:'passage',reference:'Jo 3,16'}),/Seleção inválida/);
});
test('recuperação remove visual de outro tipo sem duplicar livro',()=>{
 const {player,base,target,books}=setup();player.inventory.setItem(0,new ItemStack('evangeliarium:pontifical'));books.place(player,address(base),0,undefined,true);
 const correct=world.dimension.getEntities({type:'evangeliarium:pontifical_visual'})[0];correct.remove();const wrong=world.dimension.spawnEntity(m.VISUAL,{x:.5,y:1,z:.5});wrong.setDynamicProperty('evangeliarium:anchor',m.addressKey(address(target)));
 books.reconcileBlock(target);assert.equal(wrong.isValid,false);assert.equal(world.dimension.getEntities({type:'evangeliarium:pontifical_visual'}).length,1);assert.equal(world.dimension.getEntities({type:'minecraft:item'}).length,0);
});
test('registro de estado futuro permanece intacto sem bloquear outros livros',()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const key=m.addressKey(address(target));const record=JSON.parse(world.getDynamicProperty(key));const state=JSON.parse(record.snapshot.properties[STATE]);state.schema=2;record.snapshot.properties[STATE]=JSON.stringify(state);const raw=JSON.stringify(record);world.setDynamicProperty(key,raw);
 const restarted=new Books();const oldWarn=console.warn;console.warn=()=>{};try{restarted.load();}finally{console.warn=oldWarn;}
 player.inventory.setItem(0,new ItemStack('evangeliarium:missal'));assert.equal(restarted.held(player).book,'missal');restarted.recover();assert.equal(world.getDynamicProperty(key),raw);assert.throws(()=>restarted.reconcileBlock(target),/Registro de outra versão preservado/);
});
for(const stored of ['future','unreadable'])test(`colocação não sobrescreve diário ${stored} numa posição vazia`,()=>{
 const {player,base,target,books}=setup();books.place(player,address(base),0,undefined,true);const key=m.addressKey(address(target));
 const record=JSON.parse(world.getDynamicProperty(key));const state=JSON.parse(record.snapshot.properties[STATE]);state.schema=2;record.snapshot.properties[STATE]=JSON.stringify(state);
 const raw=stored==='future'?JSON.stringify(record):'{invalid journal';world.setDynamicProperty(key,raw);target.setType('minecraft:air');
 const restarted=new Books(),oldWarn=console.warn;console.warn=()=>{};try{restarted.load();}finally{console.warn=oldWarn;}
 player.inventory.setItem(0,new ItemStack('evangeliarium:missal'));
 assert.throws(()=>restarted.place(player,address(base),0,undefined,true),/superfície livre/);
 assert.equal(world.getDynamicProperty(key),raw);assert.equal(target.typeId,'minecraft:air');assert.equal(player.inventory.getItem(0).typeId,'evangeliarium:missal');
});
