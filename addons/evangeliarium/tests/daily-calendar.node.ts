import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyCalendar,easterDay} from '../src/domain/daily-calendar.ts';
const key=(date:string)=>dailyCalendar(date).keys[0];
test('daily calendar is bounded and resolves every 2026–2035 date to an existing source key',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../assets-src/lectionary/provenance.json',import.meta.url),'utf8'));
 const keys=new Set(Object.values(provenance.entries).map((entry:any)=>entry.key));
 for(let i=0;i<3652;i++){
  const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),result=dailyCalendar(date);
  assert.equal(result.date,date);
  for(const selected of [...result.keys,...(result.vigilKeys??[])])assert.ok(keys.has(selected),`${date}: ${selected}`);
 }
 for(const date of ['1582-12-31','0000-01-01'])assert.throws(()=>dailyCalendar(date),/1583 a 9999/);
 assert.throws(()=>dailyCalendar('2026-02-29'),/Confira a data/);
 assert.equal(key('05/11/2026'),'comum/31/4/II');
});
test('Sunday and weekday cycles are correct at Advent and civil-year boundaries',()=>{
 assert.equal(dailyCalendar('2026-11-28').cycle,'A');
 assert.equal(key('2026-11-29'),'advento/1/0/B');
 assert.equal(dailyCalendar('2026-11-30').weekdayCycle,'II');
 assert.equal(key('2027-01-12'),'comum/1/2/I');
 assert.equal(key('2027-11-28'),'advento/1/0/C');
 assert.equal(key('2026-08-03'),'comum/18/1/II/apos-multiplicacao');
 assert.equal(key('2026-08-04'),'comum/18/2/II/apos-multiplicacao');
 assert.equal(key('2027-08-02'),'comum/18/1/I/habitual');
});
test('Gregorian Easter and Brazilian celebrations preserve precedence',()=>{
 assert.equal(new Date(easterDay(2026)*86400000).toISOString().slice(0,10),'2026-04-05');
 assert.equal(new Date(easterDay(2027)*86400000).toISOString().slice(0,10),'2027-03-28');
 for(const [date,expected]of [
  ['2026-01-04','epifania'],['2026-01-11','batismo/A'],['2027-01-10','batismo/B'],
  ['2026-04-04','vigilia/A'],['2027-03-27','vigilia/B'],['2026-04-05','pascoa'],
  ['2026-05-17','ascensao/A'],['2026-05-24','pentecostes/A'],['2026-05-25','mae'],
  ['2026-06-04','corpus/A'],['2026-06-12','coracao/A'],['2026-06-28','pedro'],['2027-07-04','pedro'],
  ['2026-08-16','assuncao'],['2027-08-15','assuncao'],['2026-10-12','proprio/10-12'],
  ['2026-11-01','todos'],['2027-11-07','todos'],['2026-11-02','proprio/11-02'],
  ['2026-12-08','proprio/12-08'],['2026-12-25','proprio/12-25'],['2026-12-27','familia/B'],
  ['2026-03-23','quaresma/5/1/AB'],['2027-12-21','dez/21'],['2027-03-25','santa/4'],['2027-04-05','proprio/03-25']
 ])assert.equal(key(date!),expected,date);
 assert.equal(dailyCalendar('2026-04-04').noDaytimeMass,true);
 assert.ok(dailyCalendar('2027-04-05').warnings.some(w=>w.includes('transferida')));
});
test('ambiguous rites and coincident optional memorials remain explicit',()=>{
 assert.deepEqual(dailyCalendar('2026-06-13').keys,['imaculado','comum/10/6/II']);
 assert.ok(dailyCalendar('2026-06-13').warnings.some(w=>w.includes('Santo Antônio')));
 for(const date of ['2026-12-24','2026-12-25','2027-12-24','2027-12-25'])assert.ok(dailyCalendar(date).warnings.some(w=>w.includes('formulário')));
 assert.ok(dailyCalendar('2027-02-28').warnings.some(w=>w.includes('escrutínios')));
});

