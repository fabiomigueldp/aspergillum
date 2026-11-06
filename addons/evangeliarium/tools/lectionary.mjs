import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {liturgyPages} from '../src/domain/liturgy.ts';

/** Data-only compilation: source.zip is never imported or executed. */
export function compileLectionary(root,write){
 const raw=fs.readFileSync(path.join(root,'assets-src/lectionary/catalog.json'),'utf8');
 const catalog=JSON.parse(raw),counts={};
 for(const name of ['book','gospel']){
  const book=catalog[name];assert.ok(book.title&&book.sections.length,'Empty lectionary');
  const ids=new Set();let characters=0,pages=0;
  for(const section of book.sections){
   assert.match(section.id,/^[-a-z0-9_]{1,160}$/);assert.ok(!ids.has(section.id),'Duplicate ID');ids.add(section.id);
   assert.ok(section.title&&section.group&&section.blocks.length,'Invalid section');
   for(const block of section.blocks){assert.ok(['heading','text','rubric'].includes(block.kind)&&typeof block.text==='string'&&block.text.trim(),'Invalid block');characters+=block.text.length;}
   const rendered=liturgyPages(section);assert.ok(rendered.every(p=>p.length<=850),'Oversize page');
   const plain=s=>s.replace(/§[0-9a-z]/g,'').replace(/\s/g,'');
   assert.equal(plain(rendered.join('')),plain(section.blocks.map(b=>b.text).join('')),'Text changed by pagination');
   pages+=rendered.length;
  }
  counts[name]={sections:book.sections.length,pages,characters};
 }
 assert.deepEqual(catalog.book.sections.map(s=>s.id),catalog.gospel.sections.map(s=>s.id),'Books must share stable IDs');
 assert.deepEqual(catalog.days,{},'Date mappings need independent verification');
 const provenance=JSON.parse(fs.readFileSync(path.join(root,'assets-src/lectionary/provenance.json'),'utf8'));
 const keyToSection=Object.fromEntries(Object.entries(provenance.entries).map(([id,entry])=>[entry.key,id]));
 assert.equal(Object.keys(keyToSection).length,catalog.book.sections.length);
 const gospelSections=catalog.gospel.sections.map((section,i)=>{
  const {blocks,...metadata}=section,full=catalog.book.sections[i];
  const positions=blocks.map(block=>{const index=full.blocks.findIndex(candidate=>JSON.stringify(candidate)===JSON.stringify(block));assert.ok(index>=0,'Gospel block missing from full lectionary');return index;});
  return {...metadata,blockIndices:positions};
 });
 write('src/generated/lectionary.ts',`// Generated. Do not edit. Gospel blocks share the complete lectionary objects.\nimport type {LectionaryCatalog} from '../domain/lectionary.ts';\nimport type {LiturgicalBook} from '../domain/liturgy.ts';\nconst book:LiturgicalBook=${JSON.stringify(catalog.book)};\nconst gospelSections=${JSON.stringify(gospelSections)};\nexport const lectionaryKeyToSection:Record<string,string>=${JSON.stringify(keyToSection)};\nexport const lectionary:LectionaryCatalog={book,gospel:{title:${JSON.stringify(catalog.gospel.title)},sections:gospelSections.map(({blockIndices,...section},i)=>({...section,blocks:blockIndices.map(index=>book.sections[i]!.blocks[index]!)}))},days:{}};\n`);
 write('out/lectionary-manifest.json',JSON.stringify({sha256:crypto.createHash('sha256').update(raw).digest('hex'),books:counts,dateMapping:'none'},null,2)+'\n');
 return catalog;
}
