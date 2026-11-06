import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../assets-src/lectionary/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root),'utf8'));
const provenance=JSON.parse(fs.readFileSync(new URL('provenance.json',root),'utf8'));

test('lectionary has complete key coverage and stable shared IDs without guessed dates',()=>{
 assert.equal(catalog.book.sections.length,766);assert.equal(catalog.gospel.sections.length,766);
 assert.deepEqual(catalog.book.sections.map((s:any)=>s.id),catalog.gospel.sections.map((s:any)=>s.id));
 assert.equal(new Set(catalog.book.sections.map((s:any)=>s.id)).size,766);assert.deepEqual(catalog.days,{});
 assert.equal(catalog.book.sections.filter((s:any)=>s.warnings?.length).length,8);
});
test('every imported reading is reproduced exactly; gospel contains only gospels and their alternatives',()=>{
 for(let i=0;i<catalog.book.sections.length;i++){
  const full=catalog.book.sections[i],gospel=catalog.gospel.sections[i],source=provenance.entries[full.id].sections;
  assert.deepEqual(full.blocks.filter((b:any)=>b.kind==='text').map((b:any)=>b.text),source.filter((s:any)=>s.texto).map((s:any)=>s.texto));
  assert.deepEqual(gospel.blocks.filter((b:any)=>b.kind==='text').map((b:any)=>b.text),source.filter((s:any)=>s.tipo==='evangelho'||s.tipo==='alternativa'&&s.relativa_a==='evangelho').filter((s:any)=>s.texto).map((s:any)=>s.texto));
 }
});
test('Christmas Eve combines morning and nighttime forms, retaining distinct Mass labels',()=>{
 for(const key of ['advento/4/0/A/vespera','advento/4/0/C/vespera']){
  const id=Object.keys(provenance.entries).find(id=>provenance.entries[id].key===key);
  const section=catalog.book.sections.find((s:any)=>s.id===id);
  for(const title of ['Missa da manhã','Missa da Vigília'])assert.ok(section.blocks.some((b:any)=>b.text===title));
 }
});
test('all cycle and seasonal groups have readable labels',()=>{
 assert.ok(catalog.book.sections.some((s:any)=>s.title.includes('1º Domingo do Advento · Ano A')));
 assert.ok(catalog.book.sections.some((s:any)=>s.title.includes('1º Domingo da Quaresma · Ano C')));
 for(const s of catalog.book.sections){assert.ok(s.groups.length);assert.ok(!s.title.includes('CNBB'));}
});

test('compiled gospel shares blocks without changing the literal catalog',async()=>{
 const {lectionary}=await import('../src/generated/lectionary.ts');assert.deepEqual(lectionary,catalog);
 for(let i=0;i<lectionary.book.sections.length;i++)for(const block of lectionary.gospel.sections[i]!.blocks)assert.ok(lectionary.book.sections[i]!.blocks.includes(block));
});
