import {system,type Player} from '@minecraft/server';
import {ActionFormData,ModalFormData,FormCancelationReason,uiManager} from '@minecraft/server-ui';
import {brazilDate,displayDate,parseDate} from '../domain/calendar.ts';
import {dailyCalendar} from '../domain/daily-calendar.ts';
import {dateChoices,ordoCelebrationTitle,type DateSelection} from '../domain/ordo-calendar.ts';
import {OrdoStateError,type OrdoStore} from '../domain/ordo.ts';
import {canConfigureOrdo} from '../infrastructure/ordo.ts';
import {lectionary,lectionaryKeyToSection} from '../generated/lectionary.ts';
import {liturgy} from '../generated/liturgy.ts';
import {sectionGroups,sectionTitle,liturgyPages,type LiturgySection} from '../domain/liturgy.ts';
import {action,report} from '../infrastructure/books.ts';
import ui from '../../assets-src/ui/contract.json';
interface Session {player:Player;valid:()=>boolean;revision:number;day:string;generation:number;pending:boolean}
interface Choice {label:string;run:()=>void}
export class OrdoController {
 private sessions=new Map<string,Session>();
 constructor(private store:OrdoStore){}
 open(player:Player,valid:()=>boolean){this.close(player.id);const s={player,valid,revision:-1,day:brazilDate(Date.now()),generation:0,pending:false};this.sessions.set(player.id,s);this.home(s);}
 close(id:string){const s=this.sessions.get(id);if(!s)return;this.sessions.delete(id);s.generation++;if(s.pending)try{uiManager.closeAllForms(s.player);}catch{}s.pending=false;}
 tick(){for(const [id,s]of this.sessions)if(!this.live(s))this.close(id);}
 private live(s:Session){return this.sessions.get(s.player.id)===s&&s.player.isValid&&s.valid();}
 private show(s:Session,form:ActionFormData|ModalFormData,submit:(r:{selection?:number;formValues?:(string|number|boolean|undefined)[]})=>void,back?:()=>void){
  const generation=++s.generation;
  system.run(()=>{if(!this.live(s)||generation!==s.generation)return;s.pending=true;
   void form.show(s.player).then(r=>{if(!this.live(s)||generation!==s.generation)return;s.pending=false;
    if(r.canceled){if(r.cancelationReason===FormCancelationReason.UserBusy){this.close(s.player.id);return;}if(back)back();else this.close(s.player.id);return;}
    try{submit(r);}catch(error){this.failure(s,error);}
   }).catch(error=>{if(!this.live(s)||generation!==s.generation)return;s.pending=false;report(error);this.close(s.player.id);action(s.player,'Não foi possível abrir o Ordo.');});
  });
 }
 private menu(s:Session,title:string,body:string,choices:Choice[],back?:()=>void,catalog=false){const f=new ActionFormData().title((catalog?ui.catalogPrefix:ui.menuPrefix)+title).body(body);for(const c of choices)f.button(c.label);this.show(s,f,r=>choices[r.selection??-1]?.run(),back);}
 private home(s:Session,note=''){
  try{
   const state=this.store.read();s.revision=state.revision;s.day=brazilDate(Date.now());const choice=state.override?.selection,date=choice?.kind==='date'?choice.date:brazilDate(Date.now());
   const current=choice?.kind==='date'?`${displayDate(date)} · ${ordoCelebrationTitle(choice,lectionary.book.sections,lectionaryKeyToSection)}${choice.mass?'\n'+choice.mass:''}`:dailyCalendar(date).celebration;
   const choices:Choice[]=[];
   if(canConfigureOrdo(s.player))choices.push({label:'Escolher data',run:()=>this.dates(s)});
   choices.push({label:'Consultar votivas',run:()=>this.votives(s)});
   if(canConfigureOrdo(s.player)&&choice)choices.push({label:'Voltar para hoje',run:()=>this.apply(s)});
   choices.push({label:'Fechar',run:()=>this.close(s.player.id)});
   this.menu(s,'Ordo',current+'\n'+(choice?'Até 00h · Brasília':'Hoje · '+displayDate(date))+(note?'\n\n'+note:''),choices);
  }catch(error){this.failure(s,error);}
 }
 private dates(s:Session){const tomorrow=brazilDate(Date.now()+86_400_000);this.menu(s,'Escolher data','Até a próxima meia-noite · Brasília',[
  {label:'Amanhã · '+displayDate(tomorrow),run:()=>this.preview(s,tomorrow)},
  {label:'Outra data',run:()=>this.dateInput(s)},
  {label:'Voltar',run:()=>this.home(s)}
 ],()=>this.home(s));}
 private dateInput(s:Session,value='',error=''){
  const f=new ModalFormData().title(ui.menuPrefix+'Escolher data').textField('Dia/mês/ano','25/12/2026',{defaultValue:value}).submitButton('Continuar');if(error)f.label(error);
  this.show(s,f,r=>{const value=String(r.formValues?.[0]??'');try{this.preview(s,parseDate(value),()=>this.dateInput(s,value));}catch(error){this.dateInput(s,value,error instanceof Error?error.message:'Confira a data.');}},()=>this.dates(s));
 }
 private preview(s:Session,date:string,back=()=>this.dates(s)){
  const day=dailyCalendar(date),choices=dateChoices(date,lectionary.book.sections,lectionaryKeyToSection);
  this.menu(s,'Celebração',displayDate(date)+' · '+day.celebration+(day.projected?'\nProjeção do calendário brasileiro.':'')+(day.requiresChoice?'\nTransferência a confirmar no Diretório.':'')+(day.noDaytimeMass?'\nVigília à noite; sem Missa diurna.':'')+(choices.length?'':'\nSem formulário disponível.'),[
   ...choices.map(c=>({label:choices.length===1?'Usar esta celebração':c.label,run:()=>this.apply(s,c.selection)})),
   {label:'Voltar',run:back}
  ],back);
 }
 private apply(s:Session,selection?:DateSelection){
  if(!canConfigureOrdo(s.player)){this.home(s,'A alteração exige um operador.');return;}
  if(s.day!==brazilDate(Date.now())){this.home(s,'A data virou em Brasília. Escolha novamente.');return;}
  try{this.store.change(selection,s.revision);this.home(s);}catch(error){if(error instanceof OrdoStateError&&error.code==='conflict'){this.home(s,'O Ordo mudou. Confira a celebração atual.');return;}this.failure(s,error);}
 }
 private votives(s:Session,page=0){
  const sections=liturgy.books.missal.sections.filter(section=>sectionGroups(section).includes('Missas Votivas')&&section.title!=='Missas Votivas'),size=7;
  const choices:Choice[]=sections.slice(page*size,(page+1)*size).map(section=>({label:sectionTitle(section),run:()=>this.votiveDetail(s,section,page)}));
  if(page>0)choices.push({label:'Anteriores',run:()=>this.votives(s,page-1)});if((page+1)*size<sections.length)choices.push({label:'Mais votivas',run:()=>this.votives(s,page+1)});choices.push({label:'Voltar',run:()=>this.home(s)});
  this.menu(s,'Missas votivas','Missal Romano · '+(page+1)+'/'+Math.ceil(sections.length/size),choices,()=>this.home(s),true);
 }
 private votiveDetail(s:Session,section:LiturgySection,catalogPage:number){
  this.menu(s,'Missa votiva',sectionTitle(section)+'\n\nLeituras e Evangelho não vinculados.',[
   {label:'Ler formulário',run:()=>this.votivePage(s,section,catalogPage)},
   {label:'Voltar',run:()=>this.votives(s,catalogPage)}
  ],()=>this.votives(s,catalogPage));
 }
 private votivePage(s:Session,section:LiturgySection,catalogPage:number,page=0){
  const pages=liturgyPages(section,ui.pageCharacters),form=new ActionFormData().title(ui.readerPrefix+'Missal Romano').body('§8'+sectionTitle(section)+' · '+(page+1)+'/'+pages.length+'§r\n\n'+pages[page]);
  form.button(page>0?'Anterior':'').button('Votiva').button(page<pages.length-1?'Próxima':'');
  this.show(s,form,r=>{if(r.selection===1){this.votiveDetail(s,section,catalogPage);return;}this.votivePage(s,section,catalogPage,r.selection===0&&page>0?page-1:r.selection===2&&page<pages.length-1?page+1:page);},()=>this.votiveDetail(s,section,catalogPage));
 }
 private failure(s:Session,error:unknown){report(error);this.menu(s,'Ordo','Não foi possível consultar ou salvar a celebração. Tente reabrir o Ordo.',[{label:'Fechar',run:()=>this.close(s.player.id)}]);}
}
