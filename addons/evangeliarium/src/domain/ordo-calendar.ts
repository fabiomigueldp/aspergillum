import {dailyCalendar} from './daily-calendar.ts';
import {missalDailySections} from './daily-books.ts';
import type {LiturgySection} from './liturgy.ts';
import type {OrdoSelection} from './ordo.ts';
export type DateSelection=Extract<OrdoSelection,{kind:'date'}>;
export interface OrdoDateChoice {label:string;selection:DateSelection}
/** These are structural headings in the supplied lectionary, not inferred saints or feasts. */
export function massHeadings(section:LiturgySection):string[]{return section.blocks.filter(b=>b.kind==='heading'&&/^Missa (?:da|do) /i.test(b.text.trim())).map(b=>b.text.trim());}
export function dateChoices(date:string,sections:LiturgySection[],keys:Record<string,string>):OrdoDateChoice[]{
 const day=dailyCalendar(date),out:OrdoDateChoice[]=[];
 for(const key of [...new Set([...day.keys,...day.vigilKeys??[]])]){
  const section=sections.find(s=>s.id===keys[key]);if(!section)continue;
  let masses=massHeadings(section);
  if(!day.keys.includes(key))masses=masses.filter(m=>/vig[ií]lia/i.test(m));
  // Separate proper Masses with common readings still require a deliberate choice.
  if(!masses.length&&key==='epifania')masses=['Missa da Vigília','Missa do dia'];
  if(!masses.length&&key.startsWith('ascensao/'))masses=['Missa da Vigília','Missa do dia'];
  if(!masses.length&&day.keys.includes(key))out.push({label:section.displayTitle||section.title,selection:{kind:'date',date,key}});
  for(const mass of masses)out.push({label:mass+(!day.keys.includes(key)||day.keys.length>1?' · '+(section.displayTitle||section.title):''),selection:{kind:'date',date,key,mass}});
 }
 return out;
}
/** A view over the original section preserves IDs and saved pagination. */
export function massStartPage(section:LiturgySection,mass:string|undefined,pageForBlock:(index:number)=>number):number{
 if(!mass)return 0;const index=section.blocks.findIndex(b=>b.kind==='heading'&&b.text.trim()===mass);return index<0?0:pageForBlock(index);
}
const properMasses:Record<string,Record<string,string>>={
 'epifania':{'Missa da Vigília':'missal--missa-da-vigilia','Missa do dia':'missal--missa-do-dia_29'},
 'ascensao':{'Missa da Vigília':'missal--missa-da-vigilia_29','Missa do dia':'missal--missa-do-dia_3'},
 'pentecostes':{'Missa da Vigília':'missal--missa-da-vigilia_96','Missa do dia':'missal--missa-do-dia_46'},
 'dez/24':{'Missa da Vigília':'missal--missa-da-vigilia-do-natal-do-senhor','Missa da Noite':'missal--missa-da-noite-do-natal-do-senhor'},
 'proprio/12-25':{'Missa da aurora':'missal--missa-da-aurora-do-natal-do-senhor','Missa do dia':'missal--missa-do-dia'}
};
export function ordoMissalSections(selection:DateSelection,sections:LiturgySection[]):LiturgySection[]{
 const key=selection.key.replace(/\/[ABC]$/,'');
 if(selection.mass){const id=properMasses[key]?.[selection.mass];return id?sections.filter(s=>s.id===id):[];}
 return missalDailySections([selection.key],sections);
}

/** Label the chosen celebration, including vigils belonging to another civil day. */
export function ordoCelebrationTitle(selection:DateSelection,sections:LiturgySection[],keys:Record<string,string>):string {
 const day=dailyCalendar(selection.date);
 if(selection.key==='dez/24'&&selection.mass&&selection.mass!=='Missa da manhã')return 'Natal de Nosso Senhor Jesus Cristo';
 if(day.keys.length===1&&day.keys.includes(selection.key))return day.celebration;
 const section=sections.find(s=>s.id===keys[selection.key]);return section?.displayTitle||section?.title||day.celebration;
}
