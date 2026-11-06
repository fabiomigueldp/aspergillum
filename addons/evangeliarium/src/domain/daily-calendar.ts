import {parseDate} from './calendar.ts';
import {ReadingError} from './scripture.ts';

export interface DailyCalendar {date:string;celebration:string;keys:string[];vigilKeys?:string[];warnings:string[];requiresChoice?:boolean;projected?:boolean;noDaytimeMass?:boolean;cycle:'A'|'B'|'C';weekdayCycle:'I'|'II'}
const DAY=86_400_000;
const day=(year:number,month:number,date:number)=>Date.UTC(year,month-1,date)/DAY;
const weekday=(value:number)=>new Date(value*DAY).getUTCDay();
const sunday=(value:number)=>value+(7-weekday(value))%7;
/** Gregorian computus, independently implemented. No code from the supplied archive executes. */
export function easterDay(year:number):number {
 const golden=year%19,century=Math.floor(year/100),remainder=year%100;
 const correction=Math.floor((century-Math.floor((century+8)/25)+1)/3);
 const epact=(19*golden+century-Math.floor(century/4)-correction+15)%30;
 const adjustment=(32+2*(century%4)+2*Math.floor(remainder/4)-epact-remainder%4)%7;
 const exception=Math.floor((golden+11*epact+22*adjustment)/451);
 const total=epact+adjustment-7*exception+114;
 return day(year,Math.floor(total/31),total%31+1);
}
interface Celebration {name:string;key:string;rank:number}
const event=(name:string,key:string,rank:number):Celebration=>({name,key,rank});
// Metadata transcribed as data from the supplied national proper, not executable rules.
// 2026–2035 is the audited interval. Other Gregorian years project the current national rules, not historical practice.
const saints:Record<string,[string,number,boolean]>={
 "01-01":["Santa Maria, Mãe de Deus",3,true],
 "01-02":["Santos Basílio Magno e Gregório Nazianzeno, bispos e doutores da Igreja",10,true],
 "01-17":["Santo Antão, abade",10,false],
 "01-21":["Santa Inês, virgem e mártir",10,false],
 "01-24":["São Francisco de Sales, bispo e doutor da Igreja",10,false],
 "01-25":["Conversão de São Paulo, Apóstolo",7,true],
 "01-26":["Santos Timóteo e Tito, bispos",10,true],
 "01-28":["Santo Tomás de Aquino, presbítero e doutor da Igreja",10,false],
 "01-31":["São João Bosco, presbítero",10,false],
 "02-02":["APRESENTAÇÃO DO SENHOR",5,true],
 "02-05":["Santa Águeda, virgem e mártir",10,false],
 "02-06":["São Paulo Miki e companheiros mártires",10,false],
 "02-10":["Santa Escolástica, virgem",10,false],
 "02-14":["São Cirilo, monge e São Metódio, bispo",10,false],
 "02-22":["Cátedra de São Pedro, Apóstolo",7,true],
 "02-23":["São Policarpo, bispo e mártir",10,false],
 "03-07":["Santas Perpétua e Felicidade, mártires",10,false],
 "03-19":["SÃO JOSÉ, ESPOSO DA BEM-AVENTURADA VIRGEM MARIA, Padroeiro da Igreja Universal",3,true],
 "03-25":["Anunciação do Senhor",3,true],
 "04-07":["São João Batista de La Salle, presbítero",10,false],
 "04-11":["Santo Estanislau, bispo e mártir",10,false],
 "04-25":["São Marcos, Evangelista",7,true],
 "04-29":["Santa Catarina de Sena, virgem e doutora da Igreja",10,false],
 "05-02":["Santo Atanásio, bispo e doutor da Igreja",10,false],
 "05-03":["Santos Filipe e Tiago, Apóstolos",7,true],
 "05-14":["São Matias, Apóstolo",7,true],
 "05-26":["São Filipe Néri, presbítero",10,false],
 "05-31":["Visitação da Bem-aventurada Virgem Maria",7,true],
 "06-01":["São Justino, mártir",10,false],
 "06-03":["São Carlos Lwanga e companheiros mártires",10,false],
 "06-05":["São Bonifácio, bispo e mártir",10,false],
 "06-09":["São José de Anchieta, presbítero",10,false],
 "06-11":["São Barnabé, Apóstolo",10,true],
 "06-13":["Santo Antônio de Pádua, presbítero e doutor da Igreja",10,false],
 "06-21":["São Luís Gonzaga, religioso",10,false],
 "06-24":["Natividade de São João Batista",3,true],
 "06-28":["Santo Irineu, bispo e mártir",10,false],
 "07-03":["São Tomé, Apóstolo",7,true],
 "07-09":["Santa Paulina do Coração Agonizante de Jesus, virgem",10,false],
 "07-11":["São Bento, abade",10,false],
 "07-15":["São Boaventura, bispo e doutor da Igreja",10,false],
 "07-16":["Bem-aventurada Virgem Maria do Monte Carmelo",7,true],
 "07-22":["Santa Maria Madalena",7,true],
 "07-25":["São Tiago, Apóstolo",7,true],
 "07-26":["Santos Joaquim e Ana, pais da Bem-aventurada Virgem Maria",10,true],
 "07-29":["Santos Marta, Maria e Lázaro",10,true],
 "07-31":["Santo Inácio de Loyola, presbítero",10,false],
 "08-01":["Santo Afonso Maria de Ligório, bispo e doutor da Igreja",10,false],
 "08-04":["São João Maria Vianney, presbítero",10,false],
 "08-06":["Transfiguração do Senhor",5,true],
 "08-08":["São Domingos, presbítero",10,false],
 "08-10":["São Lourenço, diácono e mártir",7,true],
 "08-11":["Santa Clara, virgem",10,false],
 "08-13":["Santa Dulce Lopes Pontes, virgem",10,false],
 "08-14":["São Maximiliano Maria Kolbe, presbítero e mártir",10,false],
 "08-20":["São Bernardo, abade e doutor da Igreja",10,false],
 "08-21":["São Pio X, papa",10,false],
 "08-22":["Bem-aventurada Virgem Maria Rainha",10,true],
 "08-23":["Santa Rosa de Lima, virgem, Padroeira da América Latina",7,true],
 "08-24":["São Bartolomeu, Apóstolo",7,true],
 "08-27":["Santa Mônica",10,false],
 "08-28":["Santo Agostinho, bispo e doutor da Igreja",10,false],
 "08-29":["Martírio de São João Batista",10,true],
 "09-03":["São Gregório Magno, papa e doutor da Igreja",10,false],
 "09-08":["Natividade da Bem-aventurada Virgem Maria",7,true],
 "09-13":["São João Crisóstomo, bispo e doutor da Igreja",10,false],
 "09-14":["Exaltação da Santa Cruz",5,true],
 "09-15":["Bem-aventurada Virgem Maria das Dores",10,true],
 "09-16":["Santos Cornélio, papa, e Cipriano, bispo, mártires",10,false],
 "09-20":["Santos André Kim Tae-gon, presbítero, Paulo Chóng Hasang e companheiros, mártires",10,false],
 "09-21":["São Mateus, Apóstolo e Evangelista",7,true],
 "09-23":["São Pio de Pietrelcina, presbítero",10,false],
 "09-27":["São Vicente de Paulo, presbítero",10,false],
 "09-29":["Santos Miguel, Gabriel e Rafael, Arcanjos",7,true],
 "09-30":["São Jerônimo, presbítero e doutor da Igreja",10,false],
 "10-01":["Santa Teresa do Menino Jesus, virgem e doutora da Igreja",10,false],
 "10-02":["Santos Anjos da Guarda",10,true],
 "10-03":["Santos André de Soveral e Ambrósio Francisco Ferro, presbíteros, Mateus Moreira e companheiros, mártires",10,false],
 "10-04":["São Francisco de Assis, religioso",10,false],
 "10-07":["Bem-aventurada Virgem Maria do Rosário",10,true],
 "10-12":["Bem-aventurada Virgem Maria da Conceição Aparecida",3,true],
 "10-15":["Santa Teresa de Jesus, virgem e doutora da Igreja",10,false],
 "10-17":["Santo Inácio de Antioquia, bispo e mártir",10,false],
 "10-18":["São Lucas, Evangelista",7,true],
 "10-25":["Santo Antônio de Sant'Ana Galvão, religioso",10,false],
 "10-28":["Santos Simão e Judas, Apóstolos",7,true],
 "11-02":["Comemoração de Todos os Fiéis Defuntos",3,true],
 "11-04":["São Carlos Borromeu, bispo",10,false],
 "11-09":["Dedicação da Basílica do Latrão",5,true],
 "11-10":["São Leão Magno, papa e doutor da Igreja",10,false],
 "11-11":["São Martinho de Tours, bispo",10,false],
 "11-12":["São Josafá, bispo e mártir",10,false],
 "11-17":["Santa Isabel da Hungria, religiosa",10,false],
 "11-19":["Santos Roque González, Afonso Rodríguez e João de Castillo, presbíteros e mártires",10,false],
 "11-21":["Apresentação da Bem-aventurada Virgem Maria",10,true],
 "11-22":["Santa Cecília, virgem e mártir",10,false],
 "11-24":["Santo André Dung-Lac, presbítero, e companheiros mártires",10,false],
 "11-30":["Santo André, Apóstolo",7,true],
 "12-03":["São Francisco Xavier, presbítero",10,false],
 "12-07":["Santo Ambrósio, bispo e doutor da Igreja",10,false],
 "12-08":["Imaculada Conceição da Bem-aventurada Virgem Maria",3,true],
 "12-12":["Bem-aventurada Virgem Maria de Guadalupe, Padroeira principal da América",7,true],
 "12-13":["Santa Luzia, virgem e mártir",10,false],
 "12-14":["São João da Cruz, presbítero e doutor da Igreja",10,false],
 "12-25":["Natal de Nosso Senhor Jesus Cristo",3,true],
 "12-26":["Santo Estêvão, protomártir",7,true],
 "12-27":["São João, Apóstolo e Evangelista",7,true],
 "12-28":["Os Santos Inocentes, mártires",7,true]
};

