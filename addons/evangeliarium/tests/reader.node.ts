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
async function setup(placed=false){const p=new Player('p1',world.dimension);world.players.push(p);p.inventory.setItem(0,new ItemStack(ITEM));const books=new Books();books.load();let h=books.held(p);if(placed){const base=world.dimension.getBlock({x:0,y:0,z:0});base.setType('minecraft:stone');books.place(p,address(base),0,undefined,true);h=books.placed(world.dimension.getBlock({x:0,y:1,z:0}));}const reader=new Reader(books);reader.open(p,h);await settle();if(current().buttons.includes('Seções'))await click('Seções');await click('Passagem');await click('Digitar referência');await submit('Lc 13,1–9');return{p,books,reader,h};}
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
 await setup();await click('Leituras');await click('Data');await submit('27/03/2027');assert.equal(title(),'Celebração');assert.match(current().text,/Sem Missa durante o dia/);
 const vigil=current().buttons.find((label:string)=>/Vigília/i.test(label));assert.ok(vigil);await click('Livro');assert.ok(!current().buttons.includes('Marcar passagem'));await cancel();await click(vigil);assert.match(current().text,/Vigília|Evangelho/);
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
const liturgyFixture={books:{missal:{title:'Missal Romano',sections:Array.from({length:24},(_,i)=>({id:'section-'+i,title:'Seção '+i,group:i<14?'Ordinário':'Celebrações',groups:i===0?['Ordinário','Compartilhadas']:undefined,links:i===0?[{label:'Leitura complementar',targetId:'section-14'},{label:'Repetida',targetId:'section-14'},{label:'Ausente',targetId:'missing'}]:undefined,sourceId:'source',blocks:[{kind:'text',text:'Rito com bênção e resposta. '.repeat(i===0?100:2),runs:i===0?[{text:'Rito com bênção e resposta. '.repeat(100),rubric:true}]:undefined}]}))},pontifical:{title:'Pontifical Romano',sections:[{id:'section-0',title:'Ordenação',group:'Ordens',sourceId:'source',blocks:[{kind:'text',text:'Texto do Pontifical.'}]}]}},sources:[{id:'source',title:'Comunidade',url:'https://example.test/',license:'Autorização informada pelo usuário.'}]};
async function ritual(book='missal',placed=false){const {p,books,reader:previous}=await setup();previous.close(p.id);p.inventory.setItem(0,new ItemStack('evangeliarium:'+book));let h=books.held(p);if(placed){const base=world.dimension.getBlock({x:0,y:0,z:0});base.setType('minecraft:stone');books.place(p,address(base),0,undefined,true);h=books.placed(world.dimension.getBlock({x:0,y:1,z:0}));}h=books.select(p,h,{mode:'index'});const reader=new Reader(books,liturgyFixture);reader.open(p,h);await settle();return{p,books,reader,h};}
test('Missal abre índice agrupado, pagina seções e preserva leitura ao voltar',async()=>{
 await ritual();assert.equal(title(),'Missal Romano');await click('Ordinário');assert.ok(current().buttons.includes('Mais seções'));assert.ok(!current().buttons.includes('Seção 10'));
 await click('Mais seções');await click('Seções anteriores');await click('Seção 0');assert.ok(current().text.includes('§4'));await click('Próxima');const text=current().text;
 await click('Seções');await click('Índice');await cancel();assert.equal(current().text,text);
});
test('marca ritual preserva seção e página sem mudar ao navegar privadamente',async()=>{
 const {p,books,reader}=await ritual();await click('Ordinário');await click('Seção 0');await click('Próxima');const text=current().text;
 await click('Seções');await click('Livro');await click('Marcar página');assert.deepEqual(itemState(p.inventory.getItem(0)).selection,{mode:'section',sectionId:'section-0',page:1});
 await click('Seções');await click('Índice');await click('Celebrações');await click('Seção 14');reader.open(p,books.held(p));await settle();assert.equal(current().text,text);
});
test('busca ritual preserva rascunho inválido e resultados paginados',async()=>{
 await ritual();await click('Buscar');await submit('b');assert.equal(current().inputs[0].options.defaultValue,'b');await submit('BENCAO');assert.equal(title(),'Resultados');assert.ok(current().buttons.includes('Mais seções'));await click('Mais seções');await click('Seção 12');assert.equal(title(),'Seção 12');
});
test('resposta antiga do Missal não marca o Pontifical; sessão nova continua aberta',async()=>{
 const {p,books,reader}=await ritual();await click('Ordinário');await click('Seção 0');await click('Seções');await click('Livro');const stale=current();
 p.inventory.setItem(0,new ItemStack('evangeliarium:pontifical'));reader.open(p,books.held(p));await settle();const fresh=current();stale.respond({canceled:false,selection:stale.buttons.indexOf('Marcar página')});await settle();assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'index');assert.equal(current(),fresh);assert.equal(fresh.showing,true);
});
test('retirar livro ritual colocado preserva seu tipo; UI nunca converte em Evangelho',async()=>{
 const {p}=await ritual('pontifical',true);await click('Livro');await click('Retirar');assert.equal(p.inventory.getItem(0).typeId,'evangeliarium:pontifical');assert.equal(world.props.size,0);assert.equal(current().showing,false);
});
test('mudança de dimensão invalida tela pendente antes de gravar marca',async()=>{
 const {p,reader}=await ritual();await click('Ordinário');await click('Seção 0');await click('Seções');await click('Livro');const stale=current();
 p.dimension={...p.dimension,id:'minecraft:nether'};stale.respond({canceled:false,selection:stale.buttons.indexOf('Marcar página')});await settle();assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'index');reader.tick();assert.equal(current().showing,false);
});
test('salto de página ritual valida entrada, preserva rascunho e não altera marca',async()=>{
 const {p}=await ritual();await click('Ordinário');await click('Seção 0');const first=current().text;
 await click('Seções');await click('Ir para página');assert.equal(current().inputs[0].options.defaultValue,'1');
 for(const invalid of ['0','1.5','abc','9999']){await submit(invalid);assert.equal(current().inputs[0].options.defaultValue,invalid);assert.ok(current().labels.length);}
 await submit('2');assert.notEqual(current().text,first);assert.match(current().text,/ · 2\//);assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'index');
 await click('Seções');await click('Ir para página');await cancel();assert.equal(title(),'Seções');await click('Voltar à leitura');assert.match(current().text,/ · 2\//);
});
test('seção curta não mostra salto de página',async()=>{
 await ritual('pontifical');await click('Ordens');await click('Ordenação');await click('Seções');assert.ok(!current().buttons.includes('Ir para página'));
});
test('leitura retorna à mesma página da lista de seções',async()=>{
 await ritual();await click('Ordinário');await click('Mais seções');await click('Seção 12');await click('Seções');await click('Voltar à lista');
 assert.equal(title(),'Ordinário');assert.ok(current().buttons.includes('Seção 12'));assert.ok(!current().buttons.includes('Seção 0'));assert.match(current().text,/11–14 de 14/);
});
test('leitura retorna aos resultados e preserva busca, página e rascunho',async()=>{
 await ritual();await click('Buscar');await submit('BENCAO');assert.match(current().text,/BENCAO/);assert.match(current().text,/1–10 de 24/);await click('Mais seções');await click('Seção 12');
 await click('Seções');await click('Voltar aos resultados');assert.equal(title(),'Resultados');assert.ok(current().buttons.includes('Seção 12'));assert.match(current().text,/11–20 de 24/);await click('Voltar');assert.equal(current().inputs[0].options.defaultValue,'BENCAO');
});
test('busca sem resultado explica como tentar outra consulta',async()=>{
 await ritual();await click('Buscar');await submit('inexistente');assert.match(current().text,/inexistente/);assert.match(current().text,/outras palavras/);await cancel();assert.equal(current().inputs[0].options.defaultValue,'inexistente');
});
test('resposta de salto antiga não altera livro recém-aberto',async()=>{
 const {p,books,reader}=await ritual();await click('Ordinário');await click('Seção 0');await click('Seções');await click('Ir para página');const stale=current();
 p.inventory.setItem(0,new ItemStack('evangeliarium:pontifical'));reader.open(p,books.held(p));await settle();const fresh=current();stale.respond({canceled:false,formValues:['2']});await settle();assert.equal(current(),fresh);assert.equal(fresh.showing,true);
});
test('seção compartilhada aparece em todos os grupos sem duplicar o resultado de busca',async()=>{
 await ritual();await click('Compartilhadas');assert.equal(current().buttons.filter((label:string)=>label==='Seção 0').length,1);await click('Seção 0');assert.equal(title(),'Seção 0');
 await click('Seções');await click('Buscar');await submit('Compartilhadas');assert.ok(current().buttons.includes('Seção 0'));assert.match(current().text,/1–1 de 1/);
});
test('texto relacionado retorna à página do rito anterior e ao seu grupo',async()=>{
 const {p}=await ritual();await click('Ordinário');await click('Seção 0');await click('Próxima');const prior=current().text;
 await click('Seções');await click('Textos relacionados');assert.ok(!current().buttons.includes('Repetida'));assert.ok(!current().buttons.includes('Ausente'));
 await click('Leitura complementar');assert.equal(title(),'Seção 14');await click('Seções');await click('Voltar à leitura anterior');assert.equal(current().text,prior);
 assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'index');await click('Seções');await click('Voltar à lista');assert.equal(title(),'Ordinário');
});
test('Evangelho também permite salto privado em capítulo longo',async()=>{
 const {p}=await setup();await click('Leituras');await click('Passagem');await click('João');await submit(0,'');await click('Leituras');await click('Ir para página');await submit('2');assert.match(current().text,/Página 2\//);assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'today');
});
const lectionaryFixture={book:{title:'Lecionário',sections:[{id:'lc-advento',title:'1º Domingo do Advento · Ano A',group:'Advento',warnings:['Confirme a celebração no calendário local.'],blocks:[{kind:'heading',text:'Primeira leitura'},{kind:'text',text:'Leitura preservada com resposta. '.repeat(70)},{kind:'heading',text:'Evangelho'},{kind:'text',text:'Texto do Evangelho.'}]}]},gospel:{title:'Evangeliário',sections:[{id:'lc-advento',title:'1º Domingo do Advento · Ano A',group:'Advento',blocks:[{kind:'heading',text:'Evangelho'},{kind:'text',text:'Texto do Evangelho. '.repeat(75)},{kind:'heading',text:'Forma breve'},{kind:'text',text:'Alternativa preservada.'}]}]},days:{}};
async function lectionarySetup(gospel=false){const p=new Player('lectionary-player',world.dimension);world.players.push(p);p.inventory.setItem(0,new ItemStack(gospel?ITEM:'evangeliarium:lectionary'));const books=new Books();books.load();const reader=new Reader(books,liturgyFixture,lectionaryFixture);const h=gospel?books.held(p):books.select(p,books.held(p),{mode:'index'});reader.open(p,h);await settle();if(gospel)await click('Índice');return{p,books,reader};}
test('Lecionário abre índice próprio, conserva texto e marca página no exemplar',async()=>{
 const {p,books,reader}=await lectionarySetup();assert.equal(title(),'Lecionário');assert.deepEqual(itemState(p.inventory.getItem(0)).selection,{mode:'index'});
 await click('Advento');await click('1º Domingo do Advento · Ano A');assert.ok(!/Bíblia Livre|CNBB/.test(current().text));await click('Próxima');const text=current().text;
 await click('Seções');assert.match(current().text,/calendário local/);await click('Livro');await click('Marcar página');assert.deepEqual(itemState(p.inventory.getItem(0)).selection,{mode:'section',sectionId:'lc-advento',page:1});reader.open(p,books.held(p));await settle();assert.equal(current().text,text);
});
test('Evangeliário consulta formulários sem primeiras leituras e reabre marca litúrgica',async()=>{
 const {p,books,reader}=await lectionarySetup(true);await click('Advento');await click('1º Domingo do Advento · Ano A');assert.ok(!current().text.includes('Primeira leitura'));await click('Próxima');
 await click('Seções');await click('Livro');await click('Marcar página');const text=current().text;reader.open(p,books.held(p));await settle();assert.equal(current().text,text);assert.equal(itemState(p.inventory.getItem(0)).selection.sectionId,'lc-advento');
 await click('Seções');await click('Livro');await click('Seguir hoje');assert.ok(current().text.includes('24/10/2026')||title()==='Hoje');assert.deepEqual(itemState(p.inventory.getItem(0)).selection,{mode:'today'});
});
test('índice evangélico sem seleção volta ao dia e busca preserva alternativas',async()=>{
 await lectionarySetup(true);await click('Buscar');await submit('alternativa');await click('1º Domingo do Advento · Ano A');await click('Seções');await click('Hoje');assert.ok(current().text.includes('24/10/2026')||title()==='Hoje');
});
test('callback de marca do Lecionário não modifica Evangeliário substituto',async()=>{
 const {p,books,reader}=await lectionarySetup();await click('Advento');await click('1º Domingo do Advento · Ano A');await click('Seções');await click('Livro');const stale=current();p.inventory.setItem(0,new ItemStack(ITEM));reader.open(p,books.held(p));await settle();const fresh=current();stale.respond({canceled:false,selection:stale.buttons.indexOf('Marcar página')});await settle();assert.deepEqual(itemState(p.inventory.getItem(0)).selection,{mode:'today'});assert.equal(current(),fresh);assert.equal(fresh.showing,true);
});

test('partes da leitura saltam para a página real e não mudam a marca',async()=>{
 const {p}=await lectionarySetup();await click('Advento');await click('1º Domingo do Advento · Ano A');await click('Seções');await click('Partes da leitura');const target=current().buttons.find((label:string)=>label.startsWith('Evangelho · página '));assert.ok(target);await click(target);assert.ok(current().text.includes('Evangelho'));assert.deepEqual(itemState(p.inventory.getItem(0)).selection,{mode:'index'});
});
test('acervo real navega tempo, ciclo, semana e volta à mesma lista',async()=>{
 const p=new Player('real-lectionary',world.dimension);world.players.push(p);p.inventory.setItem(0,new ItemStack('evangeliarium:lectionary'));const books=new Books();books.load();const reader=new Reader(books);reader.open(p,books.held(p));await settle();await click('Seções');await click('Índice');assert.equal(title(),'Lecionário');
 await click('Tempo Comum');assert.ok(current().buttons.includes('Dias de semana · Ano II'));
 await click('Dias de semana · Ano II');assert.ok(current().buttons.includes('Semana 2'));assert.ok(!current().buttons.includes('Semana 11'));await click('Próximas');await click('Semana 12');
 const target=current().buttons.find((x:string)=>x.startsWith('Terça-feira'));assert.ok(target);await click(target);await click('Seções');await click('Voltar à lista');assert.ok(current().buttons.includes(target));await click('Voltar');assert.ok(current().buttons.includes('Semana 12'));assert.ok(!current().buttons.includes('Semana 1'));
});
test('Evangelho ausente ou marca removida volta ao índice sem conteúdo inventado',async()=>{
 const p=new Player('missing-gospel',world.dimension);world.players.push(p);p.inventory.setItem(0,new ItemStack(ITEM));const books=new Books();books.load();const h=books.select(p,books.held(p),{mode:'section',sectionId:'lc-missing',page:999});const reader=new Reader(books,liturgyFixture,{...lectionaryFixture,gospel:{title:'Evangeliário',sections:[]}});reader.open(p,h);await settle();assert.equal(title(),'Evangeliário');assert.ok(current().buttons.includes('Hoje'));await click('Hoje');assert.ok(current().text.includes('24/10/2026')||title()==='Hoje');assert.equal(itemState(p.inventory.getItem(0)).selection.sectionId,'lc-missing');
});
test('busca incremental interrompida não abre resultados sobre outra sessão',async()=>{
 const {p,books,reader}=await lectionarySetup();await click('Buscar');const queued:(()=>void)[]=[],run=m.system.run;m.system.run=(fn:()=>void)=>{queued.push(fn);};
 try{current().respond({canceled:false,formValues:['leitura']});await settle();assert.equal(queued.length,1);p.inventory.setItem(0,new ItemStack(ITEM));queued.shift()!();assert.equal(queued.length,0);}finally{m.system.run=run;}
 reader.open(p,books.held(p));await settle();assert.ok(current().text.includes('24/10/2026')||title()==='Hoje');assert.equal(current().showing,true);
});

async function dailyBook(book:string,date='2026-11-05T12:00:00Z'){
 now=Date.parse(date);const p=new Player('daily',world.dimension);world.players.push(p);p.inventory.setItem(0,new ItemStack(book==='gospel'?ITEM:'evangeliarium:'+book));const books=new Books();books.load();const reader=new Reader(books);reader.open(p,books.held(p));await settle();return{p,books,reader};
}
test('três livros abrem pela data; Pontifical permanece por rito',async()=>{
 for(const book of ['gospel','lectionary','missal']){const {reader,p}=await dailyBook(book);assert.match(current().text,/05\/11\/2026/);assert.ok(!current().text.includes('Próprios locais'));assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'today');reader.close(p.id);}
 await dailyBook('pontifical');assert.equal(title(),'Pontifical Romano');assert.ok(!current().buttons.includes('Hoje'));
});
test('Lecionário consulta data sem alterar marca e segue novo dia ao reabrir',async()=>{
 const {p,books,reader}=await dailyBook('lectionary');await click('Seções');await click('Livro');await click('Marcar página');const marked=itemState(p.inventory.getItem(0)).selection;
 await click('Seções');await click('Data');await submit('25/12/2026');assert.equal(title(),'Celebração');assert.ok(!current().text.includes('Confira'));assert.deepEqual(itemState(p.inventory.getItem(0)).selection,marked);
 reader.open(p,books.held(p));await settle();assert.notEqual(title(),'Hoje');await click('Seções');await click('Livro');await click('Seguir hoje');assert.match(current().text,/05\/11\/2026/);
 now=Date.parse('2026-11-06T04:00:00Z');reader.open(p,books.held(p));await settle();assert.match(current().text,/06\/11\/2026/);
});
test('24 dezembro não presume Missa noturna; Missal ausente nunca substitui próprio',async()=>{
 const {p,reader}=await dailyBook('gospel','2026-12-24T12:00:00Z');assert.ok(!current().text.includes('locais'));assert.ok(current().buttons.some((label:string)=>/24|Natal|Advento/.test(label)));reader.close(p.id);
 await dailyBook('missal');assert.match(current().text,/Próprio não disponível/);assert.ok(!current().buttons.includes('Oração Coleta'));
});
test('data fora da cobertura preserva rascunho e não inventa leitura',async()=>{
 await dailyBook('lectionary');await click('Seções');await click('Data');await submit('01/01/1500');assert.equal(title(),'Data');assert.equal(current().inputs[0].options.defaultValue,'01/01/1500');assert.match(current().labels[0],/1583/);await cancel();assert.match(current().text,/05\/11\/2026/);
});
test('vigília é opção explícita e não substitui a leitura diurna',async()=>{
 await dailyBook('lectionary','2026-05-23T12:00:00Z');const primary=current().buttons[0],vigil=current().buttons.find((label:string)=>label.startsWith('Vigília · '));assert.ok(vigil);assert.notEqual(primary,vigil);assert.ok(!current().text.includes('locais'));await click(vigil);await click('Seções');await click('Celebração do dia');assert.equal(current().buttons[0],primary);
});
test('projeção fora da década recebe só indicação contextual; consulta não altera marca',async()=>{
 const {p}=await dailyBook('lectionary');await click('Seções');await click('Data');await submit('05/11/2040');assert.match(current().text,/Projeção/);assert.ok(!current().text.includes('Próprios locais'));assert.equal(itemState(p.inventory.getItem(0)).selection.mode,'today');
});
test('rotina abre leitura direta sem aviso genérico ou escolha redundante',async()=>{
 await dailyBook('lectionary');assert.deepEqual(current().buttons,['','Seções','Próxima']);assert.ok(!/confira|facultativ|locais|Diretório/i.test(current().text));
});

test('Corpus de 2038 abre diretamente; só datas candidatas de João pedem escolha',async()=>{
 await dailyBook('lectionary','2038-06-24T12:00:00Z');assert.ok(current().buttons.includes('Seções'));assert.ok(!current().text.includes('Transferência a confirmar'));assert.match(current().text,/Corpo|Sangue/);
 await click('Seções');await click('Data');await submit('23/06/2038');assert.equal(title(),'Celebração');assert.match(current().text,/Transferência a confirmar/);assert.ok(current().buttons.some((label:string)=>label.includes('João')));
});
function setOrdo(date:string,key:string,mass?:string){world.setDynamicProperty('evangeliarium:ordo_state',JSON.stringify({schema:1,revision:1,override:{selection:{kind:'date',date,key,...mass?{mass}:{}},expiresAt:Date.parse('2026-10-25T03:00:00Z')}}));}
test('Ordo changes new openings without interrupting an active page or destroying its bookmark',async()=>{
 const {p,books,reader}=await setup();await click('Leituras');await click('Livro');await click('Marcar passagem');const mark=itemState(p.inventory.getItem(0)).selection,active=current();
 setOrdo('2026-10-25','comum/30/0/A');reader.tick();await settle();assert.equal(current(),active);
 reader.open(p,books.held(p));await settle();assert.match(current().text,/25\/10\/2026/);assert.deepEqual(itemState(p.inventory.getItem(0)).selection,mark);
 await click('Seções');await click('Livro');await click('Ler marca');assert.match(title(),/Lucas/);assert.deepEqual(itemState(p.inventory.getItem(0)).selection,mark);
});
test('Ordo expiry restores the saved personal bookmark on reopening after reload',async()=>{
 const {p,books,reader}=await setup();await click('Leituras');await click('Livro');await click('Marcar passagem');setOrdo('2026-10-25','comum/30/0/A');
 now=Date.parse('2026-10-25T03:00:00Z');const reopened=new Reader(books);reader.close(p.id);reopened.open(p,books.held(p));await settle();assert.match(title(),/Lucas/);assert.equal(JSON.parse(world.getDynamicProperty('evangeliarium:ordo_state')).override,undefined);
});
test('Pontifical stays on its rite while a global date is active',async()=>{
 const {p,books,reader}=await ritual('pontifical');await click('Ordens');await click('Ordenação');await click('Seções');await click('Livro');await click('Marcar página');
 setOrdo('2026-10-25','comum/30/0/A');reader.open(p,books.held(p));await settle();assert.equal(title(),'Ordenação');
});
test('selected Christmas Mass points the Gospel to the explicitly chosen aurora, not the day Mass',async()=>{
 const {p,books,reader}=await setup();setOrdo('2026-12-25','proprio/12-25','Missa da aurora');reader.open(p,books.held(p));await settle();assert.match(current().text,/Missa da aurora/);assert.match(current().text,/Lucas 2/);
});
test('missing Missal proper offers the index instead of unrelated or votive text',async()=>{
 const {p,books,reader}=await ritual('missal');setOrdo('2026-10-25','comum/30/0/A');reader.open(p,books.held(p));await settle();assert.equal(title(),'Celebração');assert.match(current().text,/Próprio não disponível/);assert.ok(current().buttons.includes('Índice'));
});
test('global Pentecost vigil uses its feast name, not the Saturday ferial label',async()=>{
 const {p,books,reader}=await setup();setOrdo('2027-05-15','pentecostes/B','Missa da Vigília');reader.open(p,books.held(p));await settle();assert.match(current().text,/Pentecostes/);assert.doesNotMatch(current().text,/7ª Semana da Páscoa/);
});