test('proper vigils are separate evening choices, never silently substituted for the civil day',()=>{
 for(const [date,vigil] of [['2026-05-23','pentecostes/A'],['2027-05-15','pentecostes/B'],['2026-06-27','pedro'],['2027-07-03','pedro'],['2026-08-15','assuncao'],['2027-08-14','assuncao'],['2026-06-23','proprio/06-24'],['2027-06-23','proprio/06-24']]){
  const result=dailyCalendar(date!);assert.deepEqual(result.vigilKeys,[vigil]);assert.notEqual(result.keys[0],vigil);
 }
 assert.equal(dailyCalendar('2026-11-07').vigilKeys,undefined);
});

test('all decade Easter dates and Advent cycle changes agree with independent published tables',()=>{
 const fixtures=[
  [2026,'04-05','11-29','A','B'],[2027,'03-28','11-28','B','C'],[2028,'04-16','12-03','C','A'],
  [2029,'04-01','12-02','A','B'],[2030,'04-21','12-01','B','C'],[2031,'04-13','11-30','C','A'],
  [2032,'03-28','11-28','A','B'],[2033,'04-17','11-27','B','C'],[2034,'04-09','12-03','C','A'],[2035,'03-25','12-02','A','B']
 ];
 for(const [year,easter,advent,before,after] of fixtures){
  assert.equal(new Date(easterDay(Number(year))*86400000).toISOString().slice(5,10),easter);
  assert.equal(key(`${year}-${easter}`),'pascoa');
  const a=`${year}-${advent}`,previous=new Date(Date.parse(a+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  assert.equal(dailyCalendar(previous).cycle,before);assert.equal(dailyCalendar(a).cycle,after);
  assert.equal(key(a),`advento/1/0/${after}`);
 }
});
test('Epiphany on 7/8 January moves Baptism to Monday; Christmas Sunday moves Holy Family to Friday',()=>{
 for(const [date,expected] of [['2029-01-07','epifania'],['2029-01-08','batismo/A'],['2029-01-09','comum/1/2/I'],['2034-01-08','epifania'],['2034-01-09','batismo/C'],['2035-01-07','epifania'],['2035-01-08','batismo/A'],['2033-12-25','proprio/12-25'],['2033-12-30','familia/C'],['2034-12-24','advento/4/0/A/vespera']])assert.equal(key(date!),expected,date);
});
test('Brazilian transfers and disputed projection preserve warnings and choices',()=>{
 for(const date of ['2028-03-18','2034-03-18'])assert.equal(key(date),'proprio/03-19');
 for(const date of ['2028-03-19','2034-03-19'])assert.notEqual(key(date),'proprio/03-19');
 for(const date of ['2029-04-09','2032-04-05','2035-04-02'])assert.equal(key(date),'proprio/03-25');
 assert.equal(key('2029-03-25'),'ramos/A');assert.equal(key('2035-03-25'),'pascoa');
 const uncertain=dailyCalendar('2035-03-17');assert.equal(uncertain.requiresChoice,true);assert.deepEqual(uncertain.keys,['proprio/03-19','quaresma/5/6']);assert.ok(uncertain.warnings.some(w=>w.includes('projeção')));
 assert.equal(key('2035-03-19'),'santa/1');
 assert.equal(key('2033-06-23'),'proprio/06-24');assert.equal(key('2033-06-24'),'coracao/B');
 assert.deepEqual(dailyCalendar('2033-06-22').vigilKeys,['proprio/06-24']);assert.equal(dailyCalendar('2033-06-23').vigilKeys,undefined);
 assert.ok(dailyCalendar('2033-06-24').warnings.some(w=>w.includes('padroeiro')));
 assert.equal(key('2031-11-01'),'todos');assert.equal(key('2031-11-02'),'proprio/11-02');
 assert.equal(key('2035-05-14'),'proprio/05-14');
});
test('competing memorials never displace feasts; optional commemorations preserve ferial readings',()=>{
 assert.equal(key('2028-06-24'),'proprio/06-24');assert.equal(dailyCalendar('2028-06-24').keys.length,1);
 for(const date of ['2029-06-09','2031-06-21','2032-06-05']){
  const result=dailyCalendar(date);assert.equal(result.keys[0],'imaculado');assert.ok(result.keys.length>1);assert.ok(result.warnings.some(w=>w.includes('facultativas coincidentes')));
 }
 assert.ok(dailyCalendar('2026-05-13').warnings.some(w=>w.includes('Fátima')));
 assert.ok(dailyCalendar('2026-03-17').warnings.some(w=>w.includes('Comemoração facultativa')));
 assert.ok(!dailyCalendar('2035-03-17').warnings.some(w=>w.includes('São Patrício')));
 assert.ok(!dailyCalendar('2026-05-17').warnings.some(w=>w.includes('facultativa')));
});

test('dates outside the audited decade are explicitly current-rule projections, never historical claims',()=>{
 for(const date of ['1583-01-01','1700-03-01','1800-03-01','1900-03-01','2000-02-29','2025-12-31','2036-01-01','2100-03-01','2400-02-29','9999-12-31']){
  const result=dailyCalendar(date);assert.equal(result.projected,true);assert.ok(result.warnings.some(w=>w.includes('não uma reconstrução histórica')));
 }
 for(const date of ['2026-01-01','2035-12-31'])assert.equal(dailyCalendar(date).projected,undefined);
 for(const date of ['1700-02-29','1800-02-29','1900-02-29','2100-02-29'])assert.throws(()=>dailyCalendar(date),/Confira a data/);
});
test('Corpus Christi and John the Baptist collision never invents a definitive transfer',()=>{
 for(const date of ['2038-06-23','2038-06-25']){
  const result=dailyCalendar(date);assert.equal(result.projected,true);assert.equal(result.requiresChoice,true);
  assert.ok(result.keys.includes('proprio/06-24'));assert.ok(result.keys.some(k=>k.startsWith('comum/')));
  assert.ok(result.warnings.some(w=>w.includes('23 ou 25')));assert.equal(result.vigilKeys,undefined);
 }
 assert.equal(key('2038-06-24'),'corpus/A');
 assert.equal(dailyCalendar('2038-06-24').requiresChoice,undefined);
 assert.equal(dailyCalendar('2038-06-22').vigilKeys,undefined);
});
test('every supported year resolves seasonal and century boundary samples to source keys',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../assets-src/lectionary/provenance.json',import.meta.url),'utf8'));
 const keys=new Set(Object.values(provenance.entries).map((entry:any)=>entry.key));
 for(let year=1583;year<=9999;year++){
  const dates=[`${year}-01-01`,`${year}-01-08`,`${year}-03-19`,`${year}-03-25`,`${year}-06-24`,`${year}-11-02`,`${year}-12-24`,`${year}-12-25`,`${year}-12-31`];
  for(const offset of [-46,-8,-1,0,49,50,60,68])dates.push(new Date((easterDay(year)+offset)*86400000).toISOString().slice(0,10));
  for(const date of dates){const result=dailyCalendar(date);for(const k of [...result.keys,...(result.vigilKeys??[])])assert.ok(keys.has(k),`${date}: ${k}`);}
 }
});

test('full Gregorian projection sweep resolves all 3,074,246 civil dates', {skip:process.env.FULL_CALENDAR_SWEEP!=='1'},()=>{
 const provenance=JSON.parse(readFileSync(new URL('../assets-src/lectionary/provenance.json',import.meta.url),'utf8'));
 const keys=new Set(Object.values(provenance.entries).map((entry:any)=>entry.key));let checked=0;
 for(let timestamp=Date.UTC(1583,0,1);timestamp<Date.UTC(10000,0,1);timestamp+=86400000){
  const date=new Date(timestamp).toISOString().slice(0,10),result=dailyCalendar(date);checked++;
  assert.equal(result.date,date);
  for(const k of [...result.keys,...(result.vigilKeys??[])])assert.ok(keys.has(k),`${date}: ${k}`);
  assert.equal(result.projected===true,date<'2026-01-01'||date>'2035-12-31');
 }
 assert.equal(checked,3074246);
});
