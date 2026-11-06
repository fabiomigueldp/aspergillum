import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liturgyPages,searchSections,type LiturgySection} from '../src/domain/liturgy.ts';
import {newState,decodeState,selectionAllowed} from '../src/domain/state.ts';
const plain=(value:string)=>value.replace(/§[0-9a-z]/g,'');
test('livros rituais têm índice e marca de seção; Evangelho conserva sua seleção',()=>{
 assert.deepEqual(newState('ev-example','missal').selection,{mode:'today'});
 assert.deepEqual(newState('ev-example').selection,{mode:'today'});
 const state={...newState('ev-example','pontifical'),selection:{mode:'section',sectionId:'ordenacao-presbiteros',page:3}};
 assert.deepEqual(decodeState(JSON.stringify(state)),state);
 for(const page of [-1,1.5,NaN])assert.equal(decodeState(JSON.stringify({...state,selection:{...state.selection,page}})),undefined);
 assert.equal(selectionAllowed('gospel',{mode:'index'}),false);assert.equal(selectionAllowed('missal',{mode:'today'}),true);
});
test('paginação conserva palavras, rubricas internas, acentos e caracteres suplementares',()=>{
 const repeated='O celebrante diz: bênção ✝ oração 😀. '.repeat(120);
 const section:LiturgySection={id:'test',title:'Teste',blocks:[{kind:'heading',text:'Título'},{kind:'text',text:repeated+'Amém.',runs:[{text:repeated,rubric:true,italic:true},{text:'Amém.',bold:true}]}]};
 const pages=liturgyPages(section,160);assert.ok(pages.length>20);assert.ok(pages.every(p=>p.length<=160));
 assert.equal(plain(pages.join('')).replace(/\s+/g,' ').trim(),section.blocks.map(b=>b.text).join(' ').replace(/\s+/g,' ').trim());
 assert.ok(pages.some(p=>p.includes('§4§o')));assert.ok(pages.some(p=>p.includes('§lAmém.§r')));
 assert.ok(pages.every(p=>!/[\uD800-\uDBFF]$/.test(plain(p))));
});
test('parágrafo maior que uma página nunca é truncado e palavra longa não causa loop',()=>{
 const text='Á'.repeat(4000);const pages=liturgyPages({id:'long',title:'Longa',blocks:[{kind:'text',text}]});
 assert.equal(pages.join(''),text);assert.ok(pages.every(p=>p.length<=850));
});
test('busca ignora acentos e caixa, exige todas as palavras e preserva ordem',()=>{
 const sections:LiturgySection[]=[{id:'a',title:'Ordenação',group:'Sacramentos',blocks:[{kind:'text',text:'O bispo abençoa.'}]},{id:'b',title:'Bênção',group:'Outros',blocks:[{kind:'text',text:'O celebrante.'}]}];
 assert.deepEqual(searchSections({title:'Livro',sections},'ORDENACAO bispo').map(s=>s.id),['a']);
 assert.deepEqual(searchSections({title:'Livro',sections},'bencao').map(s=>s.id),['b']);
 assert.deepEqual(searchSections({title:'Livro',sections},'').map(s=>s.id),['a','b']);
});
test('catálogo compilado conserva todos os grupos e apenas links internos resolvidos',async()=>{
 const {compileLiturgy}=await import('../tools/liturgy.mjs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..'),outputs=new Map<string,string>();
 const {liturgyNavigation}=await import('../tools/liturgy-navigation.mjs');
 const source=compileLiturgy(root,(name:string,data:string)=>outputs.set(name,data));
 const runtime=JSON.parse(outputs.get('src/generated/liturgy.ts')!.split('export const liturgy:LiturgyCatalog=')[1]!.trim().slice(0,-1));
 for(const id of ['missal','pontifical'])for(const section of source.books[id].sections){
  const compiled=runtime.books[id].sections.find((s:any)=>s.id===section.id);assert.equal(compiled.title,section.title);assert.deepEqual(compiled.groups,liturgyNavigation(source.books[id],section).groups);
  const expected=liturgyNavigation(source.books[id],section).links;
  assert.deepEqual(compiled.links??[],expected);
 }
 const shared=runtime.books.pontifical.sections.find((s:any)=>s.id==='pontifical--primeiras-leituras-para-ordenacoes');assert.equal(shared.groups.length,4);
});

test('rótulos desambiguam missas pelo índice original sem alterar o título da fonte',async()=>{
 const {liturgyLabels}=await import('../tools/liturgy-labels.mjs');const fs=await import('node:fs');
 const catalog=JSON.parse(fs.readFileSync(new URL('../assets-src/liturgy/catalog.json',import.meta.url),'utf8')),labels=liturgyLabels(catalog);
 const expected={"missal--missa-do-dia":"Solenidade do Natal do Senhor · Missa do Dia","missal--missa-do-dia_29":"Solenidade da Epifania do Senhor · Missa do Dia","missal--missa-do-dia_3":"Solenidade da Ascensão do Senhor · Missa do Dia","missal--missa-do-dia_46":"Solenidade de Pentecostes · Missa do Dia","missal--missa-da-vigilia":"Solenidade da Epifania do Senhor · Missa da Vigília","missal--missa-da-vigilia_29":"Solenidade da Ascensão do Senhor · Missa da Vigília","missal--missa-da-vigilia_96":"Solenidade de Pentecostes · Missa da Vigília"};
 for(const [id,title]of Object.entries(expected))assert.equal(labels.get(id),title);
 assert.match(labels.get('missal--oracao-do-ano-jubilar-senhor-vos'),/Ano Jubilar/i);assert.match(labels.get('missal--oracoes-mensais-do-ano-jubilar-rezar'),/Ano Jubilar/i);
 assert.equal(labels.size,9);
});

test('correções de navegação são explícitas; links antigos não são adivinhados',async()=>{
 const {liturgyNavigation}=await import('../tools/liturgy-navigation.mjs');const fs=await import('node:fs');
 const catalog=JSON.parse(fs.readFileSync(new URL('../assets-src/liturgy/catalog.json',import.meta.url),'utf8')),book=catalog.books.missal,section=book.sections.find((s:any)=>s.id==='missal--oracoes-eucaristicas');
 const before=JSON.stringify(section),nav=liturgyNavigation(book,section);
 for(const [roman,suffix]of [['II','29'],['III','56']])assert.equal(nav.links.find((l:any)=>l.label==='Oração Eucarística para diversas circunstâncias '+roman)?.targetId,'missal--oracao-eucaristica-para-diversas_'+suffix);
 assert.ok((nav.unresolvedLinks??0)>0);assert.equal(JSON.stringify(section),before);
 for(const id of ['missal--oracao-eucaristica-para-diversas_29','missal--oracao-eucaristica-para-missas-com_38'])assert.deepEqual(liturgyNavigation(book,book.sections.find((s:any)=>s.id===id)).groups,['Orações Eucarísticas']);
});

test('índice interno respeita páginas longas e início real dos títulos',async()=>{
 const {liturgyContents}=await import('../src/domain/liturgy.ts');
 const section:LiturgySection={id:'contents',title:'Índice',blocks:[{kind:'heading',text:'Início'},{kind:'text',text:'Longa leitura. '.repeat(150)},{kind:'heading',text:'Evangelho'},{kind:'text',text:'Texto breve.'}]};
 const pages=liturgyPages(section,160),targets=liturgyContents(section,160);assert.equal(targets.length,2);assert.equal(targets[0]!.page,0);assert.ok(targets[1]!.page>0);for(const target of targets)assert.ok(pages[target.page]!.includes(target.label));
});
