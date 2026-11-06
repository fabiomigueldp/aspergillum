import {test,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'out/tests/ordo-ui.mjs');
fs.mkdirSync(path.dirname(output),{recursive:true});
await build({stdin:{contents:`export * from './src/presentation/ordo.ts';export * from './src/infrastructure/ordo.ts';export * from './src/domain/daily-calendar.ts';export * from './tests/minecraft-mock.mjs';export * from './tests/ui-mock.mjs';`,resolveDir:root},outfile:output,bundle:true,platform:'node',format:'esm',alias:{'@minecraft/server':path.join(root,'tests/minecraft-mock.mjs'),'@minecraft/server-ui':path.join(root,'tests/ui-mock.mjs')}});
const m:any=await import(pathToFileURL(output).href);
const {OrdoController,ordo,ORDO,ORDO_STATE,Player,ItemStack,PlayerPermissionLevel,world,forms}=m;
const originalNow=Date.now;let now=Date.parse('2026-11-05T12:00:00Z');Date.now=()=>now;
const settle=async()=>{await new Promise(r=>setImmediate(r));};
const current=(p?:any)=>p?forms.filter((f:any)=>f.player===p).at(-1):forms.at(-1);
const title=(p?:any)=>current(p).heading.replace(/§./g,'');
async function click(label:string,p?:any){const f=current(p),index=f.buttons.indexOf(label);assert.notEqual(index,-1,'Button '+label+' in '+f.buttons.join(', '));f.respond({canceled:false,selection:index});await settle();}
async function submit(value:string,p?:any){current(p).respond({canceled:false,formValues:[value]});await settle();}
async function cancel(p?:any){current(p).respond({canceled:true,cancelationReason:'UserClosed'});await settle();}
function persisted(){const raw=world.getDynamicProperty(ORDO_STATE);return raw===undefined?undefined:JSON.parse(raw);}
async function setup(operator=true,id='operator'){
 const p=new Player(id,world.dimension);world.players.push(p);p.playerPermissionLevel=operator?PlayerPermissionLevel.Operator:PlayerPermissionLevel.Member;p.inventory.setItem(0,new ItemStack(ORDO));
 const controller=new OrdoController(ordo),valid=()=>p.inventory.getItem(0)?.typeId===ORDO;controller.open(p,valid);await settle();return{p,controller,valid};
}
async function preview(date='06/11/2026',p?:any){await click('Escolher data',p);await click('Outra data',p);await submit(date,p);assert.equal(title(p),'Celebração');}
async function choose(p?:any){const label=current(p).buttons.find((b:string)=>b!=='Voltar');assert.ok(label);await click(label,p);}
beforeEach(()=>{m.reset();forms.length=0;now=Date.parse('2026-11-05T12:00:00Z');});after(()=>{Date.now=originalNow;});

