import type {Verse} from '../domain/scripture.ts';

/** Long references remain complete in the scrollable caption instead of overflowing the fixed heading. */
export function readingHeading(book:string,reference:string){
 const full=book+' '+reference.slice(reference.indexOf(' ')+1).replace(/-/g,'–');
 return full.length<=38?{title:full,reference:''}:{title:book,reference:reference.replace(/-/g,'–')};
}

/** Whitespace only: a lower-case continuation stays with its preceding verse when contiguous. */
export function readingText(verses:Verse[]){
 return verses.map((v,i)=>{
  const previous=verses[i-1];
  const first=v.text.charAt(0),lowercase=first===first.toLowerCase()&&first!==first.toUpperCase();
  const continuation=previous&&v.chapter===previous.chapter&&v.verse===previous.verse+1&&lowercase;
  return(i?(continuation?' ':'\n\n'):'')+v.text;
 }).join('');
}
