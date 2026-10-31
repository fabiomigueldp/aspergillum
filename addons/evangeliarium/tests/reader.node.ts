import {test,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'out/tests/reader.mjs');fs.mkdirSync(path.dirname(output),{recursive:true});
await build({stdin:{contents:`export * from './src/infrastructure/books.ts';export * from './src/infrastructure/items.ts';export * from './src/presentation/reader.ts';export * from './tests/minecraft-mock.mjs';export * from './tests/ui-mock.mjs';`,resolveDir:root},outfile:output,bundle:true,platform:'node',format:'esm',alias:{'@minecraft/server':path.join(root,'tests/minecraft-mock.mjs'),'@minecraft/server-ui':path.join(root,'tests/ui-mock.mjs')}});
const m:any=await import(pathToFileURL(output).href);const {Books,Reader,Player,ItemStack,world,forms,ITEM,itemState,address}=m;
const originalNow=Date.now;let now=Date.parse('2026-10-24T18:00:00Z');Date.now=()=>now;
const settle=async()=>{await new Promise(r=>setImmediate(r));};
const current=()=>forms.at(-1),title=()=>current().heading.replace(/§./g,'');
async function click(label:string){const index=current().buttons.indexOf(label);assert.notEqual(index,-1,'Button '+label);current().respond({canceled:false,selection:index});await settle();}
async function submit(...values:unknown[]){current().respond({canceled:false,formValues:values});await settle();}
async function cancel(){current().respond({canceled:true,cancelationReason:'UserClosed'});await settle();}
beforeEach(()=>{m.reset();forms.length=0;now=Date.parse('2026-10-24T18:00:00Z');});after(()=>{Date.now=originalNow;});
async function setup(placed=false){const p=new Player('p1',world.dimension);world.players.push(p);p.inventory.setItem(0,new ItemStack(ITEM));const books=new Books();books.load();let h=books.held(p);if(placed){const base=world.dimension.getBlock({x:0,y:0,z:0});base.setType('minecraft:stone');books.place(p,address(base),0,undefined,true);h=books.placed(world.dimension.getBlock({x:0,y:1,z:0}));}const reader=new Reader(books);reader.open(p,h);await settle();return{p,books,reader,h};}
async function reference(value:string){await click('Leituras');await click('Passagem');await click('Digitar referência');await submit(value);}
test('leitura tem navegação fixa; consulta privada não altera marca',async()=>{
 const {p}=await setup();assert.equal(title(),'Lucas 13,1–9');assert.deepEqual(current().buttons,['','Leituras','Próxima']);
 await reference('Jo 3,16');assert.equal(title(),'João 3,16');assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'today');assert.deepEqual(current().buttons,['','Leituras','']);
 await click('Leituras');await click('Livro');await click('Marcar passagem');assert.equal(itemState(p.inventory.getItem(0)).selection.reference,'Jo 3,16');
});
test('voltar preserva página e data; Hoje explícito consulta o novo dia',async()=>{
 await setup();await click('Próxima');const text=current().text;now=Date.parse('2026-10-25T04:00:00Z');
 await click('Leituras');await click('Data');await cancel();assert.equal(title(),'Leituras');await click('Voltar');assert.equal(current().text,text);
 await click('Leituras');await click('Hoje');assert.ok(current().text.includes('25/10/2026'));
});
test('resposta antiga não marca outro item e sessão fecha após transferência',async()=>{
 const {p,reader}=await setup();await reference('Jo 1,1');await click('Leituras');await click('Livro');
 const stale=current(),index=stale.buttons.indexOf('Marcar passagem');p.inventory.setItem(0,new ItemStack(ITEM));stale.respond({canceled:false,selection:index});await settle();assert.equal(itemState(p.inventory.getItem(0)),undefined);reader.tick();assert.equal(current().showing,false);
});
test('resposta de sessão substituída não encerra a sessão nova',async()=>{
 const {p,reader,books}=await setup();const stale=current();reader.open(p,books.held(p));await settle();const fresh=current();stale.respond({canceled:true,cancelationReason:'UserClosed'});await settle();assert.equal(current(),fresh);assert.equal(fresh.showing,true);
});
test('referência inválida conserva texto digitado e oferece correção',async()=>{
 await setup();await reference('Jo 99');assert.equal(title(),'Referência');assert.equal(current().inputs[0].options.defaultValue,'Jo 99');assert.match(current().labels[0],/Confira/);await submit('Jo 3,16');assert.equal(title(),'João 3,16');
});
test('Sábado Santo oferece Vigília sem leitura diurna ou marca obsoleta',async()=>{
 await setup();await click('Leituras');await click('Data');await submit('27/03/2027');assert.equal(title(),'Sábado Santo');
 await click('Leituras');await click('Livro');assert.ok(!current().buttons.includes('Marcar passagem'));await cancel();await cancel();assert.equal(title(),'Sábado Santo');await click('Vigília Pascal');assert.equal(title(),'Marcos 16,1–7');
});
test('Seguir hoje após meia-noite remove marca fixa e usa nova data',async()=>{
 const {p}=await setup();await click('Leituras');await click('Livro');await click('Marcar passagem');now=Date.parse('2026-10-25T04:00:00Z');
 await click('Leituras');await click('Livro');await click('Seguir hoje');assert.ok(current().text.includes('25/10/2026'));assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'today');
});
test('Retirar fica em Livro, usa a mesma transação e encerra formulário',async()=>{
 const {p}=await setup(true);assert.ok(!current().buttons.includes('Retirar'));await click('Leituras');await click('Livro');await click('Retirar');assert.equal(p.inventory.getItem(0).typeId,ITEM);assert.equal(current().showing,false);assert.equal(world.props.size,0);
});
test('escolha guiada de Evangelho abre capítulo e versículos',async()=>{
 await setup();await click('Leituras');await click('Passagem');await click('João');assert.equal(current().inputs[0].items.length,21);await submit(2,'16');assert.equal(title(),'João 3,16');
});
