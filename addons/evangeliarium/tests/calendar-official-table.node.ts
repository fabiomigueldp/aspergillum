import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyCalendar} from '../src/domain/daily-calendar.ts';
/** Literal transcription of the Catholic Bishops' Conference of England and Wales table.
 * https://www.liturgyoffice.org.uk/Calendar/Info/2040.pdf (2026–2035 rows).
 * Sunday Ascension matches Brazil. English Sunday Corpus Christi deliberately excluded.
 */
const official=[
 [2026,'A','II','02-18','04-05','05-17','05-24','11-29'],
 [2027,'B','I','02-10','03-28','05-09','05-16','11-28'],
 [2028,'C','II','03-01','04-16','05-28','06-04','12-03'],
 [2029,'A','I','02-14','04-01','05-13','05-20','12-02'],
 [2030,'B','II','03-06','04-21','06-02','06-09','12-01'],
 [2031,'C','I','02-26','04-13','05-25','06-01','11-30'],
 [2032,'A','II','02-11','03-28','05-09','05-16','11-28'],
 [2033,'B','I','03-02','04-17','05-29','06-05','11-27'],
 [2034,'C','II','02-22','04-09','05-21','05-28','12-03'],
 [2035,'A','I','02-07','03-25','05-06','05-13','12-02'],
] as const;
test('entire decade agrees with independent official movable-feasts and cycles table',()=>{
 for(const [year,cycle,ferial,ashes,easter,ascension,pentecost,advent] of official){
  for(const [date,key] of [[ashes,'cinzas'],[easter,'pascoa'],[ascension,`ascensao/${cycle}`],[pentecost,`pentecostes/${cycle}`]]){
   const result=dailyCalendar(`${year}-${date}`);assert.equal(result.keys[0],key,`${year}-${date}`);assert.equal(result.cycle,cycle);assert.equal(result.weekdayCycle,ferial);
  }
  const next=cycle==='A'?'B':cycle==='B'?'C':'A';assert.equal(dailyCalendar(`${year}-${advent}`).keys[0],`advento/1/0/${next}`);
 }
});
