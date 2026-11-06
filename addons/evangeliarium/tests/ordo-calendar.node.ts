import test from 'node:test';
import assert from 'node:assert/strict';
import {dateChoices,ordoMissalSections,massHeadings} from '../src/domain/ordo-calendar.ts';
import {lectionary,lectionaryKeyToSection} from '../src/generated/lectionary.ts';
import {liturgy} from '../src/generated/liturgy.ts';
const choices=(date:string)=>dateChoices(date,lectionary.book.sections,lectionaryKeyToSection);
test('Christmas day and eve preserve explicit aurora, daytime, vigil and night choices',()=>{
 assert.deepEqual(choices('2026-12-25').map(c=>c.selection.mass),['Missa da aurora','Missa do dia']);
 assert.deepEqual(choices('2026-12-24').map(c=>c.selection.mass),['Missa da manhã','Missa da Vigília','Missa da Noite']);
 for(const c of choices('2026-12-24')){const sections=ordoMissalSections(c.selection,liturgy.books.missal.sections);assert.equal(sections.length,c.selection.mass==='Missa da manhã'?0:1);}
});
test('the eve of Pentecost offers only the vigil from the next celebration, never its daytime Mass',()=>{
 const cs=choices('2027-05-15'),pentecost=cs.filter(c=>c.selection.key.startsWith('pentecostes/'));assert.equal(pentecost.length,1);assert.equal(pentecost[0]!.selection.mass,'Missa da Vigília');
 assert.ok(cs.some(c=>!c.selection.key.startsWith('pentecostes/')));
});
test('Epiphany and Ascension never silently choose among their proper Missal Masses',()=>{
 for(const date of ['2027-01-03','2027-05-09']){const cs=choices(date);assert.equal(cs.length,2);for(const c of cs)assert.equal(ordoMissalSections(c.selection,liturgy.books.missal.sections).length,1);}
});
test('every offered 2026/2027 date choice resolves real lectionary sections and exact structural headings',()=>{
 for(let t=Date.parse('2026-01-01T12:00Z');t<Date.parse('2028-01-01T12:00Z');t+=86_400_000){for(const c of choices(new Date(t).toISOString().slice(0,10))){const s=lectionary.book.sections.find(s=>s.id===lectionaryKeyToSection[c.selection.key]);assert.ok(s);if(c.selection.mass&&c.selection.key!=='epifania'&&!c.selection.key.startsWith('ascensao/'))assert.ok(massHeadings(s).includes(c.selection.mass));}}
});
