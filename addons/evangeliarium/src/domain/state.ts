import type {BookId} from './catalog.ts';
export type Selection={mode:'today'}|{mode:'passage';reference:string}|{mode:'index'}|{mode:'section';sectionId:string;page:number};
export function selectionAllowed(book:BookId,selection:Selection):boolean{return book==='gospel'?selection.mode==='today'||selection.mode==='passage'||selection.mode==='section':selection.mode==='index'||selection.mode==='section'||book!=='pontifical'&&selection.mode==='today';}
export interface BookState {schema:1;instanceId:string;revision:number;selection:Selection}
export function decodeState(raw:unknown):BookState|undefined{
  if(typeof raw!=='string')return undefined;
  let x:any;try{x=JSON.parse(raw);}catch{return undefined;}
  if(x?.schema!==1||typeof x.instanceId!=='string'||!/^ev-[a-z0-9-]{6,80}$/.test(x.instanceId)||!Number.isSafeInteger(x.revision)||x.revision<0)return undefined;
  const s=x.selection;
  if(!s||!['today','passage','index','section'].includes(s.mode))return undefined;
  if(s.mode==='passage'&&(typeof s.reference!=='string'||!s.reference.length||s.reference.length>180))return undefined;
  if(s.mode==='section'&&(typeof s.sectionId!=='string'||!/^[-a-z0-9_]{1,160}$/.test(s.sectionId)||!Number.isSafeInteger(s.page)||s.page<0))return undefined;
  return x;
}
export function newState(id:string,book:BookId='gospel'):BookState{return{schema:1,instanceId:id,revision:0,selection:{mode:book==='pontifical'?'index':'today'}};}
export function revise(state:BookState,selection:Selection):BookState{return{...state,revision:state.revision+1,selection};}
export function sameBook(a:BookState|undefined,b:BookState):boolean{return a?.instanceId===b.instanceId&&a.revision===b.revision;}
export class Locks {
  private active=new Set<string>();
  run<T>(keys:string[],operation:()=>T):T|undefined{
    if(keys.some(k=>this.active.has(k)))return undefined;
    keys.forEach(k=>this.active.add(k));
    try{return operation();}finally{keys.forEach(k=>this.active.delete(k));}
  }
}
