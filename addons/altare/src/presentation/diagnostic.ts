/** Bounded cause chain for the Content Log; never changes player/world state. */
export function formatFailure(error:unknown):string {
 const parts:string[]=[],seen=new Set<unknown>();let current=error;
 for(let i=0;current!==undefined&&i<5&&!seen.has(current);i++){
  seen.add(current);
  parts.push((current instanceof Error?`${current.name}: ${current.message}`:String(current)).replace(/\s+/g,' ').slice(0,300));
  current=current instanceof Error?current.cause:undefined;
 }
 return parts.join(' -> ').slice(0,1200);
}
