import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parsePassage,passageVerses,paginate,pageText,type Corpus} from '../src/domain/scripture.ts';
import {brazilDate,parseDate,dayFor} from '../src/domain/calendar.ts';
import {newState,decodeState,revise,sameBook,Locks} from '../src/domain/state.ts';
import {transfer,type TransferPort} from '../src/application/transfer.ts';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../prototype/data.js',import.meta.url),'utf8'),ctx);
const corpus:Corpus=JSON.parse(JSON.stringify(ctx.EVANGELIUM_DATA));
test('89 capítulos e 3779 versículos preservados',()=>{
 assert.equal(corpus.books.reduce((n,b)=>n+b.chapters.length,0),89);
 assert.equal(corpus.books.flatMap(b=>b.chapters).flat().length,3779);
});
test('referências inteiras, intervalos entre capítulos e omissões',()=>{
 assert.equal(passageVerses(parsePassage('João 3,16-21',corpus),corpus).length,6);
 assert.equal(passageVerses(parsePassage('Jo 7,53-8,11',corpus),corpus).length,12);
 assert.deepEqual(passageVerses(parsePassage('Lc 1,26-28.30-31',corpus),corpus).map(v=>v.verse),[26,27,28,30,31]);
 assert.equal(passageVerses(parsePassage('Mateus 1',corpus),corpus).length,25);
});
test('referências inválidas não são corrigidas silenciosamente',()=>{
 for(const ref of ['Jo 22','Jo 3,0','Jo 3,100','Mt 2,5-1','Lc 1,1-4.3','Jo 3,16a','Sl 1','Jo 3,NaN'])assert.throws(()=>parsePassage(ref,corpus));
 const p=parsePassage('Jo 3,16a-18b',corpus,true);assert.equal(p.expanded,true);assert.equal(p.reference,'Jo 3,16-18');
});
test('Paixão inteira paginada sem perda ou duplicação, observables <5000',()=>{
 for(const b of corpus.books)for(let c=1;c<=b.chapters.length;c++){
  const verses=passageVerses(parsePassage(b.id+' '+c,corpus),corpus),pages=paginate(verses);
  assert.deepEqual(pages.flat(),verses);assert.ok(pages.every(p=>pageText(p).length<=850));
 }
 const passion=passageVerses(parsePassage('Mt 26,14-27,66',corpus),corpus);
 assert.ok(paginate(passion).length>10);assert.deepEqual(paginate(passion).flat(),passion);
});
test('Brasília muda à 03:00 UTC, datas impossíveis rejeitadas',()=>{
 assert.equal(brazilDate(Date.parse('2026-10-25T02:59:59Z')),'2026-10-24');
 assert.equal(brazilDate(Date.parse('2026-10-25T03:00:00Z')),'2026-10-25');
 assert.equal(parseDate('24/10/2026'),'2026-10-24');
 assert.throws(()=>parseDate('31/02/2026'));assert.throws(()=>dayFor('2028-01-01',{}));
});
test('revisão invalida callbacks antigos e schemas futuros não são aceitos',()=>{
 const old=newState('ev-instance-1234'); const next=revise(old,{mode:'passage',reference:'Jo 3,16'});
 assert.equal(sameBook(old,next),false);assert.deepEqual(decodeState(JSON.stringify(old)),old);
 assert.equal(decodeState(JSON.stringify({...old,schema:2})),undefined);
});
test('lock impede reentrada e libera após exceção',()=>{
 const l=new Locks();l.run(['p','b'],()=>assert.equal(l.run(['b'],()=>1),undefined));
 assert.throws(()=>l.run(['b'],()=>{throw Error('x');}));assert.equal(l.run(['b'],()=>42),42);
});
for(const failure of ['removeSource','writeDestination','commit'] as const)test('transferência compensa falha em '+failure,()=>{
 const events:string[]=[];let source=true,dest=false,journal=false;
 const p:TransferPort={validate(){},prepare(){journal=true;},removeSource(){events.push('remove');if(failure==='removeSource')throw Error('x');source=false;},writeDestination(){dest=true;if(failure==='writeDestination')throw Error('x');},commit(){throw Error('x');},restoreSource(){source=true;},clearDestination(){dest=false;},abort(){journal=false;}};
 assert.throws(()=>transfer(p));assert.equal(source,true);assert.equal(dest,false);assert.equal(journal,false);
});

test('data de Brasília independe do fuso do processo e mantém virada civil até 2035',()=>{
 const original=process.env.TZ;
 try{for(const zone of ['UTC','Pacific/Auckland','America/Los_Angeles']){
  process.env.TZ=zone;
  assert.equal(brazilDate(Date.parse('2035-01-01T02:59:59.999Z')),'2034-12-31');
  assert.equal(brazilDate(Date.parse('2035-01-01T03:00:00.000Z')),'2035-01-01');
 }}finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
