import type {LiturgySection} from './liturgy.ts';
export interface ReadingGroup {label:string;sections:LiturgySection[]}
/** Index-only grouping, never a calendar rule or a decision about today's Mass. */
export function lectionarySeasons(sections:LiturgySection[]):ReadingGroup[]{
 const groups=new Map<string,LiturgySection[]>();
 for(const section of sections){const label=section.group??'Outras celebrações';const list=groups.get(label)??[];list.push(section);groups.set(label,list);}
 return [...groups].map(([label,sections])=>({label,sections}));
}
export function ordinaryCycles(sections:LiturgySection[]):ReadingGroup[]{
 return ['A','B','C','I','II'].flatMap(cycle=>{
  const selected=sections.filter(section=>section.groups?.includes('Tempo Comum · Ano '+cycle));
  return selected.length?[{label:(cycle==='I'||cycle==='II'?'Dias de semana':'Domingos')+' · Ano '+cycle,sections:selected}]:[];
 });
}
export function lectionaryWeeks(sections:LiturgySection[]):ReadingGroup[]{
 const groups=new Map<number,LiturgySection[]>(),other:LiturgySection[]=[];
 for(const section of sections){const match=/(\d+)[ªº]\s+(?:semana|Domingo)/i.exec(section.title);if(!match){other.push(section);continue;}const week=Number(match[1]),list=groups.get(week)??[];list.push(section);groups.set(week,list);}
 const result=[...groups].sort(([a],[b])=>a-b).map(([week,sections])=>({label:'Semana '+week,sections}));
 if(other.length)result.push({label:'Celebrações próprias',sections:other});
 return result;
}
