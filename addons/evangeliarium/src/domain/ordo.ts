import {brazilDate, parseDate} from './calendar.ts';

export type OrdoSelection =
  | {kind:'date'; date:string; key:string; mass?:string}
  | {kind:'votive'; id:string};
export interface OrdoState {
  schema:1;
  revision:number;
  override?:{selection:OrdoSelection; expiresAt:number};
}
export type OrdoErrorCode = 'invalid_state'|'invalid_selection'|'conflict'|'persistence';
export class OrdoStateError extends Error {
  readonly code:OrdoErrorCode;
  constructor(code:OrdoErrorCode, message:string) { super(message); this.name='OrdoStateError'; this.code=code; }
}
export interface OrdoStoreOptions {
  /** undefined means uninitialized; strings are decoded as persisted JSON. */
  read:()=>unknown;
  /** Must synchronously replace the single world property or throw. */
  write:(state:OrdoState)=>void;
  now:()=>number;
  votiveIds:ReadonlySet<string>;
  dateSelectionAllowed:(selection:Extract<OrdoSelection,{kind:'date'}>)=>boolean;
}
const DAY=86_400_000;
const OFFSET=3*3_600_000;
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const keys=(v:Record<string,unknown>, allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const revision=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;

/** Next civil midnight under the existing fixed Brasília UTC−03 policy. */
export function nextBrazilMidnight(now:number):number {
  const date=brazilDate(now);
  const next=Date.parse(date+'T03:00:00.000Z')+DAY;
  if(!Number.isSafeInteger(next)||!Number.isFinite(new Date(next).getTime()))throw new OrdoStateError('invalid_state','Relógio indisponível.');
  return next;
}
export function validateOrdoSelection(value:unknown, votiveIds:ReadonlySet<string>, dateSelectionAllowed:OrdoStoreOptions['dateSelectionAllowed']):OrdoSelection {
  if(record(value)) {
    if(value.kind==='date'&&keys(value,['kind','date','key','mass'])&&typeof value.date==='string'&&typeof value.key==='string'&&value.key.length>0&&value.key.length<=160&&(!('mass' in value)||(typeof value.mass==='string'&&value.mass.length>0&&value.mass.length<=80))) {
      try { const selection:Extract<OrdoSelection,{kind:'date'}>={kind:'date',date:value.date,key:value.key}; if(typeof value.mass==='string')selection.mass=value.mass; if(parseDate(value.date)===value.date&&dateSelectionAllowed(selection))return selection; } catch { /* reject rather than normalize */ }
    }
    if(value.kind==='votive'&&keys(value,['kind','id'])&&typeof value.id==='string'&&votiveIds.has(value.id))return {kind:'votive',id:value.id};
  }
  throw new OrdoStateError('invalid_selection','Seleção do Ordo inválida.');
}

/** Synchronous server-side store: no await between revalidation and commit.
 * Invalid/unknown data is never replaced, including when an override has expired.
 * Every read reloads persistence; callers must not cache a world-state authority.
 */
export class OrdoStore {
  private readonly options:OrdoStoreOptions;
  private busy=false;
  constructor(options:OrdoStoreOptions) { this.options={...options,votiveIds:new Set(options.votiveIds)}; }
  private load(now:number):OrdoState {
    let raw:unknown;
    try { raw=this.options.read(); } catch { throw new OrdoStateError('persistence','Não foi possível ler o Ordo.'); }
    if(raw===undefined)return {schema:1,revision:0};
    try {
      if(typeof raw==='string')raw=JSON.parse(raw);
      if(!record(raw)||!keys(raw,['schema','revision','override'])||raw.schema!==1||!revision(raw.revision))throw Error();
      const state:OrdoState={schema:1,revision:raw.revision};
      if('override' in raw) {
        const override=raw.override;
        if(!record(override)||!keys(override,['selection','expiresAt'])||typeof override.expiresAt!=='number'||!Number.isSafeInteger(override.expiresAt)||
          (override.expiresAt-OFFSET)%DAY!==0||!Number.isFinite(new Date(override.expiresAt).getTime())||override.expiresAt>nextBrazilMidnight(now))throw Error();
        state.override={selection:validateOrdoSelection(override.selection,this.options.votiveIds,this.options.dateSelectionAllowed),expiresAt:override.expiresAt};
      }
      return state;
    } catch { throw new OrdoStateError('invalid_state','Ordo persistido inválido ou de versão não suportada.'); }
  }
  private clock():number {
    try { const now=this.options.now(); nextBrazilMidnight(now); return now; }
    catch { throw new OrdoStateError('invalid_state','Relógio indisponível.'); }
  }
  private commit(state:OrdoState, now:number):OrdoState {
    try { this.options.write(JSON.parse(JSON.stringify(state)) as OrdoState); }
    catch { throw new OrdoStateError('persistence','Não foi possível salvar o Ordo.'); }
    const actual=this.load(now);
    if(JSON.stringify(actual)!==JSON.stringify(state))throw new OrdoStateError('persistence','A gravação do Ordo não foi confirmada.');
    return actual;
  }
  private bump(state:OrdoState):OrdoState {
    if(state.revision===Number.MAX_SAFE_INTEGER)throw new OrdoStateError('invalid_state','Limite de revisão do Ordo atingido.');
    return {schema:1,revision:state.revision+1};
  }
  private current(now:number):OrdoState {
    const state=this.load(now);
    return state.override&&state.override.expiresAt<=now?this.commit(this.bump(state),now):state;
  }
  private run(action:()=>OrdoState):OrdoState {
    if(this.busy)throw new OrdoStateError('conflict','O Ordo está sendo atualizado.');
    this.busy=true;
    try { return action(); } finally { this.busy=false; }
  }
  read():OrdoState { return this.run(()=>this.current(this.clock())); }
  change(selection:OrdoSelection|undefined, expectedRevision:number):OrdoState {
    return this.run(()=>{
      if(!revision(expectedRevision))throw new OrdoStateError('conflict','Revisão do Ordo inválida.');
      const selected=selection===undefined?undefined:validateOrdoSelection(selection,this.options.votiveIds,this.options.dateSelectionAllowed);
      const now=this.clock(), state=this.current(now);
      if(state.revision!==expectedRevision)throw new OrdoStateError('conflict','O Ordo mudou. Reabra a seleção.');
      const next=this.bump(state);
      if(selected)next.override={selection:selected,expiresAt:nextBrazilMidnight(now)};
      return this.commit(next,now);
    });
  }
}
