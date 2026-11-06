import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {liturgyContents,liturgyPages,type LiturgySection} from '../src/domain/liturgy.ts';
import type {LectionaryCatalog} from '../src/domain/lectionary.ts';
const catalog:LectionaryCatalog=JSON.parse(fs.readFileSync(new URL('../assets-src/lectionary/catalog.json',import.meta.url),'utf8'));
test('livros anteriores conservam os limites originais de paginação',()=>{
 const pages=['book','gospel'].map(key=>catalog[key as 'book'|'gospel'].sections.map(section=>liturgyPages({...section,id:'legacy-'+section.id})));
 assert.equal(createHash('sha256').update(JSON.stringify(pages)).digest('hex'),'2da1926a3e24a47bf31c829e6d43415ab686305a3806f14dce4d77175deb1eed');
});
test('Natal distingue partes das missas e Ramos distingue procissão e formas da Paixão',()=>{
 for(const book of [catalog.book,catalog.gospel]){
  const christmas=book.sections.find(s=>s.title==='4º Domingo do Advento · Ano B · 24 de dezembro')!;
  const labels=liturgyContents(christmas).map(t=>t.label);
  assert.ok(labels.some(label=>label.startsWith('Missa da manhã · ')));
  assert.ok(labels.some(label=>label.startsWith('Missa da Vigília · EVANGELHO (mais breve)')));
  assert.ok(labels.some(label=>label.startsWith('Missa da Noite do Natal do Senhor · ')));
  const palms=book.sections.find(s=>s.title==='Domingo de Ramos · Ano A')!;
  assert.ok(liturgyContents(palms).some(t=>t.label==='Procissão de Ramos · EVANGELHO'));
  assert.ok(liturgyContents(palms).some(t=>t.label==='Missa · EVANGELHO (mais breve)'));
 }
});
test('todos os destinos são distintos, não oferecem separadores e apontam ao início real do bloco',()=>{
 for(const book of [catalog.book,catalog.gospel])for(const section of book.sections){
  const targets=liturgyContents(section),headings=new Set<number>();
  liturgyPages(section,850,(index,page)=>{if(section.blocks[index]!.kind==='heading')headings.add(page);});
  assert.ok(targets.length>0,section.title);
  assert.equal(new Set(targets.map(t=>t.label)).size,targets.length,section.title);
  for(const target of targets){assert.ok(headings.has(target.page));assert.ok(!/^ou(?:\b|[,:])/i.test(target.label));}
 }
});
test('índice dos livros anteriores mantém seus rótulos e páginas',()=>{
 const section:LiturgySection={id:'missal-legacy',title:'Rito',blocks:[{kind:'heading',text:'Missa'},{kind:'text',text:'Texto. '.repeat(200)},{kind:'heading',text:'Ou:'},{kind:'text',text:'Alternativa.'}]};
 const expected:{label:string;page:number}[]=[];
 liturgyPages(section,850,(i,page)=>{if(section.blocks[i]!.kind==='heading')expected.push({label:section.blocks[i]!.text,page});});
 assert.deepEqual(liturgyContents(section),expected);
});

test('todos os formulários lc conservam texto, limite e títulos junto do conteúdo',()=>{
 const plain=(text:string)=>text.replace(/§./g,'').replace(/\s+/g,' ').trim();
 let oldOrphans=0,newOrphans=0;
 for(const book of [catalog.book,catalog.gospel])for(const section of book.sections){
  const pages=liturgyPages(section),old=liturgyPages({...section,id:'legacy-'+section.id});
  oldOrphans+=old.filter(p=>/§l[^§]+§r\s*$/.test(p)).length;
  newOrphans+=pages.filter(p=>/§l[^§]+§r\s*$/.test(p)).length;
  assert.equal(plain(pages.join(' ')),plain(section.blocks.map(block=>block.runs?.length?block.runs.map(run=>run.text).join(''):block.text).join(' ')),section.title);
  for(const page of pages)assert.ok(page.length<=850,section.title);
  const headingStarts:{index:number;page:number}[]=[];
  liturgyPages(section,850,(index,page)=>{if(section.blocks[index]!.kind==='heading')headingStarts.push({index,page});});
  for(const target of headingStarts)assert.ok(plain(pages[target.page]!).includes(plain(section.blocks[target.index]!.text)),section.title+' · '+section.blocks[target.index]!.text);
 }
 assert.equal(oldOrphans,52);assert.equal(newOrphans,0);
});
