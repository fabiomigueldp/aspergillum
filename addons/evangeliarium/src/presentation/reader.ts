import {ordo} from '../infrastructure/ordo.ts';
import {ordoMissalSections,massStartPage,ordoCelebrationTitle} from '../domain/ordo-calendar.ts';
import type {OrdoStore} from '../domain/ordo.ts';
import {LectionarySearch} from '../domain/lectionary-search.ts';
import {lectionarySeasons,ordinaryCycles,lectionaryWeeks,type ReadingGroup} from '../domain/lectionary-navigation.ts';
import {lectionary,lectionaryKeyToSection} from '../generated/lectionary.ts';
import {dailyCalendar} from '../domain/daily-calendar.ts';
import {missalDailySections} from '../domain/daily-books.ts';
import type {LectionaryCatalog} from '../domain/lectionary.ts';
import {liturgy} from '../generated/liturgy.ts';
import {bookDefinition} from '../domain/catalog.ts';
import {liturgyPages,liturgyContents,searchSections,sectionGroups,sectionTitle,type LiturgyCatalog,type LiturgySection} from '../domain/liturgy.ts';
import {system,type Player} from '@minecraft/server';
import {ActionFormData,ModalFormData,FormCancelationReason,uiManager} from '@minecraft/server-ui';
import {corpus} from '../generated/content.ts';
import {parsePassage,passageVerses,paginate,ReadingError,type Passage,type Verse} from '../domain/scripture.ts';
import {readingHeading,readingText} from './reading-layout.ts';
import {brazilDate,displayDate,parseDate} from '../domain/calendar.ts';
import {Books,action,report,type BookHandle} from '../infrastructure/books.ts';
import ui from '../../assets-src/ui/contract.json';

