import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { parsePassage, passageVerses } from '../src/domain/scripture.ts';
export function compileContent(root,write){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'prototype/data.js'),'utf8'),ctx);
 const corpus=JSON.parse(JSON.stringify(ctx.EVANGELIUM_DATA));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'prototype/source/manifest.json'),'utf8'));
 if(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'prototype/data.js'))).digest('hex')!==manifest.dataSha256)throw Error('Corpus hash mismatch');
 const calendar={};
 const sources=[];
 for(const file of fs.readdirSync(path.join(root,'assets-src/calendar')).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()){
  const raw=JSON.parse(fs.readFileSync(path.join(root,'assets-src/calendar',file),'utf8'));
  const readings=[];
  // These snapshots aggregate other liturgical years after the correct first reference.
  const yearMixed=['2027-08-06','2027-10-10','2027-10-17'].includes(raw.date);
  for(const input of (yearMixed?raw.references.slice(0,1):raw.references)){
   const note=input.match(/\(([^)]+)\)/)?.[1]??'';
   const pieces=input.replace(/\s+/g,' ').replace(/\([^)]*\)/g,'').split(/\s+ou\s+(?:mais breve\s+)?/i);
   let prefix='';
   for(const [i,piece] of pieces.entries()){
    // Source typographic artifact on 2026-10-31, retained in the source snapshot.
    let reference=piece.trim().replace(/¬+$/,'');
    if(i===0)prefix=/^([A-Za-z]+)\s*(\d+)[,:]/.exec(reference)?.slice(1).join(' ')??'';
    else if(!/^[a-z]/i.test(reference)){
      const [book,chapter]=prefix.split(' ');reference=book+' '+(/^\d+\s*[, :]/.test(reference)?reference:chapter+','+reference);
    }
    let p;try{p=parsePassage(reference,corpus,true);passageVerses(p,corpus);}catch(e){throw Error(`${raw.date}: ${reference}: ${e.message}`);}
    let label=i>0||/breve/i.test(note)&&!note.includes('colchetes')?'Forma breve':/longo/i.test(note)?'Forma longa':/Entrada/i.test(note)?'Entrada em Jerusalém':/Paixão/i.test(note)?'Paixão do Senhor':'Evangelho';
    if(!readings.some(r=>r.reference===p.reference))readings.push({label,reference:p.reference,sourceReference:reference,expanded:p.expanded});
   }
  }
  // Palm Sunday opens at the Passion; the entrance Gospel remains an explicit option.
  readings.sort((a,b)=>Number(a.label==='Entrada em Jerusalém')-Number(b.label==='Entrada em Jerusalém'));
  const day={date:raw.date,celebration:raw.celebration,readings};
  if(/Sábado Santo/i.test(raw.celebration)){day.noDaytimeMass=true;readings.forEach(r=>r.label='Vigília Pascal');}
  if(/Páscoa na Ressurreição/.test(raw.celebration)&&readings.length>1){readings[0].label='Missa do dia';readings[1].label='Missa vespertina';}
  calendar[day.date]=day;sources.push({date:day.date,source:raw.source,responseSha256:raw.responseSha256??null});
 }
 const christmas=[['Missa do dia','Jo 1,1-18'],['Vigília','Mt 1,1-25'],['Missa da noite','Lc 2,1-14'],['Aurora','Lc 2,15-20']].map(([label,reference])=>({label,reference,sourceReference:reference,expanded:false}));
 for(const year of [2026,2027]){
  calendar[`${year}-12-25`].readings=christmas;
  calendar[`${year}-12-24`].readings.push(christmas[1],christmas[2]);
 }
 if(Object.keys(calendar).length!==730)throw Error('Expected 730 complete calendar dates');
 for(let i=0;i<730;i++){const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);if(!calendar[date])throw Error('Calendar gap '+date);}
 write('src/generated/content.ts',`// Generated. Do not edit.\nimport type {Corpus} from '../domain/scripture.ts';\nimport type {Calendar} from '../domain/calendar.ts';\nexport const corpus:Corpus=${JSON.stringify(corpus)};\nexport const calendar:Calendar=${JSON.stringify(calendar)};\n`);
 write('out/content-manifest.json',JSON.stringify({edition:manifest,dates:730,readings:Object.values(calendar).reduce((n,d)=>n+d.readings.length,0),expandedWholeVerseReadings:Object.values(calendar).flatMap(d=>d.readings).filter(r=>r.expanded).length,sources,christmasSource:'https://www.ppoomm.va/en/notizie-eventi/notizie/2021/nativity-2021.html'},null,2)+'\n');
 return {corpus,calendar};
}
