import {ReadingError} from './scripture.ts';
export interface LiturgyRun {text:string;rubric?:boolean;bold?:boolean;italic?:boolean}
export interface LiturgyBlock {kind:'rubric'|'text'|'heading';text:string;runs?:LiturgyRun[]}
export interface LiturgySection {warnings?:string[];reference?:string;id:string;title:string;displayTitle?:string;group?:string;groups?:string[];links?:{label:string;targetId:string}[];unresolvedLinks?:number;sourceId?:string;sourceUrl?:string;blocks:LiturgyBlock[]}
export interface LiturgicalBook {title:string;sections:LiturgySection[]}
export interface LiturgySource {id:string;title:string;url:string;license:string;note?:string}
export interface LiturgyCatalog {books:{missal:LiturgicalBook;pontifical:LiturgicalBook};sources:LiturgySource[]}
export function sectionTitle(section:LiturgySection):string{return section.displayTitle||section.title;}
export function sectionGroups(section:LiturgySection):string[]{
 const groups=[...new Set((section.groups?.length?section.groups:section.group?[section.group]:[]).filter(group=>group.trim()))];
 return groups.length?groups:['Outras seções'];
}
export function normalizeSearch(value:string):string{return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
const searchIndex=new WeakMap<LiturgicalBook,string[]>();
export function searchSections(book:LiturgicalBook,query:string):LiturgySection[]{
 const words=normalizeSearch(query).split(/\s+/).filter(Boolean);
 if(!words.length)return book.sections;
 let index=searchIndex.get(book);
 if(!index){index=book.sections.map(s=>normalizeSearch(s.title+' '+(s.displayTitle??'')+' '+sectionGroups(s).join(' ')+' '+s.blocks.map(b=>b.text).join(' ')));searchIndex.set(book,index);}
 return book.sections.filter((_,i)=>words.every(word=>index![i]!.includes(word)));
}
const style=(run:LiturgyRun,kind:LiturgyBlock['kind'])=>`${run.rubric||kind==='rubric'?'§4':''}${run.bold||kind==='heading'?'§l':''}${run.italic?'§o':''}`;
/** Split only at whitespace when possible; every original character remains in order. */
export function liturgyPages(section:LiturgySection,limit=850,onBlockStart?:(index:number,page:number)=>void):string[]{
 if(!Number.isInteger(limit)||limit<40)throw new ReadingError('Tamanho de página inválido.');
 const pages:string[]=[];let page='';
 const flush=()=>{if(page){pages.push(page);page='';}};
 for(const [index,block]of section.blocks.entries()){
  let started=false;
  if(section.id.startsWith('lc-')&&block.kind==='heading'&&page){
   // Reserve consecutive headings and the beginning of their text together.
   // Legacy books retain their exact pagination and saved page positions.
   let needed=2,next=index;
   while(section.blocks[next]?.kind==='heading'){
    const heading=section.blocks[next]!;
    needed+=(heading.runs?.length?heading.runs:[{text:heading.text}]).reduce((sum,run)=>{const prefix=style(run,'heading');return sum+run.text.length+prefix.length+(prefix?2:0);},0)+2;
    next++;
   }
   needed+=Math.min(80,section.blocks[next]?.text.length??0);
   if(page.length+needed>limit)flush();
  }
  if(index&&page){if(page.length+2>=limit)flush();else page+='\n\n';}
  for(const run of block.runs?.length?block.runs:[{text:block.text}]){
   let rest=run.text;const prefix=style(run,block.kind),suffix=prefix?'§r':'';
   while(rest.length){
    let room=limit-page.length-prefix.length-suffix.length;
    if(room<16){flush();room=limit-prefix.length-suffix.length;}
    let count=Math.min(room,rest.length);
    if(count<rest.length){const before=rest.slice(0,count),boundary=Math.max(before.lastIndexOf(' '),before.lastIndexOf('\n'));if(boundary>0)count=boundary+1;}
    // A surrogate pair must never be split between pages.
    if(count<rest.length&&/[\uD800-\uDBFF]/.test(rest[count-1]??''))count--;
    if(!started){onBlockStart?.(index,pages.length);started=true;}
    page+=prefix+rest.slice(0,count)+suffix;rest=rest.slice(count);if(rest.length)flush();
   }
  }
 }
 flush();if(!pages.length)throw new ReadingError('Esta seção não contém texto.');return pages;
}

/** Chapter targets use exactly the same pagination pass as the displayed text. */
export function liturgyContents(section:LiturgySection,limit=850):{label:string;page:number}[]{
 const targets:{label:string;page:number}[]=[];
 let context='';
 liturgyPages(section,limit,(index,page)=>{
  const block=section.blocks[index]!;if(block.kind!=='heading')return;
  // Only the new lectionary corpus has these structural headings. Preserve the
  // existing Missal/Pontifical contents, text and persisted page boundaries.
  if(!section.id.startsWith('lc-')){targets.push({label:block.text,page});return;}
  const label=block.text.trim();
  if(/^ou(?:\b|[,:])/i.test(label))return;
  if(/^(?:Missa\b|Procissão de Ramos\b|Vigília Pascal\b|LEITURAS DO (?:ANTIGO|NOVO) TESTAMENTO$)/i.test(label)){
   context=label;return;
  }
  targets.push({label:context?context+' · '+label:label,page});
 });
 if(section.id.startsWith('lc-')){
  const counts=new Map<string,number>(),seen=new Map<string,number>();
  for(const target of targets)counts.set(target.label,(counts.get(target.label)??0)+1);
  for(const target of targets)if(counts.get(target.label)!>1){const occurrence=(seen.get(target.label)??0)+1;seen.set(target.label,occurrence);target.label+=' · '+occurrence;}
 }
 return targets;
}
