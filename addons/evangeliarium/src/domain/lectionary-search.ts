import {normalizeSearch,sectionGroups,type LiturgicalBook,type LiturgySection} from './liturgy.ts';
const index=new WeakMap<LiturgySection,string>();
/** Bounded work per tick; cancellation is owned by the reader's session guard. */
export class LectionarySearch {
 private cursor=0;readonly results:LiturgySection[]=[];private words:string[];private book:LiturgicalBook;
 constructor(book:LiturgicalBook,query:string){this.book=book;this.words=normalizeSearch(query).split(/\s+/).filter(Boolean);}
 get done(){return this.cursor>=this.book.sections.length;}
 step(batch=32):boolean{
  if(!Number.isInteger(batch)||batch<1)throw Error('Invalid search batch');
  const end=Math.min(this.cursor+batch,this.book.sections.length);
  for(;this.cursor<end;this.cursor++){
   const section=this.book.sections[this.cursor]!;let text=index.get(section);
   if(text===undefined){text=normalizeSearch(section.title+' '+(section.displayTitle??'')+' '+sectionGroups(section).join(' ')+' '+section.blocks.map(block=>block.text).join(' '));index.set(section,text);}
   if(this.words.every(word=>text.includes(word)))this.results.push(section);
  }
  return this.done;
 }
}