test('operator configures, member and Custom permissions only inspect',async()=>{
 const op=await setup();assert.ok(current(op.p).buttons.includes('Escolher data'));assert.ok(current(op.p).buttons.includes('Escolher formulário'));
 const member=await setup(false,'member');assert.deepEqual(current(member.p).buttons,['Consultar formulários','Fechar']);assert.doesNotMatch(current(member.p).text,/Somente operadores/);
 member.p.playerPermissionLevel=PlayerPermissionLevel.Custom;member.controller.open(member.p,member.valid);await settle();assert.deepEqual(current(member.p).buttons,['Consultar formulários','Fechar']);assert.equal(persisted(),undefined);
});
test('date browsing and preview do not write before deliberate celebration choice',async()=>{
 await setup();await preview();assert.equal(persisted(),undefined);await choose();assert.equal(title(),'Ordo');assert.deepEqual(persisted().override.selection,{kind:'date',date:'2026-11-06',key:m.dailyCalendar('2026-11-06').keys[0]});assert.equal(persisted().revision,1);
});
test('concurrent editors reject stale apply without overwriting first choice',async()=>{
 const a=await setup(true,'a'),b=await setup(true,'b');await preview('06/11/2026',a.p);await preview('07/11/2026',b.p);await choose(a.p);const saved=persisted();await choose(b.p);assert.deepEqual(persisted(),saved);assert.match(current(b.p).text,/O Ordo mudou/);assert.equal(title(b.p),'Ordo');
});
test('permission revoked before apply prevents commit and hides controls',async()=>{
 const {p}=await setup();await preview();p.playerPermissionLevel=PlayerPermissionLevel.Member;await choose();assert.equal(persisted(),undefined);assert.deepEqual(current().buttons,['Consultar formulários','Fechar']);assert.match(current().text,/exige um operador/);
});
test('expiry with form open increments revision and rejects stale apply',async()=>{
 await setup();await preview();await choose();await preview('07/11/2026');now=Date.parse('2026-11-06T03:00:00Z');await choose();assert.deepEqual(persisted(),{schema:1,revision:2});assert.match(current().text,/A data virou em Brasília/);assert.match(current().text,/Hoje · 06\/11\/2026/);
});
test('midnight without previous override rejects stale form despite unchanged revision',async()=>{
 await setup();await preview('07/11/2026');assert.equal(persisted(),undefined);now=Date.parse('2026-11-06T03:00:00Z');await choose();assert.equal(persisted(),undefined);assert.equal(title(),'Ordo');assert.match(current().text,/A data virou em Brasília/);assert.match(current().text,/Hoje · 06\/11\/2026/);await preview('07/11/2026');await choose();assert.equal(persisted().revision,1);assert.equal(persisted().override.selection.date,'2026-11-07');assert.equal(persisted().override.expiresAt,Date.parse('2026-11-07T03:00:00Z'));
});
test('cancel date input returns to date menu without altering override',async()=>{
 await setup();await preview();await choose();const saved=persisted();await click('Escolher data');await click('Outra data');await cancel();assert.equal(title(),'Escolher data');assert.ok(current().buttons.includes('Outra data'));assert.deepEqual(persisted(),saved);
});
test('replaced session ignores late callback and keeps new form open',async()=>{
 const {p,controller,valid}=await setup();await preview();const stale=current(),index=stale.buttons.findIndex((b:string)=>b!=='Voltar');stale.respond({canceled:false,selection:index});controller.open(p,valid);await settle();const fresh=current();await settle();assert.equal(current(),fresh);assert.equal(fresh.showing,true);assert.equal(persisted(),undefined);
});
test('invalid live item blocks apply and tick closes invalid session',async()=>{
 const {p,controller}=await setup();await preview();p.inventory.setItem(0,new ItemStack('minecraft:stone'));await choose();controller.tick();await settle();assert.equal(persisted(),undefined);assert.equal(current().showing,false);
});
test('invalid player cannot apply pending preview',async()=>{
 const {p,controller}=await setup();await preview();const stale=current(),index=stale.buttons.findIndex((b:string)=>b!=='Voltar');p.isValid=false;stale.respond({canceled:false,selection:index});await settle();controller.tick();assert.equal(persisted(),undefined);
});
test('tomorrow is next civil date and does not auto-select vigil',async()=>{
 now=Date.parse('2026-12-23T23:00:00Z');await setup();await click('Escolher data');await click('Amanhã · 24/12/2026');assert.equal(title(),'Celebração');assert.match(current().text,/24\/12\/2026/);assert.equal(persisted(),undefined);
 const vigil=current().buttons.find((b:string)=>/Vigília/.test(b));assert.ok(vigil);await click(vigil);assert.equal(persisted().override.selection.date,'2026-12-24');assert.match(persisted().override.selection.mass,/Vigília/);
});
test('invalid date preserves draft and error and permits correction',async()=>{
 await setup();await click('Escolher data');await click('Outra data');for(const invalid of ['31/02/2026','texto','01/01/1500']){await submit(invalid);assert.equal(title(),'Escolher data');assert.equal(current().inputs[0].options.defaultValue,invalid);assert.ok(current().labels.length);assert.equal(persisted(),undefined);}await submit('06/11/2026');assert.equal(title(),'Celebração');await choose();assert.equal(persisted().override.selection.date,'2026-11-06');
});
test('return to today removes override with new revision',async()=>{
 await setup();await preview();await choose();await click('Voltar para hoje');assert.deepEqual(persisted(),{schema:1,revision:2});assert.match(current().text,/Hoje · 05\/11\/2026/);assert.ok(!current().buttons.includes('Voltar para hoje'));
});
test('operator applies a votive with explicitly labeled daily readings in one action',async()=>{
 await setup();await click('Escolher formulário');assert.equal(current().text,'Missal Romano · 1/4');const label=current().buttons[0];await click(label);
 assert.equal(title(),'Formulário');assert.deepEqual(current().buttons,['Usar com leituras de hoje','Escolher leituras','Ler formulário','Voltar']);assert.equal(persisted(),undefined);
 await click('Usar com leituras de hoje');assert.equal(title(),'Ordo');assert.equal(persisted().override.selection.kind,'votive');assert.equal(persisted().override.selection.readings.date,'2026-11-05');assert.match(current().text,/Leituras · 05\/11\/2026/);assert.ok(current().text.includes(label));
});
test('votive reading date and distinct Christmas Mass are selected deliberately',async()=>{
 await setup();await click('Escolher formulário');await click(current().buttons[0]);await click('Escolher leituras');await submit('25/12/2026');assert.equal(title(),'Leituras');assert.equal(persisted(),undefined);
 await click('Missa da aurora');assert.equal(persisted().override.selection.readings.mass,'Missa da aurora');assert.equal(persisted().override.selection.readings.date,'2026-12-25');
});
test('votive input and back preserve draft without committing',async()=>{
 await setup();await click('Escolher formulário');await click(current().buttons[0]);await click('Escolher leituras');await submit('31/02/2026');assert.equal(current().inputs[0].options.defaultValue,'31/02/2026');await submit(' 25/12/2026 ');await click('Voltar');assert.equal(current().inputs[0].options.defaultValue,' 25/12/2026 ');await cancel();assert.equal(title(),'Formulário');assert.equal(persisted(),undefined);
});
test('votive commit checks permission, stale revision and midnight',async()=>{
 const {p}=await setup();await click('Escolher formulário');await click(current().buttons[0]);p.playerPermissionLevel=PlayerPermissionLevel.Member;await click('Usar com leituras de hoje');assert.equal(persisted(),undefined);
 p.playerPermissionLevel=PlayerPermissionLevel.Operator;const a=await setup(true,'a'),b=await setup(true,'b');await click('Escolher formulário',a.p);await click(current(a.p).buttons[0],a.p);await preview('06/11/2026',b.p);await choose(b.p);const saved=persisted();await click('Usar com leituras de hoje',a.p);assert.deepEqual(persisted(),saved);assert.match(current(a.p).text,/O Ordo mudou/);
 await click('Escolher formulário',a.p);await click(current(a.p).buttons[0],a.p);now=Date.parse('2026-11-06T03:00:00Z');await click('Usar com leituras de hoje',a.p);assert.equal(persisted().override,undefined);
});
test('vigil selection names the actual feast rather than the weekday of its civil date',async()=>{
 await setup();await preview('15/05/2027');const vigil=current().buttons.find((b:string)=>/Vigília/.test(b));assert.match(vigil,/Pentecostes/);await click(vigil);assert.match(current().text,/Pentecostes/);assert.doesNotMatch(current().text,/7ª Semana/);
 await preview('24/12/2026');await click(current().buttons.find((b:string)=>/Vigília/.test(b)));assert.match(current().text,/Natal/);assert.doesNotMatch(current().text,/Semana do Advento/);
});
test('back from a typed date preview restores the exact draft for correction',async()=>{
 await setup();await preview(' 25/12/2026 ');await click('Voltar');assert.equal(title(),'Escolher data');assert.equal(current().inputs[0]?.options.defaultValue,' 25/12/2026 ');assert.equal(persisted(),undefined);
 await submit('06/11/2026');await choose();assert.equal(persisted().override.selection.date,'2026-11-06');
});
test('canceling a typed preview restores its draft, then canceling the editor returns to dates',async()=>{
 await setup();await preview('25/12/2026');await cancel();assert.equal(current().inputs[0]?.options.defaultValue,'25/12/2026');await cancel();assert.equal(title(),'Escolher data');assert.ok(current().buttons.includes('Outra data'));assert.equal(persisted(),undefined);
});
test('members can consult all votives without global changes or operator controls',async()=>{
 await setup(false);assert.deepEqual(current().buttons,['Consultar formulários','Fechar']);assert.doesNotMatch(current().text,/Somente operadores/);await click('Consultar formulários');
 const labels:string[]=[];
 for(let page=0;page<4;page++){
  assert.equal(current().text,`Missal Romano · ${page+1}/4`);assert.ok(!current().buttons.some((label:string)=>/Usar|Aplicar|Escolher data/.test(label)));
  const entries=current().buttons.filter((label:string)=>!['Voltar','Mais formulários','Anteriores'].includes(label));labels.push(...entries);
  for(const entry of entries){
   await click(entry);assert.deepEqual(current().buttons,['Ler formulário','Voltar']);assert.doesNotMatch(current().text,/não vinculados/);
   await click('Ler formulário');assert.equal(title(),'Missal Romano');assert.ok(current().text.length>100);await click('Formulário');await click('Voltar');assert.equal(current().text,`Missal Romano · ${page+1}/4`);
  }
  if(page<3)await click('Mais formulários');else assert.ok(!current().buttons.includes('Mais formulários'));
 }
 assert.equal(labels.length,24);assert.equal(new Set(labels).size,24);await click('Anteriores');assert.equal(current().text,'Missal Romano · 3/4');await click('Voltar');assert.deepEqual(current().buttons,['Consultar formulários','Fechar']);assert.equal(persisted(),undefined);
});
test('tomorrow preview returns to date choices rather than a date editor',async()=>{
 await setup();await click('Escolher data');for(const leave of [()=>click('Voltar'),()=>cancel()]){await click('Amanhã · 06/11/2026');await leave();assert.equal(title(),'Escolher data');assert.equal(current().inputs.length,0);assert.ok(current().buttons.includes('Outra data'));}assert.equal(persisted(),undefined);
});
test('closed date draft cannot reopen an editor through a late back callback',async()=>{
 const {p,controller,valid}=await setup();await preview('25/12/2026');const stale=current(),index=stale.buttons.indexOf('Voltar');stale.respond({canceled:false,selection:index});controller.close(p.id);await settle();assert.equal(current(),stale);assert.equal(persisted(),undefined);
 controller.open(p,valid);await settle();await click('Escolher data');await click('Outra data');assert.equal(current().inputs[0].options.defaultValue,'');
});

test('Saint Therese uses the supplied memorial formulary without fabricated proper readings',async()=>{
 await setup();await click('Escolher formulário');for(let page=0;page<3;page++)await click('Mais formulários');await click('Santa Teresa do Menino Jesus');assert.equal(title(),'Formulário');await click('Usar com leituras de hoje');assert.equal(persisted().override.selection.id,'missal--santa-teresa-do-menino-jesus');assert.equal(persisted().override.selection.readings.date,'2026-11-05');assert.match(current().text,/Santa Teresa do Menino Jesus/);
});
