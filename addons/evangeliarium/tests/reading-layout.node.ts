import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readingHeading,readingText} from '../src/presentation/reading-layout.ts';
test('referências longas continuam completas sem ocupar o título fixo',()=>{
 assert.deepEqual(readingHeading('João','Jo 3,16-21'),{title:'João 3,16–21',reference:''});
 const reference='Lc 1,1-4.6.8.10.12.14.16.18.20.22.24.26.28';
 assert.deepEqual(readingHeading('Lucas',reference),{title:'Lucas',reference:reference.replaceAll('-','–')});
});
test('continuações minúsculas mantêm palavras; lacunas não se fundem',()=>{
 const verses=[{chapter:22,verse:37,text:'Primeira frase;'},{chapter:22,verse:38,text:'este é o mandamento.'},{chapter:22,verse:40,text:'a conclusão.'}];
 assert.equal(readingText(verses),'Primeira frase; este é o mandamento.\n\na conclusão.');
 assert.equal(readingText(verses).replace(/\s+/g,' '),verses.map(v=>v.text).join(' '));
});