// Optional names from the supplied edition; these do not replace the day's readings.
const optionalMemorials:Record<string,string[]>={
 "01-03":["Santíssimo Nome de Jesus"],
 "01-07":["São Raimundo de Penhaforte"],
 "01-13":["Santo Hilário"],
 "01-20":["São Fabiano","São Sebastião"],
 "01-22":["São Vicente, diácono e mártir"],
 "01-27":["Santa Ângela Mérici"],
 "02-03":["São Brás","Santo Oscar"],
 "02-08":["São Jerônimo Emiliani","Santa Josefina Bakhita"],
 "02-11":["Nossa Senhora de Lourdes"],
 "02-17":["Sete Santos Fundadores da Ordem dos Servos de Maria"],
 "02-21":["São Pedro Damião"],
 "02-27":["São Gregório de Narek"],
 "03-04":["São Casimiro"],
 "03-08":["São João de Deus"],
 "03-09":["Santa Francisca Romana"],
 "03-17":["São Patrício"],
 "03-18":["São Cirilo de Jerusalém"],
 "03-23":["São Turíbio de Mogrovejo"],
 "04-02":["São Francisco de Paula"],
 "04-04":["Santo Isidoro"],
 "04-05":["São Vicente Ferrer"],
 "04-13":["São Martinho I"],
 "04-21":["Santo Anselmo"],
 "04-23":["São Jorge","Santo Adalberto"],
 "04-24":["São Fidélis de Sigmaringa"],
 "04-28":["São Pedro Chanel","São Luís Maria Grignion de Montfort"],
 "04-30":["São Pio V"],
 "05-01":["São José Operário"],
 "05-10":["São João de Ávila"],
 "05-12":["Santos Nereu e Aquiles","São Pancrácio"],
 "05-13":["Nossa Senhora de Fátima"],
 "05-18":["São João I"],
 "05-20":["São Bernardino de Sena"],
 "05-21":["São Cristóvão Magalhães e companheiros"],
 "05-22":["Santa Rita de Cássia"],
 "05-25":["São Beda, o Venerável","São Gregório VII","Santa Maria Madalena de Pazzi"],
 "05-27":["Santo Agostinho de Cantuária"],
 "05-29":["São Paulo VI"],
 "06-02":["Santos Marcelino e Pedro"],
 "06-06":["São Norberto"],
 "06-08":["Santo Efrém"],
 "06-19":["São Romualdo"],
 "06-22":["São Paulino de Nola","Santos João Fisher e Tomás More"],
 "06-27":["São Cirilo de Alexandria"],
 "06-30":["Santos Protomártires da Igreja de Roma"],
 "07-04":["Santa Isabel de Portugal"],
 "07-05":["Santo Antônio Maria Zaccaria"],
 "07-06":["Santa Maria Goretti"],
 "07-08":["Santo Agostinho Zhao Rong e companheiros"],
 "07-13":["Santo Henrique"],
 "07-14":["São Camilo de Lellis"],
 "07-17":["Bem-aventurado Inácio de Azevedo e companheiros, mártires"],
 "07-20":["Santo Apolinário"],
 "07-21":["São Lourenço de Bríndisi"],
 "07-23":["Santa Brígida"],
 "07-24":["São Charbel Makhluf"],
 "07-30":["São Pedro Crisólogo"],
 "08-02":["Santo Eusébio de Vercelli","São Pedro Julião Eymard"],
 "08-05":["Dedicação da Basílica de Santa Maria"],
 "08-07":["São Sisto II e companheiros","São Caetano"],
 "08-09":["Santa Teresa Benedita da Cruz"],
 "08-12":["Santa Joana Francisca de Chantal","Santos Ponciano e Hipólito"],
 "08-16":["Santo Estêvão da Hungria"],
 "08-19":["São João Eudes"],
 "08-25":["São Luís de França","São José de Calazans"],
 "09-05":["Santa Teresa de Calcutá"],
 "09-09":["São Pedro Claver"],
 "09-12":["Santíssimo Nome de Maria"],
 "09-17":["São Roberto Belarmino","Santa Hildegarda de Bingen"],
 "09-19":["São Januário"],
 "09-26":["Santos Cosme e Damião"],
 "09-28":["São Venceslau","São Lourenço Ruiz e companheiros"],
 "10-05":["São Benedito, o Negro"],
 "10-06":["São Bruno","Santa Faustina Kowalska"],
 "10-09":["São Dionísio e companheiros","São João Leonardi","São João Henrique Newman"],
 "10-11":["São João XXIII"],
 "10-14":["São Calisto I"],
 "10-16":["Santa Edviges","Santa Margarida Maria Alacoque"],
 "10-19":["São Pedro de Alcântara","Santos João de Brébeuf, Isaac Jogues e companheiros","São Paulo da Cruz"],
 "10-22":["São João Paulo II"],
 "10-23":["São João de Capistrano"],
 "10-24":["Santo Antônio Maria Claret"],
 "11-03":["São Martinho de Lima"],
 "11-15":["Santo Alberto Magno"],
 "11-16":["Santa Margarida da Escócia","Santa Gertrudes"],
 "11-18":["Dedicação das Basílicas de São Pedro e São Paulo"],
 "11-23":["São Clemente I","São Columbano"],
 "11-25":["Santa Catarina de Alexandria"],
 "12-04":["São João Damasceno"],
 "12-06":["São Nicolau"],
 "12-09":["São João Diego Cuauhtlatoatzin"],
 "12-10":["Nossa Senhora de Loreto"],
 "12-11":["São Dâmaso I"],
 "12-21":["São Pedro Canísio"],
 "12-23":["São João Câncio"],
 "12-29":["São Tomás Becket"],
 "12-31":["São Silvestre I"]
};

