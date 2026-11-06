/** Verified presentation-only corrections. Never rewrite original catalog/text/URLs. */
const groups={
 'missal--oracao-eucaristica-para-diversas_29':'Orações Eucarísticas',
 'missal--oracao-eucaristica-para-diversas_56':'Orações Eucarísticas',
 'missal--oracao-eucaristica-para-diversas_6':'Orações Eucarísticas',
 'missal--oracao-eucaristica-para-missas-com':'Orações Eucarísticas',
 'missal--oracao-eucaristica-para-missas-com_29':'Orações Eucarísticas',
 'missal--oracao-eucaristica-para-missas-com_38':'Orações Eucarísticas',
 'missal--prefacio-comum-ix':'Prefácios',
 'missal--prefacio-da-festa-da-apresentacao-do':'Prefácios',
 'pontifical--primeiras-leituras-para-dedicacao-da':'Dedicações',
 'pontifical--aclamacoes-ao-evangelho-para-dedicacao':'Dedicações',
 'pontifical--oracao-eucaristica-iv-para-ordenacao-de_13':'Ordenação dos Presbíteros'
};
// The source index incorrectly points both labels to the reconciliation prayer.
const eucharisticTargets={
 'Oração Eucarística para diversas circunstâncias II':'missal--oracao-eucaristica-para-diversas_29',
 'Oração Eucarística para diversas circunstâncias III':'missal--oracao-eucaristica-para-diversas_56'
};
export function liturgyNavigation(book,section){
 const sectionGroups=groups[section.id]?[groups[section.id]]:[...new Set(section.groups?.length?section.groups:section.group?[section.group]:['Outras seções'])];
 const links=[];let unresolvedLinks=0;
 for(const link of section.links??[]){
  const correction=section.id==='missal--oracoes-eucaristicas'&&link.targetId==='missal--oracao-eucaristica-sobre-reconciliacao'?eucharisticTargets[link.label.trim()]:undefined;
  const targetId=correction??link.targetId;
  if(link.internal&&book.sections.some(target=>target.id===targetId))links.push({label:link.label,targetId});
  else if(link.label.trim())unresolvedLinks++;
 }
 return{groups:sectionGroups,links,...(unresolvedLinks?{unresolvedLinks}:{})};
}
