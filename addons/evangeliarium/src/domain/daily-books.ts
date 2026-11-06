import type {LiturgySection} from './liturgy.ts';
/** Explicitly identified proper Masses only. Votive texts are never substituted. */
const missalProper:Record<string,string[]>={
 'epifania':['missal--missa-da-vigilia','missal--missa-do-dia_29'],
 'ascensao':['missal--missa-da-vigilia_29','missal--missa-do-dia_3'],
 'pentecostes':['missal--missa-da-vigilia_96','missal--missa-da-vigilia-prolongada','missal--missa-do-dia_46'],
 'cinzas':['missal--quarta-feira-de-cinzas'],
 'ramos':['missal--domingo-de-ramos-da-paixao-do-senhor'],
 'santa/4':['missal--missa-vespertina-da-ceia-do-senhor'],
 'paixao':['missal--celebracao-da-paixao-do-senhor'],
 'vigilia':['missal--vigilia-pascal-na-noite-santa'],
 'pascoa':['missal--missa-do-dia-da-pascoa-do-senhor'],
 'corpus':['missal--solenidade-do-santissimo-corpo-e-sangue'],
 'proprio/02-02':['missal--festa-da-apresentacao-do-senhor'],
 'proprio/12-25':['missal--missa-da-noite-do-natal-do-senhor','missal--missa-da-aurora-do-natal-do-senhor','missal--missa-do-dia'],
};
export function missalDailySections(keys:string[],sections:LiturgySection[]):LiturgySection[]{
 const ids=new Set(keys.flatMap(key=>missalProper[key]??missalProper[key.replace(/\/(?:A|B|C|domingo|semana)$/,'')]??[]));
 // December 24 has a daytime formulary as well as the Christmas vigil.
 if(keys.includes('dez/24')){ids.add('missal--missa-da-vigilia-do-natal-do-senhor');ids.add('missal--missa-da-noite-do-natal-do-senhor');}
 return [...ids].flatMap(id=>{const section=sections.find(s=>s.id===id);return section?[section]:[];});
}