interface Session {readingMode?:'scripture'|'liturgy';sectionReturn?:Choice;dimension:string;section?:LiturgySection;sectionPages?:string[];player:Player;handle:BookHandle;date:string;passage?:Passage;pages:Verse[][];page:number;context:string;generation:number;pending:boolean}
interface Response {selection?:number;formValues?:(string|number|boolean|undefined)[]}
interface Choice {label:string;run:()=>void}
export class Reader {
 private sessions=new Map<string,Session>();
 constructor(private books:Books,private texts:LiturgyCatalog=liturgy,private readings:LectionaryCatalog=lectionary,private globalOrdo:OrdoStore=ordo){}
 open(player:Player,handle:BookHandle){
  if(!this.books.valid(player,handle))return;
  this.close(player.id);
  const s:Session={player,handle,dimension:player.dimension.id,date:brazilDate(Date.now()),pages:[],page:0,context:'',generation:0,pending:false};this.sessions.set(player.id,s);
  try{if(handle.book!=='pontifical'&&this.globalOrdo.read().override){this.celebration(s);return;}if(handle.book!=='gospel'||handle.state.selection.mode==='section'){s.readingMode='liturgy';const selection=handle.state.selection;if(selection.mode==='section'){const section=this.liturgicalBook(s).sections.find(x=>x.id===selection.sectionId);if(section)this.readSection(s,section,selection.page);else{action(s.player,'A marca não está disponível neste acervo.');this.sectionIndex(s);}}else if(selection.mode==='today')this.dailyForms(s,s.date);else this.sectionIndex(s);return;}if(handle.state.selection.mode==='passage')this.read(s,handle.state.selection.reference,'Passagem marcada');else this.today(s,s.date);}catch(e){this.errorScreen(s,e);}
 }
 close(id:string){
  const s=this.sessions.get(id);if(!s)return;this.sessions.delete(id);s.generation++;
  // Only dismiss while this session has a form outstanding. Old responses cannot close a replacement session.
  if(s.pending)try{uiManager.closeAllForms(s.player);}catch{}s.pending=false;
 }
 tick(){for(const [id,s]of this.sessions)if(!this.live(s))this.close(id);}
 private live(s:Session){return this.sessions.get(s.player.id)===s&&this.books.valid(s.player,s.handle)&&s.player.dimension.id===s.dimension;}
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
 private menu(s:Session,title:string,body:string,choices:Choice[],back?:()=>void,catalog=false){
  const f=new ActionFormData().title((catalog?ui.catalogPrefix:ui.menuPrefix)+title).body(body);
  for(const c of choices)f.button(c.label);
  this.show(s,f,r=>{const c=choices[r.selection??-1];if(c)c.run();else this.close(s.player.id);},back);
 }
 private read(s:Session,reference:string,context='',expanded=false){
  const passage=parsePassage(reference,corpus);s.readingMode='scripture';s.section=undefined;s.sectionPages=undefined;s.sectionReturn=undefined;s.passage=passage;s.passage.expanded=expanded;s.pages=paginate(passageVerses(s.passage,corpus),ui.pageCharacters);s.page=0;s.context=context;this.page(s);
 }
 private page(s:Session){
  if(s.readingMode==='liturgy'){this.sectionPage(s);return;}
  if(!s.passage||!s.pages.length){this.dailyForms(s,s.date);return;}
  const name=corpus.books.find(b=>b.id===s.passage!.book)!.name;
  const heading=readingHeading(name,s.passage.reference);
  const caption=[heading.reference,s.context,[s.passage.expanded?'Versículos completos':'',s.pages.length>1?'Página '+(s.page+1)+'/'+s.pages.length:''].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
  const f=new ActionFormData().title(ui.readerPrefix+heading.title).body('§8'+caption+'§r\n\n'+readingText(s.pages[s.page]!));
  f.button(s.page>0?'Anterior':'').button('Leituras').button(s.page<s.pages.length-1?'Próxima':'');
  this.show(s,f,r=>{
   if(r.selection===1){this.options(s);return;}
   if(r.selection===0&&s.page>0)s.page--;
   else if(r.selection===2&&s.page<s.pages.length-1)s.page++;
   this.books.sound(s.player,'item.book.page_turn');this.page(s);
  });
 }
 private celebration(s:Session){
  const selection=this.globalOrdo.read().override?.selection;
  if(!selection){this.dailyForms(s,brazilDate(Date.now()));return;}
  if(selection.kind!=='date'){this.sectionIndex(s);return;}
  s.date=selection.date;s.readingMode='liturgy';s.section=undefined;s.sectionPages=undefined;s.sectionReturn=undefined;s.passage=undefined;s.pages=[];
  const book=this.liturgicalBook(s),sections=s.handle.book==='missal'?ordoMissalSections(selection,book.sections):book.sections.filter(section=>section.id===lectionaryKeyToSection[selection.key]);
  const context=displayDate(selection.date)+' · '+ordoCelebrationTitle(selection,this.readings.book.sections,lectionaryKeyToSection)+(selection.mass?' · '+selection.mass:'');
  const read=(section:LiturgySection)=>{let starts=new Map<number,number>();liturgyPages(section,ui.pageCharacters,(index,page)=>starts.set(index,page));this.readSection(s,section,massStartPage(section,selection.mass,index=>starts.get(index)??0),context);};
  if(sections.length===1){read(sections[0]!);return;}
  this.menu(s,'Celebração',context+(sections.length?'':'\nPróprio não disponível neste acervo.'),[
   ...sections.map(section=>({label:sectionTitle(section),run:()=>read(section)})),
   {label:'Índice',run:()=>this.sectionIndex(s)},{label:'Livro',run:()=>this.book(s)}
  ]);
 }
 private today(s:Session,date:string){this.dailyForms(s,date);}
 private dailyForms(s:Session,date:string){
  const day=dailyCalendar(date),projected=day.projected; s.date=date;s.readingMode='liturgy';s.section=undefined;s.sectionPages=undefined;s.sectionReturn=undefined;s.passage=undefined;s.pages=[];s.page=0;
  const book=this.liturgicalBook(s),missing=day.keys.filter(key=>!lectionaryKeyToSection[key]);
  const sections=s.handle.book==='missal'?missalDailySections(day.keys,book.sections):day.keys.flatMap(key=>{const section=book.sections.find(x=>x.id===lectionaryKeyToSection[key]);return section?[section]:[];});
  const warnings:string[]=[];
  const vigilSections=s.handle.book==='missal'?missalDailySections(day.vigilKeys??[],book.sections).filter(section=>/vig[ií]lia/i.test(section.title)):(day.vigilKeys??[]).flatMap(key=>{const section=book.sections.find(x=>x.id===lectionaryKeyToSection[key]);return section?[section]:[];});
  if(day.requiresChoice)warnings.push('Transferência a confirmar no Diretório de '+date.slice(0,4)+'.');
  if(day.noDaytimeMass)warnings.push('Sem Missa durante o dia. Vigília à noite.');
  if(s.handle.book==='missal'&&day.keys.includes('dez/24'))warnings.push('Próprio diurno não disponível.');
  if(!sections.length)warnings.push('Próprio não disponível neste acervo.');
  else if(missing.length)warnings.push('Formulário incompleto neste acervo.');
  const multipleMasses=day.keys.some(key=>/^(?:dez\/24|proprio\/(?:12-25|06-24)|pedro|assuncao|pentecostes\/|epifania$)/.test(key));
  if(sections.length===1&&!vigilSections.length&&!warnings.length&&!multipleMasses){this.readSection(s,sections[0]!,0,displayDate(date)+' · '+day.celebration+(projected?' · Projeção':''));return;}
  const back=()=>this.dailyForms(s,date);
  const choices:Choice[]=sections.map(section=>({label:sectionTitle(section),run:()=>{s.sectionReturn={label:'Celebração do dia',run:back};this.readSection(s,section,0,displayDate(date)+(projected?' · Projeção':''));}}));
  for(const section of vigilSections)choices.push({label:'Vigília · '+sectionTitle(section),run:()=>{s.sectionReturn={label:'Celebração do dia',run:back};this.readSection(s,section,0,displayDate(date)+' · Vigília'+(projected?' · Projeção':''));}});
  if(s.handle.book==='gospel')choices.push({label:'Passagem',run:()=>this.passages(s)});
  choices.push({label:'Data',run:()=>this.dailyDate(s)},{label:'Índice',run:()=>this.sectionIndex(s)},{label:'Livro',run:()=>this.book(s)});
  this.menu(s,date===brazilDate(Date.now())?'Hoje':'Celebração',`${displayDate(date)} · ${day.celebration}\nAno ${day.cycle}${day.keys.some(key=>key.startsWith('comum/'))?' · Ferial '+day.weekdayCycle:''} · Brasília UTC−03${projected?' · Projeção':''}`+(warnings.length?'\n\n'+warnings.join('\n'):''),choices);
 }
 private dailyDate(s:Session,value=displayDate(s.date),error=''){
  const form=new ModalFormData().title(ui.menuPrefix+'Data').textField('Dia/mês/ano','25/10/2026',{defaultValue:value}).submitButton('Ler');if(error)form.label(error);
  this.show(s,form,r=>{const draft=String(r.formValues?.[0]??'');try{this.dailyForms(s,parseDate(draft));}catch(e){this.dailyDate(s,draft,this.inputError(e));}},()=>this.dailyForms(s,s.date));
 }
 private options(s:Session){
  if(s.readingMode==='liturgy'){this.sectionOptions(s);return;}
  const choices:Choice[]=[{label:'Celebração',run:()=>this.celebration(s)},{label:'Hoje',run:()=>this.today(s,brazilDate(Date.now()))},{label:'Passagem',run:()=>this.passages(s)},{label:'Índice litúrgico',run:()=>{s.readingMode='liturgy';this.sectionIndex(s);}},{label:'Data',run:()=>this.date(s)}];
  if(s.pages.length>1)choices.push({label:'Ir para página',run:()=>this.pageNumber(s)});
  choices.push({label:'Livro',run:()=>this.book(s)},{label:'Voltar',run:()=>s.passage?this.page(s):this.dailyForms(s,s.date)});
  this.menu(s,'Leituras','',choices,()=>this.page(s));
 }
 private book(s:Session){
  if(s.readingMode==='liturgy'){this.liturgicalBookMenu(s);return;}
  const choices:Choice[]=[];
  if(this.books.canMutate(s.player)){
   if(s.handle.state.selection.mode==='passage')choices.push({label:'Ler marca',run:()=>{const mark=s.handle.state.selection;if(mark.mode==='passage')this.read(s,mark.reference,'Passagem marcada');}});
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
  ],()=>s.readingMode==='liturgy'?this.dailyForms(s,s.date):this.options(s));
 }
 private reference(s:Session,value=s.passage?.reference??'',error=''){
  const f=new ModalFormData().title(ui.menuPrefix+'Referência').textField('Referência','Jo 3,16–21',{defaultValue:value}).submitButton('Ler');
  if(error)f.label(error);
  this.show(s,f,r=>{
   const draft=String(r.formValues?.[0]??'');
   try{const p=parsePassage(draft,corpus);this.read(s,p.reference);}catch(e){this.reference(s,draft,this.inputError(e));}
  },()=>this.passages(s));
 }
 private chapter(s:Session,id:string,chapter=0,verses='',error=''){
  const book=corpus.books.find(b=>b.id===id)!;
  const f=new ModalFormData().title(ui.menuPrefix+book.name).dropdown('Capítulo',book.chapters.map((_,i)=>String(i+1)),{defaultValueIndex:chapter}).textField('Versículos','Capítulo inteiro',{defaultValue:verses}).submitButton('Ler');
  if(error)f.label(error);
  this.show(s,f,r=>{
   const c=Number(r.formValues?.[0]??0),draft=String(r.formValues?.[1]??'');
   try{const p=parsePassage(`${id} ${c+1}${draft.trim()?','+draft.trim():''}`,corpus);this.read(s,p.reference);}catch(e){this.chapter(s,id,c,draft,this.inputError(e));}
  },()=>this.passages(s));
 }
 private date(s:Session,value=displayDate(s.date),error=''){
  const f=new ModalFormData().title(ui.menuPrefix+'Data').textField('Dia/mês/ano','25/10/2026',{defaultValue:value}).submitButton('Ler');
  if(error)f.label(error);
  this.show(s,f,r=>{const draft=String(r.formValues?.[0]??'');try{this.today(s,parseDate(draft));}catch(e){this.date(s,draft,this.inputError(e));}},()=>this.options(s));
 }
 private inputError(e:unknown){if(!(e instanceof ReadingError))report(e);return e instanceof ReadingError?e.message:'Confira os dados.';}
 private credits(s:Session){
  if(s.handle.book==='lectionary'||s.handle.book==='gospel'&&s.readingMode==='liturgy'){this.menu(s,'Sobre o acervo','Formulários organizados por tempo e ciclo litúrgico. As alternativas são preservadas junto da leitura. Calendário nacional · Brasília UTC−03. Revisão de 2026–2035; outras datas são projeções pelas normas atuais, não uma reconstrução histórica.',[{label:'Voltar',run:()=>this.book(s)}],()=>this.book(s));return;}
  if(s.handle.book!=='gospel'){const sources=this.texts.sources.filter(source=>this.liturgicalBook(s).sections.some(section=>section.sourceId===source.id));this.menu(s,'Créditos',sources.map(source=>source.title+'\n'+source.url+'\n'+source.license+(source.note?'\n'+source.note:'')).join('\n\n'),[{label:'Voltar',run:()=>this.book(s)}],()=>this.book(s));return;}
  this.menu(s,'Créditos','Texto bíblico\n2018 · Diego Santos, Mario Sérgio e Marco Teles.\nCC BY 4.0 · creativecommons.org/licenses/by/4.0/\nebible.org/porbr2018\nsites.google.com/site/biblialivre/\n\nQuatro Evangelhos indexados, com o texto preservado.\n\nCalendário brasileiro · revisão 2026–2035\nBrasília · UTC-03\nReferências: Liturgia Diária, Dancrf; revisão de casos especiais no projeto. Próprios diocesanos não incluídos.',[{label:'Voltar',run:()=>this.book(s)}],()=>this.book(s));
 }
 private liturgicalBook(s:Session){return s.handle.book==='lectionary'?this.readings.book:s.handle.book==='gospel'?this.readings.gospel:this.texts.books[s.handle.book];}
 private readSection(s:Session,section:LiturgySection,page=0,context=''){
  s.context=context;s.readingMode='liturgy';s.section=section;s.sectionPages=liturgyPages(section,ui.pageCharacters);s.page=Math.max(0,Math.min(page,s.sectionPages.length-1));this.sectionPage(s);
 }
 private sectionPage(s:Session){
  if(!s.section||!s.sectionPages?.length){this.sectionIndex(s);return;}
  const fullTitle=sectionTitle(s.section),title=fullTitle.length>52?bookDefinition(s.handle.book).name:fullTitle;
  const caption=(s.context?s.context+'\n':'')+(title!==fullTitle?fullTitle+'\n':'')+bookDefinition(s.handle.book).name+' · '+(s.page+1)+'/'+s.sectionPages.length+(s.section.warnings?.length?'\nNota editorial em Seções':'');
  const form=new ActionFormData().title(ui.readerPrefix+title).body('§8'+caption+'§r\n\n'+s.sectionPages[s.page]);
  form.button(s.page>0?'Anterior':'').button('Seções').button(s.page<s.sectionPages.length-1?'Próxima':'');
  this.show(s,form,r=>{if(r.selection===1){this.sectionOptions(s);return;}if(r.selection===0&&s.page>0)s.page--;else if(r.selection===2&&s.page<s.sectionPages!.length-1)s.page++;this.books.sound(s.player,'item.book.page_turn');this.sectionPage(s);});
 }
 private pageNumber(s:Session,value=String(s.page+1),error=''){
  const count=s.readingMode==='liturgy'?s.sectionPages?.length??0:s.pages.length;
  if(count<2){this.page(s);return;}
  const form=new ModalFormData().title(ui.menuPrefix+'Ir para página').textField(`Página de 1 a ${count}`,'Número da página',{defaultValue:value}).submitButton('Ler');
  if(error)form.label(error);
  this.show(s,form,r=>{
   const draft=String(r.formValues?.[0]??''),trimmed=draft.trim(),page=Number(trimmed);
   if(!/^\d+$/.test(trimmed)||!Number.isSafeInteger(page)||page<1||page>count){this.pageNumber(s,draft,`Digite um número inteiro entre 1 e ${count}.`);return;}
   if(s.page!==page-1)this.books.sound(s.player,'item.book.page_turn');s.page=page-1;this.page(s);
  },()=>this.options(s));
 }
 private sectionOptions(s:Session){
  const choices:Choice[]=s.handle.book==='pontifical'?[]:[{label:'Celebração',run:()=>this.celebration(s)}];
  if(s.handle.book==='gospel')choices.push({label:'Hoje',run:()=>this.today(s,brazilDate(Date.now()))},{label:'Data',run:()=>this.dailyDate(s)},{label:'Passagem',run:()=>this.passages(s)});
  if(s.handle.book==='lectionary'||s.handle.book==='missal')choices.push({label:'Hoje',run:()=>this.dailyForms(s,brazilDate(Date.now()))},{label:'Data',run:()=>this.dailyDate(s)});
  if(s.sectionReturn)choices.push(s.sectionReturn);
  if(s.section&&liturgyContents(s.section,ui.pageCharacters).length>1)choices.push({label:'Partes da leitura',run:()=>this.sectionContents(s)});
  if(this.sectionLinks(s).length)choices.push({label:'Textos relacionados',run:()=>this.sectionReferences(s)});
  if((s.sectionPages?.length??0)>1)choices.push({label:'Ir para página',run:()=>this.pageNumber(s)});
  choices.push(
   {label:'Índice',run:()=>this.sectionIndex(s)},
   {label:'Buscar',run:()=>this.sectionSearch(s)},
   {label:'Livro',run:()=>this.book(s)},
   {label:'Voltar à leitura',run:()=>this.sectionPage(s)}
  );
  this.menu(s,'Seções',[...(s.section?.warnings??[]),...(s.section?.unresolvedLinks?['Algumas referências da fonte não têm destino offline verificado.']:[])].join('\n\n'),choices,()=>this.sectionPage(s));
 }
 private sectionContents(s:Session,page=0){
  const section=s.section!;const targets=liturgyContents(section,ui.pageCharacters),size=10,last=Math.max(0,Math.ceil(targets.length/size)-1);page=Math.max(0,Math.min(page,last));
  const choices:Choice[]=targets.slice(page*size,(page+1)*size).map(target=>({label:target.label+' · página '+(target.page+1),run:()=>{s.page=target.page;this.sectionPage(s);}}));
  if(page>0)choices.push({label:'Partes anteriores',run:()=>this.sectionContents(s,page-1)});
  if(page<last)choices.push({label:'Mais partes',run:()=>this.sectionContents(s,page+1)});
  choices.push({label:'Voltar',run:()=>this.sectionOptions(s)});
  this.menu(s,'Partes da leitura',sectionTitle(section),choices,()=>this.sectionOptions(s),true);
 }
 private sectionLinks(s:Session){
  const sections=this.liturgicalBook(s).sections,seen=new Set<string>();
  return(s.section?.links??[]).flatMap(link=>{
   const section=sections.find(candidate=>candidate.id===link.targetId);
   if(!section||section.id===s.section?.id||seen.has(section.id))return[];
   seen.add(section.id);return[{section,label:section.displayTitle||link.label.trim()||section.title}];
  });
 }
 private sectionReferences(s:Session,page=0){
  const links=this.sectionLinks(s),source=s.section!,sourcePage=s.page,sourceReturn=s.sectionReturn,size=10,last=Math.max(0,Math.ceil(links.length/size)-1);
  page=Math.max(0,Math.min(page,last));
  const choices:Choice[]=links.slice(page*size,(page+1)*size).map(link=>({label:link.label,run:()=>{
   s.sectionReturn={label:'Voltar à leitura anterior',run:()=>{s.sectionReturn=sourceReturn;this.readSection(s,source,sourcePage);}};
   this.readSection(s,link.section);
  }}));
  if(page>0)choices.push({label:'Anteriores',run:()=>this.sectionReferences(s,page-1)});
  if(page<last)choices.push({label:'Mais textos',run:()=>this.sectionReferences(s,page+1)});
  choices.push({label:'Voltar',run:()=>this.sectionOptions(s)});
  this.menu(s,'Textos relacionados',sectionTitle(source),choices,()=>this.sectionOptions(s),true);
 }
 private sectionIndex(s:Session,page=0){
  if(s.handle.book==='lectionary'||s.handle.book==='gospel'){this.lectionaryIndex(s);return;}
  const book=this.liturgicalBook(s),groups=[...new Set(book.sections.flatMap(sectionGroups))];
  const size=10,last=Math.max(0,Math.ceil(groups.length/size)-1);page=Math.max(0,Math.min(page,last));
  const choices:Choice[]=groups.slice(page*size,(page+1)*size).map(group=>({label:group,run:()=>this.sectionList(s,book.sections.filter(section=>sectionGroups(section).includes(group)),group,0,()=>this.sectionIndex(s,page))}));
  if(page>0)choices.push({label:'Grupos anteriores',run:()=>this.sectionIndex(s,page-1)});
  if(page<last)choices.push({label:'Mais grupos',run:()=>this.sectionIndex(s,page+1)});
  if(s.handle.book!=='pontifical')choices.unshift({label:'Celebração',run:()=>this.celebration(s)},{label:'Hoje',run:()=>this.dailyForms(s,brazilDate(Date.now()))},{label:'Data',run:()=>this.dailyDate(s)});
  choices.push({label:'Buscar',run:()=>this.sectionSearch(s)},{label:'Livro',run:()=>this.book(s)});
  if(s.section)choices.push({label:'Voltar à leitura',run:()=>this.sectionPage(s)});
  this.menu(s,book.title,`${book.sections.length} seções`+(last?' · '+(page+1)+'/'+(last+1):''),choices,s.section?()=>this.sectionPage(s):undefined,true);
 }
 private lectionaryIndex(s:Session){
  const book=this.liturgicalBook(s),choices:Choice[]=lectionarySeasons(book.sections).map(group=>({label:group.label,run:()=>{
   const back=()=>this.lectionaryIndex(s),cycles=group.label==='Tempo Comum'?ordinaryCycles(group.sections):[];
   if(cycles.length)this.lectionaryGroups(s,cycles,group.label,back,true);else this.lectionaryWeekList(s,group.sections,group.label,back);
  }}));
  if(s.handle.book!=='pontifical')choices.unshift({label:'Celebração',run:()=>this.celebration(s)},{label:'Hoje',run:()=>this.dailyForms(s,brazilDate(Date.now()))},{label:'Data',run:()=>this.dailyDate(s)});
  choices.push({label:'Buscar',run:()=>this.sectionSearch(s)},{label:'Livro',run:()=>this.book(s)});
  if(s.section)choices.push({label:'Voltar à leitura',run:()=>this.sectionPage(s)});
  this.menu(s,book.title,'',choices,s.section?()=>this.sectionPage(s):undefined,true);
 }
 private lectionaryWeekList(s:Session,sections:LiturgySection[],title:string,back:()=>void){
  const groups=lectionaryWeeks(sections);
  if(sections.length>12&&groups.length>1)this.lectionaryGroups(s,groups,title,back);
  else this.sectionList(s,sections,title,0,back);
 }
 private lectionaryGroups(s:Session,groups:ReadingGroup[],title:string,back:()=>void,cycles=false,page=0){
  const size=10,last=Math.max(0,Math.ceil(groups.length/size)-1);page=Math.max(0,Math.min(page,last));const here=()=>this.lectionaryGroups(s,groups,title,back,cycles,page);
  const choices:Choice[]=groups.slice(page*size,(page+1)*size).map(group=>({label:group.label,run:()=>cycles?this.lectionaryWeekList(s,group.sections,group.label,here):this.sectionList(s,group.sections,title+' · '+group.label,0,here)}));
  if(page>0)choices.push({label:'Anteriores',run:()=>this.lectionaryGroups(s,groups,title,back,cycles,page-1)});
  if(page<last)choices.push({label:'Próximas',run:()=>this.lectionaryGroups(s,groups,title,back,cycles,page+1)});
  choices.push({label:'Voltar',run:back});this.menu(s,title,'',choices,back,true);
 }
 private sectionList(s:Session,sections:LiturgySection[],title:string,page:number,back:()=>void,query?:string){
  const size=10,last=Math.max(0,Math.ceil(sections.length/size)-1);page=Math.max(0,Math.min(page,last));
  const choices:Choice[]=sections.slice(page*size,(page+1)*size).map(section=>({label:sectionTitle(section),run:()=>{s.sectionReturn={label:query!==undefined?'Voltar aos resultados':'Voltar à lista',run:()=>this.sectionList(s,sections,title,page,back,query)};this.readSection(s,section);}}));
  if(page>0)choices.push({label:'Seções anteriores',run:()=>this.sectionList(s,sections,title,page-1,back,query)});
  if(page<last)choices.push({label:'Mais seções',run:()=>this.sectionList(s,sections,title,page+1,back,query)});
  choices.push({label:'Voltar',run:back});
  const context=query!==undefined?'Busca: '+query+'\n':'';
  const range=sections.length?`${page*size+1}–${Math.min((page+1)*size,sections.length)} de ${sections.length} seções`:'Nenhuma seção encontrada. Tente outras palavras, sem precisar de acentos.';
  this.menu(s,title,context+range,choices,back,true);
 }
 private sectionSearch(s:Session,value='',error=''){
  const form=new ModalFormData().title(ui.menuPrefix+'Buscar').textField('Título ou palavras do texto',s.handle.book==='pontifical'?'Ex.: ordenação, crisma':s.handle.book==='missal'?'Ex.: prefácio, bênção':'Ex.: advento, domingo, Aparecida',{defaultValue:value}).submitButton('Buscar');if(error)form.label(error);
  this.show(s,form,r=>{const draft=String(r.formValues?.[0]??'');if(draft.trim().length<2){this.sectionSearch(s,draft,'Digite ao menos duas letras.');return;}if(draft.length>120){this.sectionSearch(s,draft,'Use até 120 caracteres.');return;}this.searchResults(s,draft);},()=>this.sectionIndex(s));
 }
 private searchResults(s:Session,query:string){
  if(s.handle.book!=='lectionary'&&s.handle.book!=='gospel'){this.sectionList(s,searchSections(this.liturgicalBook(s),query),'Resultados',0,()=>this.sectionSearch(s,query),query);return;}
  const search=new LectionarySearch(this.liturgicalBook(s),query),generation=++s.generation;
  action(s.player,'Buscando no acervo…');
  const next=()=>{
   if(!this.live(s)||s.generation!==generation)return;
   this.guard(s,()=>{if(search.step()){action(s.player,'');this.sectionList(s,search.results,'Resultados',0,()=>this.sectionSearch(s,query),query);}else system.run(next);});
  };
  system.run(next);
 }
 private liturgicalBookMenu(s:Session){
  const choices:Choice[]=[],selection=s.handle.state.selection;
  if(selection.mode==='section'){const marked=this.liturgicalBook(s).sections.find(x=>x.id===selection.sectionId);if(marked)choices.push({label:'Ler marca',run:()=>this.readSection(s,marked,selection.page)});}
  if(selection.mode==='passage')choices.push({label:'Ler marca',run:()=>this.read(s,selection.reference,'Passagem marcada')});
  if(this.books.canMutate(s.player)){
   if(s.section&&(selection.mode!=='section'||selection.sectionId!==s.section.id||selection.page!==s.page))choices.push({label:'Marcar página',run:()=>{s.handle=this.books.select(s.player,s.handle,{mode:'section',sectionId:s.section!.id,page:s.page});this.sectionPage(s);}});
   if(selection.mode!=='today'&&s.handle.book!=='pontifical')choices.push({label:'Seguir hoje',run:()=>{s.handle=this.books.select(s.player,s.handle,{mode:'today'});this.today(s,brazilDate(Date.now()));}});
   if(selection.mode!=='index'&&s.handle.book!=='gospel')choices.push({label:'Abrir pelo índice',run:()=>{s.handle=this.books.select(s.player,s.handle,{mode:'index'});this.sectionIndex(s);}});
   if(s.handle.kind==='placed'){
    if(this.books.isOpen(s.handle))choices.push({label:'Fechar livro',run:()=>{this.books.setOpen(s.player,s.handle,false);this.close(s.player.id);}});
    choices.push({label:'Retirar',run:()=>{this.books.retrieve(s.player,s.handle);this.close(s.player.id);}});
   }
  }
  choices.push({label:'Créditos',run:()=>this.credits(s)},{label:'Voltar',run:()=>s.section?this.sectionOptions(s):selection.mode==='today'?this.dailyForms(s,s.date):this.sectionIndex(s)});
  const marked=selection.mode==='section'?this.liturgicalBook(s).sections.find(section=>section.id===selection.sectionId):undefined;
  this.menu(s,'Livro',marked?'Marca · '+sectionTitle(marked)+' · página '+((selection.mode==='section'?selection.page:0)+1):selection.mode==='passage'?'Marca · '+selection.reference:selection.mode==='today'?'Segue a data de Brasília':'Abre pelo índice',choices,()=>s.section?this.sectionOptions(s):selection.mode==='today'?this.dailyForms(s,s.date):this.sectionIndex(s));
 }
 private errorScreen(s:Session,error:unknown){
  if(!(error instanceof ReadingError))report(error);
  this.menu(s,bookDefinition(s.handle.book).name,error instanceof ReadingError?error.message:'Não foi possível abrir esta leitura.',[{label:'Leituras',run:()=>this.options(s)}]);
 }
}
