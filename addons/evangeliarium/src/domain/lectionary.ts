import type {LiturgicalBook} from './liturgy.ts';
export interface LectionaryDay {date:string;celebration:string;options:{label:string;sectionId:string}[];warnings?:string[];noDaytimeMass?:boolean}
export interface LectionaryCatalog {book:LiturgicalBook;gospel:LiturgicalBook;days:Record<string,LectionaryDay>}
