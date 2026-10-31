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
