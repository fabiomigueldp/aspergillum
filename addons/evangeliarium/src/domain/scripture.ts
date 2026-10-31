export interface Book { id: string; name: string; chapters: string[][] }
export interface Corpus { edition: string; name: string; books: Book[] }
export interface Range { from: [number, number]; to: [number, number] }
export interface Passage { book: string; ranges: Range[]; reference: string; expanded: boolean }
export interface Verse { chapter: number; verse: number; text: string }
const aliases: Record<string, string> = {mt:'MAT',mateus:'MAT',mat:'MAT',mc:'MAR',marcos:'MAR',mar:'MAR',lc:'LUK',lucas:'LUK',luk:'LUK',jo:'JOH',joao:'JOH',joh:'JOH'};
const short: Record<string,string> = {MAT:'Mt', MAR:'Mc', LUK:'Lc', JOH:'Jo'};
export class ReadingError extends Error {}
const fail = (): never => { throw new ReadingError('Confira a referência. Ex.: Jo 3,16-21.'); };
const key = (p:[number,number]) => p[0]*1000+p[1];
export function parsePassage(input: string, corpus: Corpus, allowParts = false): Passage {
  if(input.length>180) return fail();
  const clean=input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/[–—−]/g,'-');
  const match=/^([a-zA-Z]+)\s*(.+)$/.exec(clean);
  if(!match) return fail();
  const id=aliases[match[1]!.toLowerCase()];
  const book=corpus.books.find(b=>b.id===id); if(!book)return fail();
  let spec=match[2]!.replace(/\s+/g,'');
  const expanded=/[a-d]/i.test(spec);
  if(expanded&&!allowParts) throw new ReadingError('Use versículos completos, sem a, b ou c.');
  if(allowParts)spec=spec.replace(/[a-d]/gi,'');
  const ranges:Range[]=[];
  let chapter=0;
  const valid=(p:[number,number])=>Number.isInteger(p[0])&&Number.isInteger(p[1])&&p[0]>=1&&p[1]>=1&&!!book.chapters[p[0]-1]?.[p[1]-1];
  if(/^\d+$/.test(spec)){
    chapter=Number(spec); const verses=book.chapters[chapter-1]; if(!verses) return fail();
    ranges.push({from:[chapter,1],to:[chapter,verses.length]});
  }else{
    for(const segment of spec.split(/[.;+]/)){
      const m=/^(?:(\d+)[,:])?(\d+)(?:-(?:(\d+)[,:])?(\d+))?$/.exec(segment); if(!m)return fail();
      if(m[1])chapter=Number(m[1]); if(chapter===0)return fail();
      const from:[number,number]=[chapter,Number(m[2])];
      const to:[number,number]=[m[3]?Number(m[3]):chapter,m[4]?Number(m[4]):from[1]];
      if(!valid(from)||!valid(to)||key(to)<key(from))return fail();
      if(ranges.length&&key(from)<=key(ranges[ranges.length-1]!.to))return fail();
      ranges.push({from,to}); chapter=to[0];
    }
  }
  const reference=short[book.id]+' '+ranges.map((r,i)=>{
    const start=(i===0||ranges[i-1]!.to[0]!==r.from[0]?r.from[0]+',':'')+r.from[1];
    return start+(key(r.from)===key(r.to)?'':'-'+(r.to[0]===r.from[0]?'':r.to[0]+',')+r.to[1]);
  }).join('.');
  return {book:book.id,ranges,reference,expanded};
}
export function passageVerses(p:Passage,corpus:Corpus):Verse[]{
  const b=corpus.books.find(x=>x.id===p.book); if(!b) return fail();
  const out:Verse[]=[];
  for(const range of p.ranges)for(let c=range.from[0];c<=range.to[0];c++){
    const chapter=b.chapters[c-1]; if(!chapter)return fail();
    const first=c===range.from[0]?range.from[1]:1, last=c===range.to[0]?range.to[1]:chapter.length;
    for(let v=first;v<=last;v++){const text=chapter[v-1];if(!text)return fail();out.push({chapter:c,verse:v,text});}
  }
  return out;
}
export function paginate(verses:Verse[],limit=600):Verse[][]{
  const pages:Verse[][]=[];let page:Verse[]=[],length=0;
  for(const verse of verses){
    if(page.length&&length+verse.text.length+2>limit){pages.push(page);page=[];length=0;}
    // A verse is indivisible. The validated corpus's longest verse is 277 characters.
    page.push(verse);length+=verse.text.length+2;
  }
  if(page.length)pages.push(page);return pages;
}
export function pageText(page:Verse[]):string{return page.map(v=>v.text).join('\n\n');}
