import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {missalDailySections} from '../src/domain/daily-books.ts';
import {dailyCalendar} from '../src/domain/daily-calendar.ts';
const catalog=JSON.parse(fs.readFileSync(new URL('../assets-src/liturgy/catalog.json',import.meta.url),'utf8'));
const sections=catalog.books.missal.sections;
test('Missal identifica somente próprios conhecidos; não usa votivas ou placeholder',()=>{
 assert.deepEqual(missalDailySections(['comum/31/4/II'],sections),[]);
 assert.deepEqual(missalDailySections(['proprio/03-19'],sections),[]);
 assert.equal(missalDailySections(['cinzas'],sections)[0]?.id,'missal--quarta-feira-de-cinzas');
 assert.equal(missalDailySections(['ascensao/A'],sections).length,2);
 assert.equal(missalDailySections(['pentecostes/B'],sections).length,3);
 assert.equal(missalDailySections(['proprio/12-25'],sections).length,3);
 assert.equal(missalDailySections(['dez/24'],sections).length,2);
 assert.equal(missalDailySections(['dez/24'],sections)[0]?.id,'missal--missa-da-vigilia-do-natal-do-senhor');
});
test('todos próprios resolvidos apontam para seções reais, sem duplicação',()=>{
 for(let day=Date.UTC(2026,0,1);day<Date.UTC(2036,0,1);day+=86400000){
  const result=missalDailySections(dailyCalendar(new Date(day).toISOString().slice(0,10)).keys,sections);
  assert.equal(new Set(result.map(x=>x.id)).size,result.length);
  assert.ok(result.every(x=>sections.includes(x)));
 }
});
