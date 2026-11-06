import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {loadLiturgyCatalog,compileLiturgy} from '../tools/liturgy.mjs';
import {liturgyPages,liturgyContents,searchSections} from '../src/domain/liturgy.ts';
import {missalDailySections} from '../src/domain/daily-books.ts';
const root=path.resolve(import.meta.dirname,'..');
const read=(file:string)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const supplemental=read('assets-src/liturgy/supplements/santa-teresinha.json');
const id='missal--santa-teresa-do-menino-jesus';
const plain=(text:string)=>text.replace(/§[0-9a-z]/g,'').replace(/\s/g,'');

test('Santa Teresa supplement preserves the complete historical snapshot and its audit hash',()=>{
 const {catalog,raw,supplements}=loadLiturgyCatalog(root),original=JSON.parse(raw);
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),read('assets-src/liturgy/audit-results.json').catalogSha256);
 assert.equal(catalog.books.missal.sections.length,original.books.missal.sections.length+1);
 assert.deepEqual(catalog.books.missal.sections.slice(0,-1),original.books.missal.sections);
 assert.deepEqual(catalog.books.pontifical,original.books.pontifical);
 assert.deepEqual(catalog.sourceNavigation,original.sourceNavigation);
 assert.deepEqual(catalog.sources.slice(0,-1),original.sources);
 assert.equal(supplements.length,1);
 assert.ok(!JSON.stringify(supplemental).includes('drive.google.com'));
 assert.ok(supplemental.review.corroboration.some((source:any)=>source.url===supplemental.source.url));
});

test('Santa Teresa contains five corroborated parts with an explicit accent emendation',()=>{
 const {section,review,selection}=supplemental;
 assert.equal(section.id,id);
 assert.deepEqual(section.blocks.filter((b:any)=>b.kind==='heading').map((b:any)=>b.text),['Santa Teresa do Menino Jesus, virgem e doutora da Igreja','Antífona da entrada','Coleta','Sobre as oferendas','Antífona da comunhão','Depois da comunhão']);
 assert.equal(section.blocks.filter((b:any)=>b.kind==='text').length,5);
 assert.deepEqual(section.blocks.filter((b:any)=>b.kind==='rubric').map((b:any)=>b.text),['1º de outubro · Memória','Cf. Dt 32,10-12','Mt 18,3']);
 const prayers=section.blocks.filter((b:any)=>b.kind==='text').map((b:any)=>b.text);
 assert.match(prayers[0],/Como águia estendeu as suas asas,/);
 assert.match(prayers[1],/^Ó Deus, que preparais o vosso reino\npara os pequenos e humildes,/);
 assert.match(prayers[4],/a se consagrar inteiramente a vós\ne a implorar vossa misericórdia para todos\./);
 assert.equal(review.officialEditorialCopyVerified,false);
 assert.deepEqual(review.emendations.map((e:any)=>[e.sourceReading,e.adoptedReading]),[['O Deus','Ó Deus']]);
 assert.ok(review.corroboration.filter((s:any)=>s.parts.length===5).length>=2);
 assert.deepEqual(selection,{dailyMappingAdded:false,votiveMappingAdded:false,readingKeys:[],gospelKeys:[]});
});

test('Santa Teresa is searchable and paginated without losing source text or attribution',()=>{
 const output=new Map<string,string>();compileLiturgy(root,(file:string,data:string)=>output.set(file,data));
 const runtime=JSON.parse(output.get('src/generated/liturgy.ts')!.split('export const liturgy:LiturgyCatalog=')[1]!.trim().slice(0,-1));
 const section=runtime.books.missal.sections.find((s:any)=>s.id===id);
 assert.ok(section);assert.ok(runtime.sources.some((s:any)=>s.id===section.sourceId));
 const pages=liturgyPages(section);assert.ok(pages.every((p:string)=>p.length<=850));
 assert.equal(plain(pages.join('')),plain(supplemental.section.blocks.map((b:any)=>b.text).join('')));
 assert.equal(liturgyContents(section).length,6);
 assert.ok(searchSections(runtime.books.missal,'teresinha').some(s=>s.id===id));
 assert.ok(output.get('out/liturgy-manifest.json')!.includes('supplements/santa-teresinha.json'));
});

test('Santa Teresa does not create automatic, votive or lectionary selections',()=>{
 const {catalog}=loadLiturgyCatalog(root),sections=catalog.books.missal.sections;
 assert.deepEqual(missalDailySections(['proprio/10-01'],sections),[]);
 const votives=(items:any[])=>items.filter(s=>s.groups?.includes('Missas Votivas')).map(s=>s.id);
 assert.deepEqual(votives(sections),votives(read('assets-src/liturgy/catalog.json').books.missal.sections));
 assert.deepEqual(supplemental.section.links,[]);
 const lectionary=read('assets-src/lectionary/provenance.json');
 assert.equal(Object.keys(lectionary.entries).length,766);
 assert.ok(!Object.values(lectionary.entries).some((e:any)=>e.key==='proprio/10-01'));
});