/** National Brazilian calendar. A date is a civil day in Brasília, not a vigil-time guess. */
export function dailyCalendar(input:string):DailyCalendar {
 const date=parseDate(input),year=Number(date.slice(0,4));
 if(year<1583||year>9999)throw new ReadingError('Projeção disponível de 1583 a 9999. Consulte o índice para outras datas.');
 const projected=year<2026||year>2035;
 const month=Number(date.slice(5,7)),dom=Number(date.slice(8)),n=day(year,month,dom),w=weekday(n);
 const easter=easterDay(year),offset=n-easter,advent=sunday(day(year,11,27));
 const cycle=(['C','A','B'] as const)[(year+(n>=advent?1:0))%3]!;
 // Ferial I/II applies to Ordinary Time and follows the civil year; Advent has no I/II readings.
 const weekdayCycle=year%2?'I':'II',warnings:string[]=[];
 const epiphany=sunday(day(year,1,2));
 const baptism=epiphany+(epiphany>=day(year,1,7)?1:7);
 const christmas=day(year,12,25),family=weekday(christmas)===0?day(year,12,30):sunday(christmas+1);
 const allSaintsSunday=sunday(day(year,11,1));
 const allSaints=allSaintsSunday===day(year,11,2)?day(year,11,1):allSaintsSunday;
 const joseph=day(year,3,19),josephHolyWeek=joseph>=easter-7&&joseph<=easter+7;
 const transferredJoseph=josephHolyWeek?easter-8:joseph-(weekday(joseph)===0?1:0);
 const john=day(year,6,24),johnSacredHeart=john===easter+68,johnCorpus=john===easter+60;
 const transferredJohn=johnSacredHeart?john-1:john;
 const annual=(name:string,key:string,rank=3,byCycle=false)=>event(name,key+(byCycle?'/'+cycle:''),rank);
 function temporal():Celebration {
  if(n===epiphany)return annual('Epifania do Senhor','epifania',2);
  if(n===baptism)return annual('Batismo do Senhor','batismo',5,true);
  if(month===1&&n<baptism)return event('Tempo do Natal',n<epiphany?'jan/'+dom:'epifania/dia/'+w,13);
  if(n===family)return annual('Sagrada Família','familia',5,true);
  if(n>=christmas)return event('Oitava do Natal','oitava-natal/'+dom,9);
  if(n>=advent){
   const week=1+Math.floor((n-advent)/7);
   let key=`advento/${week}/${w}`;
   if(w===0)key+='/'+cycle+(dom===24?'/vespera':'');
   else if(month===12&&dom>=17)key='dez/'+dom;
   else if(week===1&&w===1)key+=cycle==='A'?'/A':'/BC';
   return event(`${week}${w===0?'º Domingo':'ª Semana'} do Advento`,key,w===0?2:month===12&&dom>=17?9:13);
  }
  if(n===advent-7)return annual('Nosso Senhor Jesus Cristo, Rei do Universo','rei',3,true);
  if(offset===-46)return annual('Quarta-feira de Cinzas','cinzas',2);
  if(offset>=-45&&offset<=-43)return event('Depois das Cinzas','cinzas/'+w,9);
  if(offset>=-42&&offset<=-8){
   const week=1+Math.floor((offset+42)/7);
   let key=`quaresma/${week}/${w}`+(w===0?'/'+cycle:'');
   if(week===5&&w===1)key+=cycle==='C'?'/C':'/AB';
   return event(`${week}${w===0?'º Domingo':'ª Semana'} da Quaresma`,key,w===0?2:9);
  }
  if(offset===-7)return annual('Domingo de Ramos','ramos',2,true);
  if(offset>=-6&&offset<=-3)return event('Semana Santa','santa/'+w,2);
  if(offset===-2)return annual('Paixão do Senhor','paixao',1);
  if(offset===-1)return annual('Sábado Santo · Vigília Pascal','vigilia',1,true);
  if(offset===0)return annual('Páscoa da Ressurreição','pascoa',1);
  if(offset>=1&&offset<=6)return event('Oitava da Páscoa','oitava-pascoa/'+w,2);
  if(offset===7)return annual('2º Domingo da Páscoa','misericordia',2,true);
  if(offset===42)return annual('Ascensão do Senhor','ascensao',2,true);
  if(offset===49)return annual('Pentecostes','pentecostes',2,true);
  if(offset>=8&&offset<49){
   const week=1+Math.floor(offset/7);
   let key=`pascal/${week}/${w}`+(w===0?'/'+cycle:'');
   if(week===4&&w===1)key+=cycle==='A'?'/A':'/BC';
   return event(`${week}${w===0?'º Domingo':'ª Semana'} da Páscoa`,key,w===0?2:13);
  }
  const week=n<easter?2+Math.floor((n-sunday(baptism+1))/7):34+Math.floor((n-(advent-7))/7);
  let key=`comum/${week}/${w}/${w===0?cycle:weekdayCycle}`;
  if(week===18&&(w===1||w===2))key+=cycle==='A'&&new Date((n-w)*DAY).toISOString().slice(5,10)!=='08-06'?'/apos-multiplicacao':'/habitual';
  return event(`${week}${w===0?'º Domingo':'ª Semana'} do Tempo Comum`,key,w===0?6:13);
 }
 const base=temporal();let selected=base;
 const propose=(candidate:Celebration)=>{if(candidate.rank<selected.rank)selected=candidate;};
 const movable:[number,string,string,number,boolean][]=[
  [easter+50,'Maria, Mãe da Igreja','mae',10,false],
  [easter+56,'Santíssima Trindade','trindade',3,true],
  [easter+60,'Santíssimo Corpo e Sangue de Cristo','corpus',3,true],
  [easter+68,'Sagrado Coração de Jesus','coracao',3,true],
  [easter+69,'Imaculado Coração de Maria','imaculado',10,false],
  [sunday(day(year,6,28)),'São Pedro e São Paulo','pedro',3,false],
  [sunday(day(year,8,15)),'Assunção de Nossa Senhora','assuncao',3,false],
  [allSaints,'Todos os Santos','todos',3,false]
 ];
 for(const [when,name,key,rank,byCycle] of movable)if(n===when)propose(annual(name,key,rank,byCycle));
 let fixed=date.slice(5);
 // An impeded Annunciation follows the Easter octave; a Lenten Sunday moves it to Monday.
 const annunciation=day(year,3,25);
 const transferredAnnunciation=annunciation>=easter-7&&annunciation<=easter+7?easter+8:annunciation+(weekday(annunciation)===0?1:0);
 const transfers:Record<string,number>={'03-19':transferredJoseph,'03-25':transferredAnnunciation,'06-24':transferredJohn};
 if(transfers[fixed]!==undefined&&transfers[fixed]!==n)fixed='';
 for(const [key,when] of Object.entries(transfers))if(when===n)fixed=key;
 const saint=saints[fixed];
 if(saint){
  const [name,rank,proper]=saint;
  let key=proper?'proprio/'+fixed:base.key;
  if(['02-02','09-14','08-06'].includes(fixed))key+=w===0?'/domingo':'/semana';
  if(fixed==='08-06')key+='/'+cycle;
  propose(event(name,key,fixed==='12-08'||fixed==='12-25'?1:rank));
 }
 const keys=[selected.key];
 let requiresChoice=false;
 if(projected)warnings.push('Projeção pelas normas brasileiras atuais, não uma reconstrução histórica nem confirmação de decretos futuros. Confirme o Diretório anual e o calendário local.');
 if(johnCorpus&&n>=john-1&&n<=john+1){
  requiresChoice=n!==john;
  warnings.push('Corpus Christi coincide com São João Batista. A transferência para 23 ou 25 de junho depende do Diretório anual; nenhuma dessas datas está confirmada aqui.');
  if(n!==john){
   if(!keys.includes('proprio/06-24'))keys.push('proprio/06-24');
   selected={...selected,name:'São João Batista · transferência a confirmar'};
  }
 }

 if(josephHolyWeek&&(n===transferredJoseph||n===joseph)){
  warnings.push('São José coincide com a Semana Santa. A antecipação para o sábado antes de Ramos é uma projeção: confirme a transferência no Diretório da CNBB deste ano.');
  if(n===transferredJoseph){
   requiresChoice=true;
   if(!keys.includes(base.key))keys.push(base.key);
   selected={...selected,name:'São José · transferência a confirmar'};
  }
 }
 if(!josephHolyWeek&&n===transferredJoseph&&n!==joseph)warnings.push('São José antecipado para sábado no calendário brasileiro, por coincidir com domingo da Quaresma.');
 if(johnSacredHeart&&(n===transferredJohn||n===john||n===transferredJohn-1))warnings.push('Coincidência com o Sagrado Coração: projeção nacional de São João Batista em 23 de junho, conforme o precedente de 2022. Onde é padroeiro, a solução pode ser diferente; confirme o calendário local e o Diretório anual.');

 if(selected.key==='imaculado'&&saint?.[1]===10){
  keys.push(saint[2]?'proprio/'+fixed:base.key);
  if(!keys.includes(base.key))keys.push(base.key);
  warnings.push(`Memórias facultativas coincidentes: Imaculado Coração de Maria ou ${saint[0]}. Também se pode celebrar a féria; a segunda opção contém as leituras feriais.`);
 }
 if(selected!==base&&selected.rank===10&&selected.key===base.key)warnings.push('Esta memória usa aqui as leituras feriais, não um formulário próprio.');
 if(selected.key==='proprio/03-25'&&n!==annunciation)warnings.push(transferredAnnunciation===easter+8?'Anunciação transferida para depois da Oitava da Páscoa.':'Anunciação transferida para segunda-feira por coincidir com domingo da Quaresma.');
 if(offset===-1)warnings.push('Não há Missa durante o dia. A Vigília Pascal celebra-se à noite.');
 if(date.endsWith('-12-24')||date.endsWith('-12-25'))warnings.push('Escolha o formulário conforme a Missa: dia, vigília, noite ou aurora.');
 if(selected.key==='pedro'||selected.key==='proprio/06-24'||selected.key==='assuncao'||selected.key.startsWith('pentecostes/'))warnings.push('O acervo reúne formulários distintos; escolha o correspondente à celebração.');
 if(w===0&&offset>=-28&&offset<=-14&&cycle!=='A')warnings.push('Com escrutínios, podem ser usadas as leituras do Ano A. Consulte também esse formulário no índice.');
 if(selected===base&&(base.rank===13||base.rank===9)&&!requiresChoice){
  const names=[...(optionalMemorials[date.slice(5)]??[])];
  if(base.rank===9&&saint?.[1]===10)names.push(saint[0]);
  if(names.length)warnings.push(`${base.rank===9?'Comemoração facultativa (coleta)':'Memória facultativa'}: ${names.join('; ')}. As leituras feriais são conservadas aqui.`);
  if(base.rank===13&&base.key.startsWith('comum/')&&w===6)warnings.push('Pode-se celebrar Santa Maria no sábado. O acervo diário conserva as leituras feriais.');
 }
 const vigils:[number,string][]=[
  [easter+48,'pentecostes/'+cycle],
  [sunday(day(year,6,28))-1,'pedro'],
  [sunday(day(year,8,15))-1,'assuncao'],
  ...(!johnCorpus?[[transferredJohn-1,'proprio/06-24'] as [number,string]]:[])
 ];
 const vigilKeys=vigils.filter(([when])=>when===n).map(([,key])=>key);
 if(vigilKeys.length)warnings.push('À noite, há formulário próprio de vigília. Escolha-o apenas para essa celebração.');
 return {date,celebration:selected.name,keys,warnings,cycle,weekdayCycle,...(projected?{projected:true}:{}),...(requiresChoice?{requiresChoice:true}:{}),...(vigilKeys.length?{vigilKeys}:{}),...(offset===-1?{noDaytimeMass:true}:{})};
}
