/** Own-code coverage audit. Reads imported JSON metadata; never opens or executes ZIP code.
 * Run: node --experimental-strip-types tools/audit-calendar-coverage.ts
 * Optional: --decade limits the scan to the independently reviewed 2026–2035 interval.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dailyCalendar} from '../src/domain/daily-calendar.ts';
const decadeOnly=process.argv.includes('--decade');
const firstYear=decadeOnly?2026:1583,lastYear=decadeOnly?2035:9999;
const provenance=JSON.parse(readFileSync(new URL('../assets-src/lectionary/provenance.json',import.meta.url),'utf8'));
const available=new Set(Object.values(provenance.entries).map((entry:any)=>entry.key));
const missingExamples:{date:string;key:string}[]=[];
let scannedDates=0,auditedIntervalDates=0,projectedDates=0,missingKeys=0,invalidProjectionFlags=0,choiceDates=0;
const start=Date.now();
for(let timestamp=Date.UTC(firstYear,0,1);timestamp<Date.UTC(lastYear+1,0,1);timestamp+=86400000){
 const date=new Date(timestamp).toISOString().slice(0,10),result=dailyCalendar(date),inAudited=date>='2026-01-01'&&date<='2035-12-31';
 scannedDates++;if(inAudited)auditedIntervalDates++;else projectedDates++;
 if(result.requiresChoice)choiceDates++;
 if((result.projected===true)===inAudited)invalidProjectionFlags++;
 for(const key of [...result.keys,...(result.vigilKeys??[])])if(!available.has(key)){
  missingKeys++;if(missingExamples.length<50)missingExamples.push({date,key});
 }
}
const report={
 schemaVersion:1,createdAt:new Date().toISOString(),range:{from:`${firstYear}-01-01`,through:`${lastYear}-12-31`},
 auditedInterval:{from:'2026-01-01',through:'2035-12-31',expectedDates:3652},
 fullSupportedInterval:{from:'1583-01-01',through:'9999-12-31',expectedDates:3074246},
 scannedDates,auditedIntervalDates,projectedDates,choiceDates,
 missingCounts:{keys:missingKeys,projectionFlags:invalidProjectionFlags},missingExamples,
 elapsedMs:Date.now()-start,
 scope:'Tests date coverage, source-key existence and projection labels. It does not certify every liturgical decision, historical practice, future decrees, local calendars, content rights or in-game behavior.',
 archiveExecution:false,passed:missingKeys===0&&invalidProjectionFlags===0&&auditedIntervalDates===3652
};
const output=new URL(`../out/calendar-coverage-${decadeOnly?'2026-2035':'1583-9999'}.json`,import.meta.url);
mkdirSync(new URL('../out/',import.meta.url),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
