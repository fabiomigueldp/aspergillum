import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corpus,calendar} from '../src/generated/content.ts';
import {parsePassage,passageVerses} from '../src/domain/scripture.ts';
test('730 datas consecutivas com todas as referências presentes na edição',()=>{
 assert.equal(Object.keys(calendar).length,730);
 for(let i=0;i<730;i++){const iso=new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),day=calendar[iso]!;assert.equal(day.date,iso);assert.ok(day.readings.length);for(const r of day.readings)assert.ok(passageVerses(parsePassage(r.reference,corpus),corpus).length);}
});
test('referências brasileiras e variantes especiais verificadas',()=>{
 for(const [date,ref] of [['2026-10-24','Lc 13,1-9'],['2026-10-12','Jo 2,1-11'],['2026-05-17','Mt 28,16-20'],['2026-06-28','Mt 16,13-19'],['2026-08-16','Lc 1,39-56'],['2027-03-27','Mc 16,1-7']])assert.equal(calendar[date!]!.readings[0]!.reference,ref);
 assert.equal(calendar['2026-04-04']!.noDaytimeMass,true);assert.equal(calendar['2027-03-27']!.noDaytimeMass,true);
 assert.equal(calendar['2026-12-25']!.readings.length,4);assert.equal(calendar['2027-12-25']!.readings.length,4);
 assert.equal(calendar['2026-03-29']!.readings[0]!.reference,'Mt 26,14-27,66');
 assert.deepEqual(calendar['2027-10-10']!.readings.map(r=>r.reference),['Mc 10,17-30','Mc 10,17-27']);
});
