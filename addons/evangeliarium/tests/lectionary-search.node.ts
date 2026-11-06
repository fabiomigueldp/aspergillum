import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LectionarySearch} from '../src/domain/lectionary-search.ts';
import {searchSections} from '../src/domain/liturgy.ts';
import {lectionary} from '../src/generated/lectionary.ts';
test('busca do acervo é incremental e equivale à busca completa com e sem acentos',()=>{
 for(const query of ['advento','SALVACAO palavra','natividade','inexistente','']){
  const search=new LectionarySearch(lectionary.book,query);assert.equal(search.done,false);assert.equal(search.step(1),false);assert.ok(search.results.length<=1);let steps=1;while(!search.step(32))steps++;assert.ok(steps>20);assert.deepEqual(search.results,searchSections(lectionary.book,query));
 }
});
test('lote inválido não entra em loop e busca vazia encerra',()=>{
 const search=new LectionarySearch({title:'Vazio',sections:[]},'texto');assert.equal(search.done,true);assert.equal(search.step(),true);assert.throws(()=>search.step(0));assert.throws(()=>search.step(NaN));
});
