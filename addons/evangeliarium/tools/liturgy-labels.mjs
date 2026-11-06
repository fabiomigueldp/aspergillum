/** Presentation labels only. Original titles and liturgical text remain unchanged. */
export function liturgyLabels(catalog){
 const labels=new Map(),sections=catalog.books.missal.sections;
 const index=sections.find(section=>section.id==='missal--proprio-do-tempo');
 let context='';
 for(const block of index?.blocks??[]){
  const links=(block.runs??[]).filter(run=>run.href);
  if(block.kind==='heading')context='';
  if(!links.length&&/^Solenidade (?:d[ao]|de) /.test(block.text))context=block.text;
  for(const link of links){
   const target=sections.find(section=>section.sourceUrl===link.href);
   if(context&&target&&['Missa do Dia','Missa da Vigília'].includes(target.title))labels.set(target.id,context+' · '+target.title);
  }
 }
 for(const id of ['missal--oracao-do-ano-jubilar-senhor-vos','missal--oracoes-mensais-do-ano-jubilar-rezar']){
  const section=sections.find(section=>section.id===id),heading=section?.blocks.find(block=>block.kind==='heading');
  if(heading?.text)labels.set(id,heading.text);
 }
 return labels;
}
