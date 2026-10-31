import {system,type Player} from '@minecraft/server';
import {ActionFormData,ModalFormData,FormCancelationReason,uiManager} from '@minecraft/server-ui';
import {corpus,calendar} from '../generated/content.ts';
import {parsePassage,passageVerses,paginate,ReadingError,type Passage,type Verse} from '../domain/scripture.ts';
import {readingHeading,readingText} from './reading-layout.ts';
import {brazilDate,dayFor,displayDate,parseDate,type CalendarDay,type ReadingOption} from '../domain/calendar.ts';
import {Books,action,report,type BookHandle} from '../infrastructure/books.ts';
import ui from '../../assets-src/ui/contract.json';

interface Session {player:Player;handle:BookHandle;date:string;passage?:Passage;pages:Verse[][];page:number;context:string;day?:CalendarDay;generation:number;pending:boolean}
interface Response {selection?:number;formValues?:(string|number|boolean|undefined)[]}
interface Choice {label:string;run:()=>void}
export class Reader {
 private sessions=new Map<string,Session>();
 constructor(private books:Books){}
 open(player:Player,handle:BookHandle){
  if(!this.books.valid(player,handle))return;
  this.close(player.id);
  const s:Session={player,handle,date:brazilDate(Date.now()),pages:[],page:0,context:'',generation:0,pending:false};this.sessions.set(player.id,s);
  try{if(handle.state.selection.mode==='passage')this.read(s,handle.state.selection.reference,'Passagem marcada');else this.today(s,s.date);}catch(e){this.errorScreen(s,e);}
 }
 close(id:string){
  const s=this.sessions.get(id);if(!s)return;this.sessions.delete(id);s.generation++;
  // Only dismiss while this session has a form outstanding. Old responses cannot close a replacement session.
  if(s.pending)try{uiManager.closeAllForms(s.player);}catch{}s.pending=false;
 }
 tick(){for(const [id,s]of this.sessions)if(!this.books.valid(s.player,s.handle))this.close(id);}
 private live(s:Session){return this.sessions.get(s.player.id)===s&&this.books.valid(s.player,s.handle);}
 private guard(s:Session,fn:()=>void){
  if(!this.live(s)){if(this.sessions.get(s.player.id)===s)this.close(s.player.id);return;}
  try{fn();}catch(e){this.errorScreen(s,e);}
 }
 private show(s:Session,form:ActionFormData|ModalFormData,submit:(r:Response)=>void,back?:()=>void){
  const generation=++s.generation;
  system.run(()=>{
   if(!this.live(s)||generation!==s.generation)return;
   s.pending=true;
   void form.show(s.player).then(response=>{
    if(this.sessions.get(s.player.id)!==s||generation!==s.generation)return;
    s.pending=false;
    this.guard(s,()=>{
     if(!response.canceled){submit(response);return;}
     if(response.cancelationReason===FormCancelationReason.UserBusy){action(s.player,'Feche a outra tela e tente novamente.');this.close(s.player.id);return;}
     if(back)back();else this.close(s.player.id);
    });
   }).catch(error=>{
    if(this.sessions.get(s.player.id)!==s||generation!==s.generation)return;
    s.pending=false;report(error);action(s.player,'Não foi possível abrir a leitura.');this.close(s.player.id);
   });
  });
 }
 private menu(s:Session,title:string,body:string,choices:Choice[],back?:()=>void){
  const f=new ActionFormData().title(ui.menuPrefix+title).body(body);
  for(const c of choices)f.button(c.label);
  this.show(s,f,r=>{const c=choices[r.selection??-1];if(c)c.run();else this.close(s.player.id);},back);
 }
 private read(s:Session,reference:string,context='',expanded=false){
  s.passage=parsePassage(reference,corpus);s.passage.expanded=expanded;s.pages=paginate(passageVerses(s.passage,corpus),ui.pageCharacters);s.page=0;s.context=context;this.page(s);
 }
 private page(s:Session){
  if(!s.passage||!s.pages.length){this.dayScreen(s);return;}
  const name=corpus.books.find(b=>b.id===s.passage!.book)!.name;
  const heading=readingHeading(name,s.passage.reference);
  const caption=`${heading.reference?heading.reference+'\n':''}${s.context?s.context+'\n':''}Bíblia Livre${s.passage.expanded?' · versículos completos':''}${s.pages.length>1?' · '+(s.page+1)+'/'+s.pages.length:''}`;
  const f=new ActionFormData().title(ui.readerPrefix+heading.title).body('§8'+caption+'§r\n\n'+readingText(s.pages[s.page]!));
  f.button(s.page>0?'Anterior':'').button('Leituras').button(s.page<s.pages.length-1?'Próxima':'');
  this.show(s,f,r=>{
   if(r.selection===1){this.options(s);return;}
   if(r.selection===0&&s.page>0)s.page--;
   else if(r.selection===2&&s.page<s.pages.length-1)s.page++;
   this.books.sound(s.player,'item.book.page_turn');this.page(s);
  });
 }
 private today(s:Session,date:string){
  const day=dayFor(date,calendar);s.day=day;s.date=date;
  if(day.noDaytimeMass){s.passage=undefined;s.pages=[];s.page=0;s.context='';this.dayScreen(s);return;}
  this.readOption(s,day.readings[0]!);
 }
 private dayScreen(s:Session){
  if(!s.day){this.options(s);return;}
  this.menu(s,'Sábado Santo',displayDate(s.day.date)+'\n\nNão há missa durante o dia.',[
   {label:'Vigília Pascal',run:()=>this.readOption(s,s.day!.readings[0]!)},{label:'Leituras',run:()=>this.options(s)}
  ]);
 }
 private readOption(s:Session,r:ReadingOption){this.read(s,r.reference,`${displayDate(s.day!.date)} · ${s.day!.celebration}${r.label!=='Evangelho'?'\n'+r.label:''}`,r.expanded);}
 private celebrations(s:Session){
  if(!s.day)return;
  this.menu(s,'Celebração',displayDate(s.day.date)+' · '+s.day.celebration,[
   ...s.day.readings.map(r=>({label:r.label+' · '+r.reference,run:()=>this.readOption(s,r)})),{label:'Voltar',run:()=>this.options(s)}
  ],()=>this.options(s));
 }
 private options(s:Session){
  const choices:Choice[]=[{label:'Hoje',run:()=>this.today(s,brazilDate(Date.now()))},{label:'Passagem',run:()=>this.passages(s)},{label:'Data',run:()=>this.date(s)}];
  if(s.day&&s.day.readings.length>1)choices.push({label:'Celebração',run:()=>this.celebrations(s)});
  choices.push({label:'Livro',run:()=>this.book(s)},{label:'Voltar',run:()=>this.page(s)});
  this.menu(s,'Leituras','',choices,()=>this.page(s));
 }
 private book(s:Session){
  const choices:Choice[]=[];
  if(this.books.canMutate(s.player)){
   if(s.passage&&(s.handle.state.selection.mode!=='passage'||s.handle.state.selection.reference!==s.passage.reference))choices.push({label:'Marcar passagem',run:()=>{s.handle=this.books.select(s.player,s.handle,{mode:'passage',reference:s.passage!.reference});s.context='Passagem marcada';this.page(s);}});
   if(s.handle.state.selection.mode!=='today')choices.push({label:'Seguir hoje',run:()=>{s.handle=this.books.select(s.player,s.handle,{mode:'today'});this.today(s,brazilDate(Date.now()));}});
   if(s.handle.kind==='placed'){
    if(this.books.isOpen(s.handle))choices.push({label:'Fechar livro',run:()=>{this.books.setOpen(s.player,s.handle,false);this.close(s.player.id);}});
    choices.push({label:'Retirar',run:()=>{this.books.retrieve(s.player,s.handle);this.close(s.player.id);}});
   }
  }
  choices.push({label:'Créditos',run:()=>this.credits(s)},{label:'Voltar',run:()=>this.options(s)});
  this.menu(s,'Livro',s.handle.state.selection.mode==='passage'?'Marca · '+s.handle.state.selection.reference:'Evangelho do dia',choices,()=>this.options(s));
 }
 private passages(s:Session){
  this.menu(s,'Passagem','',[
   ...corpus.books.map(b=>({label:b.name,run:()=>this.chapter(s,b.id)})),
   {label:'Digitar referência',run:()=>this.reference(s)},{label:'Voltar',run:()=>this.options(s)}
  ],()=>this.options(s));
 }
 private reference(s:Session,value=s.passage?.reference??'',error=''){
  const f=new ModalFormData().title(ui.menuPrefix+'Referência').textField('Referência','Jo 3,16–21',{defaultValue:value}).submitButton('Ler');
  if(error)f.label(error);
  this.show(s,f,r=>{
   const draft=String(r.formValues?.[0]??'');
   try{const p=parsePassage(draft,corpus);s.day=undefined;this.read(s,p.reference);}catch(e){this.reference(s,draft,this.inputError(e));}
  },()=>this.passages(s));
 }
 private chapter(s:Session,id:string,chapter=0,verses='',error=''){
  const book=corpus.books.find(b=>b.id===id)!;
  const f=new ModalFormData().title(ui.menuPrefix+book.name).dropdown('Capítulo',book.chapters.map((_,i)=>String(i+1)),{defaultValueIndex:chapter}).textField('Versículos','Capítulo inteiro',{defaultValue:verses}).submitButton('Ler');
  if(error)f.label(error);
  this.show(s,f,r=>{
   const c=Number(r.formValues?.[0]??0),draft=String(r.formValues?.[1]??'');
   try{const p=parsePassage(`${id} ${c+1}${draft.trim()?','+draft.trim():''}`,corpus);s.day=undefined;this.read(s,p.reference);}catch(e){this.chapter(s,id,c,draft,this.inputError(e));}
  },()=>this.passages(s));
 }
 private date(s:Session,value=displayDate(s.day?.date??s.date),error=''){
  const f=new ModalFormData().title(ui.menuPrefix+'Data').textField('Dia/mês/ano','25/10/2026',{defaultValue:value}).submitButton('Ler');
  if(error)f.label(error);
  this.show(s,f,r=>{const draft=String(r.formValues?.[0]??'');try{this.today(s,parseDate(draft));}catch(e){this.date(s,draft,this.inputError(e));}},()=>this.options(s));
 }
 private inputError(e:unknown){if(!(e instanceof ReadingError))report(e);return e instanceof ReadingError?e.message:'Confira os dados.';}
 private credits(s:Session){
  this.menu(s,'Créditos','Bíblia Livre · porbr2018\n2018 · Diego Santos, Mario Sérgio e Marco Teles.\nCC BY 4.0 · creativecommons.org/licenses/by/4.0/\nebible.org/porbr2018\nsites.google.com/site/biblialivre/\n\nQuatro Evangelhos indexados, com o texto preservado. Esta edição não é a tradução litúrgica da CNBB.\n\nCalendário brasileiro · 2026–2027\nBrasília · UTC-03\nReferências: Liturgia Diária, Dancrf; revisão de casos especiais no projeto. Próprios diocesanos não incluídos.',[{label:'Voltar',run:()=>this.book(s)}],()=>this.book(s));
 }
 private errorScreen(s:Session,error:unknown){
  if(!(error instanceof ReadingError))report(error);
  this.menu(s,'Evangeliário',error instanceof ReadingError?error.message:'Não foi possível abrir esta leitura.',[{label:'Leituras',run:()=>this.options(s)}]);
 }
}
