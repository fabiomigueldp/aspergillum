export type Selection={mode:'today'}|{mode:'passage';reference:string};
export interface BookState {schema:1;instanceId:string;revision:number;selection:Selection}
export function decodeState(raw:unknown):BookState|undefined{
  if(typeof raw!=='string')return undefined;
  let x:any;try{x=JSON.parse(raw);}catch{return undefined;}
  if(x?.schema!==1||typeof x.instanceId!=='string'||!/^ev-[a-z0-9-]{6,80}$/.test(x.instanceId)||!Number.isSafeInteger(x.revision)||x.revision<0)return undefined;
  if(x.selection?.mode!=='today'&&(x.selection?.mode!=='passage'||typeof x.selection.reference!=='string'||x.selection.reference.length>180))return undefined;
  return x;
}
export function newState(id:string):BookState{return{schema:1,instanceId:id,revision:0,selection:{mode:'today'}};}
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
