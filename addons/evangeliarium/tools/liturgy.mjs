import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {liturgyNavigation} from './liturgy-navigation.mjs';
import {liturgyLabels} from './liturgy-labels.mjs';
import {liturgyPages} from '../src/domain/liturgy.ts';
// Reviewed additions remain separate from the immutable 2026-11-04 blog snapshot.
const supplementFiles=['assets-src/liturgy/supplements/santa-teresinha.json'];
export function loadLiturgyCatalog(root){
 const raw=fs.readFileSync(path.join(root,'assets-src/liturgy/catalog.json'),'utf8'),catalog=JSON.parse(raw),supplements=[];
 for(const file of supplementFiles){
  const bytes=fs.readFileSync(path.join(root,file),'utf8'),entry=JSON.parse(bytes);
  assert.equal(entry.schemaVersion,1);assert.equal(entry.book,'missal');
  assert.equal(entry.review?.status,'visually-collated-and-br-parish-corroborated');
  assert.equal(entry.section?.sourceId,entry.source?.id);
  assert.ok(!catalog.sources.some(source=>source.id===entry.source.id),'Supplement source already present');
  assert.ok(!catalog.books.missal.sections.some(section=>section.id===entry.section.id),'Supplement section already present');
  catalog.sources.push(entry.source);catalog.books.missal.sections.push(entry.section);
  supplements.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sections:1});
 }
 return{catalog,raw,supplements};
}
export function compileLiturgy(root,write){
 const {catalog,raw,supplements}=loadLiturgyCatalog(root);
 assert.ok(Array.isArray(catalog.sources)&&catalog.sources.length,'Liturgical sources required');
 const sources=new Set(catalog.sources.map(s=>s.id));assert.equal(sources.size,catalog.sources.length,'Duplicate liturgical source');
 for(const source of catalog.sources){assert.ok(source.title&&source.url&&source.license,'Source attribution required');assert.ok(/^https:\/\//.test(source.url),'HTTPS source required');}
 const counts={};
 for(const id of ['missal','pontifical']){
  const book=catalog.books[id];assert.ok(book?.title&&book.sections?.length,`${id}: empty book`);const ids=new Set();let pages=0,characters=0;
  for(const section of book.sections){
   assert.match(section.id,/^[-a-z0-9_]{1,160}$/);assert.ok(!ids.has(section.id),`${id}: duplicate section ${section.id}`);ids.add(section.id);
   assert.ok(section.title&&sources.has(section.sourceId),`${id}/${section.id}: source missing`);
   assert.ok(section.blocks?.length,`${id}/${section.id}: empty section`);
   for(const block of section.blocks){
    assert.ok(['rubric','text','heading'].includes(block.kind)&&typeof block.text==='string'&&block.text.trim(),`${id}/${section.id}: invalid block`);
    if(block.runs)assert.equal(block.runs.map(r=>r.text).join(''),block.text,`${id}/${section.id}: run text mismatch`);
    characters+=block.text.length;
   }
   const rendered=liturgyPages(section);assert.ok(rendered.every(p=>p.length<=850));
   const plain=text=>text.replace(/§[0-9a-z]/g,'').replace(/\s/g,'');
   assert.equal(plain(rendered.join('')),plain(section.blocks.map(b=>b.text).join('')),`${id}/${section.id}: pagination changed text`);
   pages+=rendered.length;
  }
  counts[id]={sections:book.sections.length,characters,pages};
 }
 const labels=liturgyLabels(catalog);
 const runtime={books:Object.fromEntries(['missal','pontifical'].map(id=>[id,{title:catalog.books[id].title,sections:catalog.books[id].sections.map(s=>({id:s.id,title:s.title,...(labels.has(s.id)?{displayTitle:labels.get(s.id)}:{}),...(s.group?{group:s.group}:{}),...liturgyNavigation(catalog.books[id],s),sourceId:s.sourceId,...(s.sourceUrl?{sourceUrl:s.sourceUrl}:{}),blocks:s.blocks.map(b=>({kind:b.kind,text:b.text,...(b.runs?{runs:b.runs.map(r=>({text:r.text,...(r.rubric?{rubric:true}:{}),...(r.bold?{bold:true}:{}),...(r.italic?{italic:true}:{})}))}: {})}))}))}])),sources:catalog.sources.map(s=>({id:s.id,title:s.title,...(labels.has(s.id)?{displayTitle:labels.get(s.id)}:{}),url:s.url,license:s.license,...(s.note?{note:s.note}:{})}))};
 write('src/generated/liturgy.ts',`// Generated. Do not edit.\nimport type {LiturgyCatalog} from '../domain/liturgy.ts';\nexport const liturgy:LiturgyCatalog=${JSON.stringify(runtime)};\n`);
 write('out/liturgy-manifest.json',JSON.stringify({sha256:crypto.createHash('sha256').update(raw).digest('hex'),supplements,books:counts,sources:catalog.sources},null,2)+'\n');
 return catalog;
}
